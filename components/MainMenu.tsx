
import React, { useEffect, useState } from 'react';
import { SaveSystem } from '../data/services/save-system';

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
  const [username, setUsername] = useState<string | null>(null);

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

  useEffect(() => {
    // check logged-in user via token
    let mounted = true;
    
    const checkLoginAndLoadSave = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUsername(null);
          return;
        }
        
        const res = await fetch('/api/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!mounted) return;
        
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
          
          // 获取用户存档
          const saveRes = await fetch('/api/save', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            if (saveData) {
              // 更新本地存档
              await SaveSystem.saveGameData(saveData);
              // 更新显示的分数
              setDisplayTotal(saveData.totalScore || 0);
              setDisplayHigh(saveData.highScore || 0);
            }
          }
        } else {
          // 如果 /api/me 请求失败，清除 token
          localStorage.removeItem('token');
          setUsername(null);
        }
      } catch (error) {
        console.error('检查登录状态或加载存档时出错:', error);
        setUsername(null);
      }
    };
    
    checkLoginAndLoadSave();
    return () => { mounted = false; };
  }, []);

  async function doLogout() {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    window.location.reload();
  }
  const getSyncText = () => {
    switch (syncStatus) {
        case 'syncing': return 'Syncing...';
        case 'synced': return 'Saved locally.';
        case 'error': return 'Save error.';
        default: return 'INTDGYISGOD + gnaWlraK';
    }
  };
  
  return (
    <div className="text-center flex flex-col items-center justify-center w-full h-full">
      <div className="mb-12">
          <div className="flex items-center justify-between">
            <h1 className="text-6xl lg:text-8xl font-bold tracking-widest text-teal-300 animate-pulse">DOT AGENTS</h1>
            {username && (
              <div className="ml-4">
                <button onClick={doLogout} className="px-3 py-1 bg-red-600 text-white rounded-md">登出 ({username})</button>
              </div>
            )}
          </div>
        <p className="text-gray-400 mt-2 text-lg">Close-Quarters Battle Simulation</p>
      </div>
      <div className="mb-6 flex gap-4 justify-center">
        <div className="bg-gray-900/60 border border-gray-700 text-teal-300 px-4 py-2 rounded">
          <div className="text-xs">Total Score</div>
          <div className="font-bold text-lg">{displayTotal}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-700 text-teal-300 px-4 py-2 rounded">
          <div className="text-xs">High Score</div>
          <div className="font-bold text-lg">{displayHigh}</div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-4">
            <button
              onClick={onStart}
              className="px-8 py-4 bg-teal-500 text-black font-bold text-2xl tracking-widest rounded-md border-2 border-teal-300 shadow-lg shadow-teal-500/50 hover:bg-teal-400 hover:shadow-teal-400/50 transition-all duration-300 transform hover:scale-105"
            >
              START MISSION
            </button>
            <button
              onClick={onGoToMultiplayer}
              className="px-8 py-4 bg-sky-500 text-black font-bold text-2xl tracking-widest rounded-md border-2 border-sky-300 shadow-lg shadow-sky-500/50 hover:bg-sky-400 hover:shadow-sky-400/50 transition-all duration-300 transform hover:scale-105"
            >
              MULTIPLAYER
            </button>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onGoToLoadout}
            className="px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            LOADOUT
          </button>
          <button
            onClick={onGoToEditor}
            className="px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            MAP EDITOR
          </button>
        </div>
      </div>
       <p className="text-gray-500 mt-6 h-6">{getSyncText()}</p>
    </div>
  );
};

export default MainMenu;
