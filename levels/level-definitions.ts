// Using relative coordinates (0 to 1) for map elements, so they scale with canvas size.

export interface LevelWall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelDoor {
  id: number;
  hinge: { x: number; y: number };
  length: number; // as a fraction of canvas height
  closedAngle: number;
  maxOpenAngle: number;
  swingDirection: 1 | -1;
  locked?: boolean;
}

export interface LevelEnemy {
  x: number;
  y: number;
  direction: number; // Angle in radians
  radius?: number; // Added for editor compatibility, optional in game
  type?: 'standard' | 'advanced';
  isDummy?: boolean;
}

export interface LevelDefinition {
  uuid?: string; // Unique ID for custom maps
  name: string;
  description: string;
  playerStart: { x: number; y: number };
  walls: LevelWall[];
  doors: LevelDoor[];
  enemies: LevelEnemy[];
  enemyCount?: number;
  extractionZone?: LevelWall;
}

// --- LocalStorage Utilities for Custom Maps ---

const CUSTOM_LEVELS_KEY = 'dot_agents_custom_levels';

export const getCustomLevels = (): LevelDefinition[] => {
  try {
    const levelsJson = localStorage.getItem(CUSTOM_LEVELS_KEY);
    if (levelsJson) {
      const levels = JSON.parse(levelsJson);
      // Ensure it's an array of objects
      if (Array.isArray(levels) && levels.every(l => typeof l === 'object')) {
        return levels;
      }
    }
  } catch (error) {
    console.error("Failed to load custom levels from localStorage:", error);
  }
  return [];
};

export const saveCustomLevel = (levelToSave: LevelDefinition): void => {
  if (!levelToSave.uuid) {
    console.error("Cannot save a level without a UUID.");
    return;
  }
  try {
    const levels = getCustomLevels();
    const existingIndex = levels.findIndex(l => l.uuid === levelToSave.uuid);
    if (existingIndex > -1) {
      levels[existingIndex] = levelToSave;
    } else {
      levels.push(levelToSave);
    }
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels));
  } catch (error) {
    console.error("Failed to save custom level to localStorage:", error);
  }
};

export const deleteCustomLevel = (uuid: string): void => {
  try {
    const levels = getCustomLevels();
    const filteredLevels = levels.filter(l => l.uuid !== uuid);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(filteredLevels));
  } catch (error) {
    console.error("Failed to delete custom level from localStorage:", error);
  }
};


// --- Official Missions ---

const TRAINING_GROUND: LevelDefinition = {
  name: 'TRAINING GROUND',
  description: 'Hone your skills. Practice movement, shooting, door manipulation, and throwable usage. Targets are non-hostile.',
  playerStart: { x: 0.1, y: 0.5 },
  walls: [
    // Door Practice House (Top) - Outer walls
    { x: 0.3, y: 0.1, width: 0.4, height: 0.015 }, // Top wall
    { x: 0.3, y: 0.4, width: 0.4, height: 0.015 }, // Bottom wall
    { x: 0.3, y: 0.1, width: 0.01, height: 0.3 }, // Left wall
    { x: 0.7, y: 0.1, width: 0.01, height: 0.3 }, // Right wall
    
    // -- RE-CORRECTED: Properly defined internal walls with clear doorways --
    // Vertical divider with a doorway (gap from y=0.2 to y=0.3)
    { x: 0.5, y: 0.1, width: 0.01, height: 0.1 },      // Top part
    { x: 0.5, y: 0.3, width: 0.01, height: 0.1 },      // Bottom part

    // Horizontal divider with a doorway (gap from x=0.45 to x=0.55)
    { x: 0.3, y: 0.25, width: 0.15, height: 0.015 },   // Left part
    { x: 0.55, y: 0.25, width: 0.15, height: 0.015 },  // Right part

    // Grenade Pit (Bottom)
    { x: 0.3, y: 0.7, width: 0.4, height: 0.015 }, // Top wall of pit
    { x: 0.3, y: 0.7, width: 0.01, height: 0.2 }, // Left wall of pit
    { x: 0.7, y: 0.7, width: 0.01, height: 0.2 }, // Right wall of pit
  ],
  doors: [
    // Doors for the practice house
    { id: 1, hinge: { x: 0.4, y: 0.4 }, length: 0.1, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 }, // Bottom door left room
    { id: 2, hinge: { x: 0.6, y: 0.4 }, length: 0.1, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },// Bottom door right room
    
    // -- RE-CORRECTED: Internal doors now positioned in the new gaps --
    // Door in vertical divider (gap from y=0.2 to y=0.3)
    { id: 3, hinge: { x: 0.5, y: 0.2 }, length: 0.1, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 }, // Opens to the right, into top-right room
    // Door in horizontal divider (gap from x=0.45 to x=0.55)
    { id: 4, hinge: { x: 0.45, y: 0.25 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 }, // Opens downwards, into bottom-left room
  ],
  enemies: [
    // Static targets in a "shooting range" on the far right
    { x: 0.9, y: 0.2, direction: Math.PI, isDummy: true },
    { x: 0.9, y: 0.4, direction: Math.PI, isDummy: true },
    { x: 0.9, y: 0.6, direction: Math.PI, isDummy: true },
    { x: 0.9, y: 0.8, direction: Math.PI, isDummy: true },
    // A target in one of the rooms
    { x: 0.4, y: 0.2, direction: -Math.PI/2, isDummy: true },
  ],
  enemyCount: 5,
};

const THE_FACTORY: LevelDefinition = {
  name: 'THE FACTORY',
  description: 'An abandoned industrial complex has been taken over by hostiles. Breach the facility, clear the factory floor, and neutralize all threats. Watch out for reinforced doors.',
  playerStart: { x: 0.45, y: 0.95 },
  enemyCount: 11,
  walls: [
    // Outer Shell
    { x: 0.05, y: 0.05, width: 0.9, height: 0.015 }, // Top
    { x: 0.05, y: 0.05, width: 0.01, height: 0.85 }, // Left
    { x: 0.94, y: 0.05, width: 0.01, height: 0.85 }, // Right
    // Bottom wall (with main entrance gap)
    { x: 0.05, y: 0.885, width: 0.35, height: 0.015 },
    { x: 0.5, y: 0.885, width: 0.44, height: 0.015 },

    // --- Room 1 & 2 Walls ---
    // Vertical divider between room 1 and 2 (with door gap)
    { x: 0.25, y: 0.05, width: 0.01, height: 0.15 }, 
    { x: 0.25, y: 0.30, width: 0.01, height: 0.1 }, 
    // Small horizontal walls in Room 1
    { x: 0.15, y: 0.15, width: 0.05, height: 0.02 }, // New small cover
    { x: 0.05, y: 0.25, width: 0.05, height: 0.02 },
    { x: 0.15, y: 0.25, width: 0.05, height: 0.02 },
    
    // Bottom wall of rooms 1 & 2 (with window gaps)
    { x: 0.05, y: 0.385, width: 0.05, height: 0.015 },
    { x: 0.15, y: 0.385, width: 0.05, height: 0.015 },
    { x: 0.25, y: 0.385, width: 0.05, height: 0.015 },
    { x: 0.35, y: 0.385, width: 0.05, height: 0.015 },
    
    // --- Dividing Walls between major sections (Blue walls from image) ---
    // Wall between Room 2 and 3 (with doorway)
    { x: 0.4, y: 0.05, width: 0.01, height: 0.15 },
    { x: 0.4, y: 0.3, width: 0.01, height: 0.1 },
    // Wall between Room 3 and corridor for 4/5 (with doorway)
    { x: 0.6, y: 0.05, width: 0.01, height: 0.2 },
    { x: 0.6, y: 0.35, width: 0.01, height: 0.3 }, // Corridor choke point
    { x: 0.6, y: 0.75, width: 0.01, height: 0.135 },
    { x: 0.61, y: 0.65, width: 0.05, height: 0.015 }, // Corridor choke point horizontal part
    
    // --- Wall defining top of room 5 ---
    { x: 0.6, y: 0.2, width: 0.05, height: 0.015 },

    // --- Room 5 Shelving ---
    { x: 0.65, y: 0.25, width: 0.25, height: 0.04 },
    { x: 0.75, y: 0.4, width: 0.04, height: 0.2 }, // Rotated shelf
    { x: 0.65, y: 0.55, width: 0.25, height: 0.04 },
    { x: 0.65, y: 0.7, width: 0.25, height: 0.04 },

    // --- Room 3 Cover Objects ---
    { x: 0.45, y: 0.2, width: 0.1, height: 0.1 },
    { x: 0.30, y: 0.6, width: 0.1, height: 0.02 }, // L-Shape cover horizontal
    { x: 0.30, y: 0.6, width: 0.02, height: 0.15 }, // L-Shape cover vertical
    { x: 0.5, y: 0.45, width: 0.08, height: 0.2 },
  ],
  doors: [
    // Main Double Doors (White)
    { id: 1, hinge: { x: 0.4, y: 0.8925 }, length: 0.089, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    { id: 8, hinge: { x: 0.5, y: 0.8925 }, length: 0.089, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.48, swingDirection: 1 },

    // Locked Doors (Red)
    { id: 3, hinge: { x: 0.94, y: 0.25 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.48, swingDirection: 1, locked: true },
    { id: 4, hinge: { x: 0.94, y: 0.65 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.48, swingDirection: 1, locked: true },

    // --- Internal Doors (for blue walls) ---
    { id: 5, hinge: { x: 0.41, y: 0.2 }, length: 0.1, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    { id: 6, hinge: { x: 0.61, y: 0.25 }, length: 0.1, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    // New door between room 1 and 2
    { id: 7, hinge: { x: 0.25, y: 0.2 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: 1 },
  ],
  enemies: [
    // --- Spawn Pool ---
    // Room 1 (2 AI Crossfire)
    { x: 0.13, y: 0.15, direction: 5 * Math.PI / 4, type: 'standard' },
    { x: 0.22, y: 0.35, direction: Math.PI / 4, type: 'standard' },
    // Room 2 (2 AI Crossfire)
    { x: 0.28, y: 0.15, direction: 3 * Math.PI / 2, type: 'advanced' },
    { x: 0.37, y: 0.35, direction: Math.PI, type: 'standard' },
    // Room 3 (5 AI, defensive positions)
    { x: 0.35, y: 0.7, direction: 0, type: 'advanced' }, // Behind new L-cover
    { x: 0.55, y: 0.6, direction: Math.PI, type: 'standard' },
    { x: 0.47, y: 0.3, direction: Math.PI / 2, type: 'advanced' },
    { x: 0.57, y: 0.25, direction: Math.PI, type: 'standard' },
    { x: 0.45, y: 0.8, direction: -Math.PI / 2, type: 'advanced' },
    // Room 4 (2 AI Crossfire)
    { x: 0.75, y: 0.15, direction: Math.PI, type: 'standard' },
    { x: 0.85, y: 0.3, direction: 3 * Math.PI / 2, type: 'advanced' },
    // Room 5 (3 AI, trickier)
    { x: 0.75, y: 0.45, direction: Math.PI, type: 'standard' }, // Behind rotated shelf
    { x: 0.85, y: 0.6, direction: 0, type: 'advanced' },
    { x: 0.68, y: 0.75, direction: -Math.PI / 2, type: 'standard' },
  ],
};

export const MISSIONS: LevelDefinition[] = [
  TRAINING_GROUND,
  THE_FACTORY,
];