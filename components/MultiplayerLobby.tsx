import React, { useState, useEffect } from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { Globe, Users, Gamepad2, Radio, Play, Plus, Shuffle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface MultiplayerLobbyProps {
  onJoinGame: (level: LevelDefinition, roomId: string, roomName: string, mode: 'tdm' | 'ffa' | '1v1', maxPlayers?: number, matchDuration?: number) => void;
  missions: LevelDefinition[];
}

interface ActiveRoom {
  id: string;
  name: string;
  mode: 'tdm' | 'ffa' | '1v1';
  levelName: string;
  playersCount: number;
  maxPlayers: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  kd: number;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onJoinGame, missions }) => {
    const { language, t } = useLanguage();
    // Only use official missions that are valid maps
    const availableLevels = missions.filter(m => m.name);
    
    const [livePlayersCount, setLivePlayersCount] = useState<number>(0);
    const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [leaderboardTab, setLeaderboardTab] = useState<'kills' | 'kd'>('kills');
    const [killLeaderboard, setKillLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [kdLeaderboard, setKDLeaderboard] = useState<LeaderboardEntry[]>([]);

    // Custom Room Form State
    const [customRoomName, setCustomRoomName] = useState('ALPHA SQUADRON');
    const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
    const [selectedMode, setSelectedMode] = useState<'tdm' | 'ffa' | '1v1'>('tdm');
    const [maxPlayers, setMaxPlayers] = useState<number>(8);
    const [matchDuration, setMatchDuration] = useState<number>(10); // minutes

    // Fetch live session info
    const fetchLobbyStats = async () => {
        try {
            const resHealth = await fetch('/api/health');
            const dataHealth = await resHealth.json();
            if (typeof dataHealth.playersConnected === 'number') {
                setLivePlayersCount(dataHealth.playersConnected);
            }

            const resRooms = await fetch('/api/rooms');
            const dataRooms = await resRooms.json();
            if (Array.isArray(dataRooms.rooms)) {
                setActiveRooms(dataRooms.rooms);
            }

            const resLeaderboards = await fetch('/api/leaderboards');
            const dataLeaderboards = await resLeaderboards.json();
            if (Array.isArray(dataLeaderboards.killLeaderboard)) {
                setKillLeaderboard(dataLeaderboards.killLeaderboard);
            }
            if (Array.isArray(dataLeaderboards.kdLeaderboard)) {
                setKDLeaderboard(dataLeaderboards.kdLeaderboard);
            }
        } catch (e) {
            console.error('[Lobby] Failed to synchronize live multiplayer states:', e);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    useEffect(() => {
        fetchLobbyStats();
        const timer = setInterval(fetchLobbyStats, 3000);
        return () => clearInterval(timer);
    }, []);

    // Create a new customized room
    const handleCreateRoom = () => {
        const choiceLevel = availableLevels[selectedLevelIndex] || availableLevels[0];
        const randomId = `ROOM_${Math.floor(1000 + Math.random() * 9000)}`;
        if (choiceLevel) {
            const resolvedMax = selectedMode === '1v1' ? 2 : Math.max(2, Math.min(16, maxPlayers));
            const resolvedDuration = Math.max(1, Math.min(30, matchDuration));
            onJoinGame(choiceLevel, randomId, customRoomName.trim() || 'TACTICAL SQUAD', selectedMode, resolvedMax, resolvedDuration);
        }
    };

    // Quick matchmaking trigger (Quick Play)
    const handleQuickMatchmaking = () => {
        // Look for any existing room that has space
        const joinableRoom = activeRooms.find(r => r.playersCount < r.maxPlayers);
        
        if (joinableRoom) {
            // Find corresponding level definition by name to join
            const targetLevel = availableLevels.find(m => m.name === joinableRoom.levelName) || availableLevels[0];
            onJoinGame(targetLevel, joinableRoom.id, joinableRoom.name, joinableRoom.mode);
        } else {
            // No rooms available or all are full, build a random room
            const randomLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)] || availableLevels[0];
            const randomMode: 'tdm' | 'ffa' | '1v1' = (['tdm', 'ffa', '1v1'] as const)[Math.floor(Math.random() * 3)];
            const randomId = `ROOM_${Math.floor(1000 + Math.random() * 9000)}`;
            const randomName = `${language === 'en' ? 'MATCH' : '战术特训'} #${Math.floor(100 + Math.random() * 900)}`;
            const randomMax = randomMode === '1v1' ? 2 : 8;
            const randomDuration = 10;
            
            onJoinGame(randomLevel, randomId, randomName, randomMode, randomMax, randomDuration);
        }
    };

    // Translate level names in custom select dropdown
    const getLevelDisplayName = (name: string) => {
        if (language === 'en') return name;
        if (name.toUpperCase().includes('TRAINING GROUND')) {
            return 'CQB 基础训练场 (Training)';
        }
        if (name.toUpperCase().includes('EXPANSION')) {
            return '废弃工厂：深度扩张区 (Expansion)';
        }
        if (name.toUpperCase() === 'THE FACTORY') {
            return '废弃工厂区域 (The Factory)';
        }
        return name;
    };

    return (
    <div className="w-full max-w-5xl flex flex-col min-h-full justify-center my-auto mx-auto px-4 py-6 menu-in">
      <div className="mb-8">
        <h1 className="font-display text-4xl lg:text-5xl tracking-wide text-bone flex items-center justify-center gap-3">
          <Globe className="h-8 w-8 text-signal" />
          {t('mpLobby')}
        </h1>
        <div className="hazard h-1 w-40 mx-auto mt-4" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left column: Create and Matchmaking controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Matchmaking component */}
          <div className="bg-panel border border-line p-6">
            <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono flex items-center gap-2 mb-3">
              <Shuffle className="h-4 w-4 text-signal" />
              {language === 'en' ? 'QUICK MATCHMAKING' : '快速对抗匹配 (MATCHMAKING)'}
            </h3>
            <p className="text-xs text-dim leading-relaxed mb-5">
              {language === 'en' 
                ? 'Instantly join the most suitable active room. If no rooms are currently active, a new random session with a recommended map and random rules will be established.' 
                : '立即进入最适合您当前未满员的实战对战房间。若当前无活跃房间，系统将自动推荐一张战斗地图。'}
            </p>
            <button
              onClick={handleQuickMatchmaking}
              className="w-full px-6 py-4 bg-signal text-ink font-cond font-bold text-base tracking-[0.15em] uppercase hover:bg-teal-400 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Shuffle className="h-5 w-5" />
              {language === 'en' ? 'QUICK MATCHPLAY / AUTO JOIN' : '自动寻找房间 / 快速加入'}
            </button>
          </div>

          {/* Custom Room Creator Form */}
          <div className="bg-panel border border-line p-6 space-y-4">
            <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono flex items-center gap-2 border-b border-line pb-2">
              <Plus className="h-4 w-4 text-signal" />
              {language === 'en' ? 'COMMAND NEW ROOM' : '开设专属特训房屋 (CREATE ROOM)'}
            </h3>

            {/* Room Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-dim">{language === 'en' ? 'Room Name / Custom ID' : '房间代号 / Custom ID'}</label>
              <input
                type="text"
                maxLength={20}
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-ink border border-line font-bold font-mono text-bone text-sm focus:border-signal focus:outline-none"
                placeholder={language === 'en' ? 'INPUT ROOM NAME' : '输入自定义房间命名'}
              />
            </div>

            {/* Game Mode select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-dim">{language === 'en' ? 'GAME MODE' : '对抗交火规则'}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'tdm', label: 'TDM', desc: language === 'en' ? 'Teams' : '团队对抗' },
                  { value: 'ffa', label: 'FFA', desc: language === 'en' ? 'Solo' : '个人竞技' },
                  { value: '1v1', label: '1V1', desc: language === 'en' ? 'Duel' : '巅峰单挑' }
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setSelectedMode(m.value as any);
                      if (m.value === '1v1') {
                        setMaxPlayers(2);
                      }
                    }}
                    className={`p-2.5 border text-center transition-all cursor-pointer ${
                      selectedMode === m.value 
                        ? 'border-signal bg-panel2 text-signal font-bold' 
                        : 'border-line bg-ink text-dim hover:border-signal hover:text-bone'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">{m.label}</div>
                    <div className="text-[10px] opacity-75 font-sans mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Players */}
            {selectedMode !== '1v1' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-dim">{language === 'en' ? 'Max Players' : '最大人数 / Max Players'}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={16}
                    step={1}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-line appearance-none cursor-pointer accent-teal-500"
                  />
                  <span className="text-sm font-bold text-bone font-mono tabular-nums w-8 text-right">{maxPlayers}</span>
                </div>
              </div>
            )}

            {/* Match Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-dim">{language === 'en' ? 'Match Duration' : '对局时长 (分钟)'}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-line appearance-none cursor-pointer accent-teal-500"
                />
                <span className="text-sm font-bold text-bone font-mono tabular-nums w-10 text-right">{matchDuration}m</span>
              </div>
            </div>

            {/* Select Map */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-dim">{language === 'en' ? 'TACTICAL SECTOR' : '执行演练地图'}</label>
              <select
                value={selectedLevelIndex}
                onChange={(e) => setSelectedLevelIndex(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-ink border border-line font-mono font-bold text-bone text-sm focus:border-signal focus:outline-none"
              >
                {availableLevels.map((lvl, index) => (
                  <option key={index} value={index}>
                    {getLevelDisplayName(lvl.name)} ({lvl.isTrainingGround ? (language === 'en' ? 'TRAINING' : '射击场') : (language === 'en' ? 'TACTICAL' : '实战区')})
                  </option>
                ))}
              </select>
            </div>

            {/* Initialize Button */}
            <button
              onClick={handleCreateRoom}
              disabled={!availableLevels.length}
              className="w-full px-6 py-3.5 bg-signal text-ink font-cond font-bold text-base tracking-[0.15em] uppercase hover:bg-teal-400 transition-all cursor-pointer disabled:bg-panel2 disabled:text-dim disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              {language === 'en' ? 'LAUNCH MISSION ROOM' : '创建并突入该特训战区'}
            </button>
          </div>

        </div>

        {/* Right column: Live Session List & Leaderboards */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-panel border border-line p-6 flex flex-col h-[420px]">
            <div className="flex justify-between items-center border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-signal" />
                <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono">{language === 'en' ? 'ACTIVE SECTOR LOBBIES' : '当前活跃战网房间'}</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-panel2 border border-line text-xs font-bold text-bone font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-[ping_1.5s_infinite_alternate]" />
                {livePlayersCount} {language === 'en' ? 'Operators Online' : '特工在线联络'}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {isLoadingRooms ? (
                <div className="h-full flex items-center justify-center text-dim font-bold tracking-wider text-sm animate-pulse">
                  {language === 'en' ? 'SYNCING ACTIVE ROOM SIGNALS...' : '正在同步当前活跃战场信号...'}
                </div>
              ) : activeRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-line bg-ink">
                  <Radio className="h-8 w-8 text-dim mb-2" />
                  <p className="text-sm font-bold text-dim uppercase tracking-widest font-mono">{language === 'en' ? 'NO ACTIVE LOBBIES IN SECTOR' : '当前战区暂无活跃房间'}</p>
                  <p className="text-xs text-dim/70 mt-1">{language === 'en' ? 'Use the command panel on the left or Quick Play to launch the first battle!' : '利用左侧命令面板创建或使用一键自动匹配开启首个近战战区！'}</p>
                </div>
              ) : (
                activeRooms.map((room) => {
                  const targetLvl = availableLevels.find(l => l.name === room.levelName);
                  return (
                    <div key={room.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-ink border border-line hover:border-signal transition-all">
                        <div className="flex-grow min-w-0">
                             <div className="flex items-center gap-2.5 flex-wrap">
                               <h4 className="font-cond text-base font-bold text-bone tracking-wider uppercase truncate max-w-[200px]">
                                  {room.name}
                               </h4>
                               <span className="px-2 py-0.5 bg-panel2 border border-line text-[10px] font-mono font-bold text-sky-400 uppercase">
                                 {room.mode.toUpperCase()} {language === 'en' ? 'MODE' : '模式'}
                               </span>
                             </div>
                             <p className="text-dim text-xs mt-1 uppercase tracking-wider font-mono">
                               {language === 'en' ? 'MAP' : '演练地图'}: <span className="text-bone font-extrabold">{getLevelDisplayName(room.levelName)}</span>
                             </p>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 bg-panel2 border border-line px-3 py-1.5 min-w-[80px]">
                              <Users className="h-4 w-4 text-sky-400/80" />
                              <div>
                                  <p className="text-[9px] text-dim font-bold uppercase leading-tight leading-none">{language === 'en' ? 'MEMBERS' : '在线干员'}</p>
                                  <p className="text-xs font-bold text-bone font-mono tabular-nums leading-none mt-1">{room.playersCount} / {room.maxPlayers}</p>
                              </div>
                          </div>

                          <button
                              onClick={() => targetLvl && onJoinGame(targetLvl, room.id, room.name, room.mode)}
                              disabled={!targetLvl || room.playersCount >= room.maxPlayers}
                              className="px-5 py-2.5 bg-signal hover:bg-teal-400 text-ink font-cond font-bold text-sm tracking-[0.15em] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase active:scale-[0.98]"
                          >
                              {language === 'en' ? 'ENGAGE' : '参战突入'} <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leaderboards */}
          <div className="bg-panel border border-line p-6">
            <div className="flex justify-between items-center border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-signal" />
                <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono">{language === 'en' ? 'GLOBAL LEADERBOARDS' : '全球排行榜 (LEADERBOARDS)'}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setLeaderboardTab('kills')}
                  className={`px-3 py-1 text-[10px] font-cond font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    leaderboardTab === 'kills'
                      ? 'bg-signal text-ink border-signal'
                      : 'bg-panel2 text-dim border-line hover:border-signal hover:text-bone'
                  }`}
                >
                  Kills
                </button>
                <button
                  onClick={() => setLeaderboardTab('kd')}
                  className={`px-3 py-1 text-[10px] font-cond font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    leaderboardTab === 'kd'
                      ? 'bg-signal text-ink border-signal'
                      : 'bg-panel2 text-dim border-line hover:border-signal hover:text-bone'
                  }`}
                >
                  K/D
                </button>
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-dim uppercase tracking-[0.2em] font-bold font-mono px-2">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-2 text-center">{leaderboardTab === 'kills' ? 'Kills' : 'K/D'}</div>
                <div className="col-span-3 text-center">{leaderboardTab === 'kills' ? 'K/D' : 'Kills'}</div>
              </div>
              {(leaderboardTab === 'kills' ? killLeaderboard : kdLeaderboard).map((entry, idx) => (
                <div key={entry.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-panel2 border border-line">
                  <div className="col-span-1 text-center font-mono font-bold text-dim tabular-nums">{idx + 1}</div>
                  <div className="col-span-6 font-mono text-sm truncate text-bone">{entry.name}</div>
                  <div className="col-span-2 text-center font-mono font-bold text-bone tabular-nums">{leaderboardTab === 'kills' ? entry.kills : entry.kd.toFixed(2)}</div>
                  <div className="col-span-3 text-center font-mono font-bold text-signal tabular-nums">{leaderboardTab === 'kills' ? entry.kd.toFixed(2) : entry.kills}</div>
                </div>
              ))}
              {(leaderboardTab === 'kills' ? killLeaderboard : kdLeaderboard).length === 0 && (
                <div className="text-center text-dim py-6 text-sm font-mono">NO DATA YET</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MultiplayerLobby;
