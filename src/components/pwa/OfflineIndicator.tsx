import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-3.5 py-2 text-xs font-mono text-amber-200 shadow-xl">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>AUTONOMOUS OFFLINE RIG — Tactical state cached locally</span>
    </div>
  );
};
