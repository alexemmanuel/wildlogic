import React, { useState } from 'react';
import { Download, Sparkles, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-950 tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
        title="Install Wild Logic as a standalone Progressive Web App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>INSTALL PWA</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1.5 text-xs font-mono text-emerald-300 transition-all cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>INSTALL APP</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-xl border border-emerald-500/40 bg-[#091510] p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display font-bold text-emerald-400 tracking-wide">INSTALL ON iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-emerald-900/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs font-sans text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="font-mono text-emerald-400 font-bold">01.</span>
                  Tap the <strong className="text-white">Share</strong> icon at the bottom of Safari.
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-mono text-emerald-400 font-bold">02.</span>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-mono text-emerald-400 font-bold">03.</span>
                  Launch from your home screen for full offline immersion and fullscreen grid action.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-mono font-bold text-emerald-950 transition tracking-wider uppercase cursor-pointer"
              >
                Acknowledge Protocol
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
