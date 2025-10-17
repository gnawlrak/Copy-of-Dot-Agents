
import React, { useState, useEffect } from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { MockNetworkClient, GameMode, RoomType, Room } from '../network';
import RoomWaiting from './RoomWaiting';

interface MultiplayerLobbyProps {
  onJoinGame: (level: LevelDefinition) => void;
  missions: LevelDefinition[];
  networkClient?: MockNetworkClient;
}

interface RoomSettings {
  name: string;
  gameMode: GameMode;
  map: string;
  maxPlayers: number;
  timeLimit: number;
  scoreLimit: number;
  friendlyFire: boolean;
  roomType: RoomType;
  password?: string;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onJoinGame, missions, networkClient }) => {
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [roomSettings, setRoomSettings] = useState<RoomSettings>({
        name: '我的房间',
        gameMode: GameMode.TEAM_DEATHMATCH,
        map: 'default',
        maxPlayers: 8,
        timeLimit: 600,
        scoreLimit: 100,
        friendlyFire: false,
        roomType: RoomType.PUBLIC
    });

    // 添加调试日志来监控网络客户端状态
    useEffect(() => {
        console.log('=== MultiplayerLobby组件挂载/更新 ===');
        console.log('网络客户端状态:', networkClient);
        console.log('网络客户端是否可用:', !!networkClient);
        console.log('当前房间状态:', currentRoom);
        console.log('显示创建房间状态:', showCreateRoom);
    }, [networkClient, currentRoom, showCreateRoom]);

    useEffect(() => {
        if (!networkClient) return;

        // 监听房间列表更新
        const handleRoomList = (rooms: Room[]) => {
            setAvailableRooms(rooms);
        };

        // 监听房间创建成功
        const handleRoomCreated = (room: Room) => {
            console.log('房间创建成功:', room);
            setCurrentRoom(room);
            setShowCreateRoom(false);
        };

        // 监听房间加入成功
        const handleRoomJoined = (data: { roomId: string; player: any }) => {
            const room = availableRooms.find(r => r.id === data.roomId);
            if (room) {
                setCurrentRoom(room);
            }
        };

        // 监听房间加入失败
        const handleJoinFailed = (data: { reason: string; roomId?: string; availableRooms?: string[] }) => {
            console.log('加入房间失败:', data);
            alert(`无法加入房间: ${data.reason}. 房间ID: ${data.roomId}. 可用房间: ${data.availableRooms?.join(', ') || '无'}`);
        };

        const handleClearRoomsFailed = (data: { reason: string; message?: string }) => {
            console.error('清空房间失败:', data.reason);
            alert(`清空房间失败: ${data.message || data.reason}`);
        };

        const handleAllRoomsCleared = (data: { timestamp: number; clearedCount: number; remainingCount: number }) => {
            console.log(`清空房间成功: 已清空${data.clearedCount}个房间，保留${data.remainingCount}个房间`);
            if (data.clearedCount > 0) {
                alert(`已成功清空${data.clearedCount}个房间`);
            } else {
                alert('没有可清空的房间（您只能清空自己创建的房间）');
            }
        };

        networkClient.on('room-list', handleRoomList);
        networkClient.on('room-created', handleRoomCreated);
        networkClient.on('room-joined', handleRoomJoined);
        networkClient.on('join-failed', handleJoinFailed);
        networkClient.on('clear-rooms-failed', handleClearRoomsFailed);
        networkClient.on('all-rooms-cleared', handleAllRoomsCleared);

        // 初始获取房间列表
        networkClient.send('list-rooms', {});

        // 定期刷新房间列表（每3秒）
        const refreshInterval = setInterval(() => {
            networkClient.send('list-rooms', {});
        }, 3000);

        return () => {
            networkClient.off('room-list', handleRoomList);
            networkClient.off('room-created', handleRoomCreated);
            networkClient.off('room-joined', handleRoomJoined);
            networkClient.off('join-failed', handleJoinFailed);
            networkClient.off('clear-rooms-failed', handleClearRoomsFailed);
            networkClient.off('all-rooms-cleared', handleAllRoomsCleared);
            clearInterval(refreshInterval);
        };
    }, [networkClient]); // 移除availableRooms依赖以避免无限循环

    const factoryLevel = missions.find(m => m.name === 'THE FACTORY');
    const trainingLevel = missions.find(m => m.name === 'TRAINING GROUND');
    const expansionLevel = missions.find(m => m.name.includes('EXPANSION'));

    // 使用真实房间数据替换模拟数据
    const mockRooms = availableRooms.length > 0 ? availableRooms.map(room => ({
        name: room.name,
        level: factoryLevel, // 暂时使用工厂地图
        players: `${room.currentPlayers}/${room.settings.maxPlayers}`,
        room: room
    })) : [
        { name: 'Factory Raid', level: factoryLevel, players: '2/4' },
        { name: 'Training Grounds CQB', level: trainingLevel, players: '1/2' },
        { name: 'Expansion TDM', level: expansionLevel, players: '7/8' },
    ];

    // 创建房间函数
    const handleCreateRoom = () => {
        if (!networkClient) return;
        
        console.log('开始创建房间:', roomSettings);
        
        networkClient.send('create-room', {
            name: roomSettings.name,
            ownerId: networkClient.ownId,
            gameMode: roomSettings.gameMode,
            maxPlayers: roomSettings.maxPlayers,
            roomType: roomSettings.roomType,
            password: roomSettings.password,
            map: roomSettings.map,
            timeLimit: roomSettings.timeLimit,
            scoreLimit: roomSettings.scoreLimit,
            friendlyFire: roomSettings.friendlyFire
        });
    };

    // 加入房间函数
    const handleJoinRoom = (roomId: string) => {
        if (!networkClient) return;
        
        networkClient.send('join-room', {
            roomId: roomId
        });
    };

    // 离开房间函数
    const handleLeaveRoom = () => {
        if (!networkClient || !currentRoom) return;
        
        networkClient.send('leave-room', {
            roomId: currentRoom.id,
            playerId: networkClient.ownId
        });
        
        setCurrentRoom(null);
    };

    // 清空所有房间函数
    const handleClearAllRooms = () => {
        if (!networkClient) return;
        
        if (confirm('确定要清空您创建的所有房间吗？\n注意：您只能清空自己创建的房间，其他玩家的房间将保留。')) {
            networkClient.send('clear-all-rooms', {
                playerId: networkClient.ownId
            });
            
            // 如果当前在房间中，也要离开
            if (currentRoom) {
                setCurrentRoom(null);
            }
        }
    };

    // 设置下次启动时清空所有房间
    const handleSetClearOnNextStartup = () => {
        if (confirm('确定要设置下次启动时自动清空所有房间吗？')) {
            localStorage.setItem('clear_rooms_on_init', 'true');
            alert('已设置！下次启动应用时将自动清空所有房间。');
        }
    };

    // 房间设置表单
    const renderCreateRoomForm = () => (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">创建房间</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 mb-2">房间名称</label>
                        <input
                            type="text"
                            value={roomSettings.name}
                            onChange={(e) => setRoomSettings({...roomSettings, name: e.target.value})}
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 mb-2">游戏模式</label>
                        <select
                            value={roomSettings.gameMode}
                            onChange={(e) => setRoomSettings({...roomSettings, gameMode: e.target.value as GameMode})}
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                            <option value={GameMode.TEAM_DEATHMATCH}>团队死亡竞赛</option>
                            <option value={GameMode.BOMB_DEFUSE}>炸弹拆除</option>
                            <option value={GameMode.CAPTURE_THE_FLAG}>夺旗模式</option>
                            <option value={GameMode.COOP_RAID}>合作突袭</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 mb-2">最大玩家数</label>
                        <select
                            value={roomSettings.maxPlayers}
                            onChange={(e) => setRoomSettings({...roomSettings, maxPlayers: parseInt(e.target.value)})}
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                            <option value={4}>4人</option>
                            <option value={8}>8人</option>
                            <option value={12}>12人</option>
                            <option value={16}>16人</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 mb-2">房间类型</label>
                        <select
                            value={roomSettings.roomType}
                            onChange={(e) => setRoomSettings({...roomSettings, roomType: e.target.value as RoomType})}
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                            <option value={RoomType.PUBLIC}>公开</option>
                            <option value={RoomType.PRIVATE}>私有</option>
                            <option value={RoomType.FRIENDS_ONLY}>仅好友</option>
                        </select>
                    </div>
                    
                    {roomSettings.roomType === RoomType.PRIVATE && (
                        <div>
                            <label className="block text-gray-300 mb-2">密码（可选）</label>
                            <input
                                type="password"
                                value={roomSettings.password || ''}
                                onChange={(e) => setRoomSettings({...roomSettings, password: e.target.value})}
                                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                                placeholder="输入房间密码"
                            />
                        </div>
                    )}
                    
                    <div className="flex gap-4">
                        <button
                            onClick={(e) => {
                              console.log('=== 表单内创建房间按钮被点击 ===');
                              console.log('点击事件对象:', e);
                              console.log('当前网络客户端状态:', networkClient ? '已连接' : '未连接');
                              handleCreateRoom();
                              console.log('=== 表单内按钮点击处理完成 ===');
                            }}
                            className="flex-1 py-3 bg-teal-600 text-white font-bold rounded hover:bg-teal-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                            disabled={!networkClient}
                        >
                            创建房间
                        </button>
                        <button
                            onClick={() => {
                              console.log('=== 表单内取消按钮被点击 ===');
                              console.log('当前showCreateRoom状态:', showCreateRoom);
                              setShowCreateRoom(false);
                              console.log('设置showCreateRoom为false');
                            }}
                            className="flex-1 py-3 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // 如果当前在房间中，显示房间等待界面
    if (currentRoom && networkClient) {
        return (
            <RoomWaiting
                room={currentRoom}
                networkClient={networkClient}
                onStartGame={onJoinGame}
                onLeaveRoom={handleLeaveRoom}
            />
        );
    }

    return (
    <div className="w-full max-w-6xl text-center flex flex-col h-full justify-center">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8 animate-pulse">MULTIPLAYER LOBBY</h1>
      
      {/* 创建房间按钮 */}
      <div className="mb-6 flex flex-col gap-4 justify-center">
        <div className="flex gap-4 justify-center">
          <button
              onClick={(e) => {
                console.log('=== 创建房间按钮被点击 ===');
                console.log('点击事件对象:', e);
                console.log('当前showCreateRoom状态:', showCreateRoom);
                console.log('网络客户端状态:', networkClient ? '已连接' : '未连接');
                console.log('网络客户端详情:', networkClient);
                console.log('按钮禁用状态:', !networkClient);
                
                setShowCreateRoom(true);
                
                console.log('设置showCreateRoom为true后的状态:', showCreateRoom);
                console.log('=== 按钮点击处理完成 ===');
              }}
              className="px-8 py-4 bg-teal-600 text-white font-bold text-lg rounded-md hover:bg-teal-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={!networkClient}
          >
              创建房间
          </button>
          
          <button
              onClick={handleClearAllRooms}
              className="px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-md hover:bg-red-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={!networkClient}
          >
              清空我的房间
          </button>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
              onClick={handleSetClearOnNextStartup}
              className="px-6 py-2 bg-orange-600 text-white font-bold text-sm rounded-md hover:bg-orange-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={!networkClient}
          >
              设置下次启动清空所有房间
          </button>
        </div>
      </div>
      
      <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto pr-4 bg-black/20 p-4 rounded-lg border-2 border-gray-800">
        <h3 className="text-xl text-gray-400 text-left border-b border-gray-600 pb-2">AVAILABLE SESSIONS</h3>
        {mockRooms.map((room, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-900 border-2 border-gray-700 rounded-md">
                <div className="flex-grow text-left">
                     <h2 className="text-2xl font-bold text-teal-400 tracking-wider">{room.name}</h2>
                     <p className="text-gray-400 mt-1">Map: {room.level?.name || 'Unknown'}</p>
                     {room.room && (
                         <div className="text-xs text-gray-500 mt-1">
                             {room.room.settings.gameMode} • {room.room.type}
                         </div>
                     )}
                </div>
                <div className="text-center">
                    <p className="text-lg text-gray-300">OPERATORS</p>
                    <p className="text-2xl font-bold text-white">{room.players}</p>
                </div>
                <button
                    onClick={() => room.room ? handleJoinRoom(room.room.id) : (room.level && onJoinGame(room.level))}
                    disabled={!room.level && !room.room}
                    className="px-8 py-4 bg-teal-600 text-white font-bold text-lg rounded-md hover:bg-teal-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                    JOIN
                </button>
            </div>
        ))}
      </div>
      
      {/* 创建房间弹窗 */}
      {showCreateRoom && (
        <div>
          {console.log('=== 渲染创建房间表单 ===')}
          {console.log('showCreateRoom状态为true，开始渲染表单')}
          {renderCreateRoomForm()}
        </div>
      )}
    </div>
  );
};

export default MultiplayerLobby;
