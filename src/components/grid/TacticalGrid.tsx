import React, { useState } from 'react';
import {
  GridTile,
  PlayerUnit,
  CompanionUnit,
  EnemyUnit,
  DeployableUnit,
  LogicCard,
  FloatingText,
  BiomeType,
  WeatherType,
} from '../../types/game';
import { WeatherCanvasOverlay } from './WeatherCanvasOverlay';
import { 
  Zap, 
  Shield, 
  Cpu, 
  Radio, 
  AlertTriangle, 
  Eye, 
  Sparkles, 
  Crosshair,
  Flame,
  Snowflake,
  Layers,
  Activity
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface TacticalGridProps {
  grid: GridTile[][];
  player: PlayerUnit;
  companion: CompanionUnit | null;
  enemies: EnemyUnit[];
  deployables: DeployableUnit[];
  selectedCard: LogicCard | null;
  floatingTexts: FloatingText[];
  biome: BiomeType;
  weather: WeatherType;
  onTileClick: (x: number, y: number) => void;
  onPlayerMove: (targetX: number, targetY: number) => void;
  onCompanionMove: (targetX: number, targetY: number) => void;
  selectedEntity: 'player' | 'companion' | null;
  setSelectedEntity: (entity: 'player' | 'companion' | null) => void;
}

export const TacticalGrid: React.FC<TacticalGridProps> = ({
  grid,
  player,
  companion,
  enemies,
  deployables,
  selectedCard,
  floatingTexts,
  biome,
  weather,
  onTileClick,
  onPlayerMove,
  onCompanionMove,
  selectedEntity,
  setSelectedEntity,
}) => {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  // Check if tile is within movement range of currently selected operator or companion
  const isMoveTarget = (x: number, y: number): boolean => {
    if (selectedCard) return false;
    
    // Check if tile is occupied by obstacles or units
    const isOccupied = 
      (player.x === x && player.y === y) ||
      (companion && companion.x === x && companion.y === y) ||
      enemies.some(e => e.x === x && e.y === y && e.currentHp > 0) ||
      deployables.some(d => d.x === x && d.y === y) ||
      grid[y][x].type === 'ferro_rock' ||
      grid[y][x].type === 'decayed_ruin';

    if (isOccupied) return false;

    if (selectedEntity === 'player' || !selectedEntity) {
      const dist = Math.abs(player.x - x) + Math.abs(player.y - y);
      return dist <= player.movementRange && player.currentLogic >= 1;
    } else if (selectedEntity === 'companion' && companion) {
      const dist = Math.abs(companion.x - x) + Math.abs(companion.y - y);
      return dist <= companion.stats.movement;
    }
    return false;
  };

  // Check if tile is valid card target
  const isCardTarget = (x: number, y: number): boolean => {
    if (!selectedCard) return false;
    const originX = player.x;
    const originY = player.y;
    const dist = Math.abs(originX - x) + Math.abs(originY - y);

    if (dist > selectedCard.range && selectedCard.range > 0) return false;

    if (selectedCard.targetType === 'tile_empty') {
      const isOccupied = 
        (player.x === x && player.y === y) ||
        (companion && companion.x === x && companion.y === y) ||
        enemies.some(e => e.x === x && e.y === y && e.currentHp > 0) ||
        deployables.some(d => d.x === x && d.y === y) ||
        grid[y][x].type === 'ferro_rock' ||
        grid[y][x].type === 'decayed_ruin';
      return !isOccupied;
    }

    if (selectedCard.targetType === 'enemy') {
      return enemies.some(e => e.x === x && e.y === y && e.currentHp > 0);
    }

    if (selectedCard.targetType === 'ally') {
      return (player.x === x && player.y === y) || (companion !== null && companion.x === x && companion.y === y);
    }

    if (selectedCard.targetType === 'tile_any') {
      return true;
    }

    if (selectedCard.targetType === 'relay') {
      return grid[y][x].type === 'corrupt_relay';
    }

    return false;
  };

  const handleCellClick = (x: number, y: number) => {
    if (selectedCard) {
      onTileClick(x, y);
      return;
    }

    // If clicked on player or companion, select them
    if (player.x === x && player.y === y) {
      setSelectedEntity('player');
      sound.playMove();
      return;
    }
    if (companion && companion.x === x && companion.y === y) {
      setSelectedEntity('companion');
      sound.playCompanionChuff();
      return;
    }

    // If valid move target
    if (isMoveTarget(x, y)) {
      if (selectedEntity === 'companion' && companion) {
        onCompanionMove(x, y);
      } else {
        onPlayerMove(x, y);
      }
      return;
    }

    onTileClick(x, y);
  };

  // Biome background flair
  const getBiomeTileClass = (tile: GridTile) => {
    switch (tile.type) {
      case 'ferro_rock':
        return 'bg-gradient-to-br from-slate-700 via-stone-800 to-zinc-950 border-stone-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]';
      case 'ion_spore':
        return 'bg-emerald-950/80 border-emerald-500/50 shadow-[inset_0_0_12px_rgba(16,185,129,0.3)] animate-pulse';
      case 'conductive_pool':
        return 'bg-cyan-950/70 border-cyan-500/50 shadow-[inset_0_0_15px_rgba(6,182,212,0.4)]';
      case 'solar_spire':
        return 'bg-amber-950/70 border-amber-500/60 shadow-[inset_0_0_15px_rgba(245,158,11,0.4)]';
      case 'decayed_ruin':
        return 'bg-stone-900 border-amber-700/60';
      case 'corrupt_relay':
        return 'bg-purple-950/80 border-purple-500/60 shadow-[inset_0_0_12px_rgba(168,85,247,0.3)]';
      case 'plasma_vent':
        return 'bg-rose-950/80 border-rose-500/60 shadow-[inset_0_0_12px_rgba(244,63,94,0.3)]';
      default:
        // plains
        if (biome === 'solar_spire_basin') return 'bg-[#0a140f] border-emerald-950/40 hover:border-emerald-800/60';
        if (biome === 'neon_mangrove') return 'bg-[#061612] border-emerald-900/40 hover:border-emerald-700/60';
        if (biome === 'ferro_dunes') return 'bg-[#15120c] border-amber-950/40 hover:border-amber-800/60';
        return 'bg-[#080d12] border-slate-900/60 hover:border-cyan-900/60';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      {/* Visual coordinates and Cyber Framing */}
      <div className="relative rounded-2xl border-2 border-emerald-500/30 bg-[#040806]/90 p-4 shadow-[0_0_35px_rgba(16,185,129,0.15)] backdrop-blur-md">
        
        {/* Holographic Header Deco */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/40 text-[11px] font-mono text-emerald-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold tracking-wider">TACTICAL SURVIVAL GRID [8x8]</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>SELECTED: <strong className="text-emerald-300 font-bold uppercase">{selectedEntity || 'OPERATOR'}</strong></span>
            {selectedCard && (
              <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                TARGETING: {selectedCard.name.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Column coordinate numbers */}
        <div className="flex pl-6 mb-1 text-[10px] font-mono text-slate-500">
          {grid[0]?.map((_, colIdx) => (
            <div key={colIdx} className="w-12 sm:w-14 md:w-16 text-center">
              0{colIdx}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Row coordinate labels */}
          <div className="flex flex-col pr-1 justify-around text-[10px] font-mono text-slate-500">
            {grid.map((_, rowIdx) => (
              <div key={rowIdx} className="h-12 sm:h-14 md:h-16 flex items-center">
                0{rowIdx}
              </div>
            ))}
          </div>

          {/* Main 8x8 Grid Canvas */}
          <div className="relative">
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {grid.map((row, y) =>
              row.map((tile, x) => {
                const isPlayerHere = player.x === x && player.y === y;
                const isCompanionHere = companion && companion.x === x && companion.y === y;
                const enemyHere = enemies.find(e => e.x === x && e.y === y && e.currentHp > 0);
                const deployableHere = deployables.find(d => d.x === x && d.y === y);
                const isTargetable = isCardTarget(x, y);
                const isMovable = isMoveTarget(x, y);
                const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

                // Is any enemy targeting this specific tile?
                const targetingEnemies = enemies.filter(
                  e => e.currentHp > 0 && e.intent.targetX === x && e.intent.targetY === y
                );

                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x, y)}
                    onMouseEnter={() => setHoveredTile({ x, y })}
                    onMouseLeave={() => setHoveredTile(null)}
                    className={`
                      relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl border transition-all duration-150 flex items-center justify-center cursor-pointer overflow-hidden
                      ${getBiomeTileClass(tile)}
                      ${isMovable ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black bg-emerald-950/60 shadow-[0_0_12px_rgba(52,211,153,0.4)] scale-102' : ''}
                      ${isTargetable ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black bg-amber-950/60 shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse' : ''}
                      ${isHovered && !isMovable && !isTargetable ? 'border-emerald-400/80 bg-emerald-950/40' : ''}
                    `}
                  >
                    {/* Environmental Tile Glyphs */}
                    {tile.type === 'solar_spire' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-70 pointer-events-none">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                        <span className="text-[7px] font-mono text-amber-300 font-bold">+1 LP</span>
                      </div>
                    )}

                    {tile.type === 'conductive_pool' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
                        <div className="w-7 h-7 rounded-full border border-cyan-400/60 animate-ping opacity-25" />
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    )}

                    {tile.type === 'ion_spore' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                        <span className="text-xs">🍄</span>
                      </div>
                    )}

                    {tile.type === 'corrupt_relay' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-80 pointer-events-none">
                        <Radio className="w-4 h-4 text-purple-400 animate-bounce" />
                        <span className="text-[7px] font-mono text-purple-300">RELAY</span>
                      </div>
                    )}

                    {tile.type === 'ferro_rock' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-85 pointer-events-none text-stone-400">
                        <Layers className="w-5 h-5 text-stone-400" />
                      </div>
                    )}

                    {tile.type === 'decayed_ruin' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-85 pointer-events-none text-amber-600">
                        <span className="text-[10px] font-mono font-bold text-amber-400/80">
                          {tile.decayState === 1 ? '🧱' : '💥'}
                        </span>
                        <span className="text-[7px] font-mono text-amber-500">COVER</span>
                      </div>
                    )}

                    {tile.type === 'plasma_vent' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                        <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                      </div>
                    )}

                    {/* Incoming Enemy Threat Warning Overlay */}
                    {targetingEnemies.length > 0 && !enemyHere && (
                      <div className="absolute inset-0 z-20 pointer-events-none bg-rose-500/20 border-2 border-rose-500/80 rounded-xl flex flex-col items-center justify-center animate-pulse">
                        <Crosshair className="w-4 h-4 text-rose-400" />
                        <span className="text-[8px] font-mono font-extrabold text-rose-300">
                          -{targetingEnemies.reduce((acc, curr) => acc + curr.intent.value, 0)} HP
                        </span>
                      </div>
                    )}

                    {/* Deployable Unit (e.g. Tesla Pylon) */}
                    {deployableHere && (
                      <div className="relative z-10 flex flex-col items-center justify-center">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-900 border border-cyan-400 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                          <Zap className="w-4 h-4 text-cyan-300 animate-bounce" />
                        </div>
                        <span className="text-[8px] font-mono text-cyan-200 mt-0.5">
                          {deployableHere.hp}/{deployableHere.maxHp}
                        </span>
                      </div>
                    )}

                    {/* Player Unit */}
                    {isPlayerHere && (
                      <div
                        className={`relative z-30 flex flex-col items-center justify-center transition-transform ${
                          selectedEntity === 'player' ? 'scale-110' : ''
                        }`}
                      >
                        {/* Shield halo if shielded */}
                        {player.currentShields > 0 && (
                          <div className="absolute -inset-1 rounded-full border-2 border-cyan-400/80 animate-spin opacity-75" style={{ animationDuration: '6s' }} />
                        )}

                        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-900 via-emerald-700 to-teal-500 border-2 border-emerald-300 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                          <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
                          </span>
                        </div>

                        {/* Player Mini Health / Shield bar */}
                        <div className="w-9 mt-0.5 flex flex-col gap-0.5">
                          <div className="w-full bg-slate-950/80 h-1 rounded-full overflow-hidden border border-emerald-500/30">
                            <div
                              className="bg-emerald-400 h-full transition-all duration-300"
                              style={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                            />
                          </div>
                          {player.currentShields > 0 && (
                            <div className="w-full bg-slate-950/80 h-0.5 rounded-full overflow-hidden">
                              <div
                                className="bg-cyan-400 h-full"
                                style={{ width: `${(player.currentShields / player.maxShields) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Companion Unit */}
                    {isCompanionHere && companion && (
                      <div
                        className={`relative z-30 flex flex-col items-center justify-center transition-transform ${
                          selectedEntity === 'companion' ? 'scale-110' : ''
                        }`}
                      >
                        <div
                          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 flex items-center justify-center shadow-lg"
                          style={{
                            backgroundColor: '#0f1f1a',
                            borderColor: companion.stats.color,
                            boxShadow: `0 0 12px ${companion.stats.color}66`,
                          }}
                        >
                          <span className="text-base sm:text-lg">{companion.stats.portrait}</span>
                          {companion.isCurled && (
                            <Shield className="w-3.5 h-3.5 text-cyan-300 absolute -top-1 -right-1" />
                          )}
                        </div>

                        {/* Companion HP bar */}
                        <div className="w-8 mt-0.5 bg-slate-950/80 h-1 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              backgroundColor: companion.stats.color,
                              width: `${(companion.currentHp / companion.stats.maxHp) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Enemy Unit */}
                    {enemyHere && (
                      <div className="relative z-20 flex flex-col items-center justify-center">
                        {/* Predator Intent Warning Pill */}
                        <div className="absolute -top-3 z-30 flex items-center gap-0.5 rounded-full bg-black/90 px-1 py-0.2 border border-rose-500 shadow-md">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                          <span className="text-[7px] font-mono font-bold text-rose-300">
                            {enemyHere.intent.value}
                          </span>
                        </div>

                        {/* Stunned / Hacked Badges */}
                        {enemyHere.isHacked && (
                          <div className="absolute -left-2 -top-1 z-30 px-1 rounded bg-purple-900 border border-purple-400 text-[6px] font-mono text-purple-200">
                            HACKED
                          </div>
                        )}
                        {enemyHere.isStunned && (
                          <div className="absolute -right-2 -top-1 z-30 px-1 rounded bg-cyan-900 border border-cyan-400 text-[6px] font-mono text-cyan-200">
                            STUN
                          </div>
                        )}

                        <div
                          className={`
                            relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 flex items-center justify-center transition-all
                            ${enemyHere.isAlpha 
                              ? 'bg-rose-950/90 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)]' 
                              : enemyHere.isHacked
                              ? 'bg-purple-950/90 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]'
                              : 'bg-red-950/80 border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                            }
                            ${enemyHere.isStealthed ? 'opacity-40 border-dashed' : 'opacity-100'}
                          `}
                        >
                          <span className="text-base sm:text-lg">
                            {enemyHere.type === 'apex_stalker' && '🐆'}
                            {enemyHere.type === 'scrap_hyena' && '🐺'}
                            {enemyHere.type === 'ion_strider' && '🦒'}
                            {enemyHere.type === 'vulture_drone' && '🦅'}
                            {enemyHere.type === 'behemoth_titan' && '🦖'}
                          </span>

                          {enemyHere.armor > 0 && (
                            <span className="absolute -bottom-1 -left-1 text-[7px] font-mono bg-slate-900 text-slate-300 px-0.5 rounded border border-slate-600">
                              🛡{enemyHere.armor}
                            </span>
                          )}
                        </div>

                        {/* Enemy HP Bar */}
                        <div className="w-8 mt-0.5 bg-slate-950/90 h-1 rounded-full overflow-hidden border border-red-950">
                          <div
                            className="bg-red-500 h-full transition-all duration-300"
                            style={{ width: `${(enemyHere.currentHp / enemyHere.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Floating Combat Text Animations */}
                    {floatingTexts
                      .filter(ft => ft.x === x && ft.y === y)
                      .map(ft => (
                        <div
                          key={ft.id}
                          className="absolute z-50 pointer-events-none font-display font-black text-xs sm:text-sm animate-bounce tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                          style={{ color: ft.color }}
                        >
                          {ft.text}
                        </div>
                      ))}
                  </div>
                );
              })
            )}
            </div>

            {/* Canvas-based Weather Overlay directly over the grid */}
            <WeatherCanvasOverlay weather={weather} />
          </div>
        </div>

        {/* Tactical Legend & Hotkeys Bar */}
        <div className="mt-3 pt-2 border-t border-emerald-950/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-400" />
              <span>Movement (1 LP)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500/30 border border-cyan-400" />
              <span>Conductive</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-400" />
              <span>Solar (+1 LP)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-400" />
              <span>Predator Threat</span>
            </span>
          </div>

          <div className="text-slate-500 text-[10px]">
            Click unit to toggle control • Click tile to move or target
          </div>
        </div>
      </div>
    </div>
  );
};
