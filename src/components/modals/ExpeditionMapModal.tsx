import React from 'react';
import { ExpeditionNode, BiomeType } from '../../types/game';
import { 
  Map, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  Heart, 
  ShoppingBag, 
  Skull, 
  ArrowRight,
  X,
  Compass
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface ExpeditionMapModalProps {
  nodes: ExpeditionNode[];
  currentNodeId: string | null;
  onSelectNode: (node: ExpeditionNode) => void;
  onClose: () => void;
  sectorLevel: number;
  biome: BiomeType;
}

export const ExpeditionMapModal: React.FC<ExpeditionMapModalProps> = ({
  nodes,
  currentNodeId,
  onSelectNode,
  onClose,
  sectorLevel,
  biome,
}) => {
  const getNodeIcon = (type: ExpeditionNode['type']) => {
    switch (type) {
      case 'boss': return <Skull className="w-5 h-5 text-rose-400" />;
      case 'elite': return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'vault': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'oasis': return <Heart className="w-5 h-5 text-emerald-400" />;
      case 'merchant': return <ShoppingBag className="w-5 h-5 text-cyan-400" />;
      default: return <Compass className="w-5 h-5 text-emerald-400" />;
    }
  };

  // Group nodes by tier (0, 1, 2, 3)
  const tiers = [0, 1, 2, 3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-emerald-500/30 bg-[#040907] p-5 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <Map className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg tracking-wider text-slate-100">
                WILD EXPEDITION MAP
              </h2>
              <p className="text-xs font-mono text-emerald-400">
                SECTOR {sectorLevel.toString().padStart(2, '0')} • PLOT YOUR TACTICAL ADVANCE
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

        {/* Visual Map Flow */}
        <div className="flex-1 overflow-y-auto py-6 px-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {tiers.map((tier) => {
              const tierNodes = nodes.filter((n) => n.tier === tier);
              const tierNames = ['ENTRY POINT', 'DIVERGENCE', 'WILD RECON', 'SECTOR MONOLITH'];

              return (
                <div key={tier} className="flex flex-col gap-3">
                  <div className="text-[10px] font-mono text-emerald-400/80 font-bold tracking-widest text-center border-b border-emerald-950/80 pb-1 uppercase">
                    TIER 0{tier} • {tierNames[tier]}
                  </div>

                  <div className="flex flex-col gap-3 justify-center flex-1">
                    {tierNodes.map((node) => {
                      const isCurrent = currentNodeId === node.id;
                      const isClickable = node.available && !node.completed;

                      return (
                        <div
                          key={node.id}
                          onClick={() => {
                            if (isClickable) {
                              sound.playCardSelect();
                              onSelectNode(node);
                            }
                          }}
                          className={`
                            relative rounded-xl border p-3.5 transition-all flex flex-col justify-between
                            ${isCurrent
                              ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                              : node.completed
                              ? 'bg-[#060c09] border-emerald-950 opacity-60'
                              : isClickable
                              ? 'bg-[#091510] border-emerald-500/60 hover:border-emerald-400 hover:scale-102 cursor-pointer shadow-md'
                              : 'bg-[#050907] border-slate-900 opacity-40 cursor-not-allowed'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-center">
                                {getNodeIcon(node.type)}
                              </div>
                              <div>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                                  {node.type}
                                </span>
                                <h4 className="font-display font-bold text-xs text-slate-100 leading-tight">
                                  {node.name}
                                </h4>
                              </div>
                            </div>

                            {isCurrent && (
                              <span className="text-[9px] font-mono bg-emerald-500 text-emerald-950 font-bold px-1.5 py-0.5 rounded">
                                ACTIVE
                              </span>
                            )}
                            {node.completed && (
                              <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                CLEARED
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] font-sans text-slate-400 leading-normal mb-3">
                            {node.hazardNote}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-amber-300 font-bold">
                              <Zap className="w-3 h-3 text-amber-400" /> +{node.rewardScrap} SCRAP
                            </span>

                            {isClickable && (
                              <span className="text-emerald-400 font-bold flex items-center gap-0.5 animate-pulse">
                                TRAVEL <ArrowRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-emerald-950 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Complete encounters to unlock subsequent expedition branches.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold transition cursor-pointer"
          >
            RETURN TO GRID
          </button>
        </div>
      </div>
    </div>
  );
};
