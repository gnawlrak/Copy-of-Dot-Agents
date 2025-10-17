import React, { useState, useEffect } from 'react';
import { MockNetworkClient, Room, PlayerState, GameMode, RoomType, RoomStatus, onRoomUpdate } from '../network';
import { LevelDefinition } from '../levels/level-definitions';

interface RoomWaitingProps {
  room: Room;
  networkClient: MockNetworkClient;
  onStartGame: (level: LevelDefinition) => void;
  onLeaveRoom: () => void;
}

const RoomWaiting: React.FC<RoomWaitingProps> = ({ room: initialRoom, networkClient, onStartGame, onLeaveRoom }) => {
  const [playerReady, setPlayerReady] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string>('default');
  const [isOwner, setIsOwner] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room>(initialRoom);

  // 处理'room-updated'事件
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom: Room) => {
      if (updatedRoom.id === currentRoom.id) {
        // 检查是否有新玩家加入
        const oldPlayerIds = Object.keys(currentRoom.players);
        const newPlayerIds = Object.keys(updatedRoom.players);
        
        // 找出新增的玩家ID
        const newPlayers = newPlayerIds.filter(id => !oldPlayerIds.includes(id));
        
        // 如果有新玩家加入，在房主端控制台输出日志
        if (newPlayers.length > 0 && isOwner) {
          console.log(`[房主通知] 有${newPlayers.length}名玩家加入了房间:`, newPlayers);
          newPlayers.forEach(playerId => {
            const player = updatedRoom.players[playerId];
            if (player) {
              console.log(`[房主通知] 玩家 ${playerId.slice(0, 8)} (${player.team === 'red' ? '红队' : '蓝队'}) 加入了房间`);
            }
          });
        }
        
        // 更新当前房间状态
        setCurrentRoom(updatedRoom);
      }
    };

    // 使用onRoomUpdate监听特定房间的更新
    const unsubscribe = onRoomUpdate(handleRoomUpdated);

    // 清理事件监听
    return () => {
      unsubscribe();
    };
  }, [currentRoom.id, isOwner, currentRoom.players]);

  // 检查是否是房主
  useEffect(() => {
    setIsOwner(currentRoom.ownerId === networkClient.ownId);
  }, [currentRoom.ownerId, networkClient.ownId]);
  
  // 监听游戏开始事件
  useEffect(() => {
    const handleStartRound = (data: { roundId: string; startPositions?: { x: number; y: number }[] }) => {
      console.log('[RoomWaiting] 收到游戏开始事件:', data);
      // 调用onStartGame进入游戏地图
      if (onStartGame) {
        console.log('[RoomWaiting] 调用onStartGame');
        // 如果有起始位置，保存到localStorage供GameCanvas使用
        if (data.startPositions && data.startPositions.length > 0) {
          try {
            localStorage.setItem('dot_agents_start_pos', JSON.stringify(data.startPositions));
          } catch (e) {
            console.warn('无法保存起始位置:', e);
          }
        }
        
        // 创建一个完整的多人游戏关卡定义
        const multiplayerLevel = {
          name: currentRoom.settings.gameMode,
          description: `Multiplayer ${currentRoom.settings.gameMode} match`,
          playerStart: { x: 0.5, y: 0.9 },
          walls: [
            // 外边界墙
            { x: 0, y: 0, width: 1, height: 0.01 }, // 顶部墙
            { x: 0, y: 0, width: 0.01, height: 1 }, // 左侧墙
            { x: 0.99, y: 0, width: 0.01, height: 1 }, // 右侧墙
            { x: 0, y: 0.99, width: 1, height: 0.01 }, // 底部墙
            // 内部障碍物
            { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
            { x: 0.7, y: 0.2, width: 0.1, height: 0.1 },
            { x: 0.2, y: 0.7, width: 0.1, height: 0.1 },
            { x: 0.7, y: 0.7, width: 0.1, height: 0.1 },
            { x: 0.45, y: 0.45, width: 0.1, height: 0.1 }
          ],
          doors: [],
          enemies: [],
          objectives: [],
          isTrainingGround: false
        };
        onStartGame(multiplayerLevel);
      } else {
        console.error('[RoomWaiting] onStartGame未定义');
      }
    };
    
    console.log('[RoomWaiting] 注册start-round事件监听器');
    networkClient.on('start-round', handleStartRound);
    
    return () => {
      console.log('[RoomWaiting] 移除start-round事件监听器');
      networkClient.off('start-round', handleStartRound);
    };
  }, [currentRoom.id, onStartGame]); // 移除 currentRoom.settings.gameMode 依赖，避免不必要的重新注册
  
  // 准备/取消准备
  const handleToggleReady = () => {
    const newReadyState = !playerReady;
    setPlayerReady(newReadyState);
    
    // 发送准备状态到服务器
    networkClient.send('ready-check', {
      roomId: currentRoom.id,
      isReady: newReadyState
    });
  };

  // 开始游戏
  const handleStartGame = () => {
    console.log('[RoomWaiting] handleStartGame被调用, isOwner:', isOwner);
    if (!isOwner) {
      console.log('[RoomWaiting] 不是房主，无法开始游戏');
      return;
    }
    
    // 检查所有玩家是否准备就绪
    const allReady = Object.values(currentRoom.players).every((player) => {
      return player && player.isReady === true;
    });
    console.log('[RoomWaiting] 所有玩家准备状态:', allReady);
    
    if (!allReady) {
      alert('请等待所有玩家准备就绪！');
      return;
    }
    
    console.log('[RoomWaiting] 发送start-round事件, roomId:', currentRoom.id);
    // 发送开始游戏指令
    networkClient.send('start-round', {
      roomId: currentRoom.id
    });
  };

  // 踢出玩家
  const handleKickPlayer = (playerId: string) => {
    if (!isOwner || playerId === networkClient.ownId) return;
    
    networkClient.send('team-management', {
      roomId: currentRoom.id,
      action: 'kick',
      targetPlayerId: playerId
    });
  };

  // 切换队伍
  const handleSwitchTeam = (playerId: string) => {
    // 获取玩家当前队伍
    const player = currentRoom.players[playerId];
    if (!player) return;
    
    // 切换到另一队
    const targetTeam = player.team === 'red' ? 'blue' : 'red';
    
    networkClient.send('team-management', {
      roomId: currentRoom.id,
      action: 'switch',
      targetPlayerId: playerId,
      team: targetTeam
    });
  };

  // 获取玩家列表，按队伍分组
  const getPlayersByTeam = () => {
    const redTeam: PlayerState[] = [];
    const blueTeam: PlayerState[] = [];
    
    Object.values(currentRoom.players).forEach(player => {
      if (player && player.team === 'red') {
        redTeam.push(player);
      } else if (player && player.team === 'blue') {
        blueTeam.push(player);
      }
    });
    
    return { redTeam, blueTeam };
  };

  const { redTeam, blueTeam } = getPlayersByTeam();

  return (
    <div className="w-full max-w-6xl text-center flex flex-col h-full justify-center">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-2">
          {currentRoom.name}
        </h1>
        <div className="flex justify-center gap-6 text-gray-400">
          <span>模式: {currentRoom.settings.gameMode}</span>
          <span>地图: {selectedMap}</span>
          <span>玩家: {currentRoom.currentPlayers}/{currentRoom.settings.maxPlayers}</span>
          {currentRoom.password && <span>🔒 密码房间</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 红队 */}
        <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4">
          <h3 className="text-xl font-bold text-red-400 mb-4">红队 ({redTeam.length})</h3>
          <div className="space-y-2">
            {redTeam.map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-red-800/30 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className={player.id === networkClient.ownId ? 'font-bold text-white' : 'text-gray-300'}>
                    {player.id === networkClient.ownId ? '我' : `玩家${player.id.slice(0, 4)}`}
                  </span>
                  <span className="text-xs text-gray-400">{player.role}</span>
                </div>
                <div className="flex gap-2">
                  {isOwner && player.id !== networkClient.ownId && (
                    <button 
                      onClick={() => handleKickPlayer(player.id)}
                      className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500"
                    >
                      踢出
                    </button>
                  )}
                  <button 
                    onClick={() => handleSwitchTeam(player.id)}
                    className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500"
                  >
                    换队
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 房间控制面板 */}
        <div className="bg-gray-900/20 border-2 border-gray-600 rounded-lg p-4">
          <h3 className="text-xl font-bold text-teal-400 mb-4">房间控制</h3>
          
          <div className="space-y-4">
            {/* 准备按钮 */}
            <button
              onClick={handleToggleReady}
              className={`w-full py-3 font-bold rounded transition-colors ${
                playerReady 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : 'bg-yellow-600 hover:bg-yellow-500'
              }`}
            >
              {playerReady ? '取消准备' : '准备'}
            </button>

            {/* 房主控制 */}
            {isOwner && (
              <>
                <div>
                  <label className="block text-gray-300 mb-2">选择地图</label>
                  <select
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  >
                    <option value="default">默认地图</option>
                    <option value="factory">工厂</option>
                    <option value="training">训练场</option>
                    <option value="expansion">扩展地图</option>
                  </select>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-teal-600 text-white font-bold rounded hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isOwner || !Object.values(currentRoom.players).every((player) => player && player.isReady === true)}
                >
                  开始游戏
                </button>
              </>
            )}

            {/* 离开房间按钮 */}
            <button
              onClick={onLeaveRoom}
              className="w-full py-3 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors"
            >
              离开房间
            </button>
          </div>
        </div>

        {/* 蓝队 */}
        <div className="bg-blue-900/20 border-2 border-blue-600 rounded-lg p-4">
          <h3 className="text-xl font-bold text-blue-400 mb-4">蓝队 ({blueTeam.length})</h3>
          <div className="space-y-2">
            {blueTeam.map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-blue-800/30 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className={player.id === networkClient.ownId ? 'font-bold text-white' : 'text-gray-300'}>
                    {player.id === networkClient.ownId ? '我' : `玩家${player.id.slice(0, 4)}`}
                  </span>
                  <span className="text-xs text-gray-400">{player.role}</span>
                </div>
                <div className="flex gap-2">
                  {isOwner && player.id !== networkClient.ownId && (
                    <button 
                      onClick={() => handleKickPlayer(player.id)}
                      className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500"
                    >
                      踢出
                    </button>
                  )}
                  <button 
                    onClick={() => handleSwitchTeam(player.id)}
                    className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500"
                  >
                    换队
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="bg-black/20 p-4 rounded-lg border-2 border-gray-800">
        <h3 className="text-xl text-gray-400 text-left border-b border-gray-600 pb-2 mb-4">
          房间聊天
        </h3>
        <div className="h-32 bg-gray-900/50 rounded p-3 text-left text-gray-300 mb-2 overflow-y-auto">
          {/* 聊天消息将在这里显示 */}
          <div className="text-center text-gray-500">聊天功能开发中...</div>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="输入消息..." 
            className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-white"
            disabled
          />
          <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500 disabled:bg-gray-700" disabled>
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomWaiting;