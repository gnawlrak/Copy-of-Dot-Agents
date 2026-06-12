
import React, { useEffect, useState } from 'react';
import { SaveSystem } from '../data/services/save-system';
import { Play, Users, ShieldCheck, Map, Trophy, Award, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface MainMenuProps {
  onStart: () => void;
  onGoToLoadout: () => void;
  onGoToEditor: () => void;
  onGoToMultiplayer: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  totalScore?: number;
  highScore?: number;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onGoToLoadout, onGoToEditor, onGoToMultiplayer, syncStatus, totalScore, highScore }) => {
  const [displayTotal, setDisplayTotal] = useState<number>(totalScore ?? 0);
  const [displayHigh, setDisplayHigh] = useState<number>(highScore ?? 0);

  useEffect(() => {
    // Always try to load the latest persisted scores and then merge with props
    // so returning to the menu shows the most up-to-date values.
    let mounted = true;
    const load = async () => {
      try {
        const data = await SaveSystem.loadGameData();
        if (!mounted) return;
        const persistedTotal = (data && typeof data.totalScore === 'number') ? data.totalScore : 0;
        const persistedHigh = (data && typeof data.highScore === 'number') ? data.highScore : 0;

        // Prefer prop values when provided; otherwise use persisted values.
        setDisplayTotal(typeof totalScore !== 'undefined' ? totalScore : persistedTotal);
        setDisplayHigh(typeof highScore !== 'undefined' ? highScore : persistedHigh);
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, [totalScore, highScore]);
  const getSyncText = () => {
    switch (syncStatus) {
        case 'syncing': return 'Syncing...';
        case 'synced': return 'Saved locally.';
        case 'error': return 'Save error.';
        default: return 'INTDGYISGOD + gnaWlraK';
    }
  };
  
  return (
    <div className="text-center flex flex-col items-center justify-center w-full min-h-full my-auto">
      <div className="mb-12">
        <h1 className="text-6xl lg:text-8xl font-bold tracking-widest text-teal-300 animate-pulse">DOT AGENTS</h1>
        <p className="text-gray-400 mt-2 text-lg">Close-Quarters Battle Simulation</p>
      </div>
      <div className="mb-6 flex gap-4 justify-center">
        <div className="bg-gray-900/60 border border-gray-700/80 text-teal-300 px-5 py-3 rounded-md flex items-center gap-3">
          <Award className="h-6 w-6 text-yellow-400/80" />
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Total Score</div>
            <div className="font-mono font-bold text-xl leading-none">{displayTotal}</div>
          </div>
        </div>
        <div className="bg-gray-900/60 border border-gray-700/80 text-teal-300 px-5 py-3 rounded-md flex items-center gap-3">
          <Trophy className="h-6 w-6 text-teal-400/80" />
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">High Score</div>
            <div className="font-mono font-bold text-xl leading-none">{displayHigh}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={onStart}
              className="px-8 py-4 bg-teal-500 text-black font-bold text-xl tracking-widest rounded-md border-2 border-teal-300 shadow-lg shadow-teal-500/30 hover:bg-teal-400 hover:shadow-teal-400/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current" />
              START MISSION
            </button>
            <button
              onClick={onGoToMultiplayer}
              className="px-8 py-4 bg-sky-500 text-black font-bold text-xl tracking-widest rounded-md border-2 border-sky-300 shadow-lg shadow-sky-500/30 hover:bg-sky-400 hover:shadow-sky-400/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Users className="h-5 w-5 fill-current" />
              MULTIPLAYER
            </button>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onGoToLoadout}
            className="px-6 py-3 bg-gray-800 text-teal-300 font-bold text-base tracking-widest rounded-md border-2 border-gray-600/50 hover:bg-gray-700 hover:border-teal-500 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <ShieldCheck className="h-5 w-5" />
            LOADOUT
          </button>
          <button
            onClick={onGoToEditor}
            className="px-6 py-3 bg-gray-800 text-teal-300 font-bold text-base tracking-widest rounded-md border-2 border-gray-600/50 hover:bg-gray-700 hover:border-teal-500 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Map className="h-5 w-5" />
            MAP EDITOR
          </button>
        </div>
      </div>
      
      <div className="mt-8 h-8 flex items-center justify-center gap-2 font-mono text-xs">
        {syncStatus === 'syncing' && (
          <div className="flex items-center gap-1.5 text-teal-400/85">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Syncing cloud profile...</span>
          </div>
        )}
        {syncStatus === 'synced' && (
          <div className="flex items-center gap-1.5 text-emerald-400/85">
            <CheckCircle2 className="h-4 w-4" />
            <span>Saved locally.</span>
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-rose-400/85">
            <AlertCircle className="h-4 w-4" />
            <span>Save error occurred.</span>
          </div>
        )}
        {syncStatus === 'idle' && (
          <span className="text-gray-500/70 select-none">INTDGYISGOD + gnaWlraK</span>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
