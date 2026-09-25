/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  GameState, 
  LogicCard, 
  CompanionId, 
  EnemyUnit, 
  GridTile, 
  DeployableUnit,
  ExpeditionNode,
  WeatherType
} from './types/game';
import { 
  createInitialGameState, 
  drawCards, 
  generateProceduralGrid, 
  generateEnemiesForSector, 
  generateExpeditionMap,
  COMPANIONS_CATALOG 
} from './game/engine';
import { TacticalGrid } from './components/grid/TacticalGrid';
import { CardDock } from './components/cards/CardDock';
import { TopHeader } from './components/hud/TopHeader';
import { CompanionPanel } from './components/companion/CompanionPanel';
import { CombatTerminal } from './components/terminal/CombatTerminal';
import { ExpeditionMapModal } from './components/modals/ExpeditionMapModal';
import { DeckManagerModal } from './components/modals/DeckManagerModal';
import { CodexModal } from './components/modals/CodexModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { sound } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('cheetah'));
  const [selectedEntity, setSelectedEntity] = useState<'player' | 'companion' | null>('player');
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  // Sync Audio Mute state
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Add floating combat text
  const addFloatingText = useCallback((x: number, y: number, text: string, color: string = '#34d399') => {
    const id = `ft_${Date.now()}_${Math.random()}`;
    setGameState((prev) => ({
      ...prev,
      floatingTexts: [...prev.floatingTexts, { id, x, y, text, color, timestamp: Date.now() }],
    }));

    setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        floatingTexts: prev.floatingTexts.filter((ft) => ft.id !== id),
      }));
    }, 1200);
  }, []);

  // Add terminal combat log
  const addLog = useCallback(
    (sender: GameState['combatLogs'][0]['sender'], text: string, type: GameState['combatLogs'][0]['type'] = 'info') => {
      const now = new Date();
      const time = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const entry = {
        id: `log_${Date.now()}_${Math.random()}`,
        turn: gameState.turnNumber,
        sender,
        text,
        type,
        time,
      };
      setGameState((prev) => ({
        ...prev,
        combatLogs: [...prev.combatLogs.slice(-40), entry],
      }));
    },
    [gameState.turnNumber]
  );

  // Check victory / defeat conditions after state changes
  useEffect(() => {
    if (gameState.player.currentHp <= 0 && !gameState.gameOver) {
      sound.playDefeat();
      setGameState((prev) => ({ ...prev, gameOver: true, gameWon: false }));
      addLog('SYSTEM', 'CRITICAL FAILURE: Operator vital signs terminated.', 'alert');
    }
  }, [gameState.player.currentHp, gameState.gameOver, addLog]);

  // Player Move Handler
  const handlePlayerMove = (targetX: number, targetY: number) => {
    if (gameState.player.currentLogic < 1 || isProcessingTurn) return;

    // Check hazards on target tile
    const targetTile = gameState.grid[targetY][targetX];
    let damageTaken = 0;
    if (targetTile.type === 'ion_spore') damageTaken += 2;
    if (targetTile.type === 'plasma_vent') damageTaken += 3;

    sound.playMove();

    setGameState((prev) => {
      const newHp = Math.max(0, prev.player.currentHp - damageTaken);
      const newLogic = prev.player.currentLogic - 1;

      return {
        ...prev,
        player: {
          ...prev.player,
          x: targetX,
          y: targetY,
          currentHp: newHp,
          currentLogic: newLogic,
        },
      };
    });

    if (damageTaken > 0) {
      sound.playExplosion();
      addFloatingText(targetX, targetY, `-${damageTaken} [HAZARD]`, '#f43f5e');
      addLog('HAZARD', `Operator triggered ${targetTile.type.replace('_', ' ')}: -${damageTaken} HP!`, 'alert');
    } else {
      addLog('OPERATOR', `Tactical repositioning to coordinates (${targetX}, ${targetY}). [-1 LP]`, 'info');
    }
  };

  // Companion Move Handler
  const handleCompanionMove = (targetX: number, targetY: number) => {
    if (!gameState.companion || isProcessingTurn) return;

    sound.playCompanionChuff();

    setGameState((prev) => ({
      ...prev,
      companion: prev.companion ? { ...prev.companion, x: targetX, y: targetY } : null,
    }));

    addLog('COMPANION', `${gameState.companion.stats.name} repositioned to flank (${targetX}, ${targetY}).`, 'info');
  };

  // Companion Special Tactic Action
  const handleCompanionSpecial = () => {
    if (!gameState.companion || gameState.player.currentLogic < 1 || isProcessingTurn) return;

    const comp = gameState.companion;
    sound.playShield();

    setGameState((prev) => {
      let updatedCompanion = { ...prev.companion! };
      let newLogic = prev.player.currentLogic - 1;

      if (comp.stats.id === 'pangolin') {
        // Fortress Curl: Gains 8 shields and taunts adjacent beasts
        updatedCompanion.shields = (updatedCompanion.shields || 0) + 8;
        updatedCompanion.isCurled = true;
        addFloatingText(comp.x, comp.y, '+8 SHIELD [FORTRESS]', '#06b6d4');
        addLog('COMPANION', `${comp.stats.name} engaged Fortress Carapace: +8 Shields.`, 'heal');
      } else if (comp.stats.id === 'falcon') {
        // Aerial Target Mark: Mark all stealthed enemies & reveal intent
        updatedCompanion.isMarking = true;
        const revealedEnemies = prev.enemies.map(e => ({ ...e, isStealthed: false }));
        addFloatingText(comp.x, comp.y, 'RECON SWEEP!', '#10b981');
        addLog('COMPANION', `${comp.stats.name} conducted aerial scan: all stealthed predators revealed!`, 'info');
        return {
          ...prev,
          enemies: revealedEnemies,
          companion: updatedCompanion,
          player: { ...prev.player, currentLogic: newLogic },
        };
      } else {
        // Volt Cheetah: Sprint Surge: free move
        addFloatingText(comp.x, comp.y, 'OVERCLOCK SPRINT!', '#fbbf24');
        addLog('COMPANION', `${comp.stats.name} activated Overclock Reflexes. Ready for flank!`, 'info');
      }

      return {
        ...prev,
        companion: updatedCompanion,
        player: { ...prev.player, currentLogic: newLogic },
      };
    });
  };

  // Card Execution on Target Tile
  const handleTileClick = (targetX: number, targetY: number) => {
    const card = gameState.selectedCard;
    if (!card || isProcessingTurn) return;

    if (card.cost > gameState.player.currentLogic) {
      sound.playAlarm();
      return;
    }

    // Deduct cost and remove card from hand to discard
    const newLogic = gameState.player.currentLogic - card.cost;
    const newHand = gameState.hand.filter((c) => c.id !== card.id);
    const newDiscard = [...gameState.discard, card];

    // Find enemy or unit on tile
    const targetEnemy = gameState.enemies.find((e) => e.x === targetX && e.y === targetY && e.currentHp > 0);
    const targetTile = gameState.grid[targetY][targetX];

    // Specific Card Logic Subroutines:
    switch (card.type) {
      case 'kinetic': {
        if (!targetEnemy) return;
        sound.playLaserZap();

        // Calculate pushback direction
        const dx = Math.sign(targetX - gameState.player.x);
        const dy = Math.sign(targetY - gameState.player.y);
        let destX = targetX + dx;
        let destY = targetY + dy;

        let bonusCollisionDmg = 0;
        // Check if destination is blocked or out of bounds
        const isOutOfBounds = destX < 0 || destX > 7 || destY < 0 || destY > 7;
        const isBlocked = !isOutOfBounds && (
          gameState.grid[destY][destX].type === 'ferro_rock' ||
          gameState.grid[destY][destX].type === 'decayed_ruin'
        );

        if (isOutOfBounds || isBlocked) {
          bonusCollisionDmg = 2;
          destX = targetX;
          destY = targetY;
        }

        const totalDmg = card.effectValue + bonusCollisionDmg;
        const newHp = Math.max(0, targetEnemy.currentHp - totalDmg);

        addFloatingText(targetX, targetY, `-${totalDmg} [RAIL]`, '#f59e0b');
        if (bonusCollisionDmg > 0) {
          addFloatingText(targetX, targetY, '+2 COLLISION!', '#ef4444');
        }

        addLog(
          'OPERATOR',
          `Kinetic Strike engaged on ${targetEnemy.name}: ${totalDmg} rail damage applied!`,
          'damage'
        );

        setGameState((prev) => ({
          ...prev,
          enemies: prev.enemies.map((e) =>
            e.id === targetEnemy.id
              ? { ...e, currentHp: newHp, x: destX, y: destY }
              : e
          ),
          hand: newHand,
          discard: newDiscard,
          selectedCard: null,
          player: { ...prev.player, currentLogic: newLogic },
          stats: {
            ...prev.stats,
            damageDealt: prev.stats.damageDealt + totalDmg,
            enemiesDefeated: newHp === 0 ? prev.stats.enemiesDefeated + 1 : prev.stats.enemiesDefeated,
          },
        }));
        break;
      }

      case 'energy': {
        // Arc Pulse / Nanite Leech
        if (!targetEnemy && card.targetType === 'enemy') return;
        sound.playLaserZap();

        if (card.id.startsWith('arc_pulse') && targetEnemy) {
          // Check if target is on conductive pool
          const isConductive = targetTile.conductive;
          let affectedEnemies = [targetEnemy.id];

          if (isConductive) {
            // Find other enemies on conductive pools or adjacent
            gameState.enemies.forEach((other) => {
              if (other.id !== targetEnemy.id && other.currentHp > 0) {
                const otherTile = gameState.grid[other.y][other.x];
                if (otherTile.conductive) {
                  affectedEnemies.push(other.id);
                }
              }
            });
            addLog('SYSTEM', 'IONIC CHAIN: Shockwave conducted across water grid!', 'hack');
          }

          setGameState((prev) => ({
            ...prev,
            enemies: prev.enemies.map((e) => {
              if (affectedEnemies.includes(e.id)) {
                const updatedHp = Math.max(0, e.currentHp - card.effectValue);
                addFloatingText(e.x, e.y, `-${card.effectValue} [SHOCK]`, '#06b6d4');
                return { ...e, currentHp: updatedHp, isStunned: true };
              }
              return e;
            }),
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
            player: { ...prev.player, currentLogic: newLogic },
            stats: {
              ...prev.stats,
              damageDealt: prev.stats.damageDealt + card.effectValue * affectedEnemies.length,
            },
          }));
        } else if (card.id.startsWith('nanite_leech') && targetEnemy) {
          sound.playShield();
          const newHp = Math.max(0, targetEnemy.currentHp - card.effectValue);
          const healAmount = 4;
          const playerNewHp = Math.min(gameState.player.maxHp, gameState.player.currentHp + healAmount);

          addFloatingText(targetX, targetY, `-${card.effectValue} [LEECH]`, '#10b981');
          addFloatingText(gameState.player.x, gameState.player.y, `+${healAmount} HP`, '#34d399');

          addLog('OPERATOR', `Nanite Leech extracted biomass: +${healAmount} HP to Operator.`, 'heal');

          setGameState((prev) => ({
            ...prev,
            enemies: prev.enemies.map((e) => (e.id === targetEnemy.id ? { ...e, currentHp: newHp } : e)),
            player: { ...prev.player, currentHp: playerNewHp, currentLogic: newLogic },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        }
        break;
      }

      case 'tactical': {
        // Shield, Solar Siphon, Cryo Snare, Overclock
        sound.playShield();

        if (card.id.startsWith('hardlight_shield')) {
          const isPlayerTarget = gameState.player.x === targetX && gameState.player.y === targetY;
          if (isPlayerTarget) {
            const addedShield = Math.min(
              gameState.player.maxShields,
              gameState.player.currentShields + card.effectValue
            );
            addFloatingText(targetX, targetY, `+${card.effectValue} SHIELD`, '#06b6d4');
            addLog('OPERATOR', `Hardlight barrier activated: +${card.effectValue} Shield.`, 'heal');

            setGameState((prev) => ({
              ...prev,
              player: { ...prev.player, currentShields: addedShield, currentLogic: newLogic },
              hand: newHand,
              discard: newDiscard,
              selectedCard: null,
            }));
          } else if (gameState.companion && gameState.companion.x === targetX && gameState.companion.y === targetY) {
            const compShield = (gameState.companion.shields || 0) + card.effectValue;
            addFloatingText(targetX, targetY, `+${card.effectValue} SHIELD`, '#06b6d4');
            addLog('COMPANION', `Photonic field projected onto ${gameState.companion.stats.name}.`, 'heal');

            setGameState((prev) => ({
              ...prev,
              companion: prev.companion ? { ...prev.companion, shields: compShield } : null,
              player: { ...prev.player, currentLogic: newLogic },
              hand: newHand,
              discard: newDiscard,
              selectedCard: null,
            }));
          }
        } else if (card.id.startsWith('cryo_snare') && targetEnemy) {
          const newHp = Math.max(0, targetEnemy.currentHp - card.effectValue);
          addFloatingText(targetX, targetY, `-${card.effectValue} [FROZEN]`, '#93c5fd');
          addLog('OPERATOR', `Cryo Snare deployed: ${targetEnemy.name} flash-frozen for 1 turn!`, 'damage');

          setGameState((prev) => ({
            ...prev,
            enemies: prev.enemies.map((e) => (e.id === targetEnemy.id ? { ...e, currentHp: newHp, isStunned: true } : e)),
            player: { ...prev.player, currentLogic: newLogic },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        } else if (card.id.startsWith('solar_siphon')) {
          const onSolar = gameState.grid[gameState.player.y][gameState.player.x].type === 'solar_spire';
          const refund = onSolar || gameState.weather === 'solar_flare' ? 2 : 0;
          const healedHp = Math.min(gameState.player.maxHp, gameState.player.currentHp + card.effectValue);

          addFloatingText(gameState.player.x, gameState.player.y, `+${card.effectValue} HP ${refund > 0 ? '+2 LP' : ''}`, '#fbbf24');
          addLog('OPERATOR', `Solar Siphon cycled radiation: +${card.effectValue} HP ${refund > 0 ? '(+2 LP bonus)' : ''}.`, 'heal');

          setGameState((prev) => ({
            ...prev,
            player: {
              ...prev.player,
              currentHp: healedHp,
              currentLogic: Math.min(prev.player.maxLogic, newLogic + refund),
            },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        } else if (card.id.startsWith('overclock_core')) {
          const dmg = 2;
          const playerHp = Math.max(0, gameState.player.currentHp - dmg);
          const boostedLogic = Math.min(gameState.player.maxLogic + 2, gameState.player.currentLogic + 2);

          sound.playExplosion();
          addFloatingText(gameState.player.x, gameState.player.y, '+2 LP [-2 HEAT]', '#f59e0b');
          addLog('OPERATOR', 'Reactor overclock engaged: +2 Logic points (-2 Thermal Damage).', 'alert');

          setGameState((prev) => ({
            ...prev,
            player: { ...prev.player, currentHp: playerHp, currentLogic: boostedLogic },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        } else if (card.id.startsWith('companion_pounce') && targetEnemy && gameState.companion) {
          // Companion charges and deals heavy hit
          const newHp = Math.max(0, targetEnemy.currentHp - card.effectValue);
          addFloatingText(targetX, targetY, `-${card.effectValue} [POUNCE]`, '#fbbf24');
          addLog('COMPANION', `${gameState.companion.stats.name} executed synchronized pounce strike: -${card.effectValue} HP!`, 'damage');

          setGameState((prev) => ({
            ...prev,
            enemies: prev.enemies.map((e) => (e.id === targetEnemy.id ? { ...e, currentHp: newHp, isStunned: true } : e)),
            companion: prev.companion ? { ...prev.companion, x: targetX, y: targetY } : null,
            player: { ...prev.player, currentLogic: newLogic },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        }
        break;
      }

      case 'hack': {
        // Neural Hijack: Hack beast to fight for player
        if (!targetEnemy) return;
        sound.playHack();

        addFloatingText(targetX, targetY, 'NEURAL HACKED!', '#c084fc');
        addLog('OPERATOR', `Subroutine injected: ${targetEnemy.name} firmware hijacked for 2 turns!`, 'hack');

        setGameState((prev) => ({
          ...prev,
          enemies: prev.enemies.map((e) =>
            e.id === targetEnemy.id
              ? {
                  ...e,
                  isHacked: true,
                  hackedTurnsRemaining: 2,
                  intent: {
                    action: 'attack',
                    value: e.attackPower,
                    warningDesc: 'Targeting wild predators under Operator neural override!',
                  },
                }
              : e
          ),
          player: { ...prev.player, currentLogic: newLogic },
          hand: newHand,
          discard: newDiscard,
          selectedCard: null,
          stats: { ...prev.stats, nodesHacked: prev.stats.nodesHacked + 1 },
        }));
        break;
      }

      case 'deployable': {
        // Tesla Pylon or Terra-Spike Barrier
        sound.playShield();

        if (card.id.startsWith('deploy_tesla')) {
          const newDeployable: DeployableUnit = {
            id: `deployable_${Date.now()}`,
            type: 'tesla_pylon',
            name: 'Tesla Pylon Alpha',
            x: targetX,
            y: targetY,
            hp: 6,
            maxHp: 6,
            duration: 3,
          };

          addFloatingText(targetX, targetY, 'TESLA PYLON DEPLOYED', '#06b6d4');
          addLog('OPERATOR', `Tesla Pylon deployed at (${targetX}, ${targetY}). Zaps enemies in range 2.`, 'info');

          setGameState((prev) => ({
            ...prev,
            deployables: [...prev.deployables, newDeployable],
            player: { ...prev.player, currentLogic: newLogic },
            hand: newHand,
            discard: newDiscard,
            selectedCard: null,
          }));
        } else if (card.id.startsWith('terra_barrier')) {
          // Erect Ferro Rock
          setGameState((prev) => {
            const newGrid = prev.grid.map((r, y) =>
              r.map((c, x) => (x === targetX && y === targetY ? { ...c, type: 'ferro_rock' as const } : c))
            );
            return {
              ...prev,
              grid: newGrid,
              player: { ...prev.player, currentLogic: newLogic },
              hand: newHand,
              discard: newDiscard,
              selectedCard: null,
            };
          });

          addFloatingText(targetX, targetY, 'TERRA-BARRIER ERECTED', '#78716c');
          addLog('OPERATOR', `Seismic crystallizer erected Ferro-Rock barrier at (${targetX}, ${targetY}).`, 'info');
        }
        break;
      }
    }
  };

  // Turn End Engine (Deployables -> Weather/Hazards -> Predator AI -> Recharge)
  const handleEndTurn = async () => {
    if (isProcessingTurn) return;
    setIsProcessingTurn(true);

    sound.playMove();
    addLog('SYSTEM', `=== COMMENCING TURN ${gameState.turnNumber} ENVIRONMENT & FAUNA PHASE ===`, 'info');

    // 1. DEPLOYABLE UNITS ACTION
    let currentEnemies = [...gameState.enemies];
    for (const d of gameState.deployables) {
      if (d.type === 'tesla_pylon') {
        // Find closest enemy within 2 tiles
        const inRange = currentEnemies.filter(
          (e) => e.currentHp > 0 && Math.abs(e.x - d.x) + Math.abs(e.y - d.y) <= 2
        );
        for (const target of inRange) {
          sound.playLaserZap();
          target.currentHp = Math.max(0, target.currentHp - 3);
          addFloatingText(target.x, target.y, '-3 [TESLA ZAP]', '#06b6d4');
          addLog('SYSTEM', `Tesla Pylon discharged electrical arc into ${target.name}: -3 HP.`, 'damage');
        }
      }
    }

    // 2. ENVIRONMENTAL HAZARDS & WEATHER PHASE
    let playerHp = gameState.player.currentHp;
    let playerShields = gameState.player.currentShields;
    const weather = gameState.weather;

    if (weather === 'solar_flare') {
      if (playerShields > 0) {
        playerShields = Math.max(0, playerShields - 2);
        addLog('HAZARD', 'Solar flare absorbed by photonic shield: -2 Shields.', 'alert');
      } else {
        playerHp = Math.max(0, playerHp - 2);
        addFloatingText(gameState.player.x, gameState.player.y, '-2 [SOLAR BURN]', '#f59e0b');
        addLog('HAZARD', 'Unshielded Operator suffered solar flare radiation: -2 HP.', 'alert');
      }
    } else if (weather === 'acid_monsoon') {
      addLog('HAZARD', 'Acid monsoon rain dissolved 1 armor and expanded corrosive puddles.', 'alert');
    }

    // Weather countdown mutation
    let nextWeather = weather;
    let nextCountdown = gameState.weatherCountdown - 1;
    if (nextCountdown <= 0) {
      const weathers: WeatherType[] = [
        'clear_skies',
        'solar_flare',
        'acid_monsoon',
        'emp_dust_storm',
        'bioluminescent_fog',
      ];
      const remainingWeathers = weathers.filter((w) => w !== weather);
      nextWeather = remainingWeathers[Math.floor(Math.random() * remainingWeathers.length)];
      nextCountdown = 3;
      sound.playAlarm();
      addLog('HAZARD', `ATMOSPHERIC WARNING: Weather shifted to ${nextWeather.replace('_', ' ').toUpperCase()}!`, 'alert');
    }

    // 3. PREDATOR AI ACTIONS
    for (let i = 0; i < currentEnemies.length; i++) {
      const enemy = currentEnemies[i];
      if (enemy.currentHp <= 0) continue;

      if (enemy.isStunned) {
        enemy.isStunned = false;
        addLog('WILD', `${enemy.name} recovered from electrical stun.`, 'info');
        continue;
      }

      if (enemy.isHacked) {
        // Hacked predator attacks closest wild predator!
        const wildTarget = currentEnemies.find((e) => e.id !== enemy.id && !e.isHacked && e.currentHp > 0);
        if (wildTarget) {
          sound.playExplosion();
          wildTarget.currentHp = Math.max(0, wildTarget.currentHp - enemy.attackPower);
          addFloatingText(wildTarget.x, wildTarget.y, `-${enemy.attackPower} [HACK CLASH]`, '#c084fc');
          addLog('WILD', `Hijacked ${enemy.name} mauled wild ${wildTarget.name}: -${enemy.attackPower} HP!`, 'hack');
        }
        enemy.hackedTurnsRemaining = (enemy.hackedTurnsRemaining || 1) - 1;
        if (enemy.hackedTurnsRemaining <= 0) {
          enemy.isHacked = false;
          addLog('WILD', `${enemy.name} purged neural override. Returned to wild hostility!`, 'alert');
        }
        continue;
      }

      // Normal wild predator logic: evaluate target (Operator vs Companion)
      const distToPlayer = Math.abs(enemy.x - gameState.player.x) + Math.abs(enemy.y - gameState.player.y);
      const distToCompanion = gameState.companion
        ? Math.abs(enemy.x - gameState.companion.x) + Math.abs(enemy.y - gameState.companion.y)
        : 999;

      let targetIsPlayer = true;
      if (gameState.companion && distToCompanion < distToPlayer) {
        targetIsPlayer = false;
      }

      const targetX = targetIsPlayer ? gameState.player.x : gameState.companion!.x;
      const targetY = targetIsPlayer ? gameState.player.y : gameState.companion!.y;
      const dist = Math.abs(enemy.x - targetX) + Math.abs(enemy.y - targetY);

      if (dist <= enemy.attackRange) {
        // Strike target!
        sound.playExplosion();
        let dmg = enemy.attackPower;

        if (targetIsPlayer) {
          if (playerShields > 0) {
            const absorbed = Math.min(playerShields, dmg);
            playerShields -= absorbed;
            dmg -= absorbed;
            addFloatingText(targetX, targetY, `-${absorbed} SHIELD`, '#06b6d4');
          }
          if (dmg > 0) {
            playerHp = Math.max(0, playerHp - dmg);
            addFloatingText(targetX, targetY, `-${dmg} HP [MELEE]`, '#ef4444');
          }
          addLog('WILD', `${enemy.name} struck Operator: ${enemy.attackPower} damage delivered!`, 'alert');
        } else if (gameState.companion) {
          const compHp = Math.max(0, gameState.companion.currentHp - dmg);
          addFloatingText(targetX, targetY, `-${dmg} HP`, '#fbbf24');
          addLog('WILD', `${enemy.name} ambushed ${gameState.companion.stats.name}: -${dmg} HP!`, 'alert');
          setGameState((prev) => ({
            ...prev,
            companion: prev.companion ? { ...prev.companion, currentHp: compHp } : null,
          }));
        }
      } else {
        // Move towards target
        const stepX = Math.sign(targetX - enemy.x);
        const stepY = Math.sign(targetY - enemy.y);
        const nextX = enemy.x + stepX;
        const nextY = enemy.y + (stepX === 0 ? stepY : 0);

        // Check if tile is unblocked
        if (
          nextX >= 0 && nextX <= 7 && nextY >= 0 && nextY <= 7 &&
          gameState.grid[nextY][nextX].type !== 'ferro_rock' &&
          gameState.grid[nextY][nextX].type !== 'decayed_ruin'
        ) {
          enemy.x = nextX;
          enemy.y = nextY;
        }
      }

      // Compute NEXT turn intent
      enemy.intent = {
        action: 'attack',
        targetX,
        targetY,
        value: enemy.attackPower,
        warningDesc: `Locking onto ${targetIsPlayer ? 'Operator' : 'Companion'} for ${enemy.attackPower} damage!`,
      };
    }

    // 4. RECHARGE PHASE & DRAW NEW HAND
    const onSolarSpire = gameState.grid[gameState.player.y][gameState.player.x].type === 'solar_spire';
    const rechargeLogic = gameState.player.maxLogic + (onSolarSpire ? 1 : 0);
    if (onSolarSpire) {
      addLog('OPERATOR', 'Solar Spire conduit tapped: +1 Bonus Logic Point for this turn!', 'heal');
    }

    const { hand: refreshedHand, deck: newDeck, discard: newDiscard } = drawCards(
      [],
      [...gameState.deck, ...gameState.discard, ...gameState.hand],
      [],
      5
    );

    // Check if sector cleared
    const remainingEnemies = currentEnemies.filter((e) => e.currentHp > 0);
    let sectorCleared = remainingEnemies.length === 0;
    let earnedScrap = 0;

    if (sectorCleared) {
      earnedScrap = 35 * gameState.sectorLevel;
      sound.playVictory();
      addLog('SYSTEM', `SECTOR CLEARED! All predatory threats suppressed. +${earnedScrap} Scrap collected!`, 'heal');
    }

    setGameState((prev) => ({
      ...prev,
      turnNumber: prev.turnNumber + 1,
      weather: nextWeather,
      weatherCountdown: nextCountdown,
      player: {
        ...prev.player,
        currentHp: playerHp,
        currentShields: playerShields,
        currentLogic: rechargeLogic,
      },
      enemies: currentEnemies,
      hand: refreshedHand,
      deck: newDeck,
      discard: newDiscard,
      selectedCard: null,
      scrap: prev.scrap + earnedScrap,
      stats: {
        ...prev.stats,
        turnsSurvived: prev.stats.turnsSurvived + 1,
      },
    }));

    setIsProcessingTurn(false);
  };

  // Node Selection from Expedition Map
  const handleSelectExpeditionNode = (node: ExpeditionNode) => {
    sound.playMove();

    // Advance to selected sector
    const newSeed = Date.now();
    const newLevel = gameState.sectorLevel + 1;
    const isBoss = node.type === 'boss';
    const isElite = node.type === 'elite';

    const newGrid = generateProceduralGrid(node.biome, newSeed, 8);
    const newEnemies = generateEnemiesForSector(newLevel, node.biome, newSeed, isElite, isBoss);

    // Update expedition nodes to mark current completed and next available
    const updatedNodes = gameState.expeditionNodes.map((n) => {
      if (n.id === node.id) {
        return { ...n, completed: true };
      }
      if (node.connectedTo.includes(n.id)) {
        return { ...n, available: true };
      }
      return n;
    });

    // Reset player position to safe deployment zone
    setGameState((prev) => ({
      ...prev,
      mode: 'grid',
      sectorLevel: newLevel,
      biome: node.biome,
      seed: newSeed,
      grid: newGrid,
      enemies: newEnemies,
      deployables: [],
      currentNodeId: node.id,
      expeditionNodes: updatedNodes,
      scrap: prev.scrap + node.rewardScrap,
      player: {
        ...prev.player,
        x: 1,
        y: 6,
        currentLogic: prev.player.maxLogic,
      },
      companion: prev.companion ? { ...prev.companion, x: 2, y: 6 } : null,
    }));

    addLog('SYSTEM', `EXPEDITION ADVANCED: Deployed to ${node.name} [Sector ${newLevel}].`, 'info');
  };

  // Restart Run Handler
  const handleRestartRun = (companionId: CompanionId) => {
    const freshState = createInitialGameState(companionId, Date.now());
    setGameState(freshState);
    setSelectedEntity('player');
    addLog('SYSTEM', 'NEW EXPEDITION PROTOCOL INITIALIZED.', 'info');
  };

  // Buy Card Handler
  const handleBuyCard = (card: LogicCard, cost: number) => {
    setGameState((prev) => ({
      ...prev,
      scrap: prev.scrap - cost,
      deck: [...prev.deck, card],
    }));
    addLog('OPERATOR', `Fabricated new subroutine: [${card.name}] integrated into deck.`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#040806] text-slate-100 flex flex-col font-sans relative selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Dynamic Background Cyber Ambient Grid */}
      <div className="fixed inset-0 pointer-events-none bg-tactical-grid opacity-30 z-0" />
      <div className="fixed inset-0 pointer-events-none bg-scanlines opacity-40 z-0" />

      {/* Top Header Telemetry Bar */}
      <TopHeader
        sectorLevel={gameState.sectorLevel}
        biome={gameState.biome}
        weather={gameState.weather}
        weatherCountdown={gameState.weatherCountdown}
        scrap={gameState.scrap}
        turnNumber={gameState.turnNumber}
        currentMode={gameState.mode}
        onChangeMode={(mode) => setGameState((prev) => ({ ...prev, mode }))}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Tactical Operation Center */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-7xl mx-auto w-full z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start mb-2">
          {/* Left Column: Operator & Companion Status */}
          <div className="lg:col-span-3 w-full flex flex-col gap-3">
            <CompanionPanel
              player={gameState.player}
              companion={gameState.companion}
              selectedEntity={selectedEntity}
              onSelectEntity={(entity) => setSelectedEntity(entity)}
              onCompanionSpecialAbility={handleCompanionSpecial}
              disabled={isProcessingTurn}
            />

            {/* Sector Objectives & Threat Gauge */}
            <div className="rounded-xl border border-emerald-950 bg-[#06120c]/80 p-3 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-emerald-400 font-bold uppercase">SECTOR THREATS</span>
                <span>
                  {gameState.enemies.filter((e) => e.currentHp > 0).length} HOSTILE
                </span>
              </div>

              <div className="space-y-1.5">
                {gameState.enemies
                  .filter((e) => e.currentHp > 0)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-slate-800 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 text-slate-200 truncate">
                        <span>{e.type === 'apex_stalker' ? '🐆' : e.type === 'ion_strider' ? '🦒' : '🐺'}</span>
                        <span className="truncate">{e.name}</span>
                      </span>
                      <span className="text-rose-400 font-bold ml-2">
                        {e.currentHp}/{e.maxHp} HP
                      </span>
                    </div>
                  ))}

                {gameState.enemies.every((e) => e.currentHp <= 0) && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-center text-emerald-300 font-bold animate-pulse">
                    SECTOR CLEARED • OPEN MAP
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Column: 8x8 Tactical Survival Grid */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center w-full">
            <TacticalGrid
              grid={gameState.grid}
              player={gameState.player}
              companion={gameState.companion}
              enemies={gameState.enemies}
              deployables={gameState.deployables}
              selectedCard={gameState.selectedCard}
              floatingTexts={gameState.floatingTexts}
              biome={gameState.biome}
              onTileClick={handleTileClick}
              onPlayerMove={handlePlayerMove}
              onCompanionMove={handleCompanionMove}
              selectedEntity={selectedEntity}
              setSelectedEntity={setSelectedEntity}
            />
          </div>

          {/* Right Column: Combat Terminal Live Feed */}
          <div className="lg:col-span-3 w-full h-[320px] lg:h-[480px]">
            <CombatTerminal logs={gameState.combatLogs} />
          </div>
        </div>

        {/* Bottom Subroutines Card Dock */}
        <div className="w-full mt-auto">
          <CardDock
            hand={gameState.hand}
            deckCount={gameState.deck.length}
            discardCount={gameState.discard.length}
            currentLogic={gameState.player.currentLogic}
            maxLogic={gameState.player.maxLogic}
            selectedCard={gameState.selectedCard}
            onSelectCard={(card) => setGameState((prev) => ({ ...prev, selectedCard: card }))}
            onEndTurn={handleEndTurn}
            disabled={isProcessingTurn}
          />
        </div>
      </main>

      {/* Interactive Modals */}
      {gameState.mode === 'expedition_map' && (
        <ExpeditionMapModal
          nodes={gameState.expeditionNodes}
          currentNodeId={gameState.currentNodeId}
          onSelectNode={handleSelectExpeditionNode}
          onClose={() => setGameState((prev) => ({ ...prev, mode: 'grid' }))}
          sectorLevel={gameState.sectorLevel}
          biome={gameState.biome}
        />
      )}

      {gameState.mode === 'deck' && (
        <DeckManagerModal
          deck={gameState.deck}
          scrap={gameState.scrap}
          onBuyCard={handleBuyCard}
          onUpgradeCard={() => {}}
          onClose={() => setGameState((prev) => ({ ...prev, mode: 'grid' }))}
        />
      )}

      {gameState.mode === 'codex' && (
        <CodexModal onClose={() => setGameState((prev) => ({ ...prev, mode: 'grid' }))} />
      )}

      {/* Game Over / Victory Modal */}
      {(gameState.gameOver || gameState.gameWon) && (
        <GameOverModal
          isWon={gameState.gameWon}
          stats={gameState.stats}
          sectorLevel={gameState.sectorLevel}
          scrap={gameState.scrap}
          onRestartRun={handleRestartRun}
        />
      )}

      {/* PWA Autonomous Offline Banner */}
      <OfflineIndicator />
    </div>
  );
}
