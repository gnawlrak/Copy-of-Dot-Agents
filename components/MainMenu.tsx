import React from 'react';

interface MainMenuProps {
  onStart: () => void;
  onGoToLoadout: () => void;
  onGoToEditor: () => void;
  onGoToSettings: () => void;
  isListening: boolean;
  voiceStatus: string;
  onToggleVoice: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onGoToLoadout, onGoToEditor, onGoToSettings, isListening, voiceStatus, onToggleVoice }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center w-full h-full">
      <div className="mb-12">
        <h1 className="text-6xl lg:text-8xl font-bold tracking-widest text-teal-300 animate-pulse">DOT AGENTS</h1>
        <p className="text-gray-400 mt-2 text-lg">《圆点杀机》 - Act 1: Silent Infiltration</p>
      </div>
      <div className="flex flex-col gap-6">
        <button
          onClick={onStart}
          className="px-8 py-4 bg-teal-500 text-black font-bold text-2xl tracking-widest rounded-md border-2 border-teal-300 shadow-lg shadow-teal-500/50 hover:bg-teal-400 hover:shadow-teal-400/50 transition-all duration-300 transform hover:scale-105"
        >
          START MISSION
        </button>
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
          <button
            onClick={onGoToSettings}
            className="px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            SETTINGS
          </button>
            <button
              onClick={onToggleVoice}
              className={`px-4 py-3 rounded-md border-2 transition-colors duration-200 ${
                isListening
                  ? 'bg-green-500 border-green-300 text-black animate-pulse'
                  : 'bg-gray-800 border-gray-600 text-teal-300 hover:bg-gray-700 hover:border-teal-500'
              }`}
              title="Toggle Voice Commands"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </button>
        </div>
      </div>
       <p className="text-gray-500 mt-6 h-6">{voiceStatus}</p>
    </div>
  );
};

export default MainMenu;
