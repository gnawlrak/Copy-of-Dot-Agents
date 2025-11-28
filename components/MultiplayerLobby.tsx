import React, { useState, useEffect } from 'react';
import { Room, NetworkClient } from '../network';
import { MISSIONS } from '../levels/level-definitions';

interface MultiplayerLobbyProps {
    networkClient: NetworkClient;
    onStartGame: (room: Room) => void;
    onBack: () => void;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ networkClient, onStartGame, onBack }) => {
    const [view, setView] = useState<'list' | 'room'>('list');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [selectedMap, setSelectedMap] = useState(MISSIONS[0].name);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for room events
        const handleRoomList = (list: Room[]) => setRooms(list);
        const handleRoomCreated = (room: Room) => {
            setCurrentRoom(room);
            setView('room');
        };
        const handleRoomJoined = (room: Room) => {
            setCurrentRoom(room);
            if (room.status === 'playing') {
                onStartGame(room);
            } else {
                setView('room');
            }
        };
        const handleRoomUpdated = (room: Room) => setCurrentRoom(room);
        const handleRoomLeft = () => {
            setCurrentRoom(null);
            setView('list');
            networkClient.getRoomList();
        };
        const handleGameStarted = () => currentRoom && onStartGame(currentRoom);
        const handleError = (err: { message: string }) => setError(err.message);

        networkClient.on('room-list', handleRoomList);
        networkClient.on('room-created', handleRoomCreated);
        networkClient.on('room-joined', handleRoomJoined);
        networkClient.on('room-updated', handleRoomUpdated);
        networkClient.on('room-left', handleRoomLeft);
        networkClient.on('game-started', handleGameStarted);
        networkClient.on('error', handleError);

        // Request room list on mount
        networkClient.getRoomList();

        return () => {
            networkClient.off('room-list', handleRoomList);
            networkClient.off('room-created', handleRoomCreated);
            networkClient.off('room-joined', handleRoomJoined);
            networkClient.off('room-updated', handleRoomUpdated);
            networkClient.off('room-left', handleRoomLeft);
            networkClient.off('game-started', handleGameStarted);
            networkClient.off('error', handleError);
        };
    }, [networkClient, currentRoom, onStartGame]);

    const handleCreateRoom = () => {
        if (!roomName.trim()) {
            setError('Room name is required');
            return;
        }
        networkClient.createRoom(roomName, selectedMap);
        setShowCreateDialog(false);
        setRoomName('');
    };

    const handleJoinRoom = (roomId: string) => {
        networkClient.joinRoom(roomId);
    };

    const handleLeaveRoom = () => {
        networkClient.leaveRoom();
    };

    const handleToggleReady = () => {
        networkClient.toggleReady();
    };

    const handleSwitchTeam = () => {
        const myPlayer = currentRoom?.players[networkClient.ownId];
        const newTeam = myPlayer?.team === 'red' ? 'blue' : 'red';
        networkClient.switchTeam(newTeam);
    };

    const handleStartGame = () => {
        networkClient.startGame();
    };

    if (view === 'list') {
        return (
            <div className="w-full h-full bg-black text-teal-300 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold tracking-widest mb-8 text-center">MULTIPLAYER LOBBY</h1>

                    {error && (
                        <div className="bg-red-900/30 border border-red-500 p-4 mb-4 rounded">
                            {error}
                            <button onClick={() => setError(null)} className="ml-4 text-sm">✕</button>
                        </div>
                    )}

                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="flex-1 px-6 py-3 bg-teal-600 text-black font-bold tracking-widest rounded border-2 border-teal-500 hover:bg-teal-500"
                        >
                            CREATE ROOM
                        </button>
                        <button
                            onClick={() => networkClient.getRoomList()}
                            className="px-6 py-3 bg-gray-700 text-teal-300 font-bold tracking-widest rounded border-2 border-gray-600 hover:bg-gray-600"
                        >
                            REFRESH
                        </button>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-gray-800 text-gray-400 font-bold tracking-widest rounded border-2 border-gray-700 hover:bg-gray-700"
                        >
                            BACK
                        </button>
                    </div>

                    {showCreateDialog && (
                        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                            <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-md">
                                <h2 className="text-2xl font-bold mb-4">CREATE ROOM</h2>
                                <input
                                    type="text"
                                    placeholder="Room Name"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="w-full px-4 py-2 mb-4 bg-gray-800 border border-gray-700 rounded text-white"
                                />
                                <select
                                    value={selectedMap}
                                    onChange={(e) => setSelectedMap(e.target.value)}
                                    className="w-full px-4 py-2 mb-6 bg-gray-800 border border-gray-700 rounded text-white"
                                >
                                    {MISSIONS.map((mission) => (
                                        <option key={mission.name} value={mission.name}>{mission.name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleCreateRoom}
                                        className="flex-1 px-6 py-3 bg-teal-600 text-black font-bold rounded hover:bg-teal-500"
                                    >
                                        CREATE
                                    </button>
                                    <button
                                        onClick={() => setShowCreateDialog(false)}
                                        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 font-bold rounded hover:bg-gray-600"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rooms.length === 0 ? (
                            <div className="col-span-2 text-center py-12 text-gray-500">
                                No rooms available. Create one to start playing!
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="bg-gray-900 border-2 border-gray-700 rounded-lg p-6 hover:border-teal-500 transition-colors cursor-pointer"
                                    onClick={() => handleJoinRoom(room.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold">{room.name}</h3>
                                        <span className={`px-2 py-1 rounded text-xs ${room.status === 'waiting' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                            {room.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-2">Map: {room.mapName}</p>
                                    <p className="text-gray-400 text-sm">Players: {room.currentPlayers}/{room.maxPlayers}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Room view
    if (!currentRoom) return null;

    const myPlayer = currentRoom.players[networkClient.ownId];
    const redTeam = Object.values(currentRoom.players).filter((p: any) => p.team === 'red');
    const blueTeam = Object.values(currentRoom.players).filter((p: any) => p.team === 'blue');
    const allReady = Object.values(currentRoom.players).every((p: any) => p.isReady || p.isHost);

    return (
        <div className="w-full h-full bg-black text-teal-300 p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold tracking-widest mb-2 text-center">{currentRoom.name}</h1>
                <p className="text-center text-gray-400 mb-8">Map: {currentRoom.mapName}</p>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 p-4 mb-4 rounded">
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 text-sm">✕</button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 text-red-400">RED TEAM</h2>
                        {redTeam.map((player: any) => (
                            <div key={player.id} className="flex justify-between items-center mb-2 p-2 bg-black/30 rounded">
                                <span className="flex items-center gap-2">
                                    {player.isHost && <span className="text-yellow-400">★</span>}
                                    {player.username}
                                </span>
                                {player.isReady && <span className="text-green-400">●</span>}
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-900/20 border-2 border-blue-500 rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 text-blue-400">BLUE TEAM</h2>
                        {blueTeam.map((player: any) => (
                            <div key={player.id} className="flex justify-between items-center mb-2 p-2 bg-black/30 rounded">
                                <span className="flex items-center gap-2">
                                    {player.isHost && <span className="text-yellow-400">★</span>}
                                    {player.username}
                                </span>
                                {player.isReady && <span className="text-green-400">●</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSwitchTeam}
                        className="flex-1 px-6 py-3 bg-gray-700 text-teal-300 font-bold tracking-widest rounded border-2 border-gray-600 hover:bg-gray-600"
                    >
                        SWITCH TEAM
                    </button>
                    <button
                        onClick={handleToggleReady}
                        className={`flex-1 px-6 py-3 font-bold tracking-widest rounded border-2 ${myPlayer?.isReady
                            ? 'bg-red-900 text-red-300 border-red-700 hover:bg-red-800'
                            : 'bg-green-900 text-green-300 border-green-700 hover:bg-green-800'
                            }`}
                    >
                        {myPlayer?.isReady ? 'NOT READY' : 'READY'}
                    </button>
                    {myPlayer?.isHost && (
                        <button
                            onClick={handleStartGame}
                            disabled={!allReady}
                            className={`flex-1 px-6 py-3 font-bold tracking-widest rounded border-2 ${allReady
                                ? 'bg-teal-600 text-black border-teal-500 hover:bg-teal-500'
                                : 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
                                }`}
                        >
                            START GAME
                        </button>
                    )}
                    <button
                        onClick={handleLeaveRoom}
                        className="px-6 py-3 bg-red-900/50 text-red-300 font-bold tracking-widest rounded border-2 border-red-800 hover:bg-red-900"
                    >
                        LEAVE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiplayerLobby;
