
import React, { useEffect, useState } from 'react';
import { SaveSystem } from '../data/services/save-system';
import { Play, Users, ShieldCheck, Map, Trophy, Award, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface MainMenuProps {
  onStart: () => void;
  onGoToLoadout: () => void;
  onGoToEditor: () => void;
  onGoToMultiplayer: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  totalScore?: number;
  highScore?: number;
  currentUser?: string;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onGoToLoadout, onGoToEditor, onGoToMultiplayer, syncStatus, totalScore, highScore, currentUser }) => {
  const { language, t } = useLanguage();
  const [displayTotal, setDisplayTotal] = useState<number>(totalScore ?? 0);
  const [displayHigh, setDisplayHigh] = useState<number>(highScore ?? 0);

  useEffect(() => {
    // Always try to load the latest persisted scores and then merge with props
    // so returning to the menu shows the most up-to-date values.
    let mounted = true;
    const load = async () => {
      try {
        const data = await SaveSystem.loadGameData(currentUser || 'guest');
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

  return (
    <div className="text-center flex flex-col items-center justify-center w-full min-h-full my-auto menu-in">
      <div className="mb-10 flex flex-col items-center">
        <h1 className="font-display text-6xl lg:text-8xl tracking-wide text-bone leading-none">
          {t('appName')}
        </h1>
        <div className="hazard h-1.5 w-48 lg:w-72 mt-4" aria-hidden="true" />
        <p className="text-dim mt-4 text-[11px] lg:text-xs uppercase tracking-[0.3em] font-mono">
          {t('subTitle')}
        </p>
      </div>

      <div className="mb-10 flex gap-3 justify-center">
        <div className="bg-panel border border-line px-5 py-3 flex items-center gap-3">
          <Award className="h-5 w-5 text-signal" />
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.2em] text-dim font-mono">{t('totalScore')}</div>
            <div className="font-mono font-bold text-xl leading-none text-bone tabular-nums">{displayTotal}</div>
          </div>
        </div>
        <div className="bg-panel border border-line px-5 py-3 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-signal" />
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.2em] text-dim font-mono">{t('highScore')}</div>
            <div className="font-mono font-bold text-xl leading-none text-bone tabular-nums">{displayHigh}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 items-center">
        <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onStart}
              className="group px-10 py-4 bg-signal text-ink font-cond font-bold text-xl tracking-[0.2em] uppercase hover:bg-teal-400 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current" />
              {t('startMission')}
            </button>
            <button
              onClick={onGoToMultiplayer}
              className="px-10 py-4 bg-panel2 text-bone font-cond font-bold text-xl tracking-[0.2em] uppercase border border-line hover:border-signal hover:text-signal transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
            >
              <Users className="h-5 w-5" />
              {t('multiplayer')}
            </button>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={onGoToLoadout}
            className="px-6 py-2.5 text-dim font-cond font-semibold text-base tracking-[0.15em] uppercase border border-transparent hover:border-line hover:text-bone hover:bg-panel transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            {t('loadout')}
          </button>
          <button
            onClick={onGoToEditor}
            className="px-6 py-2.5 text-dim font-cond font-semibold text-base tracking-[0.15em] uppercase border border-transparent hover:border-line hover:text-bone hover:bg-panel transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Map className="h-4 w-4" />
            {t('mapEditor')}
          </button>
        </div>
      </div>

      <div className="mt-10 h-6 flex items-center justify-center gap-2 font-mono text-xs">
        {syncStatus === 'syncing' && (
          <div className="flex items-center gap-1.5 text-signal/85">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t('syncing')}</span>
          </div>
        )}
        {syncStatus === 'synced' && (
          <div className="flex items-center gap-1.5 text-emerald-400/85">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('savedLocally')}</span>
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-danger/85">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{t('saveError')}</span>
          </div>
        )}
        {syncStatus === 'idle' && (
          <span className="text-dim/50 select-none">INTDGYISGOD + gnaWlraK</span>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
