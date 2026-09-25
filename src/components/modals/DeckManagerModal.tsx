import React from 'react';
import { LogicCard } from '../../types/game';
import { SHOP_CARDS_CATALOG } from '../../game/engine';
import { Layers, Zap, Plus, X, Sparkles, Check, ArrowUpRight } from 'lucide-react';
import { sound } from '../../utils/audio';

interface DeckManagerModalProps {
  deck: LogicCard[];
  scrap: number;
  onBuyCard: (card: LogicCard, cost: number) => void;
  onUpgradeCard: (cardId: string, cost: number) => void;
  onClose: () => void;
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  deck,
  scrap,
  onBuyCard,
  onUpgradeCard,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-emerald-500/30 bg-[#040907] p-5 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg tracking-wider text-slate-100">
                LOGIC RIG & SUBROUTINE DECK
              </h2>
              <p className="text-xs font-mono text-emerald-400">
                {deck.length} ACTIVE SUBROUTINES IN FIRMWARE MEMORY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#081710] border border-amber-500/40 rounded-lg px-3 py-1 text-xs font-mono text-amber-300 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{scrap} SCRAP AVAILABLE</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-emerald-900/60 hover:bg-emerald-900/40 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs: Current Deck & Fabrication / Market */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Current Subroutines */}
          <div>
            <h3 className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>LOADED LOGIC SUBROUTINES ({deck.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {deck.map((card, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="rounded-xl border border-emerald-900/60 bg-[#06120c] p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold">
                        {card.type}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold">
                        {card.cost} LP
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-xs text-slate-100 mb-1">
                      {card.name}
                    </h4>

                    <p className="text-[10px] font-sans text-slate-300 leading-tight mb-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-400 flex items-center justify-between">
                    <span>RANGE: {card.range > 0 ? `${card.range} T` : 'SELF'}</span>
                    <span className="text-emerald-400">INSTALLED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subroutine Fabrication & Shop */}
          <div className="pt-4 border-t border-emerald-950">
            <h3 className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>FABRICATE EXPERIMENTAL LOGIC CHIPS</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SHOP_CARDS_CATALOG.map((card) => {
                const cost = card.rarity === 'prototype' ? 50 : 30;
                const canAfford = scrap >= cost;

                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-amber-900/60 bg-[#0d140e] p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono uppercase text-amber-400 font-bold">
                          {card.rarity} {card.type}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 border border-amber-400 text-amber-300 font-bold">
                          {card.cost} LP
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-xs text-slate-100 mb-1">
                        {card.name}
                      </h4>

                      <p className="text-[10px] font-sans text-slate-300 leading-tight mb-3">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> {cost} SCRAP
                      </span>

                      <button
                        onClick={() => {
                          if (canAfford) {
                            sound.playHack();
                            onBuyCard(card, cost);
                          } else {
                            sound.playAlarm();
                          }
                        }}
                        disabled={!canAfford}
                        className={`
                          flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition cursor-pointer
                          ${canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }
                        `}
                      >
                        <Plus className="w-3 h-3" />
                        <span>FABRICATE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-emerald-950 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Scrap is salvaged by defeating predators and clearing expedition nodes.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold transition cursor-pointer"
          >
            CONFIRM & RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
