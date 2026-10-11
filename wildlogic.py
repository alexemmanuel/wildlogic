#!/usr/bin/env python3
"""
WILDLOGIC - one-file sniper bot with a button control panel.

  pip install requests            # paper mode (no real money)
  python wildlogic.py             # prints a link: http://127.0.0.1:8080/?k=XXXX  -> open it

LIVE mode (Solana, real money, via Jupiter):
  pip install requests solders
  python wildlogic.py --new-wallet          # makes a fresh wallet ON YOUR MACHINE, prints its address
  (send a little SOL to that address)
  export SOLANA_RPC="<your Helius/QuickNode RPC url>"
  export BOT_LIVE=1
  export BOT_CONFIRM=I_UNDERSTAND_I_CAN_LOSE_ALL_OF_THIS_MONEY
  export WITHDRAW_TO="<your main wallet>"   # optional: locks the Withdraw button to this address
  python wildlogic.py

Settings can live in a file named secrets.env next to this script (KEY=value lines; keep it OFF GitHub).
Flags:  --new-wallet | --address | --headless (old terminal-only mode, no panel)
Env:    PANEL_PORT (8080), PANEL_HOST (127.0.0.1), PANEL_KEY (fixed login key instead of a random one)

Buttons: Sniper ON/OFF, Scanner ON/OFF, address, balance, positions (sell 50%/100%), add token,
         settings (buy size, take-profit, sell %, stop loss), withdraw SOL, sell all, trade history.
Sniper and Scanner start OFF each time you open the panel the first time; the choice is remembered after.

The page is plain HTTP and only listens on this computer. For phone access use Tailscale or an SSH tunnel.
Never use your main wallet for the bot. Fund it only with money you can afford to lose.
Data: DexScreener (market), GoPlus (EVM security, paper only), RugCheck (Solana).
"""
import base64
import csv
import hmac
import json
import logging
import os
import queue
import secrets
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone

import requests


def _load_env_file(name="secrets.env"):
    """Reads KEY=value lines from secrets.env next to this file (never overrides real env vars)."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env_file()

# ============================ CONFIG ============================
LIVE = os.environ.get("BOT_LIVE") == "1"
CONFIRM_PHRASE = "I_UNDERSTAND_I_CAN_LOSE_ALL_OF_THIS_MONEY"
CHAINS = {"ethereum": "1", "base": "8453", "bsc": "56", "arbitrum": "42161", "solana": None}  # paper

# Paper settings
START_CASH = 1000.0
POSITION_USD = 50.0
MAX_POSITIONS = 5
MAX_DAILY_LOSS = 100.0
SLIPPAGE = 0.015
FEE = 0.003

# Live settings (override the paper ones when LIVE). Keep small!
# Each trade costs real fees (network + priority + one-off token-account rent),
# so very small positions lose a big % to overhead. Do not go below ~$20.
LIVE_POSITION_USD = 25.0
LIVE_MAX_POSITIONS = 3
LIVE_MAX_DAILY_LOSS = 40.0
SOL_FEE_RESERVE = 0.02          # SOL always kept for fees
BUY_SLIPPAGE_BPS = 300
SELL_SLIPPAGE_BPS = [500, 1500, 3000]   # escalates on retry: exits matter more than price
MAX_PRICE_IMPACT = 0.03         # reject buys moving the price more than 3%
MAX_ROUNDTRIP_LOSS = 0.15       # reject if instantly selling back would lose >15%
PRIORITY_MAX_LAMPORTS = 500_000
SOLANA_RPC = os.environ.get("SOLANA_RPC", "https://api.mainnet-beta.solana.com")

# Market filters
MIN_LIQ_USD = 50_000
MIN_AGE_H = 6
MAX_AGE_H = 24 * 14
MIN_VOL_H24 = 100_000
MIN_TXNS_H24 = 300
MAX_H24_CHANGE = 300.0
MIN_H1_CHANGE = 2.0
MAX_FDV_TO_LIQ = 80
MIN_SCORE = 55

# Security filters
MAX_TAX = 0.05
MAX_OWNER_PCT = 0.05
MAX_TOP10_PCT = 0.40
MIN_LP_LOCKED = 0.50
MAX_RUGCHECK_SCORE = 30         # RugCheck normalised score: higher = riskier (60+ is high risk)

SCANNER_ENABLED = True          # False = the bot ONLY trades tokens from sniper_list.txt

# ======================== SNIPER SETTINGS (edit me) ========================
SNIPER_BUY_USD = 3.0                # buy size for any token you add (override per line: CONTRACT 10)
SNIPER_TARGETS = [(10.0, 0.5)]      # AUTO-SELL: at 10x sell 50% of the position, keep the rest.
                                    #   add rungs, e.g. [(3.0, 0.25), (10.0, 0.5)]
SNIPER_STOP_LOSS = None             # e.g. 0.5 = sell everything if down 50%.  None = off
SNIPER_TRAIL_ARM = None             # e.g. 2.0 = once up 200%...
SNIPER_TRAIL_PCT = None             # ...sell if price falls 25% from its peak (e.g. 0.25).  None = off
SNIPER_RUG_ALARM = 0.40             # sell everything if liquidity falls 40% from entry.  None = off
SNIPER_SECURITY_CHECK = True        # rug-check first; add `force` to a line to skip it for that token
SNIPER_POLL_SEC = 5                 # how often waiting tokens are checked for a market
# ===========================================================================

# Exit profiles. targets = [(price multiple of your entry, fraction of the ORIGINAL position to sell)]
PROFILES = {
    "scanner": dict(targets=[(1.40, 1.0)], stop_loss=0.15, trail_arm=0.20, trail_pct=0.12,
                    max_hold_h=24, liq_drop_exit=0.40),
    "sniper":  dict(targets=SNIPER_TARGETS, stop_loss=SNIPER_STOP_LOSS, trail_arm=SNIPER_TRAIL_ARM,
                    trail_pct=SNIPER_TRAIL_PCT, max_hold_h=None, liq_drop_exit=SNIPER_RUG_ALARM),
}
PROFILE_ALIAS = {"manual": "sniper"}   # older state files
PAIR_MISS_LIMIT = 5             # consecutive "pair not found" before treating as rugged
SNIPER_FILE = "sniper_list.txt"

SCAN_EVERY = 180
MONITOR_EVERY = 30
RECHECK_AFTER_H = 6
STATE_FILE = "state_paper.json"
TRADES_FILE = "trades_paper.csv"
# ================================================================

DEX = "https://api.dexscreener.com"
GOPLUS = "https://api.gopluslabs.io/api/v1"
RUGCHECK = "https://api.rugcheck.xyz/v1"
JUP = "https://lite-api.jup.ag/swap/v1"
WSOL = "So11111111111111111111111111111111111111112"
BURN = {"0x000000000000000000000000000000000000dead", "0x0000000000000000000000000000000000000000"}
API_ERR = "API_ERR"  # sentinel: network/API failure (different from "token has no pair")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("wildlogic")


def get(url, params=None, retries=2):
    for i in range(retries + 1):
        try:
            r = requests.get(url, params=params, timeout=15, headers={"User-Agent": "wildlogic-bot/3.0"})
            if r.status_code == 429:
                time.sleep(5 * (i + 1))
                continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log.debug("GET failed %s: %s", url, e)
            time.sleep(1)
    return None


# ------------------------- market data -------------------------
def candidates():
    d = get(f"{DEX}/token-profiles/latest/v1")
    return [(p["chainId"], p["tokenAddress"]) for p in (d or [])
            if p.get("chainId") in CHAINS and p.get("tokenAddress")]


def best_pair(chain, addr):
    """Deepest-liquidity pair where `addr` is the BASE token (else priceUsd is another token's)."""
    d = get(f"{DEX}/latest/dex/tokens/{addr}")
    if d is None:
        return API_ERR
    pairs = [p for p in (d.get("pairs") or [])
             if p.get("chainId") == chain and p.get("priceUsd")
             and ((p.get("baseToken") or {}).get("address") or "").lower() == addr.lower()]
    return max(pairs, key=lambda p: (p.get("liquidity") or {}).get("usd") or 0) if pairs else None


def market_check(p):
    """Returns (ok, reason, score). Fails closed on missing data."""
    liq = (p.get("liquidity") or {}).get("usd") or 0
    vol = p.get("volume") or {}
    tx = p.get("txns") or {}
    pc = p.get("priceChange") or {}
    created = p.get("pairCreatedAt")
    if not created:
        return False, "unknown age", 0
    age_h = (time.time() * 1000 - created) / 3.6e6
    fdv = p.get("fdv") or 0
    tx24 = sum((tx.get("h24") or {}).values())
    h1 = tx.get("h1") or {}
    buys, sells = h1.get("buys", 0), h1.get("sells", 0)
    br = buys / (buys + sells) if buys + sells else 0
    h1c, h24c = pc.get("h1") or 0, pc.get("h24") or 0

    if liq < MIN_LIQ_USD: return False, f"liq ${liq:,.0f}", 0
    if not MIN_AGE_H <= age_h <= MAX_AGE_H: return False, f"age {age_h:.1f}h", 0
    if (vol.get("h24") or 0) < MIN_VOL_H24: return False, "low volume", 0
    if tx24 < MIN_TXNS_H24: return False, "few txns", 0
    if h24c > MAX_H24_CHANGE: return False, f"already +{h24c:.0f}% 24h", 0
    if h1c < MIN_H1_CHANGE: return False, "no momentum", 0
    if fdv and fdv / liq > MAX_FDV_TO_LIQ: return False, "FDV >> liquidity", 0

    score = (min(h1c, 20) / 20 * 25                           # momentum
             + max(0, min((br - 0.5) * 4, 1)) * 25            # buy pressure
             + min((vol.get("h1") or 0) / liq / 0.3, 1) * 20  # hourly turnover
             + min(liq / 500_000, 1) * 15
             + min(age_h / 72, 1) * 15)
    return score >= MIN_SCORE, f"score {score:.0f}", score


# ------------------------- security -------------------------
def security_check(chain, addr):
    """Returns (ok, reason). Fails closed: no data = no trade."""
    return solana_check(addr) if chain == "solana" else evm_check(chain, addr)


def evm_check(chain, addr):
    d = get(f"{GOPLUS}/token_security/{CHAINS[chain]}", {"contract_addresses": addr})
    info = ((d or {}).get("result") or {}).get(addr.lower())
    if not info:
        return False, "no security data"
    for k in ("is_honeypot", "buy_tax", "sell_tax"):  # unknown must not be read as "safe"
        if info.get(k) in (None, ""):
            return False, f"missing {k}"
    num = lambda k: float(info.get(k) or 0)
    flag = lambda k: str(info.get(k)) == "1"

    bad = [name for name, cond in [
        ("honeypot", flag("is_honeypot")),
        ("cannot sell all", flag("cannot_sell_all")),
        ("closed source", not flag("is_open_source")),
        ("buy tax", num("buy_tax") > MAX_TAX),
        ("sell tax", num("sell_tax") > MAX_TAX),
        ("hidden owner", flag("hidden_owner")),
        ("owner can reclaim", flag("can_take_back_ownership")),
        ("mintable", flag("is_mintable")),
        ("pausable transfers", flag("transfer_pausable")),
        ("blacklist function", flag("is_blacklisted")),
        ("mutable tax", flag("slippage_modifiable")),
        ("trading cooldown", flag("trading_cooldown")),
        ("owner holds a lot", num("owner_percent") > MAX_OWNER_PCT),
        ("creator holds a lot", num("creator_percent") > MAX_OWNER_PCT),
    ] if cond]
    holders = [h for h in (info.get("holders") or [])[:10]
               if str(h.get("is_contract")) != "1" and str(h.get("is_locked")) != "1"]
    if sum(float(h.get("percent") or 0) for h in holders) > MAX_TOP10_PCT:
        bad.append("concentrated holders")
    lp = info.get("lp_holders") or []
    locked = sum(float(h.get("percent") or 0) for h in lp
                 if str(h.get("is_locked")) == "1" or (h.get("address") or "").lower() in BURN)
    if locked < MIN_LP_LOCKED:
        bad.append(f"LP only {locked:.0%} locked/burned")
    return (not bad), ", ".join(bad) or "clean"


def solana_check(mint):
    d = get(f"{RUGCHECK}/tokens/{mint}/report/summary")
    if not d:
        return False, "no security data"
    score = d.get("score_normalised")
    if score is None:
        return False, "no risk score"
    bad = [r.get("name", "?") for r in (d.get("risks") or []) if r.get("level") == "danger"]
    if score > MAX_RUGCHECK_SCORE:
        bad.append(f"risk score {score}")
    return (not bad), ", ".join(bad) or "clean"


# ------------------------- executors -------------------------
WALLET_FILE = "wildlogic_wallet.json"


def load_keypair():
    """Key comes from SOLANA_PRIVATE_KEY, else from wildlogic_wallet.json. Never logged."""
    try:
        from solders.keypair import Keypair
    except ImportError:
        sys.exit("This needs: pip install solders")
    key = os.environ.get("SOLANA_PRIVATE_KEY", "").strip()
    if not key and os.path.exists(WALLET_FILE):
        with open(WALLET_FILE) as f:
            key = f.read().strip()
    if not key:
        sys.exit("No wallet found. Run: python wildlogic.py --new-wallet")
    return Keypair.from_bytes(bytes(json.loads(key))) if key.startswith("[") else Keypair.from_base58_string(key)


def new_wallet():
    """Creates a fresh Solana wallet locally. The private key is written to a file and never printed."""
    try:
        from solders.keypair import Keypair
    except ImportError:
        sys.exit("This needs: pip install solders")
    if os.path.exists(WALLET_FILE):
        sys.exit(f"{WALLET_FILE} already exists (address {load_keypair().pubkey()}). Not overwriting it.")
    kp = Keypair()
    fd = os.open(WALLET_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(list(bytes(kp)), f)
    print(f"""
New wallet created. Your Solana address (safe to share, send SOL here):

    {kp.pubkey()}

Private key saved to {WALLET_FILE} (this file controls the money).
 - Back it up somewhere safe. If you lose it, the funds are gone.
 - Never share it, never paste it into a chat, never upload it to GitHub.
 - Send only what you can afford to lose. Keep some SOL for fees (about 0.02 SOL minimum).
""")


class Paper:
    """Simulated fills. No money moves."""
    def available_usd(self, st):
        return st["cash"]

    def buy(self, st, chain, addr, pair, usd):
        fill = float(pair["priceUsd"]) * (1 + SLIPPAGE)
        st["cash"] -= usd
        return {"entry": fill, "qty": usd * (1 - FEE) / fill, "usd": usd}

    def sell(self, st, pos, price, fraction=1.0):
        proceeds = pos["qty"] * fraction * price * (1 - SLIPPAGE) * (1 - FEE) if price > 0 else 0.0
        st["cash"] += proceeds
        return proceeds


def rpc(method, params):
    try:
        r = requests.post(SOLANA_RPC, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
                          timeout=20)
        j = r.json()
        if "error" in j:
            log.warning("RPC %s error: %s", method, str(j["error"])[:200])
            return None
        return j.get("result")
    except Exception as e:
        log.warning("RPC %s failed: %s", method, e)
        return None


def jup_quote(inp, out, amount, bps):
    return get(f"{JUP}/quote", {"inputMint": inp, "outputMint": out, "amount": int(amount),
                                "slippageBps": bps, "restrictIntermediateTokens": "true"}, retries=1)


class LiveSolana:
    """REAL swaps through Jupiter. Private key is read from the environment and never logged or saved."""
    def __init__(self):
        self.kp = load_keypair()
        self.pub = str(self.kp.pubkey())
        self._sp = (0.0, 0.0)

    # --- chain reads ---
    def sol_price(self):
        t, p = self._sp
        if p and time.time() - t < 30:
            return p
        pair = best_pair("solana", WSOL)
        if pair not in (None, API_ERR):
            self._sp = (time.time(), float(pair["priceUsd"]))
        return self._sp[1]

    def sol_balance(self):
        r = rpc("getBalance", [self.pub, {"commitment": "confirmed"}])
        return r["value"] if r else None

    def token_balance(self, mint):
        r = rpc("getTokenAccountsByOwner",
                [self.pub, {"mint": mint}, {"encoding": "jsonParsed", "commitment": "confirmed"}])
        if r is None:
            return None
        raw, dec = 0, 0
        for a in r["value"]:
            amt = a["account"]["data"]["parsed"]["info"]["tokenAmount"]
            raw += int(amt["amount"])
            dec = amt["decimals"]
        return raw, dec

    def available_usd(self, st):
        bal, price = self.sol_balance(), self.sol_price()
        if bal is None or not price:
            return 0.0
        return max(0.0, bal / 1e9 - SOL_FEE_RESERVE) * price

    # --- sending ---
    def _sign_send(self, b64tx):
        from solders.transaction import VersionedTransaction
        tx = VersionedTransaction.from_bytes(base64.b64decode(b64tx))
        signed = VersionedTransaction(tx.message, [self.kp])
        raw = base64.b64encode(bytes(signed)).decode()
        return rpc("sendTransaction", [raw, {"encoding": "base64", "skipPreflight": False,
                                              "maxRetries": 3, "preflightCommitment": "confirmed"}])

    def _confirm(self, sig, timeout=60):
        end = time.time() + timeout
        while time.time() < end:
            r = rpc("getSignatureStatuses", [[sig], {"searchTransactionHistory": True}])
            s = ((r or {}).get("value") or [None])[0]
            if s:
                if s.get("err"):
                    return False
                if s.get("confirmationStatus") in ("confirmed", "finalized"):
                    return True
            time.sleep(2)
        return None  # unknown: caller must verify with balances

    def _swap(self, quote):
        base = {"quoteResponse": quote, "userPublicKey": self.pub, "dynamicComputeUnitLimit": True}
        prio = dict(base, prioritizationFeeLamports={"priorityLevelWithMaxLamports": {
            "maxLamports": PRIORITY_MAX_LAMPORTS, "priorityLevel": "high"}})
        for body in (prio, base):
            try:
                r = requests.post(f"{JUP}/swap", json=body, timeout=20)
                r.raise_for_status()
                tx = r.json().get("swapTransaction")
                if tx:
                    sig = self._sign_send(tx)
                    if sig:
                        return sig
            except Exception as e:
                log.warning("swap build failed: %s", e)
        return None

    # --- trading ---
    def buy(self, st, chain, addr, pair, usd):
        price = self.sol_price()
        bal = self.sol_balance()
        if not price or bal is None:
            return None
        lamports = int(usd / price * 1e9)
        if bal - lamports < SOL_FEE_RESERVE * 1e9:
            log.info("not enough SOL for buy + fee reserve")
            return None
        q = jup_quote(WSOL, addr, lamports, BUY_SLIPPAGE_BPS)
        if not q:
            log.info("no buy route"); return None
        if float(q.get("priceImpactPct") or 0) > MAX_PRICE_IMPACT:
            log.info("price impact too high"); return None
        back = jup_quote(addr, WSOL, int(q["outAmount"]), SELL_SLIPPAGE_BPS[-1])  # can we sell it back?
        if not back:
            log.info("no sell route (possible honeypot)"); return None
        if int(back["outAmount"]) < lamports * (1 - MAX_ROUNDTRIP_LOSS):
            log.info("round-trip loss too high"); return None

        before = self.token_balance(addr)
        if before is None:
            return None
        sig = self._swap(q)
        if not sig:
            return None
        self._confirm(sig)
        after = self.token_balance(addr)
        if after is None or after[0] <= before[0]:
            log.warning("buy not confirmed by balance (sig %s) - check wallet manually", sig)
            return None
        qty = (after[0] - before[0]) / 10 ** after[1]
        spent = lamports / 1e9 * price
        return {"entry": spent / qty, "qty": qty, "usd": spent, "sig": sig}

    def sell(self, st, pos, price, fraction=1.0):
        addr = pos["addr"]
        bal = self.token_balance(addr)
        if bal is None:
            return None
        raw, _ = bal
        if raw <= 0:
            log.warning("%s: no token balance found, assuming already sold", pos["symbol"])
            return 0.0
        amount = raw if fraction >= 0.999 else int(raw * fraction)
        if amount <= 0:
            return None
        sol_before = self.sol_balance()
        for bps in SELL_SLIPPAGE_BPS:
            q = jup_quote(addr, WSOL, amount, bps)
            if not q:
                continue
            sig = self._swap(q)
            if not sig:
                continue
            self._confirm(sig)
            left = self.token_balance(addr)
            if left is not None and left[0] <= (raw - amount) + raw * 0.05:
                sol_after, p = self.sol_balance(), self.sol_price()
                if sol_before is not None and sol_after is not None and p:
                    return max(0.0, (sol_after - sol_before) / 1e9 * p)
                return int(q["outAmount"]) / 1e9 * (p or 0)
        return None  # all attempts failed; position stays open


# ------------------------- state / trading -------------------------
def load():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"cash": START_CASH, "positions": {}, "rejected": {}, "day": "", "pnl_today": 0.0,
            "sniper_done": [], "sniper_tries": {}}


def save(st):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(st, f, indent=1)
    os.replace(tmp, STATE_FILE)  # atomic: a crash can't corrupt the state file


def log_trade(action, pos, price, usd, pnl, reason):
    new = not os.path.exists(TRADES_FILE)
    with open(TRADES_FILE, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["time", "action", "chain", "symbol", "address", "price", "usd", "pnl", "reason"])
        w.writerow([datetime.now(timezone.utc).isoformat(timespec="seconds"), action, pos["chain"],
                    pos["symbol"], pos["addr"], price, round(usd, 2), round(pnl, 2), reason])


def roll_day(st):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if st["day"] != today:
        st["day"], st["pnl_today"] = today, 0.0


def open_position(st, ex, chain, addr, pair, why, profile="scanner", usd=None, ovr=None):
    usd = min(usd or POSITION_USD, ex.available_usd(st))
    fill = ex.buy(st, chain, addr, pair, usd)
    if not fill:
        return False
    pos = {"chain": chain, "addr": addr, "symbol": pair["baseToken"]["symbol"], "entry": fill["entry"],
           "qty": fill["qty"], "qty0": fill["qty"], "usd": fill["usd"], "peak": fill["entry"],
           "last": float(pair["priceUsd"]), "opened": time.time(), "profile": profile, "hit": 0, "ovr": ovr or {},
           "liq0": (pair.get("liquidity") or {}).get("usd") or 0, "misses": 0}
    st["positions"][f"{chain}:{addr}"] = pos
    log_trade("BUY", pos, fill["entry"], fill["usd"], 0, why)
    log.info("BUY  %-10s %s @ %.8g ($%.2f) %s", pos["symbol"], chain, fill["entry"], fill["usd"], why)
    return True


def close_position(st, ex, key, price, reason, fraction=1.0):
    """Sell `fraction` of what is currently held. Returns True if the sale went through."""
    pos = st["positions"][key]
    proceeds = ex.sell(st, pos, price, fraction)
    if proceeds is None:
        pos["sell_fails"] = pos.get("sell_fails", 0) + 1
        pos["next_try"] = time.time() + 60 * min(pos["sell_fails"], 10)
        log.warning("SELL FAILED %s (attempt %d) - will retry. Check your wallet if this persists.",
                    pos["symbol"], pos["sell_fails"])
        return False
    cost = pos["usd"] * fraction
    pnl = proceeds - cost
    st["pnl_today"] += pnl
    log_trade("SELL" if fraction >= 0.999 else "SELL_PART", pos, price, proceeds, pnl, reason)
    log.info("SELL %-10s %.0f%% pnl $%+.2f (%s)", pos["symbol"], fraction * 100, pnl, reason)
    if fraction >= 0.999:
        del st["positions"][key]
    else:
        pos["qty"] *= 1 - fraction
        pos["usd"] -= cost
        pos["sell_fails"], pos["next_try"] = 0, 0
    return True


def monitor(st, ex):
    if os.path.exists("SELL_ALL"):
        for key in list(st["positions"]):
            close_position(st, ex, key, st["positions"][key]["last"], "SELL_ALL file")
        if not st["positions"]:
            os.remove("SELL_ALL")
        return
    for key, pos in list(st["positions"].items()):
        if pos.get("next_try", 0) > time.time():
            continue
        pair = best_pair(pos["chain"], pos["addr"])
        if pair is API_ERR:  # network blip: do nothing, never count as a rug
            continue
        if pair is None:
            pos["misses"] += 1
            if pos["misses"] >= PAIR_MISS_LIMIT:
                close_position(st, ex, key, 0.0, "pair disappeared (assumed rug)")
            continue
        pos["misses"] = 0
        price = float(pair["priceUsd"])
        pos["last"] = price
        pos["peak"] = max(pos["peak"], price)
        name = PROFILE_ALIAS.get(pos.get("profile"), pos.get("profile"))
        prof = {**PROFILES.get(name, PROFILES["scanner"]), **pos.get("ovr", {})}  # per-token tp/sl win
        mult = price / pos["entry"]
        liq = (pair.get("liquidity") or {}).get("usd") or 0
        held_h = (time.time() - pos["opened"]) / 3600

        # 1) profit targets: partial sells leave the rest running
        hit, targets = pos.get("hit", 0), prof["targets"]
        if hit < len(targets) and mult >= targets[hit][0]:
            frac = min(1.0, targets[hit][1] * pos.get("qty0", pos["qty"]) / pos["qty"])
            if close_position(st, ex, key, price, f"take profit {targets[hit][0]:g}x", fraction=frac):
                if key in st["positions"]:
                    st["positions"][key]["hit"] = hit + 1
            continue

        # 2) protective exits: sell everything
        reason = None
        if prof["stop_loss"] is not None and mult - 1 <= -prof["stop_loss"]:
            reason = "stop loss"
        elif (prof["trail_arm"] is not None and pos["peak"] / pos["entry"] - 1 >= prof["trail_arm"]
              and price <= pos["peak"] * (1 - prof["trail_pct"])):
            reason = "trailing stop"
        elif prof["liq_drop_exit"] is not None and pos["liq0"] and liq < pos["liq0"] * (1 - prof["liq_drop_exit"]):
            reason = "liquidity drain"
        elif prof["max_hold_h"] is not None and held_h >= prof["max_hold_h"]:
            reason = "time stop"
        if reason:
            close_position(st, ex, key, price, reason)


def scan(st, ex):
    roll_day(st)
    if not SCANNER_ENABLED:
        return
    if os.path.exists("STOP"):
        log.info("STOP file present: no new buys.")
        return
    if st["pnl_today"] <= -MAX_DAILY_LOSS:
        log.info("Daily loss limit hit, not opening new trades.")
        return
    now = time.time()
    st["rejected"] = {k: t for k, t in st["rejected"].items() if now - t < RECHECK_AFTER_H * 3600}
    found = []
    for chain, addr in candidates():
        key = f"{chain}:{addr}"
        if key in st["positions"] or key in st["rejected"]:
            continue
        pair = best_pair(chain, addr)
        if pair is API_ERR:
            continue
        ok, why, score = market_check(pair) if pair else (False, "no pair", 0)
        if not ok:
            st["rejected"][key] = now
            log.debug("skip %s: %s", key, why)
            continue
        ok, sec = security_check(chain, addr)
        if not ok:
            if sec != "no security data":  # API hiccup: retry next scan instead of blacklisting
                st["rejected"][key] = now
            log.info("REJECT %s (%s): %s", pair["baseToken"]["symbol"], chain, sec)
            continue
        found.append((score, chain, addr, pair, why))
        time.sleep(0.3)
    for score, chain, addr, pair, why in sorted(found, key=lambda x: -x[0]):
        if len(st["positions"]) >= MAX_POSITIONS or ex.available_usd(st) < POSITION_USD:
            break
        if not open_position(st, ex, chain, addr, pair, why):
            st["rejected"][f"{chain}:{addr}"] = time.time()
    equity = ex.available_usd(st) + sum(p["qty"] * p["last"] for p in st["positions"].values())
    log.info("Equity ~$%.2f | open %d | pnl today $%+.2f", equity, len(st["positions"]), st["pnl_today"])


SNIPER_TEMPLATE = """# SNIPER LIST - the bot checks this file every few seconds. Edit it while the bot runs.
# One token per line:    CONTRACT_ADDRESS  [dollars]  [tp=10]  [sell=50]  [sl=30]  [force]
#   just the address -> buys SNIPER_BUY_USD ($3 by default) and uses your SNIPER SETTINGS sell rules
#   dollars          -> buy amount for this token, e.g.   <ADDRESS> 10
#   tp=10            -> auto-sell at 10x      sell=50 -> sell 50% of the position at that target
#   sl=30            -> auto-sell everything if the token drops 30% from your entry price
#   force            -> skip the rug check for this token (not recommended)
# If the token has no market yet, the bot waits and buys as soon as one appears.
# Handled lines are marked DONE / REJECTED / FAILED / INVALID automatically.
# Other chains (paper mode only): prefix with the chain, e.g.   base:0x... 5
"""


def ensure_sniper_file():
    if not os.path.exists(SNIPER_FILE):
        with open(SNIPER_FILE, "w") as f:
            f.write(SNIPER_TEMPLATE)


def parse_line(line):
    """'[chain:]ADDRESS [usd] [tp=N] [sell=N] [sl=N] [force]' -> (chain, addr, usd, force, overrides)."""
    toks = line.split()
    head = toks[0]
    chain, addr = head.split(":", 1) if ":" in head else ("solana", head)
    chain = chain.lower()
    if chain not in CHAINS:
        raise ValueError(f"unsupported chain '{chain}'")
    if chain == "solana":
        if addr.startswith("0x"):
            raise ValueError("EVM address needs a chain prefix like base:0x...")
        if not 32 <= len(addr) <= 44 or not addr.isalnum():
            raise ValueError("not a valid Solana address")
    elif not (addr.startswith("0x") and len(addr) == 42):
        raise ValueError("not a valid EVM address")
    usd, force, opts = SNIPER_BUY_USD, False, {}
    for t in toks[1:]:
        t = t.lower()
        if t == "force":
            force = True
        elif "=" in t:
            k, v = t.split("=", 1)
            if k not in ("tp", "sell", "sl"):
                raise ValueError(f"unknown option '{k}'")
            opts[k] = float(v.rstrip("x%"))
        else:
            usd = float(t.lstrip("$"))
    if usd <= 0:
        raise ValueError("amount must be above 0")
    ovr = {}
    if "tp" in opts or "sell" in opts:
        base = SNIPER_TARGETS[0] if SNIPER_TARGETS else (10.0, 0.5)
        tp, sell = opts.get("tp", base[0]), opts.get("sell", base[1] * 100)
        if tp <= 1:
            raise ValueError("tp must be above 1 (tp=10 means 10x)")
        if not 0 < sell <= 100:
            raise ValueError("sell must be between 1 and 100 (percent)")
        ovr["targets"] = [(tp, sell / 100)]
    if "sl" in opts:
        if not 0 < opts["sl"] < 100:
            raise ValueError("sl must be between 0 and 100 (percent)")
        ovr["stop_loss"] = opts["sl"] / 100
    return chain, addr, usd, force, ovr


def sniper_buys(st, ex):
    """Buys every active line in sniper_list.txt, then comments the line out so it never repeats."""
    if not os.path.exists(SNIPER_FILE):
        return
    with open(SNIPER_FILE) as f:
        original = f.read()
    lines = original.splitlines()
    active = {l.strip() for l in lines if l.strip() and not l.strip().startswith("#")}
    if not active:
        return
    st["sniper_done"] = [l for l in st.get("sniper_done", []) if l in active]  # guards double-buys
    tries = st.setdefault("sniper_tries", {})
    stamp = datetime.now(timezone.utc).strftime("%m-%d %H:%M")
    blocked = os.path.exists("STOP")
    out = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            out.append(raw)
            continue
        if line in st["sniper_done"]:
            out.append(f"# DONE {stamp} {line}")
            continue
        try:
            chain, addr, usd, force, ovr = parse_line(line)
        except ValueError as e:
            out.append(f"# INVALID ({e}) {line}")
            continue
        if LIVE and chain != "solana":
            out.append(f"# INVALID (live mode is Solana only) {line}")
            continue
        key = f"{chain}:{addr}"
        if key in st["positions"]:
            out.append(f"# SKIPPED (already holding it) {line}")
            continue
        pair = best_pair(chain, addr)
        if blocked or pair in (API_ERR, None) or ex.available_usd(st) < usd:
            out.append(raw)  # no market yet / API down / not enough funds / STOP file: keep and retry
            continue
        if SNIPER_SECURITY_CHECK and not force:
            ok, why = security_check(chain, addr)
            if not ok and why == "no security data":
                out.append(raw)
                continue
            if not ok:
                log.info("SNIPER REJECT %s: %s", pair["baseToken"]["symbol"], why)
                out.append(f"# REJECTED ({why}); to override add 'force' to: {line}")
                continue
        if open_position(st, ex, chain, addr, pair, "sniper", "sniper", usd, ovr):
            st["sniper_done"].append(line)
            out.append(f"# DONE {stamp} {line}")
        else:
            tries[key] = tries.get(key, 0) + 1
            out.append(f"# FAILED (no safe route / price impact) {line}" if tries[key] >= 3 else raw)
    new = "\n".join(out)
    if new != "\n".join(lines):
        with open(SNIPER_FILE) as f:
            if f.read() != original:  # you edited it mid-cycle: leave it, handle next cycle
                return
        with open(SNIPER_FILE + ".tmp", "w") as f:
            f.write(new + "\n")
        os.replace(SNIPER_FILE + ".tmp", SNIPER_FILE)


def main_headless():
    global CHAINS, POSITION_USD, MAX_POSITIONS, MAX_DAILY_LOSS, STATE_FILE, TRADES_FILE
    if LIVE:
        if os.environ.get("BOT_CONFIRM") != CONFIRM_PHRASE:
            sys.exit(f"LIVE needs BOT_CONFIRM={CONFIRM_PHRASE}")
        CHAINS = {"solana": None}
        POSITION_USD, MAX_POSITIONS, MAX_DAILY_LOSS = LIVE_POSITION_USD, LIVE_MAX_POSITIONS, LIVE_MAX_DAILY_LOSS
        STATE_FILE, TRADES_FILE = "state_live.json", "trades_live.csv"
        ex = LiveSolana()
        bal = ex.sol_balance()
        print(f"\nLIVE MODE | wallet {ex.pub} | balance {(bal or 0) / 1e9:.4f} SOL")
        print(f"Per trade ${POSITION_USD}, max {MAX_POSITIONS} positions, daily loss limit ${MAX_DAILY_LOSS}.")
        if input("Type START to trade REAL money: ").strip() != "START":
            sys.exit("Aborted.")
    else:
        ex = Paper()
        log.info("PAPER mode (no real money).")
    ensure_sniper_file()
    st, last_scan, last_mon = load(), 0, 0
    log.info("WILDLOGIC BOT running. Sniper list: %s (default buy $%.2f). Scanner %s.",
             SNIPER_FILE, SNIPER_BUY_USD, "ON" if SCANNER_ENABLED else "OFF")
    log.info("Running. Ctrl+C to stop (open positions stay open; use SELL_ALL file to exit them).")
    try:
        while True:
            try:
                if time.time() - last_mon >= MONITOR_EVERY:
                    monitor(st, ex)
                    last_mon = time.time()
                sniper_buys(st, ex)
                if time.time() - last_scan >= SCAN_EVERY:
                    scan(st, ex)
                    last_scan = time.time()
                save(st)
            except KeyboardInterrupt:
                raise
            except Exception:
                log.exception("loop error (continuing)")
                time.sleep(10)
            time.sleep(SNIPER_POLL_SEC)
    except KeyboardInterrupt:
        save(st)
        log.info("Stopped. State saved.")




# ======================================================================
# CONTROL PANEL (buttons)
# ======================================================================
bot = sys.modules[__name__]   # the panel code below reads/sets the bot settings above through `bot.`

HOST = os.environ.get("PANEL_HOST", "127.0.0.1")
PORT = int(os.environ.get("PANEL_PORT", "8080"))
KEY = os.environ.get("PANEL_KEY") or secrets.token_urlsafe(16)
WITHDRAW_TO = os.environ.get("WITHDRAW_TO", "").strip()
CFG_FILE = "panel_settings.json"
MIN_WITHDRAW_LAMPORTS = 1_000_000
TX_FEE_LAMPORTS = 10_000

CFG = dict(sniper_on=False, scanner_on=False, buy=3.0, tp=10.0, sell=50.0, sl=0.0)  # sl 0 = off
ST = {}
Q = queue.Queue()


# ------------------------- settings -------------------------
def load_cfg():
    if os.path.exists(CFG_FILE):
        try:
            with open(CFG_FILE) as f:
                CFG.update(json.load(f))
        except Exception:
            pass


def apply_cfg():
    bot.SNIPER_BUY_USD = CFG["buy"]
    bot.SNIPER_TARGETS = [(CFG["tp"], CFG["sell"] / 100)]
    bot.SNIPER_STOP_LOSS = CFG["sl"] / 100 if CFG["sl"] else None
    bot.PROFILES["sniper"].update(targets=bot.SNIPER_TARGETS, stop_loss=bot.SNIPER_STOP_LOSS)
    bot.SCANNER_ENABLED = CFG["scanner_on"]
    with open(CFG_FILE, "w") as f:
        json.dump(CFG, f)


# ------------------------- data for the page -------------------------
def positions():
    for _ in range(3):
        try:
            return list(ST["st"]["positions"].items())
        except RuntimeError:
            time.sleep(0.2)
    return []


def balance():
    t, sol, price = ST.get("balc", (0, None, 0))
    if time.time() - t > 15:
        ex = ST["ex"]
        sol, price = ex.sol_balance(), ex.sol_price()
        ST["balc"] = (time.time(), sol, price)
    return sol, price


def sniper_lines():
    if not os.path.exists(bot.SNIPER_FILE):
        return [], []
    with open(bot.SNIPER_FILE) as f:
        lines = [l.strip() for l in f if l.strip()]
    waiting = [l for l in lines if not l.startswith("#")]
    recent = [l[:100] for l in lines if l.startswith("# ")
              and l.split()[1:2] and l.split()[1] in ("DONE", "REJECTED", "FAILED", "INVALID", "SKIPPED")][-6:]
    return waiting, recent


def recent_trades():
    if not os.path.exists(bot.TRADES_FILE):
        return []
    with open(bot.TRADES_FILE) as f:
        rows = list(csv.DictReader(f))[-8:]
    return [dict(time=r["time"][11:19], action=r["action"], symbol=r["symbol"], usd=r["usd"], pnl=r["pnl"],
                 reason=r["reason"]) for r in reversed(rows)]


def state():
    st, ex = ST["st"], ST["ex"]
    ps = []
    for k, p in positions():
        val = p["qty"] * p["last"]
        ps.append(dict(addr=p["addr"][:16], symbol=p["symbol"], mult=p["last"] / p["entry"] if p["entry"] else 0,
                       value=val, pnl=val - p["usd"]))
    out = dict(live=bot.LIVE, cfg=CFG, positions=ps, pnl_today=st["pnl_today"], wd_locked=WITHDRAW_TO or None,
               trades=recent_trades())
    out["waiting"], out["recent"] = sniper_lines()
    if bot.LIVE:
        sol, price = balance()
        out.update(address=ex.pub, sol=(sol / 1e9 if sol is not None else None), sol_usd=price)
    else:
        out["cash"] = st["cash"]
    return out


# ------------------------- withdraw -------------------------
def valid_addr(s):
    try:
        from solders.pubkey import Pubkey
        Pubkey.from_string(s)
        return 32 <= len(s) <= 44
    except Exception:
        return False


def send_sol(dest, lamports):
    from solders.hash import Hash
    from solders.pubkey import Pubkey
    from solders.system_program import TransferParams, transfer
    from solders.transaction import Transaction
    ex = ST["ex"]
    r = bot.rpc("getLatestBlockhash", [{"commitment": "finalized"}])
    if not r:
        return None
    ix = transfer(TransferParams(from_pubkey=ex.kp.pubkey(), to_pubkey=Pubkey.from_string(dest), lamports=lamports))
    tx = Transaction.new_signed_with_payer([ix], ex.kp.pubkey(), [ex.kp], Hash.from_string(r["value"]["blockhash"]))
    raw = base64.b64encode(bytes(tx)).decode()
    return bot.rpc("sendTransaction", [raw, {"encoding": "base64", "preflightCommitment": "confirmed"}])


def withdraw(d):
    if not bot.LIVE:
        return {"msg": "Paper mode: no real funds to withdraw."}
    dest = WITHDRAW_TO or str(d.get("dest", "")).strip()
    if not valid_addr(dest):
        return {"msg": "Invalid destination address."}
    ex = ST["ex"]
    if dest == ex.pub:
        return {"msg": "That is the bot wallet itself."}
    pct = float(d.get("pct", 0))
    if not 0 < pct <= 100:
        return {"msg": "Bad percentage."}
    bal = ex.sol_balance()
    lamports = int(((bal or 0) - TX_FEE_LAMPORTS) * pct / 100)
    if lamports < MIN_WITHDRAW_LAMPORTS:
        return {"msg": "Amount too small or balance unreadable (minimum about 0.001 SOL)."}
    sig = send_sol(dest, lamports)
    if not sig:
        return {"msg": "Send failed. Nothing was sent. Check balance/RPC and try again."}
    ok = ex._confirm(sig)
    ST.pop("balc", None)
    return {"msg": f"{'Sent' if ok else 'Submitted (not confirmed yet)'} {lamports / 1e9:.4f} SOL. https://solscan.io/tx/{sig}"}


# ------------------------- actions from the buttons -------------------------
def act(d):
    a = d.get("a")
    if a == "tog":
        k = "sniper_on" if d.get("w") == "sniper" else "scanner_on"
        CFG[k] = not CFG[k]
        apply_cfg()
        return {"msg": f"{k.split('_')[0].title()} {'ON' if CFG[k] else 'OFF'}"}
    if a == "set":
        k, v = d.get("k"), float(d.get("v"))
        ok = {"buy": v > 0, "tp": v > 1, "sell": 0 < v <= 100, "sl": 0 <= v < 100}.get(k, False)
        if not ok:
            return {"msg": "Invalid value."}
        CFG[k] = v
        apply_cfg()
        return {"msg": "Saved."}
    if a == "add":
        line = str(d.get("line", "")).strip()
        try:
            chain, addr, usd, force, ovr = bot.parse_line(line)
            if bot.LIVE and chain != "solana":
                return {"msg": "Live mode is Solana only."}
        except Exception as e:
            return {"msg": f"Not a valid token line: {e}"}
        Q.put(("add", line))
        return {"msg": f"Queued ${usd:g} buy." + ("" if CFG["sniper_on"] else " Sniper is OFF, so it waits until you turn it ON.")}
    if a == "sell":
        key = next((k for k, p in positions() if p["addr"].startswith(str(d.get("addr", "")))), None)
        if not key:
            return {"msg": "Position not found."}
        Q.put(("sell", key, float(d.get("pct", 100)) / 100))
        return {"msg": "Sell queued."}
    if a == "sell_all":
        Q.put(("sell_all",))
        return {"msg": "Sell-all queued."}
    if a == "wd":
        return withdraw(d)
    return {"msg": "Unknown action."}


# ------------------------- trading thread -------------------------
def add_line(line):
    bot.ensure_sniper_file()
    with open(bot.SNIPER_FILE) as f:
        active = {l.strip() for l in f if l.strip() and not l.strip().startswith("#")}
    if line not in active:
        with open(bot.SNIPER_FILE, "a") as f:
            f.write(line + "\n")


def drain(st, ex):
    while True:
        try:
            item = Q.get_nowait()
        except queue.Empty:
            return
        if item[0] == "sell":
            pos = st["positions"].get(item[1])
            if pos:
                bot.close_position(st, ex, item[1], pos["last"], "manual (panel)", fraction=item[2])
        elif item[0] == "sell_all":
            open("SELL_ALL", "w").close()
            ST["force_mon"] = True
        elif item[0] == "add":
            add_line(item[1])


def trade_loop(st, ex):
    last_scan = last_mon = 0
    while True:
        try:
            drain(st, ex)
            if ST.pop("force_mon", False) or time.time() - last_mon >= bot.MONITOR_EVERY:
                bot.monitor(st, ex)
                last_mon = time.time()
            if CFG["sniper_on"]:
                bot.sniper_buys(st, ex)
            if time.time() - last_scan >= bot.SCAN_EVERY:
                bot.scan(st, ex)
                last_scan = time.time()
            bot.save(st)
        except Exception:
            log.exception("loop error (continuing)")
            time.sleep(10)
        time.sleep(bot.SNIPER_POLL_SEC)


# ------------------------- web server -------------------------
PAGE = r"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WILDLOGIC</title><style>
body{font:15px system-ui;background:#111;color:#eee;margin:0;padding:12px;max-width:640px;margin:auto}
h2{font-size:15px;margin:18px 0 6px;color:#9ab}.card{background:#1b1b1f;border-radius:10px;padding:10px;margin-bottom:8px}
button{background:#2a2a33;color:#eee;border:0;border-radius:8px;padding:10px 12px;margin:3px 3px 3px 0;font-size:14px}
button.on{background:#1f6f43}button.sel{outline:2px solid #4a8}button.red{background:#7a2323}button.go{background:#2b5fa8}
input{background:#0d0d10;color:#eee;border:1px solid #333;border-radius:8px;padding:10px;width:100%;box-sizing:border-box;margin:3px 0}
code{word-break:break-all;font-size:13px}.pos{color:#6c6}.neg{color:#e66}.row{display:flex;justify-content:space-between;gap:8px}
#toast{position:fixed;bottom:12px;left:12px;right:12px;background:#333;padding:10px;border-radius:8px;display:none;word-break:break-all}
</style></head><body>
<div class="row"><b>WILDLOGIC <span id="mode"></span></b><span id="pnl"></span></div>
<h2>Bot</h2><div class="card"><button id="bSn"></button><button id="bSc"></button></div>
<h2>Wallet</h2><div class="card"><div id="bal"></div><div>Address: <code id="addr"></code></div>
<button onclick="copyAddr()">Copy address</button></div>
<h2>Positions</h2><div class="card" id="pos"></div>
<h2>Add token to sniper</h2><div class="card"><input id="tok" placeholder="ADDRESS  [dollars] [tp=10] [sell=50] [sl=30]">
<button class="go" onclick="addTok()">Add</button><div id="wait" style="margin-top:6px;font-size:13px"></div></div>
<h2>Settings</h2><div class="card" id="set"></div>
<h2>Withdraw SOL</h2><div class="card" id="wd"></div>
<h2>Recent trades</h2><div class="card" id="tr" style="font-size:13px"></div>
<div class="card"><button class="red" onclick="sellAll()">SELL ALL POSITIONS</button></div>
<div id="toast"></div>
<script>
const K=new URLSearchParams(location.search).get('k')||'';let S=null;
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(p,b){const r=await fetch(p,{method:b?'POST':'GET',headers:{'X-Key':K,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});
 if(r.status==401){document.body.innerHTML='Bad or missing key in the link.';throw 0}return r.json()}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',6000)}
async function act(a,x={}){const r=await api('/api/act',{a,...x});if(r.msg)toast(r.msg);refresh()}
function copyAddr(){navigator.clipboard&&navigator.clipboard.writeText(S.address||'');toast('Copied')}
function addTok(){const v=document.getElementById('tok').value.trim();if(v){act('add',{line:v});document.getElementById('tok').value=''}}
function sellAll(){if(confirm('Sell EVERY open position?'))act('sell_all')}
function wd(p){const d=S.wd_locked||document.getElementById('wdto').value.trim();
 if(confirm('Send '+p+'% of SOL to\n'+d+'\n\nThis cannot be undone.'))act('wd',{pct:p,dest:d})}
function presets(label,k,vals,f){return '<div>'+label+' '+vals.map(v=>`<button class="${Math.abs(S.cfg[k]-v)<1e-9?'sel':''}" onclick="act('set',{k:'${k}',v:${v}})">${f(v)}</button>`).join('')+'</div>'}
function render(){const c=S.cfg;
 mode.textContent=S.live?'LIVE':'PAPER';pnl.innerHTML=`today <span class="${S.pnl_today>=0?'pos':'neg'}">$${S.pnl_today.toFixed(2)}</span>`;
 bSn.textContent='Sniper: '+(c.sniper_on?'ON':'OFF');bSn.className=c.sniper_on?'on':'';bSn.onclick=()=>act('tog',{w:'sniper'});
 bSc.textContent='Scanner: '+(c.scanner_on?'ON':'OFF');bSc.className=c.scanner_on?'on':'';bSc.onclick=()=>act('tog',{w:'scanner'});
 bal.textContent=S.live?(S.sol==null?'Balance unavailable':`${S.sol.toFixed(4)} SOL (~$${(S.sol*S.sol_usd).toFixed(2)})`):`Paper cash $${S.cash.toFixed(2)}`;
 addr.textContent=S.live?S.address:'(paper mode, no wallet)';
 pos.innerHTML=S.positions.length?S.positions.map(p=>`<div class="row"><span><b>${e(p.symbol)}</b> ${p.mult.toFixed(2)}x $${p.value.toFixed(2)} <span class="${p.pnl>=0?'pos':'neg'}">${p.pnl>=0?'+':''}${p.pnl.toFixed(2)}</span></span>
  <span><button onclick="act('sell',{addr:'${e(p.addr)}',pct:50})">50%</button><button class="red" onclick="act('sell',{addr:'${e(p.addr)}',pct:100})">Sell</button></span></div>`).join(''):'No open positions';
 wait.innerHTML=(S.waiting.length?'<b>Waiting:</b><br>'+S.waiting.map(l=>'<code>'+e(l)+'</code>').join('<br>')+'<br>':'')+S.recent.map(e).join('<br>');
 const f=document.activeElement&&document.activeElement.id; 
 set.innerHTML=presets('Buy size','buy',[1,3,5,10,25],v=>'$'+v)+presets('Sell at','tp',[2,3,5,10,20],v=>v+'x')+presets('Sell how much','sell',[25,50,75,100],v=>v+'%')+presets('Stop loss','sl',[0,20,30,50],v=>v?v+'%':'off');
 if(!document.getElementById('wdto')||wd_.dataset.k!=String(S.live)+S.wd_locked){wd_.dataset.k=String(S.live)+S.wd_locked;
  wd_.innerHTML=!S.live?'Paper mode: nothing to withdraw.':(S.wd_locked?'To (locked): <code>'+e(S.wd_locked)+'</code>':'<input id="wdto" placeholder="Destination Solana address">')+
  '<div>Only SOL is sent. Sell positions first.</div>'+[25,50,75,100].map(p=>`<button class="go" onclick="wd(${p})">${p}%</button>`).join('')}
 tr.innerHTML=S.trades.map(t=>`${e(t.time)} ${e(t.action)} ${e(t.symbol)} $${e(t.usd)} ${e(t.reason)}`).join('<br>')||'none yet'}
const wd_=document.getElementById('wd');
async function refresh(){try{S=await api('/api/state');render()}catch(x){}}
refresh();setInterval(()=>{if(document.activeElement.tagName!='INPUT')refresh()},5000);
</script></body></html>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _ok(self):
        return hmac.compare_digest(self.headers.get("X-Key", ""), KEY)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            return self._send(200, PAGE, "text/html; charset=utf-8")
        if path == "/api/state":
            if not self._ok():
                return self._send(401, "{}")
            try:
                return self._send(200, json.dumps(state()))
            except Exception:
                log.exception("state error")
                return self._send(500, "{}")
        self._send(404, "{}")

    def do_POST(self):
        if self.path != "/api/act" or not self._ok():
            return self._send(401, "{}")
        try:
            n = int(self.headers.get("Content-Length", 0))
            return self._send(200, json.dumps(act(json.loads(self.rfile.read(n) or b"{}"))))
        except Exception as e:
            log.exception("action error")
            return self._send(200, json.dumps({"msg": f"Error: {e}"}))


def setup_bot():
    if bot.LIVE:
        if os.environ.get("BOT_CONFIRM") != bot.CONFIRM_PHRASE:
            sys.exit(f"LIVE needs BOT_CONFIRM={bot.CONFIRM_PHRASE}")
        bot.CHAINS = {"solana": None}
        bot.POSITION_USD, bot.MAX_POSITIONS, bot.MAX_DAILY_LOSS = (
            bot.LIVE_POSITION_USD, bot.LIVE_MAX_POSITIONS, bot.LIVE_MAX_DAILY_LOSS)
        bot.STATE_FILE, bot.TRADES_FILE = "state_live.json", "trades_live.csv"
        return bot.LiveSolana()
    return bot.Paper()


def run_panel():
    load_cfg()
    apply_cfg()
    ex = setup_bot()
    ST["ex"], ST["st"] = ex, bot.load()
    bot.ensure_sniper_file()
    threading.Thread(target=trade_loop, args=(ST["st"], ex), daemon=True).start()
    print(f"\n{'LIVE' if bot.LIVE else 'PAPER'} mode. Sniper and Scanner start OFF.\n"
          f"Open this link:  http://{HOST}:{PORT}/?k={KEY}\n")
    if not os.environ.get("PANEL_NO_BROWSER"):
        threading.Timer(1.5, lambda: webbrowser.open(f"http://{HOST}:{PORT}/?k={KEY}")).start()
    try:
        ThreadingHTTPServer((HOST, PORT), H).serve_forever()
    except KeyboardInterrupt:
        bot.save(ST["st"])
        print("Stopped. State saved.")




if __name__ == "__main__":
    if "--new-wallet" in sys.argv:
        new_wallet()
    elif "--address" in sys.argv:
        print(load_keypair().pubkey())
    elif "--headless" in sys.argv:
        main_headless()
    else:
        run_panel()
