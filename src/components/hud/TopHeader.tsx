import React from 'react';
import { 
  BiomeType, 
  WeatherType 
} from '../../types/game';
import { 
  Sun, 
  CloudRain, 
  Wind, 
  Eye, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Map, 
  Layers, 
  BookOpen, 
  Grid,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { sound } from '../../utils/audio';

interface TopHeaderProps {
  sectorLevel: number;
  biome: BiomeType;
  weather: WeatherType;
  weatherCountdown: number;
  scrap: number;
  turnNumber: number;
  currentMode: 'grid' | 'expedition_map' | 'deck' | 'codex';
  onChangeMode: (mode: 'grid' | 'expedition_map' | 'deck' | 'codex') => void;
  onCycleWeather?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sectorLevel,
  biome,
  weather,
  weatherCountdown,
  scrap,
  turnNumber,
  currentMode,
  onChangeMode,
  onCycleWeather,
  isMuted,
  onToggleMute,
}) => {
  const getBiomeName = (b: BiomeType) => {
    switch (b) {
      case 'solar_spire_basin': return 'Solar Spire Basin';
      case 'neon_mangrove': return 'Neon Mangrove Swamp';
      case 'ferro_dunes': return 'Ferro-Dune Expanse';
      case 'reactor_ruins': return 'Reactor Core Ruins';
    }
  };

  const getWeatherDetails = (w: WeatherType) => {
    switch (w) {
      case 'solar_flare':
        return {
          name: 'Solar Flare Surge',
          icon: <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          color: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
          desc: '+1 LP/Turn, but unshielded entities take 2 burn damage',
        };
      case 'acid_monsoon':
        return {
          name: 'Acid Monsoon',
          icon: <CloudRain className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />,
          color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
          desc: 'Corrodes 1 Armor/Turn and transforms ground into acid',
        };
      case 'emp_dust_storm':
        return {
          name: 'EMP Dust Storm',
          icon: <Wind className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />,
          color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
          desc: 'Radar distorted; -1 Logic Pool; wild beasts attack erratically',
        };
      case 'bioluminescent_fog':
        return {
          name: 'Ion Spore Fog',
          icon: <Eye className="w-3.5 h-3.5 text-purple-400 animate-pulse" />,
          color: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
          desc: 'Vision restricted to 2 tiles; beasts gain surprise bonus',
        };
      default:
        return {
          name: 'Stable Techno-Skies',
          icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/30',
          desc: 'Normal atmospheric conditions',
        };
    }
  };

  const weatherInfo = getWeatherDetails(weather);

  return (
    <header className="w-full bg-[#030705]/95 border-b border-emerald-500/20 backdrop-blur-md px-4 py-2.5 z-40 sticky top-0">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Game Title & Sector Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="font-display font-black text-sm text-emerald-400">WL</span>
            </div>
            <div>
              <h1 className="font-display font-black text-sm sm:text-base tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>WILD LOGIC</span>
                <span className="text-[10px] font-mono font-normal text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                  GRID SEC {sectorLevel.toString().padStart(2, '0')}
                </span>
              </h1>
              <p className="text-[10px] font-mono text-slate-400 truncate max-w-[180px] sm:max-w-none">
                {getBiomeName(biome)} • Turn {turnNumber}
              </p>
            </div>
          </div>

          {/* Dynamic Weather Hazard Widget */}
          <button
            onClick={onCycleWeather}
            className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer hover:scale-102 active:scale-98 ${weatherInfo.color}`}
            title={`${weatherInfo.desc} • Click to cycle atmospheric phenomenon`}
          >
            {weatherInfo.icon}
            <span className="font-bold">{weatherInfo.name}</span>
            <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
              SHIFT IN: <strong className="text-white">{weatherCountdown}T</strong>
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#06120c] border border-emerald-950 rounded-xl p-1">
          <button
            onClick={() => onChangeMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentMode === 'grid'
                ? 'bg-emerald-600 text-emerald-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GRID COMBAT</span>
          </button>

          <button
            onClick={() => onChangeMode('expedition_map')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentMode === 'expedition_map'
                ? 'bg-emerald-600 text-emerald-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXPEDITION</span>
          </button>

          <button
            onClick={() => onChangeMode('deck')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentMode === 'deck'
                ? 'bg-emerald-600 text-emerald-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LOGIC RIG</span>
          </button>

          <button
            onClick={() => onChangeMode('codex')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentMode === 'codex'
                ? 'bg-emerald-600 text-emerald-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CODEX</span>
          </button>
        </nav>

        {/* Resources & Utilities */}
        <div className="flex items-center gap-2">
          {/* Scrap Currency */}
          <div className="flex items-center gap-1.5 bg-[#081710] border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs font-mono text-amber-300 font-bold shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{scrap}</span>
            <span className="text-[9px] text-amber-400/70 font-normal">SCRAP</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg border border-emerald-900/60 bg-[#06120c] hover:bg-emerald-900/40 text-slate-300 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
