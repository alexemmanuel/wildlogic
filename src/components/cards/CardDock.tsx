import React from 'react';
import { LogicCard } from '../../types/game';
import { 
  Zap, 
  Shield, 
  Cpu, 
  Radio, 
  Snowflake, 
  Sun, 
  Flame, 
  HeartPulse, 
  Crosshair, 
  Layers, 
  Sparkles,
  Eye,
  Move,
  ArrowRight
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface CardDockProps {
  hand: LogicCard[];
  deckCount: number;
  discardCount: number;
  currentLogic: number;
  maxLogic: number;
  selectedCard: LogicCard | null;
  onSelectCard: (card: LogicCard | null) => void;
  onEndTurn: () => void;
  disabled: boolean;
}

export const CardDock: React.FC<CardDockProps> = ({
  hand,
  deckCount,
  discardCount,
  currentLogic,
  maxLogic,
  selectedCard,
  onSelectCard,
  onEndTurn,
  disabled,
}) => {
  const getCardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Shield': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'Radio': return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'Snowflake': return <Snowflake className="w-4 h-4 text-blue-300" />;
      case 'Sun': return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'HeartPulse': return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case 'Crosshair': return <Crosshair className="w-4 h-4 text-red-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-stone-400" />;
      case 'Eye': return <Eye className="w-4 h-4 text-teal-400" />;
      case 'Move': return <Move className="w-4 h-4 text-indigo-400" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getRarityGlow = (rarity: LogicCard['rarity'], isSelected: boolean) => {
    if (isSelected) {
      return 'border-amber-400 ring-2 ring-amber-400/80 bg-gradient-to-b from-[#1b2b20] to-[#0d1712] shadow-[0_0_20px_rgba(251,191,36,0.5)] -translate-y-3';
    }
    switch (rarity) {
      case 'prototype':
        return 'border-purple-500/70 hover:border-purple-400 bg-gradient-to-b from-[#190d24] to-[#09050d] hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]';
      case 'rare':
        return 'border-cyan-500/60 hover:border-cyan-400 bg-gradient-to-b from-[#091f24] to-[#040e12] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]';
      default:
        return 'border-emerald-500/40 hover:border-emerald-400 bg-gradient-to-b from-[#0d1f16] to-[#050e09] hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    }
  };

  const handleCardClick = (card: LogicCard) => {
    if (disabled) return;
    if (selectedCard?.id === card.id) {
      onSelectCard(null);
    } else {
      if (card.cost > currentLogic) {
        sound.playAlarm();
        return;
      }
      sound.playCardSelect();
      onSelectCard(card);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 py-2">
      {/* Logic Pool & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-2">
        {/* Logic Pool Bar */}
        <div className="flex items-center gap-3 bg-[#050a08]/90 border border-emerald-500/30 rounded-xl px-4 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-display font-bold text-xs tracking-wider text-emerald-300">LOGIC POOL:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxLogic }).map((_, idx) => (
              <div
                key={idx}
                className={`w-6 h-5 rounded border transition-all duration-200 flex items-center justify-center font-mono text-[9px] font-bold ${
                  idx < currentLogic
                    ? 'bg-emerald-500 border-emerald-300 text-emerald-950 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-slate-900 border-slate-700 text-slate-600'
                }`}
              >
                LP
              </div>
            ))}
          </div>

          <span className="font-mono text-xs font-bold text-slate-300 ml-1">
            {currentLogic} / {maxLogic}
          </span>
        </div>

        {/* Deck / Discard Statistics */}
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-[#091510] border border-emerald-900/60 rounded-lg px-2.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>SUBROUTINES: <strong className="text-cyan-300">{deckCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#091510] border border-emerald-900/60 rounded-lg px-2.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>EXHAUSTED: <strong className="text-amber-300">{discardCount}</strong></span>
          </div>
        </div>

        {/* End Turn Button */}
        <button
          onClick={onEndTurn}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase transition-all shadow-lg cursor-pointer
            ${currentLogic === 0
              ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 border border-yellow-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.6)]'
              : 'bg-emerald-600/90 hover:bg-emerald-500 text-emerald-950 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            }
          `}
        >
          <span>EXECUTE & END TURN</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hand of Logic Cards */}
      <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-2 px-1 scrollbar-none">
        {hand.map((card) => {
          const isSelected = selectedCard?.id === card.id;
          const canAfford = card.cost <= currentLogic;

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`
                relative flex-shrink-0 w-36 sm:w-40 md:w-44 rounded-xl border p-2.5 transition-all duration-200 cursor-pointer select-none
                ${getRarityGlow(card.rarity, isSelected)}
                ${!canAfford ? 'opacity-40 grayscale-[40%]' : 'hover:-translate-y-2'}
              `}
            >
              {/* Cost Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {getCardIcon(card.iconName)}
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {card.type}
                  </span>
                </div>

                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-950 border border-emerald-400 font-mono text-[10px] font-bold text-emerald-300 shadow-sm">
                  {card.cost}
                </div>
              </div>

              {/* Title */}
              <h4 className="font-display font-bold text-xs tracking-wide text-slate-100 truncate mb-1">
                {card.name}
              </h4>

              {/* Description */}
              <p className="text-[10px] font-sans text-slate-300 leading-tight mb-2 h-10 overflow-hidden line-clamp-3">
                {card.description}
              </p>

              {/* Card Footer: Range & Target */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[8px] font-mono text-slate-400">
                <span>RNG: {card.range > 0 ? `${card.range} T` : 'SELF'}</span>
                <span className="uppercase text-emerald-400 font-bold">
                  {card.targetType.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}

        {hand.length === 0 && (
          <div className="text-center py-6 text-slate-500 font-mono text-xs">
            NO SUBROUTINES IN BUFFER — PROCEED TO NEXT TURN CYCLE
          </div>
        )}
      </div>
    </div>
  );
};
