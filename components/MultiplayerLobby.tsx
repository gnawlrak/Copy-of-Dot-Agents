
import React from 'react';
import { LevelDefinition } from '../levels/level-definitions';

interface MultiplayerLobbyProps {
  onJoinGame: (level: LevelDefinition) => void;
  missions: LevelDefinition[];
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onJoinGame, missions }) => {
    const factoryLevel = missions.find(m => m.name === 'THE FACTORY');
    const trainingLevel = missions.find(m => m.name === 'TRAINING GROUND');
    const expansionLevel = missions.find(m => m.name.includes('EXPANSION'));

    const mockRooms = [
        { name: 'Factory Raid', level: factoryLevel, players: '2/4' },
        { name: 'Training Grounds CQB', level: trainingLevel, players: '1/2' },
        { name: 'Expansion TDM', level: expansionLevel, players: '7/8' },
    ];

    return (
    <div className="w-full max-w-4xl text-center flex flex-col h-full justify-center">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8 animate-pulse">MULTIPLAYER LOBBY</h1>
      
      <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto pr-4 bg-black/20 p-4 rounded-lg border-2 border-gray-800">
        <h3 className="text-xl text-gray-400 text-left border-b border-gray-600 pb-2">AVAILABLE SESSIONS</h3>
        {mockRooms.map((room, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-900 border-2 border-gray-700 rounded-md">
                <div className="flex-grow text-left">
                     <h2 className="text-2xl font-bold text-teal-400 tracking-wider">{room.name}</h2>
                     <p className="text-gray-400 mt-1">Map: {room.level?.name || 'Unknown'}</p>
                </div>
                <div className="text-center">
                    <p className="text-lg text-gray-300">OPERATORS</p>
                    <p className="text-2xl font-bold text-white">{room.players}</p>
                </div>
                <button
                    onClick={() => room.level && onJoinGame(room.level)}
                    disabled={!room.level}
                    className="px-8 py-4 bg-teal-600 text-white font-bold text-lg rounded-md hover:bg-teal-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                    JOIN
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};

export default MultiplayerLobby;
