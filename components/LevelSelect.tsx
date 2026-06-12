
import React from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { Difficulty } from '../App';
import { Flame, ShieldAlert, Swords, Plus, Edit3, Trash2, Play, Compass } from 'lucide-react';

interface LevelSelectProps {
  officialLevels: LevelDefinition[];
  customLevels: LevelDefinition[];
  onSelectLevel: (level: LevelDefinition) => void;
  onEditLevel: (level: LevelDefinition) => void;
  onDeleteLevel: (uuid: string) => void;
  onCreateNew: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const LevelSelect: React.FC<LevelSelectProps> = ({ officialLevels, customLevels, onSelectLevel, onEditLevel, onDeleteLevel, onCreateNew, difficulty, onDifficultyChange }) => {

  const renderLevelButton = (level: LevelDefinition, isCustom: boolean) => (
    <div key={level.uuid || level.name} className="flex items-stretch gap-3">
      <button
        onClick={() => onSelectLevel(level)}
        className="flex-grow p-5 bg-gray-900 border-2 border-gray-800 rounded-md text-left hover:bg-gray-800/80 hover:border-teal-500 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
      >
        <div className="bg-gray-800/80 p-3 rounded-md text-teal-400 group-hover:text-teal-300 transition-colors">
          <Play className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-teal-400 tracking-wider group-hover:text-teal-300 transition-colors">{level.name}</h2>
          <p className="text-gray-400 text-sm mt-1">{level.description}</p>
        </div>
      </button>
      {isCustom && level.uuid && (
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => onEditLevel(level)} 
            className="p-4 bg-blue-900/40 border border-blue-700/50 text-blue-300 rounded-md hover:bg-blue-800/60 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Edit Map"
          >
            <Edit3 className="h-5 w-5" />
          </button>
          <button 
            onClick={() => onDeleteLevel(level.uuid!)} 
            className="p-4 bg-red-900/40 border border-red-700/50 text-red-300 rounded-md hover:bg-red-800/60 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Delete Map"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
  
  const difficultyButtonClass = (d: Difficulty) => 
    `px-6 py-3 font-bold text-base tracking-widest rounded-md border-2 transition-all duration-200 flex items-center gap-2 cursor-pointer ${
        difficulty === d 
        ? d === 'simple' ? 'bg-emerald-500 text-black border-emerald-300 shadow-md shadow-emerald-500/10' :
          d === 'hard' ? 'bg-red-500 text-black border-red-300 shadow-md shadow-red-500/10' :
          'bg-teal-500 text-black border-teal-300 shadow-md shadow-teal-500/10'
        : 'bg-gray-800 text-gray-400 border-gray-700/80 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <div className="w-full max-w-4xl text-center mx-auto px-2">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-6 flex items-center justify-center gap-3">
        <Compass className="h-8 w-8 text-teal-400 animate-pulse" />
        SELECT MISSION
      </h1>

      <div className="mb-8 bg-gray-900/40 border border-gray-800 p-5 rounded-lg">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-4 uppercase">DIFFICULTY METRIC</h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <button onClick={() => onDifficultyChange('simple')} className={difficultyButtonClass('simple')}>
                <Compass className="h-4 w-4" />
                SIMPLE
            </button>
            <button onClick={() => onDifficultyChange('normal')} className={difficultyButtonClass('normal')}>
                <Swords className="h-4 w-4" />
                NORMAL
            </button>
            <button onClick={() => onDifficultyChange('hard')} className={difficultyButtonClass('hard')}>
                <Flame className="h-4 w-4" />
                HARD
            </button>
        </div>
      </div>
      
      <div className="space-y-4 mb-8 max-h-[45vh] overflow-y-auto pr-2 text-left">
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-teal-400" />
          <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase">OFFICIAL SIMULATIONS</h3>
        </div>
        <div className="space-y-3">
          {officialLevels.map((level) => renderLevelButton(level, false))}
        </div>

        {customLevels.length > 0 && (
          <>
            <div className="flex items-center gap-2 border-b border-gray-800/80 pb-2 mb-4 pt-6">
              <Swords className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase">TACTICAL CUSTOMS</h3>
            </div>
            <div className="space-y-3">
              {customLevels.map((level) => renderLevelButton(level, true))}
            </div>
          </>
        )}
      </div>
       <div className="flex items-center justify-center mt-6">
        <button
          onClick={onCreateNew}
          className="px-8 py-3 bg-teal-600 text-white font-bold text-base tracking-widest rounded-md hover:bg-teal-500 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-teal-900/30"
        >
          <Plus className="h-5 w-5" />
          CREATE NEW MAP
        </button>
       </div>
    </div>
  );
};

export default LevelSelect;
