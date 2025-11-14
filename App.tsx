
import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import LevelSelect from './components/LevelSelect';
import { LevelDefinition, MISSIONS } from './levels/level-definitions';
import MapEditor from './components/MapEditor';
import LoadoutMenu from './components/LoadoutMenu';
import WeaponModificationMenu from './components/WeaponModificationMenu';
import { AGENT_SKINS } from './data/definitions';
import { WEAPON_TYPES } from './data/weapons';
import ControlCustomizer from './components/ControlCustomizer';
import { PlayerLoadout, CustomControls } from './types';
import { OperatorClassID, OPERATORS } from './data/operators';

import { SaveSystem, GameData } from './data/services/save-system';

type GameState = 'main-menu' | 'level-select' | 'in-game' | 'map-editor' | 'loadout' | 'weapon-modification';
export type Difficulty = 'simple' | 'normal' | 'hard';

const DEFAULT_LOADOUT: PlayerLoadout = {
  primary: 'Assault Rifle',
  secondary: WEAPON_TYPES.secondary[0],
  melee: 'Combat Knife',
  special: 'Rocket Launcher',
  primaryAttachments: {
    'Trigger': '三连发扳机组' // Default with burst fire
  },
  secondaryAttachments: {},
  specialAttachments: {},
  throwables: {
    'grenade': 2,
    'flashbang': 1,
    'smoke': 2,
    'molotov': 0,
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
        special:        { x: 0.92,  y: 0.59, scale: 0.8 },
    },
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('main-menu');
  const [selectedLevel, setSelectedLevel] = useState<LevelDefinition | null>(null);
  const [levelToEdit, setLevelToEdit] = useState<LevelDefinition | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundWaves, setShowSoundWaves] = useState(true);
  const [weaponToModify, setWeaponToModify] = useState<'primary' | 'secondary' | 'special' | null>(null);
  const [isCustomizingControls, setIsCustomizingControls] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('simple');

  const runScoreRef = useRef<number>(0);
  
  // State for saved data
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [operatorClassId, setOperatorClassId] = useState<OperatorClassID>('A-Red');
  const [aimSensitivity, setAimSensitivity] = useState<number>(1.0);
  const [agentSkin, setAgentSkin] = useState<string>(AGENT_SKINS[0].name);
  const [playerLoadout, setPlayerLoadout] = useState<PlayerLoadout>(DEFAULT_LOADOUT);
  const [customControls, setCustomControls] = useState<CustomControls>(DEFAULT_CONTROLS_LAYOUT);
  const [customLevels, setCustomLevels] = useState<LevelDefinition[]>([]);
  // Scoring state
  const [totalScore, setTotalScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);


  
  // Data Loading Effect
  useEffect(() => {
    const loadData = async () => {
        let loadedData = await SaveSystem.loadGameData();

        // One-time migration from old format to the new unified save object
        if (!loadedData && localStorage.getItem('dot_agents_player_loadout')) {
            console.log("Migrating old data to new save system...");
            const oldCustomLevels = (() => {
                try {
                    const levelsJson = localStorage.getItem('dot_agents_custom_levels');
                    return levelsJson ? JSON.parse(levelsJson) : [];
                } catch { return []; }
            })();
            
            const migratedData: GameData = {
                version: 1,
                operatorClassId: (localStorage.getItem('dot_agents_operator_class_id') || 'A-Red') as OperatorClassID,
                aimSensitivity: parseFloat(localStorage.getItem('dot_agents_aim_sensitivity') || '1.0'),
                agentSkin: localStorage.getItem('dot_agents_agent_skin') || AGENT_SKINS[0].name,
                playerLoadout: {
                    ...JSON.parse(localStorage.getItem('dot_agents_player_loadout') || JSON.stringify(DEFAULT_LOADOUT)),
                    special: 'Rocket Launcher', // Add default special weapon
                    specialAttachments: {},
                },
                customControls: JSON.parse(localStorage.getItem('dot_agents_custom_controls') || JSON.stringify(DEFAULT_CONTROLS_LAYOUT)),
                customLevels: oldCustomLevels
            };
            loadedData = migratedData;
            await SaveSystem.saveGameData(migratedData);
            await SaveSystem.clearOldData();
        }

        if (loadedData) {
            // Apply loaded data to state
            setOperatorClassId(loadedData.operatorClassId || 'A-Red');
            setAimSensitivity(loadedData.aimSensitivity || 1.0);
            setAgentSkin(loadedData.agentSkin || AGENT_SKINS[0].name);
            setPlayerLoadout(loadedData.playerLoadout || DEFAULT_LOADOUT);
            setCustomControls(loadedData.customControls || DEFAULT_CONTROLS_LAYOUT);
            setCustomLevels(loadedData.customLevels || []);
            setTotalScore(loadedData.totalScore || 0);
            setHighScore(loadedData.highScore || 0);
        }
        setIsDataLoaded(true);
    };
    loadData();
  }, []);

  // Centralized Data Saving Effect
  useEffect(() => {
    if (!isDataLoaded) {
        return; // Don't save before initial data is loaded, to prevent overwriting save with defaults.
    }

    const gameData: GameData = {
        version: 1,
        operatorClassId,
        aimSensitivity,
        agentSkin,
        playerLoadout,
        customControls,
        customLevels,
        totalScore,
        highScore,
    };
    
    setSyncStatus('syncing');
    const handler = setTimeout(() => {
        SaveSystem.saveGameData(gameData).then(() => {
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 1500);
        }).catch(() => {
             setSyncStatus('error');
        });
    }, 1000); // Debounce saving by 1 second

    return () => {
        clearTimeout(handler);
    };

    }, [operatorClassId, aimSensitivity, agentSkin, playerLoadout, customControls, customLevels, totalScore, highScore, isDataLoaded]);

  
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
    setIsMultiplayer(false);
    setGameState('in-game');
  };



  const handleMissionEnd = () => {
    setSelectedLevel(null);
    const previousState = 'level-select';
    setIsMultiplayer(false);
    
    // When mission ends, accumulate run score into total and update high score
    // Skip scoring accumulation for training ground maps
    const isTrainingGround = selectedLevel?.isTrainingGround || false;
    const run = runScoreRef.current || 0;
    console.log(`[App] Mission end - isTrainingGround=${isTrainingGround}, run=${run}, selectedLevel=${selectedLevel?.name}`);
    
    if (!isTrainingGround) {
    const prevTotal = totalScore || 0;
    const prevHigh = highScore || 0;
    const nextTotal = prevTotal + run;
    const nextHigh = Math.max(prevHigh, run);
    console.log('[Score] Mission end. run=', run, 'nextTotal=', nextTotal, 'nextHigh=', nextHigh);
    setTotalScore(nextTotal);
    setHighScore(nextHigh);
    // Persist immediately so main menu shows updated values
    const gameData: GameData = {
        version: 1,
        operatorClassId,
        aimSensitivity,
        agentSkin,
        playerLoadout,
        customControls,
        customLevels,
        totalScore: nextTotal,
        highScore: nextHigh,
    };
    // Persist and then return to main menu (singleplayer) or previous state (multiplayer)
    const targetState = isMultiplayer ? previousState : 'main-menu';
    SaveSystem.saveGameData(gameData).then(() => {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 1500);
        setGameState(targetState);
    }).catch(err => {
        console.error('Failed to save score on mission end', err);
        setGameState(previousState);
    });
    } else {
        console.log('[Score] Training ground mission end. run=', run, ' (not accumulated)');
        // Just return to menu without saving scores
        const targetState = isMultiplayer ? previousState : 'main-menu';
        setGameState(targetState);
    }
    
    // Reset run score reference
    runScoreRef.current = 0;
  };
  
  const handleBackToMenu = () => {
    setGameState('main-menu');
  };
  
  const handleSaveCustomLevel = useCallback((level: LevelDefinition) => {
      setCustomLevels(prevLevels => {
          const existingIndex = prevLevels.findIndex(l => l.uuid === level.uuid);
          if (existingIndex > -1) {
              const newLevels = [...prevLevels];
              newLevels[existingIndex] = level;
              return newLevels;
          } else {
              return [...prevLevels, level];
          }
      });
      setGameState('level-select');
  }, []);

  const handleDeleteLevel = useCallback((uuid: string) => {
    if (window.confirm('Are you sure you want to delete this custom map?')) {
        setCustomLevels(prevLevels => prevLevels.filter(l => l.uuid !== uuid));
    }
  }, []);

  const handleGoToModifyWeapon = (weaponType: 'primary' | 'secondary' | 'special') => {
    setWeaponToModify(weaponType);
    setGameState('weapon-modification');
  };

  const handleBackToLoadout = useCallback(() => {
      setWeaponToModify(null);
      setGameState('loadout');
  }, []);

  const handleAttachmentsChange = (newAttachments: { [slot: string]: string }) => {
      if (!weaponToModify) return;
      
      let attachmentField: 'primaryAttachments' | 'secondaryAttachments' | 'specialAttachments' = 'primaryAttachments';
      if(weaponToModify === 'secondary') attachmentField = 'secondaryAttachments';
      if(weaponToModify === 'special') attachmentField = 'specialAttachments';

      setPlayerLoadout(prev => ({
          ...prev,
          [attachmentField]: newAttachments,
      }));
  };

  const handleGlobalBack = useCallback(() => {
    switch (gameState) {
        case 'level-select':
        case 'loadout':
        case 'multiplayer-lobby':
            setGameState('main-menu');
            break;
        case 'map-editor':
            // The global back button is not shown in the editor,
            // but if it were, this would be a "cancel without saving" action.
            setGameState('level-select');
            break;
        case 'weapon-modification':
            handleBackToLoadout();
            break;
        default:
            break;
    }
  }, [gameState, handleBackToLoadout]);


  const renderContent = () => {
    if (!isDataLoaded) {
      return <div className="text-2xl text-teal-300 animate-pulse">LOADING DATA...</div>
    }
    switch (gameState) {
      case 'in-game':
        if (selectedLevel) {
          const skinColor = AGENT_SKINS.find(s => s.name === agentSkin)?.color || '#FFFFFF';
          const operator = OPERATORS[operatorClassId];
          return (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full h-full max-h-[calc(100vh-2rem)] aspect-video bg-black border-2 border-teal-500 shadow-lg shadow-teal-500/30 rounded-md">
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

                    initialRunScore={0}
                    onScoreChange={(newRunScore: number) => {
                        console.log(`[App] onScoreChange called with: ${newRunScore}`);
                        runScoreRef.current = newRunScore;
                    }}
                    totalScore={totalScore}
                    highScore={highScore}
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
          officialLevels={MISSIONS} 
          customLevels={customLevels}
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
            <MapEditor levelToEdit={levelToEdit} onBack={handleSaveCustomLevel} />
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
          
          let attachmentField: 'primaryAttachments' | 'secondaryAttachments' | 'specialAttachments' = 'primaryAttachments';
          if(weaponToModify === 'secondary') attachmentField = 'secondaryAttachments';
          if(weaponToModify === 'special') attachmentField = 'specialAttachments';
          const currentAttachments = playerLoadout[attachmentField];

          return (
            <WeaponModificationMenu 
                weaponName={weaponName}
                currentAttachments={currentAttachments}
                onAttachmentsChange={handleAttachmentsChange}
            />
          );
      }

      case 'main-menu':
      default:
        return <MainMenu 
            onStart={handleStartMission} 
            onGoToLoadout={handleGoToLoadout} 
            onGoToEditor={() => handleGoToEditor(null)} 

            syncStatus={syncStatus}
            totalScore={totalScore}
            highScore={highScore}
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