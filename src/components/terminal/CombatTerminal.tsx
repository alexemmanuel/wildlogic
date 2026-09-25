import React, { useEffect, useRef } from 'react';
import { CombatLogEntry } from '../../types/game';
import { Terminal, ShieldAlert, Cpu, Sparkles, Activity } from 'lucide-react';

interface CombatTerminalProps {
  logs: CombatLogEntry[];
}

export const CombatTerminal: React.FC<CombatTerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getSenderBadge = (sender: CombatLogEntry['sender']) => {
    switch (sender) {
      case 'OPERATOR':
        return <span className="text-emerald-400 font-bold">[OPERATOR]</span>;
      case 'COMPANION':
        return <span className="text-cyan-400 font-bold">[COMPANION]</span>;
      case 'WILD':
        return <span className="text-rose-400 font-bold">[WILD FAUNA]</span>;
      case 'HAZARD':
        return <span className="text-amber-400 font-bold">[HAZARD]</span>;
      default:
        return <span className="text-purple-400 font-bold">[SYSTEM]</span>;
    }
  };

  const getLogColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'damage': return 'text-rose-300';
      case 'heal': return 'text-emerald-300';
      case 'alert': return 'text-amber-300';
      case 'hack': return 'text-purple-300';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#030806]/90 border border-emerald-950 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-950/80 bg-[#050f0b] text-[11px] font-mono text-emerald-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold tracking-wider">TACTICAL LOG TERMINAL</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE FEED</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 p-2.5 overflow-y-auto space-y-1.5 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-emerald-950"
      >
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 border-l border-emerald-950/40 pl-2">
            <span className="text-slate-600 text-[9px] font-mono whitespace-nowrap mt-0.5">
              T{log.turn}
            </span>
            <div className="flex-1">
              <span className="mr-1.5 text-[10px]">{getSenderBadge(log.sender)}</span>
              <span className={getLogColor(log.type)}>{log.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
