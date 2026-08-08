
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
  isBlownOpen?: boolean;
  isBreachable?: boolean;
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
    { x: 0.3, y: 0.4, width: 0.1, height: 0.015 },  // Bottom wall - Left part
    { x: 0.5, y: 0.4, width: 0.1, height: 0.015 },  // Bottom wall - Middle part
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
    { id: 1, hinge: { x: 0.4, y: 0.4 }, length: 0.1, closedAngle: 0, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: 1 }, // Bottom door left room (bridges x=0.4 to 0.5)
    { id: 2, hinge: { x: 0.7, y: 0.4 }, length: 0.1, closedAngle: Math.PI, maxOpenAngle: Math.PI / 2 * 0.9, swingDirection: -1 },// Bottom door right room (bridges x=0.6 to 0.7)
    
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

const BASTION_7: LevelDefinition = {
  name: 'BASTION-7',
  description: 'A classified military stronghold and tactical compound. Breach the outer barriers, infiltrate the secure server vaults and weapon armories, and secure the helipad for extraction. Highly hostile environment.',
  playerStart: { x: 0.5, y: 0.95 },
  enemyCount: 22,
  cameraScale: 1.0,
  extractionZone: { x: 0.44, y: 0.06, width: 0.12, height: 0.08 },
  walls: [
    // Outer Shell
    { x: 0.05, y: 0.05, width: 0.9, height: 0.015 }, // Top Wall
    { x: 0.05, y: 0.05, width: 0.015, height: 0.86 }, // Left Wall
    { x: 0.935, y: 0.05, width: 0.015, height: 0.86 }, // Right Wall
    { x: 0.05, y: 0.91, width: 0.4, height: 0.015 }, // Bottom Left Wall
    { x: 0.55, y: 0.91, width: 0.4, height: 0.015 }, // Bottom Right Wall

    // --- Sector A: South Infiltration Zone ---
    { x: 0.35, y: 0.75, width: 0.015, height: 0.16 }, // Left barrier wall
    { x: 0.635, y: 0.75, width: 0.015, height: 0.16 }, // Right barrier wall
    { x: 0.20, y: 0.80, width: 0.15, height: 0.02 }, // Left sandbags barrier
    { x: 0.65, y: 0.80, width: 0.15, height: 0.02 }, // Right sandbags barrier

    // --- Sector B: Central Command Hub ---
    { x: 0.38, y: 0.45, width: 0.015, height: 0.10 }, // Left Hub Wall Upper
    { x: 0.38, y: 0.62, width: 0.015, height: 0.05 }, // Left Hub Wall Lower
    { x: 0.605, y: 0.45, width: 0.015, height: 0.10 }, // Right Hub Wall Upper
    { x: 0.605, y: 0.62, width: 0.015, height: 0.05 }, // Right Hub Wall Lower
    { x: 0.38, y: 0.45, width: 0.08, height: 0.015 }, // Top Left Hub Wall
    { x: 0.54, y: 0.45, width: 0.08, height: 0.015 }, // Top Right Hub Wall
    { x: 0.38, y: 0.67, width: 0.09, height: 0.015 }, // Bottom Hub Wall Left
    { x: 0.53, y: 0.67, width: 0.09, height: 0.015 }, // Bottom Hub Wall Right

    // --- Sector C: Western Vault & Server Room ---
    { x: 0.05, y: 0.45, width: 0.25, height: 0.015 }, // Main horizontal separator
    { x: 0.20, y: 0.05, width: 0.015, height: 0.32 }, // Server room partition vertical 
    { x: 0.05, y: 0.22, width: 0.05, height: 0.015 }, // Server room container A - left part (split for door)
    { x: 0.15, y: 0.22, width: 0.05, height: 0.015 }, // Server room container A - right part (split for door)
    { x: 0.10, y: 0.33, width: 0.10, height: 0.02 }, // Server room rack B

    // --- Sector D: Eastern Armory & Storage ---
    { x: 0.70, y: 0.45, width: 0.25, height: 0.015 }, // Main horizontal separator right
    { x: 0.78, y: 0.45, width: 0.015, height: 0.28 }, // Armory wall vertical
    { x: 0.78, y: 0.84, width: 0.015, height: 0.07 },
    { x: 0.62, y: 0.60, width: 0.16, height: 0.02 }, // Armory internal partitions
    { x: 0.84, y: 0.68, width: 0.10, height: 0.02 }, // Heavy weapon crate block

    // --- Sector E: Northern VIP Helipad & Extraction ---
    { x: 0.38, y: 0.05, width: 0.015, height: 0.20 }, // Left Helipad Wall
    { x: 0.605, y: 0.05, width: 0.015, height: 0.20 }, // Right Helipad Wall
    { x: 0.38, y: 0.25, width: 0.08, height: 0.015 }, // Helipad bottom left partition
    { x: 0.54, y: 0.25, width: 0.08, height: 0.015 }, // Helipad bottom right partition
    // Helipad markings
    { x: 0.46, y: 0.14, width: 0.08, height: 0.01 }, // Landing zone mark H horizontal
    { x: 0.46, y: 0.09, width: 0.01, height: 0.10 }, // Landing zone mark H left vertical
    { x: 0.53, y: 0.09, width: 0.01, height: 0.10 }, // Landing zone mark H right vertical
  ],
  doors: [
    // Bottom Entrance Double Doors
    { id: 201, hinge: { x: 0.45, y: 0.91 }, length: 0.051, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },
    { id: 202, hinge: { x: 0.55, y: 0.91 }, length: 0.051, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },

    // Entry from Sector A to Central Hub Command Area
    { id: 203, hinge: { x: 0.47, y: 0.67 }, length: 0.06, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },

    // Sector C Doors
    { id: 204, hinge: { x: 0.30, y: 0.45 }, length: 0.08, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 }, // Entrance to database corridor
    { id: 205, hinge: { x: 0.20, y: 0.37 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: -1, locked: true }, // LOCKED vault door

    // Sector D Doors
    { id: 206, hinge: { x: 0.70, y: 0.45 }, length: 0.08, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 }, // Entrance to Armory bay (opening direction reversed)
    { id: 207, hinge: { x: 0.7875, y: 0.735 }, length: 0.105, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: -1, isBreachable: true }, // Back door of armory (Can be breached!)

    // Sector E Security Air-lock Double Doors
    { id: 208, hinge: { x: 0.46, y: 0.25 }, length: 0.045, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    { id: 209, hinge: { x: 0.54, y: 0.25 }, length: 0.045, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },
    
    // Side Access Security Doors
    { id: 210, hinge: { x: 0.3875, y: 0.55 }, length: 0.07, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 }, 
    { id: 211, hinge: { x: 0.6125, y: 0.55 }, length: 0.07, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 }, 

    // New door in wall 19 (Server room container A)
    { id: 212, hinge: { x: 0.10, y: 0.22 }, length: 0.05, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 }, // Door in split server room container wall
  ],
  enemies: [
    // Southern Checkpoint Patrols
    { x: 0.38, y: 0.85, direction: Math.PI, type: 'standard', hasScored: false },
    { x: 0.62, y: 0.85, direction: 0, type: 'standard', hasScored: false },
    { x: 0.5, y: 0.80, direction: -Math.PI / 2, type: 'advanced', hasScored: false }, 

    // Central Command Hub Guard Team 
    { x: 0.45, y: 0.55, direction: -Math.PI / 4, type: 'advanced', hasScored: false },
    { x: 0.55, y: 0.55, direction: -3 * Math.PI / 4, type: 'advanced', hasScored: false },
    { x: 0.5, y: 0.48, direction: Math.PI / 2, type: 'standard', hasScored: false },

    // Sector C 
    { x: 0.12, y: 0.12, direction: Math.PI / 6, type: 'standard', hasScored: false }, 
    { x: 0.26, y: 0.25, direction: Math.PI, type: 'advanced', hasScored: false }, 
    { x: 0.08, y: 0.38, direction: -Math.PI / 2, type: 'standard', hasScored: false }, 
    { x: 0.15, y: 0.40, direction: 0, type: 'advanced', hasScored: false },

    // Sector D
    { x: 0.85, y: 0.52, direction: Math.PI, type: 'standard', hasScored: false },
    { x: 0.72, y: 0.70, direction: Math.PI / 4, type: 'advanced', hasScored: false },
    { x: 0.90, y: 0.85, direction: -Math.PI / 2, type: 'standard', hasScored: false },
    { x: 0.84, y: 0.80, direction: Math.PI, type: 'advanced', hasScored: false },

    // Perimeter Side Passages
    { x: 0.30, y: 0.60, direction: -Math.PI / 2, type: 'standard', hasScored: false }, 
    { x: 0.70, y: 0.55, direction: -Math.PI / 2, type: 'standard', hasScored: false }, 

    // Sector E 
    { x: 0.42, y: 0.20, direction: Math.PI / 4, type: 'advanced', hasScored: false },
    { x: 0.58, y: 0.20, direction: 3 * Math.PI / 4, type: 'advanced', hasScored: false },
    { x: 0.5, y: 0.10, direction: -Math.PI / 2, type: 'advanced', hasScored: false }, 
    { x: 0.35, y: 0.15, direction: 0, type: 'standard', hasScored: false },
    { x: 0.65, y: 0.15, direction: Math.PI, type: 'standard', hasScored: false },
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
    { x: 0.43, y: 0.78, width: 0.015, height: 0.13 }, // Left hallway wall bottom-half
    { x: 0.555, y: 0.45, width: 0.015, height: 0.25 }, // Right hallway wall top-half
    { x: 0.555, y: 0.78, width: 0.015, height: 0.13 }, // Right hallway wall bottom-half

    // Sector 1 (Cooling Lab / Storage - Top Left)
    // Horizontal divider wall between Sector 1 and Sector 2 (y: 0.45)
    { x: 0.05, y: 0.45, width: 0.15, height: 0.015 }, // Outer segment
    { x: 0.28, y: 0.45, width: 0.15, height: 0.015 }, // Inner segment (meets hallway at 0.43)
    
    // Sector 3 (Heavy Machining / Power Plant - Bottom Right)
    // Horizontal divider wall between Sector 3 and Sector 4 (y: 0.45)
    { x: 0.57, y: 0.45, width: 0.18, height: 0.015 }, // Inner segment (starts after hallway 0.555)
    { x: 0.83, y: 0.45, width: 0.105, height: 0.015 }, // Outer segment (ends at right wall 0.935)
    // Internal partition walls (Laboratory & server rooms)
    { x: 0.18, y: 0.08, width: 0.025, height: 0.12 }, // Server Rack cover (moved toward top wall to clear D112)
    { x: 0.28, y: 0.22, width: 0.025, height: 0.12 }, // Server Rack cover 2
    { x: 0.05, y: 0.3, width: 0.08, height: 0.02 }, // Table cover
    { x: 0.27, y: 0.12, width: 0.06, height: 0.02 }, // Lab table (optimized to stay left of x:0.35)

    // Sector 2 (Loading Bay / Assembly Line - Bottom Left)
    // Crates and containers
    { x: 0.12, y: 0.58, width: 0.12, height: 0.03 }, // Cargo Box A
    { x: 0.28, y: 0.65, width: 0.03, height: 0.12 }, // Cargo Box B
    { x: 0.15, y: 0.78, width: 0.15, height: 0.04 }, // Assembler station

    // Sector 3 (Heavy Machining / Power Plant - Bottom Right)
    // Heavy machinery obstacles
    { x: 0.65, y: 0.55, width: 0.08, height: 0.08 }, // Generator Block A
    { x: 0.78, y: 0.65, width: 0.08, height: 0.08 }, // Generator Block B
    { x: 0.68, y: 0.8, width: 0.15, height: 0.04 }, // Assembly Deck

    // Sector 4 (Control Center & Server Room - Top Right)
    // Horizontal partitions and furniture obstacles
    { x: 0.05, y: 0.2, width: 0.1, height: 0.015 }, // Lab Ceiling part A
    { x: 0.25, y: 0.2, width: 0.1, height: 0.015 }, // Lab Ceiling part B
    { x: 0.65, y: 0.2, width: 0.1, height: 0.02 },  // Admin Ceiling part A
    { x: 0.82, y: 0.2, width: 0.13, height: 0.02 },  // Admin Ceiling part B (extended to far edge of console wall)
    { x: 0.82, y: 0.22, width: 0.02, height: 0.15 }, // Computer Console Group
    { x: 0.7, y: 0.35, width: 0.12, height: 0.03 }, // System Mainframe

    // Top Lobby / Command Sector (Top Center)
    // Vertical lobby walls Left and Right
    { x: 0.35, y: 0.05, width: 0.015, height: 0.17 }, // Left top wall
    { x: 0.35, y: 0.28, width: 0.015, height: 0.17 }, // Left bottom wall
    { x: 0.65, y: 0.05, width: 0.015, height: 0.17 }, // Right top wall (Aligned to 0.65)
    { x: 0.65, y: 0.28, width: 0.015, height: 0.17 }, // Right bottom wall (Aligned to 0.65)
    // Center server panel split
    { x: 0.365, y: 0.22, width: 0.092, height: 0.015 }, // Secure partition left (closes more gap)
    { x: 0.543, y: 0.22, width: 0.107, height: 0.015 }, // Secure partition right (closes more gap)
  ],
  doors: [
    // Bottom main double entrance doors
    { id: 101, hinge: { x: 0.45, y: 0.91 }, length: 0.051, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },
    { id: 102, hinge: { x: 0.55, y: 0.91 }, length: 0.051, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },

    // Left Hallway Side Entry
    { id: 103, hinge: { x: 0.43, y: 0.7 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    // Right Hallway Side Entry
    { id: 104, hinge: { x: 0.555, y: 0.7 }, length: 0.08, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },

    // Lobby Entry Double Doors (top of central hall)
    { id: 105, hinge: { x: 0.43, y: 0.45 }, length: 0.062, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    { id: 106, hinge: { x: 0.555, y: 0.45 }, length: 0.062, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },

    // Sector 1-2 Horizontal Divider Door (double)
    { id: 107, hinge: { x: 0.2, y: 0.45 }, length: 0.04, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    { id: 207, hinge: { x: 0.28, y: 0.45 }, length: 0.04, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },

    // Sector 3-4 Horizontal Divider Door (double)
    { id: 108, hinge: { x: 0.75, y: 0.45 }, length: 0.04, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    { id: 208, hinge: { x: 0.83, y: 0.45 }, length: 0.04, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },

    // Left Lobby Entry (Lab <-> Lobby)
    { id: 109, hinge: { x: 0.35, y: 0.22 }, length: 0.06, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },

    // Right Lobby Entry (Control <-> Lobby) - opens left into lobby to avoid hinge wall
    { id: 110, hinge: { x: 0.65, y: 0.22 }, length: 0.045, closedAngle: Math.PI / 2, maxOpenAngle: Math.PI * 0.65, swingDirection: 1 },

    // Central Locked Secure Command Room door
    { id: 111, hinge: { x: 0.457, y: 0.22 }, length: 0.086, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1, locked: true },

    // New doors in ceiling walls (double)
    { id: 112, hinge: { x: 0.15, y: 0.2 }, length: 0.05, closedAngle: 0, maxOpenAngle: Math.PI * 0.95, swingDirection: 1 },
    { id: 212, hinge: { x: 0.25, y: 0.2 }, length: 0.05, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.95, swingDirection: -1 },
    { id: 113, hinge: { x: 0.75, y: 0.2 }, length: 0.035, closedAngle: 0, maxOpenAngle: Math.PI * 0.9, swingDirection: -1 },
    { id: 213, hinge: { x: 0.82, y: 0.2 }, length: 0.035, closedAngle: Math.PI, maxOpenAngle: Math.PI * 0.9, swingDirection: 1 },
  ],
  enemies: [
    // Bottom entry guards
    { x: 0.40, y: 0.88, direction: Math.PI / 2, type: 'standard', hasScored: false },
    { x: 0.60, y: 0.88, direction: Math.PI / 2, type: 'standard', hasScored: false },

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
    { x: 0.325, y: 0.17, direction: Math.PI, type: 'standard', hasScored: false },

    // Heavy Machining (Bottom Right)
    { x: 0.62, y: 0.6, direction: Math.PI, type: 'advanced', hasScored: false },
    { x: 0.88, y: 0.55, direction: -Math.PI * 0.75, type: 'standard', hasScored: false },
    { x: 0.72, y: 0.75, direction: Math.PI / 2, type: 'standard', hasScored: false },
    { x: 0.85, y: 0.88, direction: Math.PI * 1.2, type: 'advanced', hasScored: false },

    // Control Center (Top Right)
    { x: 0.68, y: 0.25, direction: 0, type: 'standard', hasScored: false },
    { x: 0.88, y: 0.15, direction: Math.PI, type: 'advanced', hasScored: false },
    { x: 0.78, y: 0.42, direction: -Math.PI / 2, type: 'advanced', hasScored: false },

    // Central Lobby & Secure room (Top Center)
    { x: 0.5, y: 0.28, direction: Math.PI / 2, type: 'advanced', hasScored: false },
    { x: 0.42, y: 0.12, direction: Math.PI / 6, type: 'standard', hasScored: false },
    { x: 0.58, y: 0.12, direction: -Math.PI / 6, type: 'standard', hasScored: false },
  ],
};


export const MISSIONS: LevelDefinition[] = [
  TRAINING_GROUND,
  BASTION_7,
  THE_FACTORY_EXPANSION,
];
