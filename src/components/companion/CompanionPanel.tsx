import React from 'react';
import { PlayerUnit, CompanionUnit } from '../../types/game';
import { 
  Heart, 
  Shield, 
  Cpu, 
  Crosshair, 
  Activity, 
  Eye, 
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface CompanionPanelProps {
  player: PlayerUnit;
  companion: CompanionUnit | null;
  selectedEntity: 'player' | 'companion' | null;
  onSelectEntity: (entity: 'player' | 'companion') => void;
  onCompanionSpecialAbility: () => void;
  disabled: boolean;
}

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  player,
  companion,
  selectedEntity,
  onSelectEntity,
  onCompanionSpecialAbility,
  disabled,
}) => {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Operator Card */}
      <div
        onClick={() => onSelectEntity('player')}
        className={`
          relative rounded-xl border p-3 transition-all cursor-pointer select-none
          ${selectedEntity === 'player'
            ? 'bg-gradient-to-br from-[#0c1f17] to-[#050e0a] border-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'bg-[#060e0a]/80 border-emerald-950/70 hover:border-emerald-800'
          }
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-400/60 flex items-center justify-center font-mono font-bold text-emerald-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xs tracking-wider text-slate-100">
                OPERATOR RIG
              </h3>
              <p className="text-[10px] font-mono text-emerald-400">
                LOGIC SYNC: ACTIVE (POS: {player.x}, {player.y})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              ARMOR {player.armor}
            </span>
          </div>
        </div>

        {/* Health & Shield Bars */}
        <div className="space-y-1.5 text-xs font-mono">
          <div>
            <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <Heart className="w-3 h-3" /> INTEGRITY
              </span>
              <span>
                {player.currentHp} / {player.maxHp} HP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-emerald-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
                style={{ width: `${Math.max(0, (player.currentHp / player.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          {player.maxShields > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Shield className="w-3 h-3" /> PHOTONIC SHIELD
                </span>
                <span>
                  {player.currentShields} / {player.maxShields} SHD
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-950 border border-cyan-950 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  style={{ width: `${Math.max(0, (player.currentShields / player.maxShields) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wildlife Companion Card */}
      {companion && (
        <div
          onClick={() => onSelectEntity('companion')}
          className={`
            relative rounded-xl border p-3 transition-all cursor-pointer select-none
            ${selectedEntity === 'companion'
              ? 'bg-gradient-to-br from-[#121c17] to-[#060e0a] border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-[#060e0a]/80 border-emerald-950/70 hover:border-emerald-800'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-lg"
                style={{
                  backgroundColor: '#0a1612',
                  borderColor: companion.stats.color,
                }}
              >
                {companion.stats.portrait}
              </div>
              <div>
                <h3 className="font-display font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span>{companion.stats.name}</span>
                  <span
                    className="text-[9px] font-mono px-1 rounded uppercase font-semibold"
                    style={{
                      color: companion.stats.color,
                      backgroundColor: `${companion.stats.color}22`,
                    }}
                  >
                    {companion.stats.role}
                  </span>
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  {companion.stats.species} (POS: {companion.x}, {companion.y})
                </p>
              </div>
            </div>
          </div>

          {/* Companion Health */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Heart className="w-3 h-3" /> VITALITY
              </span>
              <span>
                {companion.currentHp} / {companion.stats.maxHp} HP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  backgroundColor: companion.stats.color,
                  width: `${Math.max(0, (companion.currentHp / companion.stats.maxHp) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Passive & Action info */}
          <div className="rounded-lg bg-black/40 border border-emerald-950/80 p-2 text-[10px] font-mono">
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-0.5">
              <span className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {companion.stats.passiveName}
              </span>
              <span className="text-slate-400">SPD: {companion.stats.movement}</span>
            </div>
            <p className="text-slate-400 text-[9px] leading-tight">
              {companion.stats.passiveDesc}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompanionSpecialAbility();
              }}
              disabled={disabled}
              className="mt-2 w-full py-1.5 px-2 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>ENGAGE COMPANION TACTIC (1 LP)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
