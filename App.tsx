

import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import LevelSelect from './components/LevelSelect';
import { LevelDefinition, MISSIONS, deleteCustomLevel } from './levels/level-definitions';
import MapEditor from './components/MapEditor';
import LoadoutMenu from './components/LoadoutMenu';
import WeaponModificationMenu from './components/WeaponModificationMenu';
import { ThrowableType, AGENT_SKINS } from './data/definitions';
import { WEAPONS, WEAPON_TYPES } from './data/weapons';
import ControlCustomizer from './components/ControlCustomizer';
import { PlayerLoadout, CustomControls } from './types';
import { Operator, OperatorClassID, OPERATORS } from './data/operators';
import MultiplayerLobby from './components/MultiplayerLobby';
import { MockNetworkClient } from './network';

type GameState = 'main-menu' | 'level-select' | 'in-game' | 'map-editor' | 'loadout' | 'weapon-modification' | 'multiplayer-lobby';
export type Difficulty = 'simple' | 'normal' | 'hard';

const DEFAULT_LOADOUT: PlayerLoadout = {
  primary: 'Assault Rifle',
  secondary: WEAPON_TYPES.secondary[0],
  melee: 'Combat Knife',
  primaryAttachments: {
    'Trigger': '三连发扳机组' // Default with burst fire
  },
  secondaryAttachments: {},
  throwables: {
    'grenade': 3,
    'flashbang': 2,
  },
};

const DEFAULT_CONTROLS_LAYOUT: CustomControls = {
    baseScale: 1.0,
    opacity: 0.5,
    layout: {
        joystick:       { x: 0.078, y: 0.86, scale: 1.6 },
        fire:           { x: 0.92,  y: 0.86, scale: 1.2 },
        fixedFire:      { x: 0.078, y: 0.65, scale: 1.2 },
        reload:         { x: 0.92,  y: 0.69, scale: 0.8 },
        interact:       { x: 0.85,  y: 0.75, scale: 0.8 },
        switchWeapon:   { x: 0.85,  y: 0.86, scale: 0.8 },
        melee:          { x: 0.78,  y: 0.75, scale: 0.8 },
        throwableSelect:{ x: 0.78,  y: 0.86, scale: 0.8 },
        switchThrowable:{ x: 0.71,  y: 0.86, scale: 0.8 },
        fireModeSwitch: { x: 0.78,  y: 0.65, scale: 0.8 },
        heal:           { x: 0.85,  y: 0.65, scale: 0.8 },
        skill:          { x: 0.71,  y: 0.55, scale: 0.9 },
        ultimate:       { x: 0.78,  y: 0.55, scale: 0.9 },
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
  const [isCustomizingControls, setIsCustomizingControls] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('simple');
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const networkClientRef = useRef<MockNetworkClient | null>(null);

  useEffect(() => {
    if (!networkClientRef.current) {
        networkClientRef.current = new MockNetworkClient();
    }
  }, []);
  
  const [operatorClassId, setOperatorClassId] = useState<OperatorClassID>(() => {
    try {
        const saved = localStorage.getItem('dot_agents_operator_class_id');
        if (saved && OPERATORS[saved as OperatorClassID]) {
            return saved as OperatorClassID;
        }
    } catch (e) {
        console.error("Failed to load operator class id:", e);
    }
    return 'A-Red'; // Default to Assault
  });

  useEffect(() => {
    try {
        localStorage.setItem('dot_agents_operator_class_id', operatorClassId);
    } catch (e) {
        console.error("Failed to save operator class id:", e);
    }
  }, [operatorClassId]);

  const [aimSensitivity, setAimSensitivity] = useState<number>(() => {
    try {
        const saved = localStorage.getItem('dot_agents_aim_sensitivity');
        if (saved) {
            const parsed = parseFloat(saved);
            if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to load aim sensitivity:", e);
    }
    return 1.0; // Default value
  });

  useEffect(() => {
    try {
        localStorage.setItem('dot_agents_aim_sensitivity', aimSensitivity.toString());
    } catch (e) {
        console.error("Failed to save aim sensitivity:", e);
    }
  }, [aimSensitivity]);

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
            melee: parsed.melee || DEFAULT_LOADOUT.melee,
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

  const [customControls, setCustomControls] = useState<CustomControls>(() => {
    try {
        const saved = localStorage.getItem('dot_agents_custom_controls');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Basic validation
            if (parsed.baseScale && parsed.opacity && parsed.layout) {
                // Merge with default to ensure all controls are present if new ones were added in an update
                return {
                    ...DEFAULT_CONTROLS_LAYOUT,
                    ...parsed,
                    layout: {
                        ...DEFAULT_CONTROLS_LAYOUT.layout,
                        ...parsed.layout,
                    }
                };
            }
        }
    } catch (e) {
        console.error("Failed to load custom controls:", e);
    }
    return DEFAULT_CONTROLS_LAYOUT;
  });

  useEffect(() => {
    try {
      localStorage.setItem('dot_agents_custom_controls', JSON.stringify(customControls));
    } catch (e) {
      console.error("Failed to save custom controls:", e);
    }
  }, [customControls]);

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

  const handleGoToMultiplayer = () => {
    setGameState('multiplayer-lobby');
  };

  const handleGoToEditor = (level: LevelDefinition | null) => {
    setLevelToEdit(level);
    setGameState('map-editor');
  };

  const handleSelectLevel = (level: LevelDefinition) => {
    setSelectedLevel(level);
    setIsMultiplayer(false);
    setGameState('in-game');
  };

  const handleJoinMultiplayerGame = (level: LevelDefinition) => {
    setSelectedLevel(level);
    setIsMultiplayer(true);
    setGameState('in-game');
  };

  const handleMissionEnd = () => {
    setSelectedLevel(null);
    networkClientRef.current?.disconnect();
    const previousState = isMultiplayer ? 'multiplayer-lobby' : 'level-select';
    setIsMultiplayer(false);
    setGameState(previousState);
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

  const handleBackToLoadout = useCallback(() => {
      setWeaponToModify(null);
      setGameState('loadout');
  }, []);

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

  const handleGlobalBack = useCallback(() => {
    switch (gameState) {
        case 'level-select':
        case 'loadout':
        case 'multiplayer-lobby':
            setGameState('main-menu');
            break;
        case 'map-editor':
            handleBackToLevelSelect();
            break;
        case 'weapon-modification':
            handleBackToLoadout();
            break;
        default:
            break;
    }
  }, [gameState, handleBackToLevelSelect, handleBackToLoadout]);


  const renderContent = () => {
    switch (gameState) {
      case 'in-game':
        if (selectedLevel) {
          const skinColor = AGENT_SKINS.find(s => s.name === agentSkin)?.color || '#FFFFFF';
          const operator = OPERATORS[operatorClassId];
          return (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full h-full max-w-6xl max-h-[calc(100vh-2rem)] aspect-video bg-black border-2 border-teal-500 shadow-lg shadow-teal-500/30 rounded-md">
                <GameCanvas 
                    level={selectedLevel} 
                    loadout={playerLoadout} 
                    operator={operator}
                    onMissionEnd={handleMissionEnd} 
                    showSoundWaves={showSoundWaves} 
                    agentSkinColor={skinColor}
                    customControls={customControls}
                    aimSensitivity={aimSensitivity}
                    onAimSensitivityChange={setAimSensitivity}
                    onCustomControlsChange={setCustomControls}
                    defaultControlsLayout={DEFAULT_CONTROLS_LAYOUT}
                    difficulty={difficulty}
                    isMultiplayer={isMultiplayer}
                    networkClient={networkClientRef.current}
                />
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
          onEditLevel={(level) => handleGoToEditor(level)}
          onDeleteLevel={handleDeleteLevel}
          onCreateNew={() => handleGoToEditor(null)}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
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
            />
          );
      }
      case 'multiplayer-lobby':
        return <MultiplayerLobby 
            onJoinGame={handleJoinMultiplayerGame}
            missions={MISSIONS}
        />;
      case 'main-menu':
      default:
        return <MainMenu 
            onStart={handleStartMission} 
            onGoToLoadout={handleGoToLoadout} 
            onGoToEditor={() => handleGoToEditor(null)} 
            onGoToMultiplayer={handleGoToMultiplayer}
        />;
    }
  };
  
  const BackButton = () => (
    <button
        onClick={handleGlobalBack}
        className="absolute top-4 left-4 z-50 p-3 bg-gray-800/50 text-teal-300 rounded-full border-2 border-gray-600/50 hover:bg-gray-700 hover:border-teal-500 transition-all duration-200"
        aria-label="Go Back"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    </button>
  );

  const SettingsButton = () => (
    <button
        onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 z-50 p-3 bg-gray-800/50 text-teal-300 rounded-full border-2 border-gray-600/50 hover:bg-gray-700 hover:border-teal-500 transition-all duration-200"
        aria-label="Open Settings"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    </button>
  );

  const shouldShowGlobalUI = gameState !== 'in-game' && gameState !== 'map-editor' && !isCustomizingControls && !showSettings;

  return (
    <main className="bg-black text-white w-screen h-screen flex flex-col items-center justify-center font-mono overflow-hidden relative">
      {shouldShowGlobalUI && gameState !== 'main-menu' && <BackButton />}
      {shouldShowGlobalUI && <SettingsButton />}
      
      {renderContent()}

      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-md shadow-lg shadow-teal-500/30">
            <h2 id="settings-title" className="text-3xl font-bold tracking-widest text-teal-300 mb-6 text-center">SETTINGS</h2>
            
            <div className="flex flex-col gap-2 py-4">
              <label htmlFor="sensitivity-slider" className="flex items-center justify-between text-lg text-gray-300">
                <span>Aim Sensitivity</span>
                <span className="font-mono text-teal-300">{aimSensitivity.toFixed(2)}</span>
              </label>
              <input
                id="sensitivity-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={aimSensitivity}
                onChange={(e) => setAimSensitivity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
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
              onClick={() => {
                  setShowSettings(false);
                  setIsCustomizingControls(true);
              }}
              className="mt-4 w-full px-6 py-3 bg-teal-600 text-black font-bold text-lg tracking-widest rounded-md border-2 border-teal-500 hover:bg-teal-500 transition-colors duration-200"
            >
              CUSTOMIZE CONTROLS
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
      {isCustomizingControls && (
        <ControlCustomizer
            initialLayout={customControls}
            defaultLayout={DEFAULT_CONTROLS_LAYOUT}
            onSave={(newLayout) => {
                setCustomControls(newLayout);
                setIsCustomizingControls(false);
            }}
            onClose={() => setIsCustomizingControls(false)}
        />
      )}
    </main>
  );
};

export default App;