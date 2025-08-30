import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import LevelSelect from './components/LevelSelect';
import { LevelDefinition, MISSIONS, deleteCustomLevel } from './levels/level-definitions';
import MapEditor from './components/MapEditor';
import LoadoutMenu from './components/LoadoutMenu';
import WeaponModificationMenu from './components/WeaponModificationMenu';
import { ThrowableType, AGENT_SKINS } from './data/definitions';
import { WEAPONS, WEAPON_TYPES } from './data/weapons';

type GameState = 'main-menu' | 'level-select' | 'in-game' | 'map-editor' | 'loadout' | 'weapon-modification';

export interface PlayerLoadout {
  primary: string;
  secondary: string;
  primaryAttachments: { [slot: string]: string };
  secondaryAttachments: { [slot: string]: string };
  throwables: { [key in ThrowableType]?: number };
}

const DEFAULT_LOADOUT: PlayerLoadout = {
  primary: WEAPON_TYPES.primary[0],
  secondary: WEAPON_TYPES.secondary[0],
  primaryAttachments: {},
  secondaryAttachments: {},
  throwables: {
    'grenade': 3,
    'flashbang': 2,
  },
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('main-menu');
  const [selectedLevel, setSelectedLevel] = useState<LevelDefinition | null>(null);
  const [levelToEdit, setLevelToEdit] = useState<LevelDefinition | null>(null);
  const [levelVersion, setLevelVersion] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundWaves, setShowSoundWaves] = useState(true);
  const [weaponToModify, setWeaponToModify] = useState<'primary' | 'secondary' | null>(null);


  const [agentSkin, setAgentSkin] = useState<string>(() => {
    try {
      const savedSkin = localStorage.getItem('dot_agents_agent_skin');
      if (savedSkin && AGENT_SKINS.find(s => s.name === savedSkin)) {
        return savedSkin;
      }
    } catch (e) {
      console.error("Failed to load agent skin:", e);
    }
    return AGENT_SKINS[0].name;
  });

  const [playerLoadout, setPlayerLoadout] = useState<PlayerLoadout>(() => {
    try {
      const saved = localStorage.getItem('dot_agents_player_loadout');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic validation and migration for new attachment fields
        if (parsed.primary && parsed.secondary && parsed.throwables) {
          return {
            ...DEFAULT_LOADOUT,
            ...parsed,
            primaryAttachments: parsed.primaryAttachments || {},
            secondaryAttachments: parsed.secondaryAttachments || {},
          };
        }
      }
    } catch (e) {
      console.error("Failed to load player loadout:", e);
    }
    return DEFAULT_LOADOUT;
  });

  useEffect(() => {
    try {
      localStorage.setItem('dot_agents_agent_skin', agentSkin);
    } catch (e) {
      console.error("Failed to save agent skin:", e);
    }
  }, [agentSkin]);

  useEffect(() => {
    try {
      localStorage.setItem('dot_agents_player_loadout', JSON.stringify(playerLoadout));
    } catch (e) {
      console.error("Failed to save player loadout:", e);
    }
  }, [playerLoadout]);


  const handleStartMission = () => {
    setGameState('level-select');
  };
  
  const handleGoToLoadout = () => {
    setGameState('loadout');
  };

  const handleGoToEditor = (level: LevelDefinition | null) => {
    setLevelToEdit(level);
    setGameState('map-editor');
  };

  const handleSelectLevel = (level: LevelDefinition) => {
    setSelectedLevel(level);
    setGameState('in-game');
  };

  const handleMissionEnd = () => {
    setSelectedLevel(null);
    setGameState('level-select');
  };
  
  const handleBackToMenu = () => {
    setGameState('main-menu');
  };

  const handleBackToLevelSelect = useCallback(() => {
    setLevelVersion(v => v + 1); // Increment to force LevelSelect to re-fetch levels
    setGameState('level-select');
  }, []);
  
  const handleGoToModifyWeapon = (weaponType: 'primary' | 'secondary') => {
    setWeaponToModify(weaponType);
    setGameState('weapon-modification');
  };

  const handleBackToLoadout = () => {
      setWeaponToModify(null);
      setGameState('loadout');
  };

  const handleAttachmentsChange = (newAttachments: { [slot: string]: string }) => {
      if (!weaponToModify) return;
      setPlayerLoadout(prev => ({
          ...prev,
          [weaponToModify === 'primary' ? 'primaryAttachments' : 'secondaryAttachments']: newAttachments,
      }));
  };

  const handleDeleteLevel = useCallback((uuid: string) => {
    if (window.confirm('Are you sure you want to delete this custom map?')) {
        deleteCustomLevel(uuid);
        setLevelVersion(v => v + 1); // Force re-render of level list
    }
  }, []);

  const renderContent = () => {
    switch (gameState) {
      case 'in-game':
        if (selectedLevel) {
          const skinColor = AGENT_SKINS.find(s => s.name === agentSkin)?.color || '#FFFFFF';
          return (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full h-full max-w-6xl max-h-[calc(100vh-2rem)] aspect-video bg-black border-2 border-teal-500 shadow-lg shadow-teal-500/30 rounded-md">
                <GameCanvas level={selectedLevel} loadout={playerLoadout} onMissionEnd={handleMissionEnd} showSoundWaves={showSoundWaves} agentSkinColor={skinColor} />
              </div>
            </div>
          );
        }
        // Fallback if no level is selected
        setGameState('level-select');
        return null;
      case 'level-select':
        return <LevelSelect 
          key={levelVersion} 
          officialLevels={MISSIONS} 
          onSelectLevel={handleSelectLevel} 
          onBack={handleBackToMenu}
          onEditLevel={(level) => handleGoToEditor(level)}
          onDeleteLevel={handleDeleteLevel}
          onCreateNew={() => handleGoToEditor(null)}
        />;
      case 'map-editor':
        return (
          <div className="w-full h-full p-4">
            <MapEditor levelToEdit={levelToEdit} onBack={handleBackToLevelSelect} />
          </div>
        );
      case 'loadout':
        return <LoadoutMenu 
          currentLoadout={playerLoadout} 
          onLoadoutChange={setPlayerLoadout}
          onBack={handleBackToMenu}
          currentSkinName={agentSkin}
          onSkinChange={setAgentSkin}
          onModifyWeapon={handleGoToModifyWeapon}
        />;
      case 'weapon-modification': {
          if (!weaponToModify) {
              setGameState('loadout'); // Fallback
              return null;
          }
          const weaponName = playerLoadout[weaponToModify];
          const currentAttachments = playerLoadout[weaponToModify === 'primary' ? 'primaryAttachments' : 'secondaryAttachments'];
          return (
            <WeaponModificationMenu 
                weaponName={weaponName}
                currentAttachments={currentAttachments}
                onAttachmentsChange={handleAttachmentsChange}
                onBack={handleBackToLoadout}
            />
          );
      }
      case 'main-menu':
      default:
        return <MainMenu onStart={handleStartMission} onGoToLoadout={handleGoToLoadout} onGoToEditor={() => handleGoToEditor(null)} onGoToSettings={() => setShowSettings(true)} />;
    }
  };

  return (
    <main className="bg-black text-white w-screen h-screen flex flex-col items-center justify-center font-mono overflow-hidden">
      {renderContent()}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-md shadow-lg shadow-teal-500/30">
            <h2 id="settings-title" className="text-3xl font-bold tracking-widest text-teal-300 mb-6 text-center">SETTINGS</h2>
            <div className="flex items-center justify-between py-4">
              <span className="text-lg text-gray-300" id="sound-waves-label">Show Sound Waves</span>
              <button
                onClick={() => setShowSoundWaves(!showSoundWaves)}
                className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${showSoundWaves ? 'bg-teal-500' : 'bg-gray-700'}`}
                role="switch"
                aria-checked={showSoundWaves}
                aria-labelledby="sound-waves-label"
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${showSoundWaves ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default App;
