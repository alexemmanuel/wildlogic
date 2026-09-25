import React, { useState } from 'react';
import { CompanionId, GameState } from '../../types/game';
import { COMPANIONS_CATALOG } from '../../game/engine';
import { 
  Trophy, 
  Skull, 
  RotateCcw, 
  Zap, 
  Shield, 
  Cpu, 
  Activity, 
  Heart,
  ChevronRight
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface GameOverModalProps {
  isWon: boolean;
  stats: GameState['stats'];
  sectorLevel: number;
  scrap: number;
  onRestartRun: (companionId: CompanionId) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isWon,
  stats,
  sectorLevel,
  scrap,
  onRestartRun,
}) => {
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionId>('cheetah');

  const companions: CompanionId[] = ['cheetah', 'pangolin', 'falcon'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/40 bg-[#040806] p-6 shadow-[0_0_60px_rgba(16,185,129,0.3)] text-slate-100 flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Banner */}
        <div className="text-center pb-4 border-b border-emerald-950">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg">
            {isWon ? (
              <div className="w-full h-full rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
              </div>
            ) : (
              <div className="w-full h-full rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center">
                <Skull className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
            )}
          </div>

          <h2 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase">
            {isWon ? 'EXPEDITION VICTORY: APEX SUBDUED' : 'OPERATOR RIG COMPROMISED'}
          </h2>
          <p className="text-xs font-mono text-emerald-400 mt-1">
            {isWon
              ? 'You mastered the Wild Logic and preserved the techno-wilderness core.'
              : 'Wild bio-mechanical fauna breached suit integrity. Emergency beacon triggered.'}
          </p>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">SECTORS REACHED</span>
            <span className="font-display font-black text-lg text-emerald-300">
              0{sectorLevel}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">TURNS SURVIVED</span>
            <span className="font-display font-black text-lg text-emerald-300">
              {stats.turnsSurvived}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">BEASTS SUBDUED</span>
            <span className="font-display font-black text-lg text-rose-400">
              {stats.enemiesDefeated}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">SCRAP SALVAGED</span>
            <span className="font-display font-black text-lg text-amber-300">
              {scrap} ⚡
            </span>
          </div>
        </div>

        {/* Select Wildlife Companion for Next Run */}
        <div className="mt-2 mb-6">
          <h3 className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-3 text-center">
            SELECT WILDLIFE COMPANION FOR NEXT PROTOCOL
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {companions.map((cid) => {
              const comp = COMPANIONS_CATALOG[cid];
              const isSelected = selectedCompanion === cid;

              return (
                <div
                  key={cid}
                  onClick={() => {
                    setSelectedCompanion(cid);
                    sound.playCardSelect();
                  }}
                  className={`
                    rounded-xl border p-3 cursor-pointer transition-all flex flex-col justify-between
                    ${isSelected
                      ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/60 shadow-lg scale-102'
                      : 'bg-[#060f0a] border-emerald-950/80 hover:border-emerald-800'
                    }
                  `}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{comp.portrait}</span>
                      <div>
                        <h4 className="font-display font-bold text-xs text-slate-100">
                          {comp.name}
                        </h4>
                        <span className="text-[9px] font-mono text-emerald-400 uppercase">
                          {comp.role}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] font-sans text-slate-300 leading-tight mb-2">
                      {comp.passiveDesc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[9px] font-mono text-slate-400 flex items-center justify-between">
                    <span>HP: {comp.maxHp}</span>
                    <span>ATK: {comp.attackPower}</span>
                    <span>SPD: {comp.movement}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reboot Run Button */}
        <button
          onClick={() => {
            sound.playVictory();
            onRestartRun(selectedCompanion);
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-display font-black text-sm tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>REBOOT EXPEDITION PROTOCOL</span>
        </button>
      </div>
    </div>
  );
};
