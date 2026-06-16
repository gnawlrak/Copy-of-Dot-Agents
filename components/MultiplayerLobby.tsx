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
    <div className="w-full max-w-5xl flex flex-col min-h-full justify-center my-auto mx-auto px-4 py-6">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8 flex items-center justify-center gap-3">
        <Globe className="h-8 w-8 text-teal-400 animate-[spin_12s_linear_infinite]" />
        {t('mpLobby')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left column: Create and Matchmaking controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Matchmaking component */}
          <div className="bg-gradient-to-br from-teal-950/20 to-gray-950/40 p-6 rounded-lg border-2 border-teal-500/20 shadow-md">
            <h3 className="text-lg font-bold tracking-wider text-teal-300 flex items-center gap-2 mb-3">
              <Shuffle className="h-5 w-5 text-teal-400" />
              {language === 'en' ? 'QUICK MATCHMAKING' : '快速对抗匹配 (MATCHMAKING)'}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              {language === 'en' 
                ? 'Instantly join the most suitable active room. If no rooms are currently active, a new random session with a recommended map and random rules will be established.' 
                : '立即进入最适合您当前未满员的实战对战房间。若当前无活跃房间，系统将自动推荐一张战斗地图。'}
            </p>
            <button
              onClick={handleQuickMatchmaking}
              className="w-full px-6 py-4 bg-teal-500 text-black font-bold text-base rounded hover:bg-teal-400 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 active:scale-[0.98]"
            >
              <Shuffle className="h-5 w-5" />
              {language === 'en' ? 'QUICK MATCHPLAY / AUTO JOIN' : '自动寻找房间 / 快速加入'}
            </button>
          </div>

          {/* Custom Room Creator Form */}
          <div className="bg-gray-950/40 p-6 rounded-lg border-2 border-gray-800 shadow-md space-y-4">
            <h3 className="text-lg font-bold tracking-wider text-gray-200 flex items-center gap-2 border-b border-gray-800 pb-2">
              <Plus className="h-5 w-5 text-sky-400" />
              {language === 'en' ? 'COMMAND NEW ROOM' : '开设专属特训房屋 (CREATE ROOM)'}
            </h3>

            {/* Room Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">{language === 'en' ? 'Room Name / Custom ID' : '房间代号 / Custom ID'}</label>
              <input
                type="text"
                maxLength={20}
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-gray-900 border-2 border-gray-800 rounded font-bold font-mono text-white text-sm focus:border-teal-500 focus:outline-none focus:ring-0"
                placeholder={language === 'en' ? 'INPUT ROOM NAME' : '输入自定义房间命名'}
              />
            </div>

            {/* Game Mode select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">{language === 'en' ? 'GAME MODE' : '对抗交火规则'}</label>
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
                    className={`p-2.5 rounded border-2 text-center transition-all cursor-pointer ${
                      selectedMode === m.value 
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300 font-bold' 
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-gray-200'
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
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">{language === 'en' ? 'Max Players' : '最大人数 / Max Players'}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={16}
                    step={1}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  <span className="text-sm font-bold text-teal-300 font-mono w-8 text-right">{maxPlayers}</span>
                </div>
              </div>
            )}

            {/* Match Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">{language === 'en' ? 'Match Duration' : '对局时长 (分钟)'}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <span className="text-sm font-bold text-teal-300 font-mono w-10 text-right">{matchDuration}m</span>
              </div>
            </div>

            {/* Select Map */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">{language === 'en' ? 'TACTICAL SECTOR' : '执行演练地图'}</label>
              <select
                value={selectedLevelIndex}
                onChange={(e) => setSelectedLevelIndex(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-900 border-2 border-gray-800 rounded font-mono font-bold text-white text-sm focus:border-teal-500 focus:outline-none"
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
              className="w-full px-6 py-3.5 bg-sky-600 text-white font-bold text-base rounded hover:bg-sky-500 hover:shadow-lg transition-all cursor-pointer disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sky-900/10 mt-2 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              {language === 'en' ? 'LAUNCH MISSION ROOM' : '创建并突入该特训战区'}
            </button>
          </div>

        </div>

        {/* Right column: Live Session List & Leaderboards */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-950/40 p-6 rounded-lg border-2 border-gray-800 shadow-sm flex flex-col h-[420px]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-teal-400 animate-pulse" />
                <h3 className="text-sm font-bold tracking-widest text-gray-300 uppercase font-mono">{language === 'en' ? 'ACTIVE SECTOR LOBBIES' : '当前活跃战网房间'}</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-teal-950/40 border border-teal-500/20 rounded text-xs font-bold text-teal-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-[ping_1.5s_infinite_alternate]" />
                {livePlayersCount} {language === 'en' ? 'Operators Online' : '特工在线联络'}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {isLoadingRooms ? (
                <div className="h-full flex items-center justify-center text-gray-500 font-bold tracking-wider text-sm animate-pulse">
                  {language === 'en' ? 'SYNCING ACTIVE ROOM SIGNALS...' : '正在同步当前活跃战场信号...'}
                </div>
              ) : activeRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-800 rounded bg-gray-900/10">
                  <Radio className="h-8 w-8 text-gray-700 mb-2" />
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-widest font-mono">{language === 'en' ? 'NO ACTIVE LOBBIES IN SECTOR' : '当前战区暂无活跃房间'}</p>
                  <p className="text-xs text-gray-500 mt-1">{language === 'en' ? 'Use the command panel on the left or Quick Play to launch the first battle!' : '利用左侧命令面板创建或使用一键自动匹配开启首个近战战区！'}</p>
                </div>
              ) : (
                activeRooms.map((room) => {
                  const targetLvl = availableLevels.find(l => l.name === room.levelName);
                  return (
                    <div key={room.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-gray-950 border-2 border-gray-850 rounded-md hover:border-teal-500/30 transition-all">
                        <div className="flex-grow min-w-0">
                             <div className="flex items-center gap-2.5 flex-wrap">
                               <h4 className="text-base font-bold text-teal-400 tracking-wider truncate max-w-[200px]">
                                  {room.name}
                               </h4>
                               <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[10px] font-mono font-bold text-sky-400 rounded-sm uppercase">
                                 {room.mode.toUpperCase()} {language === 'en' ? 'MODE' : '模式'}
                               </span>
                             </div>
                             <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider font-mono">
                               {language === 'en' ? 'MAP' : '演练地图'}: <span className="text-gray-300 font-extrabold">{getLevelDisplayName(room.levelName)}</span>
                             </p>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-md min-w-[80px]">
                              <Users className="h-4 w-4 text-sky-400/80" />
                              <div>
                                  <p className="text-[9px] text-gray-500 font-bold uppercase leading-tight leading-none">{language === 'en' ? 'MEMBERS' : '在线干员'}</p>
                                  <p className="text-xs font-bold text-white font-mono leading-none mt-1">{room.playersCount} / {room.maxPlayers}</p>
                              </div>
                          </div>

                          <button
                              onClick={() => targetLvl && onJoinGame(targetLvl, room.id, room.name, room.mode)}
                              disabled={!targetLvl || room.playersCount >= room.maxPlayers}
                              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
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
          <div className="bg-gray-950/40 p-6 rounded-lg border-2 border-gray-800 shadow-sm">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-sky-400" />
                <h3 className="text-sm font-bold tracking-widest text-gray-300 uppercase font-mono">{language === 'en' ? 'GLOBAL LEADERBOARDS' : '全球排行榜 (LEADERBOARDS)'}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setLeaderboardTab('kills')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    leaderboardTab === 'kills'
                      ? 'bg-teal-600 text-black border-teal-500'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  Kills
                </button>
                <button
                  onClick={() => setLeaderboardTab('kd')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    leaderboardTab === 'kd'
                      ? 'bg-teal-600 text-black border-teal-500'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  K/D
                </button>
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold px-2">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-2 text-center">{leaderboardTab === 'kills' ? 'Kills' : 'K/D'}</div>
                <div className="col-span-3 text-center">{leaderboardTab === 'kills' ? 'K/D' : 'Kills'}</div>
              </div>
              {(leaderboardTab === 'kills' ? killLeaderboard : kdLeaderboard).map((entry, idx) => (
                <div key={entry.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded bg-gray-900/30 border border-gray-800">
                  <div className="col-span-1 text-center font-bold text-gray-400">{idx + 1}</div>
                  <div className="col-span-6 font-mono text-sm truncate text-gray-200">{entry.name}</div>
                  <div className="col-span-2 text-center font-bold">{leaderboardTab === 'kills' ? entry.kills : entry.kd.toFixed(2)}</div>
                  <div className="col-span-3 text-center font-bold text-teal-300">{leaderboardTab === 'kills' ? entry.kd.toFixed(2) : entry.kills}</div>
                </div>
              ))}
              {(leaderboardTab === 'kills' ? killLeaderboard : kdLeaderboard).length === 0 && (
                <div className="text-center text-gray-500 py-6 text-sm">NO DATA YET</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MultiplayerLobby;
