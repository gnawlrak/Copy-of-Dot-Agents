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

const THE_OFFICE: LevelDefinition = {
  name: 'THE OFFICE',
  description: 'Infiltrate a corporate office and neutralize all hostile agents. Tight corridors and multiple rooms demand careful planning.',
  playerStart: { x: 0.5, y: 0.75 },
  walls: [
    // Outer boundary walls are implicitly handled, but we define inner walls.
    // Vertical wall with door gap
    { x: 0.25, y: 0, width: 0.015, height: 0.3 },
    { x: 0.25, y: 0.3 + 0.15, width: 0.015, height: 1 - (0.3 + 0.15) }, // door length is 0.15 * height
    // Other inner walls
    { x: 0.75, y: 0.4, width: 0.015, height: 0.6 },
    { x: 0.4, y: 0.4, width: 0.2, height: 0.02 }
  ],
  doors: [
    {
      id: 1,
      hinge: { x: 0.25 + 0.015 / 2, y: 0.3 },
      length: 0.15,
      closedAngle: Math.PI / 2,
      maxOpenAngle: Math.PI / 2 * 0.9,
      swingDirection: 1,
    }
  ],
  enemies: [
    { x: 0.15, y: 0.2, direction: 0, type: 'standard' },
    { x: 0.8, y: 0.25, direction: Math.PI, type: 'standard' },
    { x: 0.5, y: 0.5, direction: -Math.PI / 2, type: 'standard' },
    { x: 0.8, y: 0.8, direction: 3 * Math.PI / 2, type: 'standard' },
  ],
};

const THE_WAREHOUSE: LevelDefinition = {
  name: 'THE WAREHOUSE',
  description: 'A large, open warehouse with shipping containers for cover. Longer sightlines make this a different kind of challenge.',
  playerStart: { x: 0.1, y: 0.5 },
  walls: [
    // Central container block
    { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
    // A few scattered crates
    { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
    { x: 0.7, y: 0.15, width: 0.15, height: 0.1 },
    { x: 0.75, y: 0.7, width: 0.1, height: 0.2 },
    { x: 0.25, y: 0.8, width: 0.2, height: 0.08 },
  ],
  doors: [],
  enemies: [
    { x: 0.5, y: 0.2, direction: Math.PI / 2, type: 'standard' },
    { x: 0.8, y: 0.5, direction: Math.PI, type: 'standard' },
    { x: 0.5, y: 0.8, direction: -Math.PI / 2, type: 'standard' },
    { x: 0.3, y: 0.5, direction: 0, type: 'standard' },
  ],
};

const THE_COMPLEX: LevelDefinition = {
  name: 'THE COMPLEX',
  description: 'A sprawling multi-wing facility. Neutralize all targets in this high-threat environment.',
  playerStart: { x: 0.5, y: 0.95 },
  walls: [
    // --- Main Structure Walls ---
    // Left vertical wall
    { x: 0.3, y: 0.1, width: 0.015, height: 0.6 },
    { x: 0.3, y: 0.8, width: 0.015, height: 0.1 },
    // Right vertical wall
    { x: 0.7, y: 0.1, width: 0.015, height: 0.6 },
    { x: 0.7, y: 0.8, width: 0.015, height: 0.1 },
    // Top horizontal wall
    { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
    // Bottom horizontal wall
    { x: 0.3, y: 0.8, width: 0.4, height: 0.02 },

    // --- Left Wing (Offices) ---
    // Horizontal dividers
    { x: 0.1, y: 0.3, width: 0.2, height: 0.02 },
    { x: 0.1, y: 0.6, width: 0.2, height: 0.02 },
    // Vertical divider
    { x: 0.18, y: 0.3, width: 0.015, height: 0.09 },
    { x: 0.18, y: 0.41, width: 0.015, height: 0.08 },
    { x: 0.18, y: 0.51, width: 0.015, height: 0.09 },
    { x: 0.3, y: 0.1, width: 0.015, height: 0.09 },
    { x: 0.3, y: 0.21, width: 0.015, height: 0.09 },

    // --- Right Wing (Server Room) ---
    // Server racks (cover)
    { x: 0.75, y: 0.2, width: 0.02, height: 0.15 },
    { x: 0.85, y: 0.2, width: 0.02, height: 0.15 },
    { x: 0.75, y: 0.45, width: 0.02, height: 0.15 },
    { x: 0.85, y: 0.45, width: 0.02, height: 0.15 },
    { x: 0.78, y: 0.7, width: 0.1, height: 0.02 },

    // --- Central Area (Low Cover) ---
    { x: 0.45, y: 0.4, width: 0.1, height: 0.02 },
    { x: 0.45, y: 0.5, width: 0.1, height: 0.02 },
  ],
  doors: [
    // Entrance to left wing
    { id: 1, hinge: { x: 0.3, y: 0.7 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },
    // Entrance to right wing
    { id: 2, hinge: { x: 0.7, y: 0.7 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },
    // Doors for offices in left wing
    // Top-left office
    { id: 3, hinge: { x: 0.18, y: 0.4 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },
    // Bottom-left office
    { id: 4, hinge: { x: 0.18, y: 0.5 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },
    // Top-right office (of the left wing)
    { id: 5, hinge: { x: 0.3, y: 0.2 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },
  ],
  enemies: [
    // Entrance guards
    { x: 0.4, y: 0.85, direction: -Math.PI / 2, type: 'standard' },
    { x: 0.6, y: 0.85, direction: -Math.PI / 2, type: 'standard' },
    // Left wing
    { x: 0.15, y: 0.15, direction: Math.PI / 4, type: 'standard' }, // Top-left office
    { x: 0.25, y: 0.45, direction: Math.PI, type: 'standard' },     // Hallway
    { x: 0.15, y: 0.7, direction: 0, type: 'standard' },         // Bottom-left office
    // Right wing
    { x: 0.8, y: 0.3, direction: Math.PI, type: 'standard' },
    { x: 0.8, y: 0.6, direction: Math.PI, type: 'standard' },
    { x: 0.9, y: 0.5, direction: 3 * Math.PI / 2, type: 'standard' },
    // Top area patrol
    { x: 0.5, y: 0.15, direction: 0, type: 'standard' },
  ],
};

const THE_FACTORY: LevelDefinition = {
  name: 'THE FACTORY',
  description: 'An abandoned industrial complex has been taken over by hostiles. Breach the facility, clear the factory floor, and neutralize all threats. Watch out for reinforced doors.',
  playerStart: { x: 0.5, y: 0.95 },
  enemyCount: 12,
  walls: [
    // --- Exterior Fence ---
    { x: 0.05, y: 0.9, width: 0.9, height: 0.01 },
    // --- Main Building Shell ---
    { x: 0.1, y: 0.1, width: 0.8, height: 0.015 }, // Top
    { x: 0.1, y: 0.1, width: 0.01, height: 0.75 }, // Left
    { x: 0.89, y: 0.1, width: 0.01, height: 0.75 }, // Right
    // Bottom wall with door gaps
    { x: 0.1, y: 0.835, width: 0.2, height: 0.015 },
    { x: 0.38, y: 0.835, width: 0.24, height: 0.015 },
    { x: 0.7, y: 0.835, width: 0.19, height: 0.015 },

    // --- Interior Walls ---
    // Office block (top left)
    { x: 0.11, y: 0.35, width: 0.25, height: 0.015 }, // Office bottom wall
    { x: 0.23, y: 0.1, width: 0.01, height: 0.25 },  // Office vertical divider
    // Warehouse area (right side)
    { x: 0.65, y: 0.1, width: 0.01, height: 0.5 }, // Warehouse dividing wall
    // Warehouse shelving
    { x: 0.7, y: 0.15, width: 0.15, height: 0.04 },
    { x: 0.7, y: 0.25, width: 0.15, height: 0.04 },
    { x: 0.7, y: 0.35, width: 0.15, height: 0.04 },
    { x: 0.7, y: 0.45, width: 0.15, height: 0.04 },

    // --- Main Factory Floor Cover (Machinery) ---
    { x: 0.2, y: 0.5, width: 0.1, height: 0.2 },
    { x: 0.35, y: 0.6, width: 0.2, height: 0.1 },
    { x: 0.45, y: 0.25, width: 0.15, height: 0.15 },
    { x: 0.58, y: 0.45, width: 0.05, height: 0.25 },
  ],
  doors: [
    // --- Main Entrances ---
    { id: 1, hinge: { x: 0.31, y: 0.835 }, length: 0.07, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.48, swingDirection: 1 },
    { id: 2, hinge: { x: 0.38, y: 0.835 }, length: 0.07, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    { id: 3, hinge: { x: 0.62, y: 0.835 }, length: 0.08, closedAngle: -Math.PI / 2, maxOpenAngle: Math.PI * 0.48, swingDirection: 1 },
    
    // --- Office Doors ---
    { id: 4, hinge: { x: 0.2, y: 0.35 }, length: 0.08, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    { id: 5, hinge: { x: 0.3, y: 0.35 }, length: 0.08, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },

    // --- Warehouse Destructible Door ---
    { id: 6, hinge: { x: 0.65, y: 0.5 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: 1, locked: true },
  ],
  enemies: [
    // This is now a pool of potential spawn points.
    // Office spawns
    { x: 0.16, y: 0.2, direction: 0, type: 'standard' },
    { x: 0.3, y: 0.2, direction: Math.PI, type: 'advanced' },
    { x: 0.18, y: 0.3, direction: -Math.PI/2, type: 'standard' },
    // Warehouse spawns
    { x: 0.75, y: 0.2, direction: Math.PI, type: 'advanced' },
    { x: 0.82, y: 0.3, direction: Math.PI, type: 'standard' },
    { x: 0.75, y: 0.4, direction: Math.PI/2, type: 'advanced' },
    { x: 0.78, y: 0.55, direction: 0, type: 'standard' },
    // Main floor spawns
    { x: 0.25, y: 0.45, direction: Math.PI / 4, type: 'standard' },
    { x: 0.22, y: 0.75, direction: -Math.PI / 2, type: 'advanced' },
    { x: 0.4, y: 0.5, direction: 0, type: 'standard' },
    { x: 0.5, y: 0.7, direction: Math.PI, type: 'advanced' },
    { x: 0.55, y: 0.4, direction: -Math.PI, type: 'standard' },
    { x: 0.6, y: 0.2, direction: Math.PI, type: 'standard' },
    { x: 0.4, y: 0.2, direction: 3 * Math.PI / 2, type: 'advanced' },
    { x: 0.58, y: 0.78, direction: Math.PI, type: 'standard' },
    { x: 0.15, y: 0.6, direction: 0, type: 'advanced' },
  ],
};

export const MISSIONS: LevelDefinition[] = [
  THE_OFFICE,
  THE_WAREHOUSE,
  THE_COMPLEX,
  THE_FACTORY,
];
