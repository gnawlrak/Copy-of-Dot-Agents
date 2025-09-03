import React, { useState, useEffect } from 'react';
import { LevelDefinition, getCustomLevels } from '../levels/level-definitions';
import { Difficulty } from '../App';

interface LevelSelectProps {
  officialLevels: LevelDefinition[];
  onSelectLevel: (level: LevelDefinition) => void;
  onBack: () => void;
  onEditLevel: (level: LevelDefinition) => void;
  onDeleteLevel: (uuid: string) => void;
  onCreateNew: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const LevelSelect: React.FC<LevelSelectProps> = ({ officialLevels, onSelectLevel, onBack, onEditLevel, onDeleteLevel, onCreateNew, difficulty, onDifficultyChange }) => {
  const [customLevels, setCustomLevels] = useState<LevelDefinition[]>([]);
  
  useEffect(() => {
    setCustomLevels(getCustomLevels());
  }, []);

  const renderLevelButton = (level: LevelDefinition, isCustom: boolean) => (
    <div key={level.uuid || level.name} className="flex items-center gap-2">
      <button
        onClick={() => onSelectLevel(level)}
        className="flex-grow p-6 bg-gray-900 border-2 border-gray-700 rounded-md text-left hover:bg-gray-800 hover:border-teal-500 transition-colors duration-200"
      >
        <h2 className="text-2xl font-bold text-teal-400 tracking-wider">{level.name}</h2>
        <p className="text-gray-400 mt-1">{level.description}</p>
      </button>
      {isCustom && level.uuid && (
        <div className="flex flex-col gap-3">
          <button onClick={() => onEditLevel(level)} className="px-5 py-3 bg-blue-800 text-white rounded hover:bg-blue-700 transition-colors">Edit</button>
          <button onClick={() => onDeleteLevel(level.uuid!)} className="px-5 py-3 bg-red-800 text-white rounded hover:bg-red-700 transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
  
  const difficultyButtonClass = (d: Difficulty) => 
    `px-8 py-3 font-bold text-lg tracking-widest rounded-md border-2 transition-colors duration-200 ${
        difficulty === d 
        ? 'bg-teal-500 text-black border-teal-300' 
        : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
    }`;

  return (
    <div className="w-full max-w-4xl text-center">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-4">SELECT MISSION</h1>

      <div className="mb-6">
        <h2 className="text-xl text-gray-400 mb-3">DIFFICULTY</h2>
        <div className="flex justify-center gap-4">
            <button onClick={() => onDifficultyChange('simple')} className={difficultyButtonClass('simple')}>
                SIMPLE
            </button>
            <button onClick={() => onDifficultyChange('normal')} className={difficultyButtonClass('normal')}>
                NORMAL
            </button>
            <button onClick={() => onDifficultyChange('hard')} className={difficultyButtonClass('hard')}>
                HARD
            </button>
        </div>
      </div>
      
      <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-4">
        <h3 className="text-xl text-gray-400 text-left border-b border-gray-600 pb-2">OFFICIAL MISSIONS</h3>
        {officialLevels.map((level) => renderLevelButton(level, false))}

        {customLevels.length > 0 && (
          <h3 className="text-xl text-gray-400 text-left border-b border-gray-600 pb-2 pt-6">CUSTOM MAPS</h3>
        )}
        {customLevels.map((level) => renderLevelButton(level, true))}
      </div>
       <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-gray-800 text-gray-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors duration-200"
        >
          BACK TO MENU
        </button>
        <button
          onClick={onCreateNew}
          className="px-8 py-3 bg-teal-600 text-white font-bold text-lg rounded-md hover:bg-teal-500 transition-colors"
        >
          CREATE NEW MAP
        </button>
       </div>
    </div>
  );
};

export default LevelSelect;