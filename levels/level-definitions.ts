
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


// Helper function to generate the expanded map (won't be exported)
const generateExpandedFactory = (): LevelDefinition => {
  const original = THE_FACTORY;
  const newLevel: LevelDefinition = {
    name: "THE FACTORY (EXPANSION)",
    description: "A massive industrial zone with four interconnected sectors. High threat density. Ideal for multi-squad operations.",
    playerStart: { x: 0.5, y: 0.98 },
    walls: [],
    doors: [],
    enemies: [],
    enemyCount: 32, // Increased enemy count
    extractionZone: { x: 0.45, y: 0.45, width: 0.1, height: 0.1 },
    cameraScale: 2,
  };

  let doorIdCounter = 1;

  const quadrants: ('TL' | 'TR' | 'BL' | 'BR')[] = ['TL', 'TR', 'BL', 'BR'];

  // Define the original outer shell for precise removal logic
  const outerShellWalls = new Set([
    JSON.stringify({ x: 0.05, y: 0.05, width: 0.9, height: 0.015 }), // Top
    JSON.stringify({ x: 0.05, y: 0.05, width: 0.01, height: 0.85 }), // Left
    JSON.stringify({ x: 0.94, y: 0.05, width: 0.01, height: 0.85 }), // Right
    JSON.stringify({ x: 0.05, y: 0.885, width: 0.35, height: 0.015 }), // Bottom Left part
    JSON.stringify({ x: 0.5, y: 0.885, width: 0.44, height: 0.015 }), // Bottom Right part
  ]);

  for (const quadrant of quadrants) {
    const transformWall = (wall: LevelWall): LevelWall => {
      const { x, y, width: w, height: h } = wall;
      switch (quadrant) {
        case 'TL': return { x: x / 2, y: y / 2, width: w / 2, height: h / 2 };
        case 'TR': return { x: 0.5 + (1 - x - w) / 2, y: y / 2, width: w / 2, height: h / 2 };
        case 'BL': return { x: x / 2, y: 0.5 + (1 - y - h) / 2, width: w / 2, height: h / 2 };
        case 'BR': return { x: 0.5 + (1 - x - w) / 2, y: 0.5 + (1 - y - h) / 2, width: w / 2, height: h / 2 };
      }
    };
    
    const transformDoor = (door: LevelDoor): LevelDoor => {
        let hinge = {x: door.hinge.x, y: door.hinge.y};
        let closedAngle = door.closedAngle;
        let swingDirection = door.swingDirection;

        switch(quadrant) {
            case 'TL':
                hinge = { x: hinge.x/2, y: hinge.y/2 };
                break;
            case 'TR':
                hinge = { x: 0.5 + (1-hinge.x)/2, y: hinge.y/2 };
                closedAngle = Math.PI - closedAngle;
                swingDirection = -swingDirection as 1 | -1;
                break;
            case 'BL':
                hinge = { x: hinge.x/2, y: 0.5 + (1-hinge.y)/2 };
                closedAngle = -closedAngle;
                swingDirection = -swingDirection as 1 | -1;
                break;
            case 'BR':
                hinge = { x: 0.5 + (1-hinge.x)/2, y: 0.5 + (1-hinge.y)/2 };
                closedAngle = Math.PI + closedAngle;
                break;
        }

        return {
            ...door,
            id: doorIdCounter++,
            hinge,
            length: door.length / 2,
            closedAngle,
            swingDirection,
        };
    };

    const transformEnemy = (enemy: LevelEnemy): LevelEnemy => {
        let {x, y, direction} = enemy;
        switch(quadrant) {
            case 'TL':
                x /= 2; y /= 2;
                break;
            case 'TR':
                x = 0.5 + (1-x)/2; y /= 2;
                direction = Math.PI - direction;
                break;
            case 'BL':
                x /= 2; y = 0.5 + (1-y)/2;
                direction = -direction;
                break;
            case 'BR':
                x = 0.5 + (1-x)/2; y = 0.5 + (1-y)/2;
                direction = Math.PI + direction;
                break;
        }
        return { ...enemy, x, y, direction };
    };
    
    original.walls.forEach(w => {
        const isOuterShell = outerShellWalls.has(JSON.stringify(w));

        if (!isOuterShell) {
            // It's an internal wall, always keep it.
            newLevel.walls.push(transformWall(w));
            return;
        }

        // It's an outer shell wall. Decide if we keep it based on the quadrant.
        const isTop = w.y < 0.1 && w.height < 0.1;
        const isBottom = w.y > 0.8;
        const isLeft = w.x < 0.1 && w.width < 0.1;
        const isRight = w.x > 0.9;
        
        let keep = false;
        switch(quadrant) {
            case 'TL': if (isTop || isLeft) keep = true; break;
            case 'TR': if (isTop || isRight) keep = true; break;
            case 'BL': if (isBottom || isLeft) keep = true; break;
            case 'BR': if (isBottom || isRight) keep = true; break;
        }
        
        if (keep) {
            newLevel.walls.push(transformWall(w));
        }
    });

    original.doors.forEach(d => {
        // Exclude doors that were on the now-removed outer walls
        const isOnRightWall = d.hinge.x > 0.9;
        const isOnBottomWall = d.hinge.y > 0.8; // main entrance has no doors
        
        let shouldBeRemoved = false;
        switch(quadrant) {
            case 'TL': if (isOnRightWall || isOnBottomWall) shouldBeRemoved = true; break;
            case 'TR': if (isOnRightWall || isOnBottomWall) shouldBeRemoved = true; break; // Original right becomes new right, but its door needs to become internal
            case 'BL': if (isOnRightWall || isOnBottomWall) shouldBeRemoved = true; break;
            case 'BR': if (isOnRightWall || isOnBottomWall) shouldBeRemoved = true; break;
        }

        if (!shouldBeRemoved) {
             newLevel.doors.push(transformDoor(d));
        }
    });

    original.enemies.forEach(e => newLevel.enemies.push(transformEnemy(e)));
  }

  // Add new central doors
  const doorLength = 0.1 / 2;
  const doorMaxAngle = Math.PI / 2 * 0.9;
  
  // Vertical Connector
  newLevel.doors.push({ id: doorIdCounter++, hinge: { x: 0.495, y: 0.45 }, length: doorLength, closedAngle: -Math.PI/2, maxOpenAngle: doorMaxAngle, swingDirection: -1 });
  newLevel.doors.push({ id: doorIdCounter++, hinge: { x: 0.495, y: 0.55 }, length: doorLength, closedAngle: Math.PI/2, maxOpenAngle: doorMaxAngle, swingDirection: 1 });
  
  // Horizontal Connector
  newLevel.doors.push({ id: doorIdCounter++, hinge: { x: 0.45, y: 0.505 }, length: doorLength, closedAngle: Math.PI, maxOpenAngle: doorMaxAngle, swingDirection: 1 });
  newLevel.doors.push({ id: doorIdCounter++, hinge: { x: 0.55, y: 0.505 }, length: doorLength, closedAngle: 0, maxOpenAngle: doorMaxAngle, swingDirection: -1 });


  return newLevel;
};

const THE_FACTORY_EXPANSION = generateExpandedFactory();


export const MISSIONS: LevelDefinition[] = [
  TRAINING_GROUND,
  THE_FACTORY,
  THE_FACTORY_EXPANSION,
];
