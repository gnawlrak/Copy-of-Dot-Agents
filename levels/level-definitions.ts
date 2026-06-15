
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
  hasScored?: boolean; // Added for scoring tracking
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
  cameraScale?: number;
  isTrainingGround?: boolean; // If true, this map doesn't count towards scoring
}

// --- Official Missions ---

const TRAINING_GROUND: LevelDefinition = {
  name: 'TRAINING GROUND',
  description: 'Hone your skills. Practice movement, shooting, door manipulation, and throwable usage. Targets are non-hostile.',
  playerStart: { x: 0.1, y: 0.5 },
  isTrainingGround: true,
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
    { x: 0.9, y: 0.2, direction: Math.PI, isDummy: true, hasScored: false },
    { x: 0.9, y: 0.4, direction: Math.PI, isDummy: true, hasScored: false },
    { x: 0.9, y: 0.6, direction: Math.PI, isDummy: true, hasScored: false },
    { x: 0.9, y: 0.8, direction: Math.PI, isDummy: true, hasScored: false },
    // A target in one of the rooms
    { x: 0.4, y: 0.2, direction: -Math.PI/2, isDummy: true, hasScored: false },
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
    { id: 1, hinge: { x: 0.4, y: 0.8925 }, length: 0.051, closedAngle: 0, maxOpenAngle: Math.PI * 0.48, swingDirection: -1 },
    { id: 8, hinge: { x: 0.5, y: 0.8925 }, length: 0.051, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.48, swingDirection: 1 },

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
    { x: 0.13, y: 0.15, direction: 5 * Math.PI / 4, type: 'standard', hasScored: false },
    { x: 0.22, y: 0.35, direction: Math.PI / 4, type: 'standard', hasScored: false },
    // Room 2 (2 AI Crossfire)
    { x: 0.28, y: 0.15, direction: 3 * Math.PI / 2, type: 'advanced', hasScored: false },
    { x: 0.37, y: 0.35, direction: Math.PI, type: 'standard', hasScored: false },
    // Room 3 (5 AI, defensive positions)
    { x: 0.35, y: 0.7, direction: 0, type: 'advanced', hasScored: false }, // Behind new L-cover
    { x: 0.55, y: 0.6, direction: Math.PI, type: 'standard', hasScored: false },
    { x: 0.47, y: 0.3, direction: Math.PI / 2, type: 'advanced', hasScored: false },
    { x: 0.57, y: 0.25, direction: Math.PI, type: 'standard', hasScored: false },
    { x: 0.45, y: 0.8, direction: -Math.PI / 2, type: 'advanced', hasScored: false },
    // Room 4 (2 AI Crossfire)
    { x: 0.75, y: 0.15, direction: Math.PI, type: 'standard', hasScored: false },
    { x: 0.85, y: 0.3, direction: 3 * Math.PI / 2, type: 'advanced', hasScored: false },
    // Room 5 (3 AI, trickier)
    { x: 0.75, y: 0.45, direction: Math.PI, type: 'standard', hasScored: false }, // Behind rotated shelf
    { x: 0.85, y: 0.6, direction: 0, type: 'advanced', hasScored: false },
    { x: 0.68, y: 0.75, direction: -Math.PI / 2, type: 'standard', hasScored: false },
  ],
};


// --- Handcrafted Expanded Factory Level ---
const THE_FACTORY_EXPANSION: LevelDefinition = {
  name: "THE FACTORY (EXPANSION)",
  description: "A massive industrial zone featuring four handcrafted tactical sectors. Includes a secure central server vault, loading bays, distinct rooms, and high threat density.",
  playerStart: { x: 0.5, y: 0.965 },
  enemyCount: 20,
  cameraScale: 1.0,
  extractionZone: { x: 0.44, y: 0.12, width: 0.12, height: 0.10 },
  walls: [
    // Outer Border Shell
    { x: 0.05, y: 0.05, width: 0.9, height: 0.015 }, // Top Wall
    { x: 0.05, y: 0.05, width: 0.015, height: 0.86 }, // Left Wall (ends at y:0.91)
    { x: 0.935, y: 0.05, width: 0.015, height: 0.86 }, // Right Wall (ends at y:0.91)
    { x: 0.05, y: 0.91, width: 0.4, height: 0.015 }, // Bottom Left Wall
    { x: 0.55, y: 0.91, width: 0.4, height: 0.015 }, // Bottom Right Wall (aligned to right wall)

    // Central Corridor / Main Hallway vertical dividers with Door gaps
    { x: 0.43, y: 0.45, width: 0.015, height: 0.25 }, // Left hallway wall top-half
    { x: 0.43, y: 0.78, width: 0.015, height: 0.13 }, // Left hallway wall bottom-half (ends at y:0.91)
    { x: 0.555, y: 0.45, width: 0.015, height: 0.25 }, // Right hallway wall top-half
    { x: 0.555, y: 0.78, width: 0.015, height: 0.13 }, // Right hallway wall bottom-half (ends at y:0.91)

    // Lobby Entry Horizontal Partition Walls
    { x: 0.35, y: 0.45, width: 0.08, height: 0.015 },  // Left partition before double door
    { x: 0.57, y: 0.45, width: 0.08, height: 0.015 },  // Right partition after double door

    // Sector 1 (Cooling Lab / Storage - Top Left)
    // Horizontal divider wall between Sector 1 and Sector 2
    { x: 0.05, y: 0.45, width: 0.15, height: 0.015 },
    { x: 0.28, y: 0.45, width: 0.15, height: 0.015 },
    // Internal partition walls (Laboratory & server rooms)
    { x: 0.18, y: 0.15, width: 0.025, height: 0.12 }, // Server Rack cover
    { x: 0.28, y: 0.22, width: 0.025, height: 0.12 }, // Server Rack cover 2
    { x: 0.05, y: 0.3, width: 0.08, height: 0.02 }, // Table cover
    { x: 0.27, y: 0.12, width: 0.06, height: 0.02 }, // Lab table (optimized to stay left of x:0.35)

    // Sector 2 (Loading Bay / Assembly Line - Bottom Left)
    // Crates and containers
    { x: 0.12, y: 0.58, width: 0.12, height: 0.03 }, // Cargo Box A
    { x: 0.28, y: 0.65, width: 0.03, height: 0.12 }, // Cargo Box B
    { x: 0.15, y: 0.78, width: 0.15, height: 0.04 }, // Assembler station

    // Sector 3 (Heavy Machining / Power Plant - Bottom Right)
    // Horizontal divider wall between Sector 3 and Sector 4
    { x: 0.57, y: 0.45, width: 0.18, height: 0.015 },
    { x: 0.83, y: 0.45, width: 0.12, height: 0.015 },
    // Heavy machinery obstacles
    { x: 0.65, y: 0.55, width: 0.08, height: 0.08 }, // Generator Block A
    { x: 0.78, y: 0.65, width: 0.08, height: 0.08 }, // Generator Block B
    { x: 0.68, y: 0.8, width: 0.15, height: 0.04 }, // Assembly Deck

    // Sector 4 (Control Center & Server Room - Top Right)
    // Internal partitions
    { x: 0.65, y: 0.2, width: 0.12, height: 0.02 }, // Administration Desk
    { x: 0.82, y: 0.22, width: 0.02, height: 0.15 }, // Computer Console Group
    { x: 0.7, y: 0.35, width: 0.12, height: 0.03 }, // System Mainframe

    // Top Lobby / Command Sector (Top Center)
    // Vertical lobby walls Left and Right
    { x: 0.35, y: 0.05, width: 0.015, height: 0.15 }, // Left top wall
    { x: 0.35, y: 0.28, width: 0.015, height: 0.17 }, // Left bottom wall
    { x: 0.635, y: 0.05, width: 0.015, height: 0.15 }, // Right top wall
    { x: 0.635, y: 0.28, width: 0.015, height: 0.17 }, // Right bottom wall
    // Center server panel split
    { x: 0.365, y: 0.22, width: 0.095, height: 0.015 }, // Secure partition left
    { x: 0.54, y: 0.22, width: 0.095, height: 0.015 }, // Secure partition right
  ],
  doors: [
    // Bottom main double entrance doors
    { id: 101, hinge: { x: 0.45, y: 0.91 }, length: 0.051, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },
    { id: 102, hinge: { x: 0.55, y: 0.91 }, length: 0.051, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },

    // Left Hallway Side Entry
    { id: 103, hinge: { x: 0.43, y: 0.7 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },
    // Right Hallway Side Entry
    { id: 104, hinge: { x: 0.555, y: 0.7 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },

    // Lobby Entry Double Doors (top of central hall)
    { id: 105, hinge: { x: 0.43, y: 0.45 }, length: 0.07, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },
    { id: 106, hinge: { x: 0.57, y: 0.45 }, length: 0.07, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },

    // Sector 1-2 Horizontal Divider Door
    { id: 107, hinge: { x: 0.2, y: 0.45 }, length: 0.08, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },

    // Sector 3-4 Horizontal Divider Door
    { id: 108, hinge: { x: 0.75, y: 0.45 }, length: 0.08, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },

    // Left Lobby Entry (Lab <-> Lobby)
    { id: 109, hinge: { x: 0.35, y: 0.2 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },

    // Right Lobby Entry (Control <-> Lobby)
    { id: 110, hinge: { x: 0.635, y: 0.2 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 },

    // Central Locked Secure Command Room door
    { id: 111, hinge: { x: 0.46, y: 0.22 }, length: 0.08, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1, locked: true },
  ],
  enemies: [
    // Bottom entry guards
    { x: 0.42, y: 0.88, direction: Math.PI / 2, type: 'standard', hasScored: false },
    { x: 0.58, y: 0.88, direction: Math.PI / 2, type: 'standard', hasScored: false },

    // Central Hallway
    { x: 0.5, y: 0.6, direction: Math.PI / 2, type: 'advanced', hasScored: false },

    // Loading Bay (Bottom Left)
    { x: 0.08, y: 0.58, direction: 0, type: 'standard', hasScored: false },
    { x: 0.28, y: 0.52, direction: Math.PI, type: 'advanced', hasScored: false },
    { x: 0.15, y: 0.72, direction: -Math.PI / 4, type: 'standard', hasScored: false },
    { x: 0.32, y: 0.85, direction: Math.PI * 0.75, type: 'advanced', hasScored: false },

    // Cooling Lab (Top Left)
    { x: 0.1, y: 0.15, direction: Math.PI / 4, type: 'standard', hasScored: false },
    { x: 0.22, y: 0.3, direction: -Math.PI / 2, type: 'advanced', hasScored: false },
    { x: 0.32, y: 0.12, direction: Math.PI, type: 'standard', hasScored: false },

    // Heavy Machining (Bottom Right)
    { x: 0.62, y: 0.6, direction: Math.PI, type: 'advanced', hasScored: false },
    { x: 0.88, y: 0.55, direction: -Math.PI * 0.75, type: 'standard', hasScored: false },
    { x: 0.72, y: 0.75, direction: Math.PI / 2, type: 'standard', hasScored: false },
    { x: 0.85, y: 0.88, direction: Math.PI * 1.2, type: 'advanced', hasScored: false },

    // Control Center (Top Right)
    { x: 0.68, y: 0.25, direction: 0, type: 'standard', hasScored: false },
    { x: 0.88, y: 0.15, direction: Math.PI, type: 'advanced', hasScored: false },
    { x: 0.78, y: 0.38, direction: -Math.PI / 2, type: 'advanced', hasScored: false },

    // Central Lobby & Secure room (Top Center)
    { x: 0.5, y: 0.28, direction: Math.PI / 2, type: 'advanced', hasScored: false },
    { x: 0.42, y: 0.12, direction: Math.PI / 6, type: 'standard', hasScored: false },
    { x: 0.58, y: 0.12, direction: -Math.PI / 6, type: 'standard', hasScored: false },
  ],
};


export const MISSIONS: LevelDefinition[] = [
  TRAINING_GROUND,
  THE_FACTORY,
  THE_FACTORY_EXPANSION,
];
