import React from 'react';

interface MainMenuProps {
  onStart: () => void;
  onGoToLoadout: () => void;
  onGoToEditor: () => void;
  onGoToSettings: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onGoToLoadout, onGoToEditor, onGoToSettings }) => {
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
            className="px-6 py-2 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            LOADOUT
          </button>
          <button
            onClick={onGoToEditor}
            className="px-6 py-2 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            MAP EDITOR
          </button>
          <button
            onClick={onGoToSettings}
            className="px-6 py-2 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
          >
            SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
