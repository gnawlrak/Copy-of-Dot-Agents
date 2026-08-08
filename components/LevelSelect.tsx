
import React from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { Difficulty } from '../App';
import { Flame, ShieldAlert, Swords, Plus, Edit3, Trash2, Play, Compass, Wrench } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface LevelSelectProps {
  officialLevels: LevelDefinition[];
  customLevels: LevelDefinition[];
  onSelectLevel: (level: LevelDefinition) => void;
  onEditLevel: (level: LevelDefinition) => void;
  onDeleteLevel: (uuid: string) => void;
  onCreateNew: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  isAdmin: boolean;
}

const LevelSelect: React.FC<LevelSelectProps> = ({ officialLevels, customLevels, onSelectLevel, onEditLevel, onDeleteLevel, onCreateNew, difficulty, onDifficultyChange, isAdmin }) => {
  const { language, t } = useLanguage();

  const getLevelTranslation = (name: string, desc: string) => {
    if (language === 'en') return { name, desc };

    const key = name.toUpperCase();
    if (key.includes('TRAINING GROUND')) {
      return {
        name: 'CQB 基础训练场',
        desc: '适合调试和校正各类战术兵装，测试不同枪支的射击弹道与投掷物属性。'
      };
    }
    if (key === 'THE FACTORY') {
      return {
        name: '废弃工厂区域',
        desc: '高风险废弃厂房内，充斥着巡逻敌方人员，地形宽阔需要极高的态势感知。'
      };
    }
    if (key.includes('THE FACTORY (EXPANSION)')) {
      return {
        name: '废弃工厂：深度扩张区',
        desc: '更大更复杂的工厂核心区域，多角度盲区与重火力敌人交织。'
      };
    }
    return { name, desc };
  };

  const renderLevelButton = (level: LevelDefinition, isCustom: boolean) => {
    const { name, desc } = getLevelTranslation(level.name, level.description);
    return (
      <div key={level.uuid || level.name} className="flex items-stretch gap-2">
        <button
          onClick={() => onSelectLevel(level)}
          className="flex-grow p-4 bg-panel border border-line text-left hover:bg-panel2 hover:border-signal transition-all duration-200 flex items-center gap-4 cursor-pointer group"
        >
          <div className="bg-ink border border-line p-3 text-signal group-hover:border-signal transition-colors shrink-0">
            <Play className="h-4 w-4 fill-current" />
          </div>
          <div className="min-w-0">
            <h2 className="font-cond text-xl font-bold text-bone tracking-wider group-hover:text-signal transition-colors uppercase">{name}</h2>
            <p className="text-dim text-sm mt-0.5 font-mono">{desc}</p>
          </div>
        </button>
        {isCustom && level.uuid && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onEditLevel(level)}
              className="p-4 bg-panel border border-line text-dim hover:text-signal hover:border-signal transition-all flex items-center justify-center gap-1 cursor-pointer"
              title={language === 'en' ? 'Edit Map' : '编辑此地图'}
            >
              <Edit3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDeleteLevel(level.uuid!)}
              className="p-4 bg-panel border border-line text-dim hover:text-danger hover:border-danger transition-all flex items-center justify-center gap-1 cursor-pointer"
              title={language === 'en' ? 'Delete Map' : '删除此地图'}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const difficultyButtonClass = (d: Difficulty) =>
    `px-6 py-2.5 font-cond font-bold text-base tracking-[0.15em] uppercase border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
        difficulty === d
        ? d === 'simple' ? 'bg-emerald-500 text-ink border-emerald-400' :
          d === 'hard' ? 'bg-danger text-ink border-red-400' :
          d === 'test' ? 'bg-indigo-500 text-white border-indigo-400' :
          'bg-signal text-ink border-teal-400'
        : 'bg-panel text-dim border-line hover:bg-panel2 hover:text-bone'
    }`;

  return (
    <div className="w-full max-w-4xl text-center mx-auto px-2 menu-in">
      <div className="mb-8">
        <h1 className="font-display text-4xl lg:text-5xl tracking-wide text-bone flex items-center justify-center gap-3">
          <Compass className="h-8 w-8 text-signal" />
          {t('levelSelectTitle')}
        </h1>
        <div className="hazard h-1 w-40 mx-auto mt-4" aria-hidden="true" />
      </div>

      <div className="mb-8 bg-panel border border-line p-5">
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-dim mb-4 uppercase font-mono">
          {language === 'en' ? '// DIFFICULTY METRIC' : '// 战场烈度 (难度级别)'}
        </h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
            <button onClick={() => onDifficultyChange('simple')} className={difficultyButtonClass('simple')} title={t('difficultySimple')}>
                <Compass className="h-4 w-4" />
                {language === 'en' ? 'SIMPLE' : '简单'}
            </button>
            <button onClick={() => onDifficultyChange('normal')} className={difficultyButtonClass('normal')} title={t('difficultyNormal')}>
                <Swords className="h-4 w-4" />
                {language === 'en' ? 'NORMAL' : '标准'}
            </button>
            <button onClick={() => onDifficultyChange('hard')} className={difficultyButtonClass('hard')} title={t('difficultyHard')}>
                <Flame className="h-4 w-4" />
                {language === 'en' ? 'HARD' : '突击/重压'}
            </button>
            {isAdmin && (
                <button onClick={() => onDifficultyChange('test')} className={difficultyButtonClass('test')} title={t('difficultyTest')}>
                    <Wrench className="h-4 w-4" />
                    {language === 'en' ? 'TEST' : '测试'}
                </button>
            )}
        </div>
      </div>

      <div className="space-y-4 mb-8 max-h-[45vh] overflow-y-auto pr-2 text-left">
        <div className="flex items-center gap-2 border-b border-line pb-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-signal" />
          <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono">
            {language === 'en' ? 'OFFICIAL SIMULATIONS' : '官方认证测试场地'}
          </h3>
        </div>
        <div className="space-y-2">
          {officialLevels.map((level) => renderLevelButton(level, false))}
        </div>

        {customLevels.length > 0 && (
          <>
            <div className="flex items-center gap-2 border-b border-line pb-2 mb-4 pt-6">
              <Swords className="h-4 w-4 text-signal" />
              <h3 className="text-[11px] font-bold tracking-[0.25em] text-dim uppercase font-mono">
                {language === 'en' ? 'TACTICAL CUSTOMS' : '自定实兵演练地域'}
              </h3>
            </div>
            <div className="space-y-2">
              {customLevels.map((level) => renderLevelButton(level, true))}
            </div>
          </>
        )}
      </div>
       <div className="flex items-center justify-center mt-6">
        <button
          onClick={onCreateNew}
          className="px-8 py-3 bg-panel2 border border-line text-bone font-cond font-bold text-base tracking-[0.15em] uppercase hover:border-signal hover:text-signal transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          {language === 'en' ? 'CREATE NEW MAP' : '绘制自定全新地图'}
        </button>
       </div>
    </div>
  );
};

export default LevelSelect;
