import React, { useState } from 'react';
import { 
  BookOpen, 
  ShieldAlert, 
  Cpu, 
  CloudRain, 
  Sun, 
  Wind, 
  Eye, 
  Sparkles, 
  Activity, 
  Layers, 
  X,
  Radio,
  Flame
} from 'lucide-react';

interface CodexModalProps {
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'bestiary' | 'hazards' | 'logic'>('bestiary');

  const beasts = [
    {
      name: 'Apex Stalker (Cyber-Leopard)',
      icon: '🐆',
      hp: '18 - 24',
      threat: 'CRITICAL',
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
      desc: 'Active photonic stealth predator. Traverses up to 4 tiles and executes high-velocity pounce attacks.',
      tactics: 'Break line-of-sight with Ferro-Rock or deploy Tesla Pylons. Aerial falcon scan reveals stealth instantly.',
    },
    {
      name: 'Scrap Hyena Raider',
      icon: '🐺',
      hp: '14 - 18',
      threat: 'MODERATE',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',
      desc: 'Opportunistic pack canine. Scans for units with compromised health or shield integrity and swarms with hydraulic jaws.',
      tactics: 'Keep companion close to taunt or protect weakened operator. Vulnerable to Area Arc Pulses.',
    },
    {
      name: 'Ion Strider Behemoth',
      icon: '🦒',
      hp: '26 - 38',
      threat: 'HIGH',
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20',
      desc: 'Towering bio-mechanical quadruped with high ceramic armor. Charges a 3x3 EMP ground shockwave that discharges high damage and drains Logic.',
      tactics: 'Reposition outside EMP blast radius before turn end. Exploit Neural Hack to turn its massive attack onto other predators.',
    },
    {
      name: 'Vulture Recon Drone',
      icon: '🦅',
      hp: '12 - 16',
      threat: 'MEDIUM',
      color: 'text-purple-400 border-purple-500/40 bg-purple-950/20',
      desc: 'Airborne bio-scavenger. Spits corrosive bio-acid pools that dissolve armor and damage decaying cover.',
      tactics: 'Long attack range but low durability. Kinetic rail pulses dispatch them in 2 shots.',
    },
    {
      name: 'Titan Dune-Gorgon (APEX TITAN)',
      icon: '🦖',
      hp: '65 - 85',
      threat: 'EXTREME (BOSS)',
      color: 'text-rose-400 border-rose-500/40 bg-rose-950/20',
      desc: 'Ancient cyber-monolith beast that commands seismic tremors and devastating line blasts.',
      tactics: 'Utilize Hardlight Shields, deploy autonomous pylons, and hack escort hyenas to divide the titan’s focus.',
    },
  ];

  const hazards = [
    {
      name: 'Solar Flare Surge',
      icon: <Sun className="w-5 h-5 text-amber-400" />,
      desc: 'Photovoltaic radiation charges player suits (+1 LP per turn), but unshielded entities suffer 2 solar burn damage every turn.',
    },
    {
      name: 'Acid Monsoon',
      icon: <CloudRain className="w-5 h-5 text-emerald-400" />,
      desc: 'Atmospheric acid rains strip 1 Armor from all exterior units each turn and converts regular tiles into conductive corrosive puddles.',
    },
    {
      name: 'EMP Dust Storm',
      icon: <Wind className="w-5 h-5 text-cyan-400" />,
      desc: 'Electromagnetic static blinds tactical sensors. Drains 1 Logic Point per turn; predator intent icons glitch unless scanned.',
    },
    {
      name: 'Ion Spore Fog',
      icon: <Eye className="w-5 h-5 text-purple-400" />,
      desc: 'Bioluminescent spore clouds limit target acquisition to 2 tiles. Predators gain surprise attack damage if striking from fog.',
    },
  ];

  const terrain = [
    {
      name: 'Conductive Water Pool',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      desc: 'Conducts electrical shockwaves. Hitting an entity in a pool with Arc Pulse chains shock damage to all adjacent conductive tiles!',
    },
    {
      name: 'Solar Spire',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      desc: 'Standing on this ancient collector grants +1 bonus Logic Point at the start of your turn.',
    },
    {
      name: 'Corrupt Tech Relay',
      icon: <Radio className="w-5 h-5 text-purple-400" />,
      desc: 'Can be hacked using your subroutines to trigger defensive EMP bursts or siphon scrap.',
    },
    {
      name: 'Ferro-Rock & Decayed Ruins',
      icon: <Layers className="w-5 h-5 text-stone-400" />,
      desc: 'Blocks line-of-sight and physical projectile attacks. Can be used to evade predator leap paths.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-emerald-500/30 bg-[#040907] p-5 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg tracking-wider text-slate-100">
                WILD SURVIVAL CODEX
              </h2>
              <p className="text-xs font-mono text-emerald-400">
                TACTICAL INTELLIGENCE ARCHIVE • POST-COLLAPSE WILDERNESS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-emerald-900/60 hover:bg-emerald-900/40 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-3 border-b border-emerald-950/80 pb-2">
          <button
            onClick={() => setTab('bestiary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              tab === 'bestiary'
                ? 'bg-emerald-600 text-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            PREDATOR BESTIARY
          </button>

          <button
            onClick={() => setTab('hazards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              tab === 'hazards'
                ? 'bg-emerald-600 text-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            WEATHER & TERRAIN HAZARDS
          </button>

          <button
            onClick={() => setTab('logic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              tab === 'logic'
                ? 'bg-emerald-600 text-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            TACTICAL PROTOCOLS
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {tab === 'bestiary' && (
            <div className="space-y-3">
              {beasts.map((beast, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${beast.color} transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{beast.icon}</span>
                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-100">
                          {beast.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          BASE INTEGRITY: {beast.hp} HP
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-black/60 border border-slate-700">
                      THREAT: {beast.threat}
                    </span>
                  </div>

                  <p className="text-xs font-sans text-slate-300 mb-2 leading-relaxed">
                    {beast.desc}
                  </p>

                  <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold block mb-0.5">
                      COUNTER-TACTICS:
                    </span>
                    <span className="text-slate-300">{beast.tactics}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'hazards' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-mono text-amber-400 font-bold tracking-wider uppercase mb-3">
                  MUTATING ATMOSPHERIC WEATHER
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hazards.map((h, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        {h.icon}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xs text-slate-100 mb-1">
                          {h.name}
                        </h4>
                        <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                          {h.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono text-cyan-400 font-bold tracking-wider uppercase mb-3">
                  ENVIRONMENTAL GRID ELEMENTS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {terrain.map((t, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-950 bg-[#06120c] p-3 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        {t.icon}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xs text-slate-100 mb-1">
                          {t.name}
                        </h4>
                        <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'logic' && (
            <div className="space-y-3 text-xs font-sans text-slate-300 leading-relaxed">
              <div className="rounded-xl border border-emerald-500/30 bg-[#06140e] p-4">
                <h4 className="font-display font-bold text-sm text-emerald-400 mb-1 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> THE "WILD" VS THE "LOGIC"
                </h4>
                <p className="mb-2">
                  In <em>Wild Logic</em>, the environment is never static. Every turn, weather conditions mutate, predator intentions update, and terrain decays under crossfire.
                </p>
                <p>
                  Your weapon is <strong>Logic</strong>: your limited action pool (LP). Every action—moving through the grid, shielding your companion, or executing a kinetic strike—requires conscious management of RAM.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#060c09] p-4 space-y-2">
                <h4 className="font-display font-bold text-sm text-slate-100">
                  SURVIVAL COMMANDMENTS
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs font-mono">
                  <li>Always check red predator intent arrows before ending your turn.</li>
                  <li>Use kinetic knockback to push enemies into rocks or Tesla pylon zap zones.</li>
                  <li>Electric attacks chain across conductive water pools.</li>
                  <li>Keep at least 1 shield up during Solar Flare weather to avoid burn damage.</li>
                  <li>Command your companion to flank beasts from behind for critical damage.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-emerald-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold transition cursor-pointer"
          >
            CLOSE CODEX
          </button>
        </div>
      </div>
    </div>
  );
};
