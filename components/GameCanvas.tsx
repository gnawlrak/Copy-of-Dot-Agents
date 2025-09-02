import React, { useRef, useEffect, useState } from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { PlayerLoadout, CustomControls } from '../App';
import { Weapon, ThrowableType, Throwable } from '../data/definitions';
import { WEAPONS } from '../data/weapons';

// Define types for geometry
type Point = { x: number; y: number };
type Wall = { x: number; y: number; width: number; height: number };
type Segment = { a: Point; b: Point };
type Door = {
  id: number;
  hinge: Point;
  length: number;
  thickness: number;
  closedAngle: number;
  currentAngle: number;
  maxOpenAngle: number;
  swingDirection: 1 | -1;
  angularVelocity: number;
  targetAngle: number | null;
  autoSwingSpeed: number;
  isPlayerHolding: boolean;
  lastSoundTime?: number;
  locked?: boolean;
};
type Bullet = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
};
type Enemy = {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  direction: number; // Angle in radians
  fov: number; // Field of view in radians
  viewDistance: number;
  isAlert: boolean;
  speed: number;
  targetX?: number;
  targetY?: number;
  shootCooldown: number;
  shootCooldownMax: number;
  stunTimer?: number;
  suppressionTimer?: number;
  type: 'standard' | 'advanced';
  lastSeenTime?: number;
  // Advanced AI fields
  rifleAmmo?: number;
  isReloadingRifle?: boolean;
  reloadRifleTimer?: number;
  burstCooldown?: number;
  burstShotsFired?: number;
  axeState?: 'idle' | 'windup' | 'swing' | 'recover';
  axeTimer?: number;
  // Pathfinding / State fields
  patrolStartX?: number;
  patrolStartY?: number;
  patrolStartDirection?: number;
  isInvestigating?: boolean;
  searchTimer?: number;
  isReturningToPost?: boolean;
  reactionTimer?: number;
  moveSoundTimer?: number;
};
type Player = {
    x: number;
    y: number;
    radius: number;
    speed: number; // pixels/sec
    health: number;
    maxHealth: number;
    hitTimer: number; // seconds
    weapons: Weapon[];
    currentWeaponIndex: number;
    shootCooldown: number; // seconds
    isReloading: boolean;
    reloadTimer: number; // seconds
    throwables: { [key in ThrowableType]?: number };
    throwableTypes: ThrowableType[];
    currentThrowableIndex: number;
    flashTimer: number; // seconds
}
type Light = {
  x: number;
  y: number;
  ttl: number; // seconds
  life: number; // seconds
  power: number;
  type: 'muzzle' | 'impact' | 'grenade' | 'flashbang';
  openWindow?: boolean;
};
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number; // seconds
  life: number; // seconds
};
type Explosion = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
    type: ThrowableType;
};
type Shockwave = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
};
type HitEffect = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
};
type TakedownEffect = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
}
type SlashArc = {
    x: number;
    y: number;
    a1: number;
    a2: number;
    inner: number;
    outer: number;
    ttl: number; // seconds
    life: number; // seconds
    isEnemy?: boolean;
};
type Tracer = {
    x1: number; y1: number;
    x2: number; y2: number;
    ttl: number; life: number; // seconds
};
type SoundWave = {
    x: number; y: number;
    radius: number; maxRadius: number;
    lifetime: number; maxLifetime: number; // seconds
    type: 'player_move' | 'player_shoot' | 'enemy_move' | 'enemy_shoot' | 'impact' | 'explosion' | 'door' | 'bounce' | 'slash';
};
type ShakeWave = {
    t: number; // time elapsed
    amp: number;
    rotAmp: number;
    freq: number;
    decay: number;
    dirx: number;
    diry: number;
    phase: number;
};

interface GameCanvasProps {
    level: LevelDefinition;
    loadout: PlayerLoadout;
    onMissionEnd: () => void;
    showSoundWaves: boolean;
    agentSkinColor: string;
    customControls: CustomControls;
}

const BASE_LOGICAL_HEIGHT = 720; // Design resolution

// --- Advanced AI Constants ---
const AXE_RANGE = 50; // pixels
const AXE_WINDUP_DURATION = 0.4; // seconds
const AXE_SWING_DURATION = 0.15; // seconds
const AXE_RECOVER_DURATION = 0.6; // seconds
const RIFLE_RELOAD_TIME = 2.5; // seconds
const RIFLE_BURST_PAUSE = 0.8; // seconds between bursts
const RIFLE_INTER_BURST_DELAY = 0.1; // seconds between shots in a burst


// Intersect a ray (p, d) with a segment s
const intersectRaySegment = (px: number, py: number, dx: number, dy: number, s: Segment): { t: number; x: number; y: number } | null => {
  const rx = dx;
  const ry = dy;
  const sx = s.b.x - s.a.x;
  const sy = s.b.y - s.a.y;
  const rxs = rx * sy - ry * sx;
  if (Math.abs(rxs) < 1e-8) return null; // Parallel

  const qpx = s.a.x - px;
  const qpy = s.a.y - py;
  const t = (qpx * sy - qpy * sx) / rxs; // Ray parameter t >= 0
  const u = (qpx * ry - qpy * rx) / rxs; // Segment parameter u in [0,1]

  if (t >= 0 && u >= 0 && u <= 1) {
    return { t, x: px + t * rx, y: py + t * ry };
  }
  return null;
};

// Intersect segment (p1, p2) with segment s
const intersectSegSeg = (p1x: number, p1y: number, p2x: number, p2y: number, s: Segment): { t: number; x: number; y: number } | null => {
    const rx = p2x - p1x, ry = p2y - p1y;
    const sx = s.b.x - s.a.x, sy = s.b.y - s.a.y;
    const rxs = rx * sy - ry * sx;
    if (Math.abs(rxs) < 1e-8) return null;
    const qpx = s.a.x - p1x, qpy = s.a.y - p1y;
    const t = (qpx * sy - qpy * sx) / rxs; // on p segment
    const u = (qpx * ry - qpy * rx) / rxs; // on s segment
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { return { t, x: p1x + t * rx, y: p1y + t * ry }; }
    return null;
}

// Intersect segment (p1, p2) with circle (cx, cy, r)
const intersectSegCircle = (p1x: number, p1y: number, p2x: number, p2y: number, cx: number, cy: number, r: number): { t: number, x: number, y: number } | null => {
    const dx = p2x - p1x;
    const dy = p2y - p1y;
    const fx = p1x - cx;
    const fy = p1y - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    
    // If start point is already inside, immediate hit at t=0
    if (c < 0) {
        return { t: 0, x: p1x, y: p1y };
    }

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return null; // No real intersection and not starting inside
    }

    discriminant = Math.sqrt(discriminant);
    
    // We only care about the first intersection point (the smaller t)
    const t = (-b - discriminant) / (2 * a);

    if (t >= 0 && t <= 1) {
        return { t: t, x: p1x + dx * t, y: p1y + dy * t };
    }
    
    return null;
};

// Calculate a vision polygon from an origin point
const getVisionPolygon = (origin: Point, segments: Segment[], canvasSize: {width: number, height: number}): Point[] => {
    const corners: Point[] = [];
    segments.forEach(seg => {
        corners.push(seg.a, seg.b);
    });

    const eps = 1e-4;
    const angles: number[] = [];
    for (const c of corners) {
        const a = Math.atan2(c.y - origin.y, c.x - origin.x);
        angles.push(a - eps, a, a + eps);
    }
    
    const uniqueAngles = Array.from(new Set(angles.map(a => Math.atan2(Math.sin(a), Math.cos(a)))));

    const points: (Point & { angle: number })[] = [];
    const maxDist = Math.hypot(canvasSize.width, canvasSize.height);

    for (const angle of uniqueAngles) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let closest: { t: number, x: number, y: number } | null = null;
        for (const s of segments) {
            const hit = intersectRaySegment(origin.x, origin.y, dx, dy, s);
            if (hit) {
                if (!closest || hit.t < closest.t) closest = hit;
            }
        }
        if (closest) {
            points.push({ x: closest.x, y: closest.y, angle });
        } else {
            points.push({ x: origin.x + dx * maxDist, y: origin.y + dy * maxDist, angle });
        }
    }

    points.sort((p, q) => p.angle - q.angle);
    return points;
};

// Helper function to calculate the shortest distance from a point to a line segment
const pointToSegmentDistance = (p: Point, a: Point, b: Point) => {
    const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const closestPoint = {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y)
    };
    return Math.hypot(p.x - closestPoint.x, p.y - closestPoint.y);
};

// Helper to check if a point is inside a polygon
const pointInPoly = (x: number, y: number, poly: Point[]) => {
    let isInside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

// Helper to draw a wedge for the slash effect
const drawArcWedge = (ctx: CanvasRenderingContext2D, x: number, y: number, a1: number, a2: number, inner: number, outer: number, alpha: number, isEnemy?: boolean) => {
    if (alpha <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, outer, a1, a2, false);
    ctx.arc(x, y, inner, a2, a1, true);
    ctx.closePath();
    ctx.fillStyle = isEnemy ? `rgba(255, 100, 100, ${0.25 * alpha})` : `rgba(255, 255, 255, ${0.18 * alpha})`;
    ctx.fill();
}

// Helper: squared distance from point (px, py) to segment (ax, ay) - (bx, by)
const distPtSegSquared = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const l2 = vx * vx + vy * vy;
    if (l2 === 0) return { d2: wx * wx + wy * wy, cx: ax, cy: ay, t: 0 };
    let t = (wx * vx + wy * vy) / l2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * vx;
    const cy = ay + t * vy;
    const dx = px - cx;
    const dy = py - cy;
    return { d2: dx * dx + dy * dy, cx, cy, t };
};

const GameCanvas = ({ level, loadout, onMissionEnd, showSoundWaves, agentSkinColor, customControls }: GameCanvasProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const scaleRef = useRef(1);
  const lastTimeRef = useRef(performance.now());
  const playerRef = useRef<Player>({
      x: 100, y: 100, radius: 10, speed: 240, health: 100, maxHealth: 100, hitTimer: 0,
      weapons: [], currentWeaponIndex: 0, shootCooldown: 0, isReloading: false, reloadTimer: 0,
      throwables: {}, throwableTypes: [], currentThrowableIndex: 0, flashTimer: 0
  });
  const playerMoveSoundTimerRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const wallsRef = useRef<Array<Wall>>([]);
  const doorsRef = useRef<Array<Door>>([]);
  const wallSegmentsRef = useRef<Array<Segment>>([]); // Static wall segments for raycasting
  const mousePosRef = useRef({ x: 0, y: 0 });
  const bulletsRef = useRef<Array<Bullet>>([]);
  const enemiesRef = useRef<Array<Enemy>>([]);
  const initialEnemyCountRef = useRef<number>(0);
  const missionTimeRef = useRef<number>(0);
  const lightsRef = useRef<Array<Light>>([]);
  const sparksRef = useRef<Array<Spark>>([]);
  const throwablesRef = useRef<Array<Throwable>>([]);
  const explosionsRef = useRef<Array<Explosion>>([]);
  const shockwavesRef = useRef<Array<Shockwave>>([]);
  const hitEffectsRef = useRef<Array<HitEffect>>([]);
  const isGameOverRef = useRef<boolean>(false);
  const isMissionCompleteRef = useRef<boolean>(false);
  const missionEndTimeRef = useRef<number | null>(null);
  const interactingDoorIdRef = useRef<number | null>(null);
  const interactionHintDoorIdRef = useRef<number | null>(null);
  const lockedDoorHintIdRef = useRef<number | null>(null);
  const lastEKeyPressTimeRef = useRef<number>(0);
  const lastInteractedDoorIdRef = useRef<number | null>(null);
  const isShootingRef = useRef<boolean>(false); // For mouse input ONLY
  const isAimingThrowableRef = useRef<boolean>(false);
  const cookingThrowableRef = useRef<{ type: ThrowableType; timer: number; maxTimer: number; } | null>(null);
  let nextThrowableId = 0;
  const combatModeRef = useRef<'gun' | 'slash'>('gun');
  const isThrowableModeRef = useRef<boolean>(false);
  const slashStateRef = useRef({
    active: false, t: 0, dur: 0.15, // seconds
    startA: 0, endA: 0, curA: 0, prevA: 0,
    range: 0, inner: 0, width: (20 * Math.PI / 180),
    cd: 0.67, cdLeft: 0,
  });
  const slashHitThisSwingRef = useRef<Set<Enemy>>(new Set());
  const slashArcsRef = useRef<Array<SlashArc>>([]);
  const takedownHintEnemyRef = useRef<Enemy | null>(null);
  const takedownEffectsRef = useRef<Array<TakedownEffect>>([]);
  const tracersRef = useRef<Array<Tracer>>([]);
  const soundWavesRef = useRef<Array<SoundWave>>([]);
  const extractionZoneRef = useRef<Wall | null>(null);
  const isExtractionActiveRef = useRef<boolean>(false);
  const shakerRef = useRef({
      waves: [] as ShakeWave[],
      addImpulse({amp=6, rotAmp=0.015, freq=60, decay=16, dirx=0, diry=0}){
        const n = Math.hypot(dirx,diry)||1; this.waves.push({t:0, amp, rotAmp, freq, decay, dirx:dirx/n, diry:diry/n, phase:Math.random()*Math.PI*2});
      },
      sample(dt: number){
        let ox=0, oy=0, rot=0; const TWO_PI=Math.PI*2; 
        for(let i=this.waves.length-1;i>=0;i--){ const w=this.waves[i]; w.t+=dt; const env=Math.exp(-w.decay*w.t); if(env<0.015){ this.waves.splice(i,1); continue; }
          const s = Math.sin(w.phase + TWO_PI*w.freq*w.t);
          ox += w.dirx * w.amp * env * s;
          oy += w.diry * w.amp * env * s;
          rot += w.rotAmp * env * s;
        }
        return {ox, oy, rot};
      }
  });
  const hasUsedTouchRef = useRef<boolean>(false);
  
    const touchStateRef = useRef({
        movement: { id: null as number | null, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 },
        aim: { id: null as number | null },
        fire: { id: null as number | null, lastX: 0, lastY: 0 },
        fixedFire: { id: null as number | null },
        reload: { id: null as number | null },
        interact: { id: null as number | null },
        switchWeapon: { id: null as number | null },
        melee: { id: null as number | null },
        throwableSelect: { id: null as number | null },
    });
    const touchButtonRectsRef = useRef<{ [key: string]: { x: number; y: number; r: number } }>({});

  // Circle-Rectangle collision detection helper function
  const checkCollision = (circle: {x: number, y: number, radius: number}, rect: {x: number, y: number, width: number, height: number}) => {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (circle.radius * circle.radius);
  };
  
  // New robust wall collision solver
  const resolveCollisionWithWall = (circle: { x: number; y: number; radius: number }, rect: Wall): Point | null => {
      const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
      const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
      const dx = circle.x - closestX;
      const dy = circle.y - closestY;
      const distanceSquared = (dx * dx) + (dy * dy);

      if (distanceSquared >= circle.radius * circle.radius) {
          return null; // No collision
      }

      const distance = Math.sqrt(distanceSquared);
      const penetrationDepth = circle.radius - distance;
      
      // Handle the case where the circle center is inside the rectangle.
      if (distance < 1e-6) {
          const distToLeft = circle.x - rect.x;
          const distToRight = (rect.x + rect.width) - circle.x;
          const distToTop = circle.y - rect.y;
          const distToBottom = (rect.y + rect.height) - circle.y;
          const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

          if (minDist === distToLeft) return { x: rect.x - circle.radius - 0.1, y: circle.y };
          if (minDist === distToRight) return { x: rect.x + rect.width + circle.radius + 0.1, y: circle.y };
          if (minDist === distToTop) return { x: circle.x, y: rect.y - circle.radius - 0.1 };
          return { x: circle.x, y: rect.y + rect.height + circle.radius + 0.1 };
      }

      const pushX = (dx / distance) * (penetrationDepth + 0.1);
      const pushY = (dy / distance) * (penetrationDepth + 0.1);

      return { x: circle.x + pushX, y: circle.y + pushY };
  };

  // Circle-Rotated Rectangle collision for doors
  const checkCollisionWithDoor = (circle: {x: number, y: number, radius: number}, door: Door) => {
    const angle = -door.currentAngle;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    const dx = circle.x - door.hinge.x;
    const dy = circle.y - door.hinge.y;

    const rotatedX = dx * cosAngle - dy * sinAngle;
    const rotatedY = dx * sinAngle + dy * cosAngle;
    
    const doorRect = {
        x: 0, y: -door.thickness / 2, width: door.length, height: door.thickness
    };
    
    const closestX = Math.max(doorRect.x, Math.min(rotatedX, doorRect.x + doorRect.width));
    const closestY = Math.max(doorRect.y, Math.min(rotatedY, doorRect.y + doorRect.height));
    
    const distanceX = rotatedX - closestX;
    const distanceY = rotatedY - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    return distanceSquared < (circle.radius * circle.radius);
  }
  
  const resolveCollisionWithDoor = (
    circle: { x: number, y: number, radius: number },
    door: Door
  ): Point | null => {
    const doorRadius = door.thickness / 2;
    const totalRadius = circle.radius + doorRadius;

    // Get door segment endpoints
    const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
    const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);

    // Get closest point on door's centerline to circle's center
    const { d2, cx, cy } = distPtSegSquared(circle.x, circle.y, door.hinge.x, door.hinge.y, endX, endY);

    // Check for penetration
    if (d2 >= totalRadius * totalRadius) {
        return null; // No collision
    }

    // Calculate push-out vector
    let nx = circle.x - cx;
    let ny = circle.y - cy;
    let len = Math.hypot(nx, ny);

    // Handle case where circle center is exactly on the segment
    if (len < 1e-6) {
        const segDX = endX - door.hinge.x;
        const segDY = endY - door.hinge.y;
        nx = -segDY;
        ny = segDX;
        len = Math.hypot(nx, ny) || 1;
    }

    nx /= len;
    ny /= len;

    const penetrationDepth = totalRadius - Math.sqrt(d2);
    const pushAmount = penetrationDepth + 0.1; // Add epsilon to prevent re-collision

    return {
        x: circle.x + nx * pushAmount,
        y: circle.y + ny * pushAmount
    };
  };

  const fireWeapon = (dynamicSegments: Segment[]) => {
    const player = playerRef.current;
    if (isGameOverRef.current || player.shootCooldown > 0 || player.isReloading || isThrowableModeRef.current || combatModeRef.current === 'slash') return;
    
    const currentWeapon = player.weapons[player.currentWeaponIndex];
    if (currentWeapon.ammoInMag === 0) {
        return;
    }

    if (currentWeapon.magSize !== -1) {
        currentWeapon.ammoInMag--;
    }

    const mouse = mousePosRef.current;
    const baseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    
    const ux = Math.cos(baseAngle), uy = Math.sin(baseAngle);
    currentWeapon.shake(ux, uy);
    const muzzleFlashOffset = player.radius + (2 * scaleRef.current);
    const muzzleX = player.x + ux * muzzleFlashOffset;
    const muzzleY = player.y + uy * muzzleFlashOffset;

    const impact = (x: number, y: number) => {
        const shaker = shakerRef.current;
        const dx=playerRef.current.x-x, dy=playerRef.current.y-y; const dist=Math.hypot(dx,dy)||1; const k = Math.max(0, 1 - dist/ (900 * scaleRef.current));
        if(k>0){ shaker.addImpulse({ amp: 7*k, rotAmp: 0.012*k, freq: 55+40*Math.random(), decay: 18+6*Math.random(), dirx: dx/dist, diry: dy/dist }); }
    };
    
    if (currentWeapon.type === 'hitscan') {
        for (let i = 0; i < currentWeapon.pellets; i++) {
            const spreadAmount = (currentWeapon.pellets > 1) ? (Math.random() - 0.5) * currentWeapon.spread : 0;
            const finalAngle = baseAngle + spreadAmount;
            const finalUx = Math.cos(finalAngle), finalUy = Math.sin(finalAngle);

            let nearestWallT = 9999;
            for(const s of dynamicSegments) {
                const hit = intersectRaySegment(player.x, player.y, finalUx, finalUy, s);
                if (hit && hit.t < nearestWallT) nearestWallT = hit.t;
            }

            let hitEnemy = null, nearestEnemyT = nearestWallT;
            for (const enemy of enemiesRef.current) {
                if (enemy.health <= 0) continue;
                const dx = enemy.x - player.x, dy = enemy.y - player.y;
                const t = dx * finalUx + dy * finalUy;
                if (t > 0 && t < nearestEnemyT) {
                    const ex = player.x + t * finalUx;
                    const ey = player.y + t * finalUy;
                    const distToRay = Math.hypot(ex - enemy.x, ey - enemy.y);
                    if (distToRay < enemy.radius) {
                        hitEnemy = enemy;
                        nearestEnemyT = t;
                    }
                }
            }

            const hitDist = nearestEnemyT;
            const hitX = player.x + finalUx * hitDist;
            const hitY = player.y + finalUy * hitDist;

            tracersRef.current.push({ x1: muzzleX, y1: muzzleY, x2: hitX, y2: hitY, ttl: 0.07, life: 0.07 });
            
            if (hitEnemy) {
                const healthBefore = hitEnemy.health;
                hitEnemy.health -= currentWeapon.damage;
                if (hitEnemy.health <= 0 && healthBefore > 0) {
                  hitEffectsRef.current.push({ x: hitEnemy.x, y: hitEnemy.y, radius: 0, maxRadius: 40 * scaleRef.current, lifetime: 0.33, maxLifetime: 0.33 });
                }
                impact(hitEnemy.x, hitEnemy.y);
            } else {
                lightsRef.current.push({ x: hitX, y: hitY, ttl: 0.13, life: 0.13, power: 1.35, type: 'impact' });
                impact(hitX, hitY);
                soundWavesRef.current.push({ x: hitX, y: hitY, radius: 0, maxRadius: 200 * scaleRef.current, lifetime: 0.3, maxLifetime: 0.3, type: 'impact' });
                const sparkCount = 10 + Math.floor(Math.random() * 6);
                for (let j = 0; j < sparkCount; j++) {
                    const sparkAngle = Math.atan2(-finalUy, -finalUx) + (Math.random() - 0.5) * 1.1;
                    const speed = (270 + Math.random() * 360); // pixels/sec
                    sparksRef.current.push({ x: hitX, y: hitY, vx: Math.cos(sparkAngle) * speed, vy: Math.sin(sparkAngle) * speed, ttl: 0.28, life: 0.28 });
                }
            }
        }
    } else { // Projectile
        if (currentWeapon.pellets > 1) { // Shotgun logic
            const pelletSpread = currentWeapon.pelletSpread || currentWeapon.spread;
            for (let i = 0; i < currentWeapon.pellets; i++) {
                const jitter = (Math.random() - 0.5) * pelletSpread + (Math.random() - 0.5) * currentWeapon.spread;
                const finalAngle = baseAngle + jitter;
                const speed = currentWeapon.bulletSpeed * (0.92 + Math.random() * 0.16);
                bulletsRef.current.push({
                    x: muzzleX,
                    y: muzzleY,
                    dx: Math.cos(finalAngle),
                    dy: Math.sin(finalAngle),
                    radius: currentWeapon.bulletRadius,
                    speed: speed,
                    damage: currentWeapon.damage,
                    owner: 'player'
                });
            }
        } else { // Single projectile logic (e.g., Pistol)
            const spreadAmount = (Math.random() - 0.5) * currentWeapon.spread;
            const finalAngle = baseAngle + spreadAmount;
            bulletsRef.current.push({
                x: muzzleX,
                y: muzzleY,
                dx: Math.cos(finalAngle),
                dy: Math.sin(finalAngle),
                radius: currentWeapon.bulletRadius,
                speed: currentWeapon.bulletSpeed,
                damage: currentWeapon.damage,
                owner: 'player'
            });
        }
    }
    
    soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: currentWeapon.soundRadius * scaleRef.current, lifetime: 0.5, maxLifetime: 0.5, type: 'player_shoot' });

    lightsRef.current.push({ x: muzzleX, y: muzzleY, ttl: 0.08, life: 0.08, power: 1.0 + currentWeapon.pellets * 0.1, type: 'muzzle', openWindow: true });
    
    player.shootCooldown = currentWeapon.fireRate;
  };

  const startSlash = () => {
    const slash = slashStateRef.current;
    if (slash.active || slash.cdLeft > 0) return;

    const player = playerRef.current;
    const mouse = mousePosRef.current;
    const ang = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const sweep = 120 * Math.PI / 180;
    soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 80 * scaleRef.current, lifetime: 0.2, maxLifetime: 0.2, type: 'slash' });

    slash.startA = ang - sweep * 0.5;
    slash.endA   = ang + sweep * 0.5;
    slash.curA = slash.prevA = slash.startA;
    slash.t = 0;
    slash.active = true;
    shakerRef.current.addImpulse({ amp: 4, rotAmp: 0.01, freq: 80, decay: 20, dirx: Math.cos(ang+Math.PI), diry: Math.sin(ang+Math.PI) });
  };

  const throwThrowable = () => {
    const player = playerRef.current;
    const cookState = cookingThrowableRef.current;
    if (!cookState) return;

    const throwableType = cookState.type;
    if ((player.throwables[throwableType] ?? 0) <= 0) {
        return; 
    }
    player.throwables[throwableType]! -= 1;

    const mouse = mousePosRef.current;
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const dist = Math.hypot(dx, dy);

    const scale = scaleRef.current;
    const launchPower = Math.min(dist / (20 * scale), 15 * scale);
    const angle = Math.atan2(dy, dx);
    
    const vx = Math.cos(angle) * launchPower;
    const vy = Math.sin(angle) * launchPower;

    throwablesRef.current.push({
        id: nextThrowableId++,
        type: throwableType,
        x: player.x,
        y: player.y,
        vx,
        vy,
        timer: cookState.timer, // Already in seconds
        radius: 5 * scale,
        hasBounced: false,
    });
};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    let animationFrameId: number;

    const isPlayerCampingDoor = (door: Door, enemy: Enemy): boolean => {
        const player = playerRef.current;
        
        // 1. Check if they are on opposite sides of the closed door's line.
        const doorVecX = Math.cos(door.closedAngle);
        const doorVecY = Math.sin(door.closedAngle);

        const aiVecX = enemy.x - door.hinge.x;
        const aiVecY = enemy.y - door.hinge.y;

        const playerVecX = player.x - door.hinge.x;
        const playerVecY = player.y - door.hinge.y;

        const crossAI = doorVecX * aiVecY - doorVecY * aiVecX;
        const crossPlayer = doorVecX * playerVecY - doorVecY * playerVecX;

        // If signs are the same or one is zero, they are on the same side. Not camping from opposite side.
        if (Math.sign(crossAI) * Math.sign(crossPlayer) >= 0) {
            return false;
        }

        // 2. Check if player is close to the door.
        const endX = door.hinge.x + door.length * Math.cos(door.closedAngle);
        const endY = door.hinge.y + door.length * Math.sin(door.closedAngle);
        
        const distToDoor = pointToSegmentDistance({ x: player.x, y: player.y }, door.hinge, { x: endX, y: endY });
        
        // Player radius + half door thickness + a generous buffer
        const campingThreshold = player.radius + (door.thickness / 2) + (30 * scaleRef.current); 

        return distToDoor < campingThreshold;
    };

    const getLaserEndpoint = (): Point => {
        const player = playerRef.current;
        const mouse = mousePosRef.current;
        const dynamicSegments: Segment[] = [...wallSegmentsRef.current];
        doorsRef.current.forEach(door => {
            const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
            const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
            dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
        });
    
        const dx = mouse.x - player.x;
        const dy = mouse.y - player.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
    
        let nearestT = len; // Default to mouse position
        for (const s of dynamicSegments) {
            const hit = intersectRaySegment(player.x, player.y, ux, uy, s);
            if (hit && hit.t < nearestT) {
                nearestT = hit.t;
            }
        }
        return { x: player.x + ux * nearestT, y: player.y + uy * nearestT };
    }

    const setupMap = () => {
        if (!canvas) return;
        const scale = scaleRef.current;
        const wallThickness = 15 * scale;
        
        wallsRef.current = [];
        doorsRef.current = [];
        wallSegmentsRef.current = [];

        wallsRef.current.push(
          { x: 0, y: 0, width: canvas.width, height: wallThickness },
          { x: 0, y: canvas.height - wallThickness, width: canvas.width, height: wallThickness },
          { x: 0, y: 0, width: wallThickness, height: canvas.height },
          { x: canvas.width - wallThickness, y: 0, width: wallThickness, height: canvas.height }
        );

        level.walls.forEach(w => {
            wallsRef.current.push({
                x: w.x * canvas.width,
                y: w.y * canvas.height,
                width: w.width * canvas.width,
                height: w.height * canvas.height,
            });
        });
        
        level.doors.forEach(d => {
            doorsRef.current.push({
              ...d,
              hinge: { x: d.hinge.x * canvas.width, y: d.hinge.y * canvas.height },
              length: d.length * canvas.height,
              thickness: wallThickness,
              currentAngle: d.closedAngle,
              angularVelocity: 0,
              targetAngle: null,
              autoSwingSpeed: 3.0,
              isPlayerHolding: false,
              locked: d.locked || false,
            });
        });

        wallsRef.current.forEach(wall => {
            const { x, y, width, height } = wall;
            wallSegmentsRef.current.push({ a: { x, y }, b: { x: x + width, y } });
            wallSegmentsRef.current.push({ a: { x: x + width, y }, b: { x: x + width, y: y + height } });
            wallSegmentsRef.current.push({ a: { x: x + width, y: y + height }, b: { x, y: y + height } });
            wallSegmentsRef.current.push({ a: { x, y: y + height }, b: { x, y } });
        });

        if (level.extractionZone) {
            const ez = level.extractionZone;
            extractionZoneRef.current = {
                x: ez.x * canvas.width,
                y: ez.y * canvas.height,
                width: ez.width * canvas.width,
                height: ez.height * canvas.height,
            };
        } else {
            extractionZoneRef.current = null;
        }
    };

    const setupEnemies = () => {
        if (!canvas) return;
        const scale = scaleRef.current;
        const viewDistance = canvas.width * 0.5; 
        const enemySpeed = 120 * scale; // pixels/sec
        const shootCooldownMax = 2; // seconds

        // Shuffle array function
        function shuffleArray<T>(array: T[]): T[] {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const enemyPool = shuffleArray(level.enemies);
        const enemyCount = level.enemyCount || level.enemies.length;
        const chosenSpawns = enemyPool.slice(0, enemyCount);
        initialEnemyCountRef.current = chosenSpawns.length;

        enemiesRef.current = chosenSpawns.map(e => {
            const startX = e.x * canvas.width;
            const startY = e.y * canvas.height;
            const enemyType = e.type || 'standard';
            const maxHealth = enemyType === 'advanced' ? 150 : 100;

            const baseEnemy: Enemy = {
                x: startX,
                y: startY,
                direction: e.direction,
                radius: 12 * scale,
                health: maxHealth,
                maxHealth: maxHealth,
                fov: 130 * (Math.PI / 180), // 130 degrees in radians
                viewDistance,
                isAlert: false,
                speed: enemySpeed,
                shootCooldown: Math.random() * shootCooldownMax,
                shootCooldownMax,
                stunTimer: 0,
                suppressionTimer: 0,
                type: enemyType,
                patrolStartX: startX,
                patrolStartY: startY,
                patrolStartDirection: e.direction,
                isInvestigating: false,
                searchTimer: 0,
                isReturningToPost: false,
                moveSoundTimer: 0,
            };

            // Spawn protection: ensure enemies don't spawn inside walls.
            let finalPos = { x: baseEnemy.x, y: baseEnemy.y };
            for (const wall of wallsRef.current) {
                const resolved = resolveCollisionWithWall({ ...finalPos, radius: baseEnemy.radius }, wall);
                if (resolved) {
                    finalPos = resolved;
                }
            }
            baseEnemy.x = finalPos.x;
            baseEnemy.y = finalPos.y;

            if (enemyType === 'advanced') {
                return {
                    ...baseEnemy,
                    rifleAmmo: 30,
                    isReloadingRifle: false,
                    reloadRifleTimer: 0,
                    burstCooldown: 0,
                    burstShotsFired: 0,
                    axeState: 'idle' as const,
                    axeTimer: 0,
                };
            }
            return baseEnemy;
        });
    };

    const initializePlayer = () => {
      if (!canvas) return;
      const scale = scaleRef.current;
      const player = playerRef.current;
      player.x = level.playerStart.x * canvas.width;
      player.y = level.playerStart.y * canvas.height;
      player.health = player.maxHealth;
      player.hitTimer = 0;
      player.radius = 10 * scale;
      player.speed = 240 * scale; // pixels/sec
      
      const shaker = shakerRef.current;
      
      const weaponShakeFunctions: { [key: string]: (shaker: any, scale: number, ux: number, uy: number) => void } = {
        'Pistol': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 8 * scale, rotAmp: 0.020, freq: 70, decay: 22, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 3 * scale, rotAmp: 0.010, freq: 120, decay: 28, dirx: -ux*0.2, diry: -uy*0.2 });
        },
        'Heavy Pistol': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 12 * scale, rotAmp: 0.025, freq: 60, decay: 23, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 5 * scale, rotAmp: 0.012, freq: 110, decay: 29, dirx: -ux*0.2, diry: -uy*0.2 });
        },
        'Shotgun': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 11 * scale, rotAmp: 0.028, freq: 65, decay: 24, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 4.5 * scale, rotAmp: 0.016, freq: 120, decay: 30, dirx: -ux*0.2, diry: -uy*0.2 });
        },
        'SMG': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 4.2 * scale, rotAmp: 0.012, freq: 95, decay: 26, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 1.6 * scale, rotAmp: 0.006, freq: 140, decay: 34, dirx: (Math.random()*2-1), diry: (Math.random()*2-1) });
        },
        'Assault Rifle': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 6 * scale, rotAmp: 0.016, freq: 85, decay: 27, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 2.5 * scale, rotAmp: 0.008, freq: 130, decay: 33, dirx: (Math.random()*2-1), diry: (Math.random()*2-1) });
        },
        'Machine Gun': (shaker, scale, ux, uy) => {
            shaker.addImpulse({ amp: 5 * scale, rotAmp: 0.014, freq: 90, decay: 28, dirx: -ux, diry: -uy });
            shaker.addImpulse({ amp: 2 * scale, rotAmp: 0.007, freq: 150, decay: 32, dirx: (Math.random()*2-1), diry: (Math.random()*2-1) });
        },
      };

      const createWeaponInstance = (weaponName: string, attachments: { [slot: string]: string }): Weapon => {
          const def = WEAPONS[weaponName];
          if (!def) throw new Error(`Weapon definition not found for ${weaponName}`);
          
          const weapon: Weapon = {
              ...def,
              bulletSpeed: def.bulletSpeed * scale,
              bulletRadius: def.bulletRadius * scale,
              ammoInMag: def.magSize, // Start with a full mag
              reserveAmmo: def.reserveAmmo,
              shake: (ux: number, uy: number) => {
                  const shakeFunc = weaponShakeFunctions[def.name];
                  if (shakeFunc) {
                      shakeFunc(shakerRef.current, scale, ux, uy);
                  }
              }
          };

          // Apply attachment modifiers
          Object.values(attachments).forEach(attachmentName => {
            if (!def.attachmentSlots) return;
            for (const slotName in def.attachmentSlots) {
                const attachment = def.attachmentSlots[slotName].find(a => a.name === attachmentName);
                if (attachment) {
                    const mod = attachment.modifiers;
                    if (mod.fireRate) weapon.fireRate *= mod.fireRate;
                    if (mod.reloadTime) weapon.reloadTime *= mod.reloadTime;
                    if (mod.bulletRadius) weapon.bulletRadius += mod.bulletRadius * scale;
                    if (mod.pellets) weapon.pellets += mod.pellets;
                    if (mod.magSize) {
                        weapon.magSize = Math.round(weapon.magSize * mod.magSize);
                        weapon.ammoInMag = weapon.magSize; // Refill mag when applying mod
                    }
                    if (mod.spread) weapon.spread *= mod.spread;
                    break; 
                }
            }
          });

          return weapon;
      }
      
      player.weapons = [
          createWeaponInstance(loadout.primary, loadout.primaryAttachments),
          createWeaponInstance(loadout.secondary, loadout.secondaryAttachments)
      ];

      player.currentWeaponIndex = 0;
      player.shootCooldown = 0;
      player.isReloading = false;
      player.reloadTimer = 0;
      player.throwables = { ...loadout.throwables };
      player.throwableTypes = Object.keys(loadout.throwables).filter(t => (loadout.throwables[t as ThrowableType] ?? 0) > 0) as ThrowableType[];
      player.currentThrowableIndex = 0;
      player.flashTimer = 0;
      combatModeRef.current = 'gun';
      isThrowableModeRef.current = false;
    };
    
    const resetGame = () => {
      if (!canvas) return;
      isGameOverRef.current = false;
      isMissionCompleteRef.current = false;
      missionEndTimeRef.current = null;
      isExtractionActiveRef.current = false;
      missionTimeRef.current = 0;
      hasUsedTouchRef.current = false;
      const parent = canvas.parentElement;
      if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          scaleRef.current = canvas.height / BASE_LOGICAL_HEIGHT;
      }

      // Calculate touch button positions right after sizing the canvas
      const { width, height } = canvas;
      if (width > 0 && height > 0 && customControls) {
          const newRects: { [key: string]: { x: number; y: number; r: number } } = {};
          const baseRadius = (height * 0.06) * customControls.baseScale;
          for (const key in customControls.layout) {
              const control = customControls.layout[key];
              newRects[key] = {
                  x: control.x * width,
                  y: control.y * height,
                  r: baseRadius * control.scale,
              };
          }
          touchButtonRectsRef.current = newRects;
      }

      setupMap();
      setupEnemies();
      initializePlayer();
      bulletsRef.current = [];
      keysPressedRef.current.clear();
      lightsRef.current = [];
      sparksRef.current = [];
      throwablesRef.current = [];
      explosionsRef.current = [];
      shockwavesRef.current = [];
      hitEffectsRef.current = [];
      isAimingThrowableRef.current = false;
      cookingThrowableRef.current = null;
      combatModeRef.current = 'gun';
      isThrowableModeRef.current = false;
      tracersRef.current = [];
      soundWavesRef.current = [];
      shakerRef.current.waves = [];
      const scale = scaleRef.current;
      slashStateRef.current.active = false;
      slashStateRef.current.cdLeft = 0;
      slashStateRef.current.range = 90 * scale;
      slashStateRef.current.inner = 15 * scale;
      slashArcsRef.current = [];
      takedownHintEnemyRef.current = null;
      takedownEffectsRef.current = [];
    };

    resetGame();
    
    const getBrightnessByDistance = (x: number, y: number, radius: number) => {
        const player = playerRef.current;
        if (!player) return 0;
        const dist = Math.hypot(x - player.x, y - player.y);
        return Math.max(0, 1 - dist / radius);
    };
    
    const drawPathFromPoly = (ctx: CanvasRenderingContext2D, poly: Point[]) => {
      if (poly.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
    };

    const gameLoop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const scale = scaleRef.current;
      const isEnded = isGameOverRef.current || isMissionCompleteRef.current;
      if (isEnded && missionEndTimeRef.current === null) {
        missionEndTimeRef.current = now;
      }
      if (!isEnded) {
        missionTimeRef.current += dt;
      }
      const visionRadius = Math.max(220, Math.min(520, Math.max(canvas.width, canvas.height) * 0.45)) * scale;

      const dynamicSegments = [...wallSegmentsRef.current];
      doorsRef.current.forEach(door => {
          const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
          const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
          dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
      });

      const detonate = (n: Throwable) => {
        const rad = (n.type === 'grenade' ? 230 : 280) * scale;
        
        shakerRef.current.addImpulse({ amp: (n.type === 'grenade' ? 18 : 12) * scale, rotAmp: 0.04, freq: 50, decay: 15, dirx: 0, diry: 0 });
        
        const lightTTL = n.type === 'grenade' ? 0.23 : 0.3; // seconds
        const lightPow = n.type === 'grenade' ? 2.0 : 3.5;
        lightsRef.current.push({ x: n.x, y: n.y, ttl: lightTTL, life: lightTTL, power: lightPow, type: n.type, openWindow: n.type === 'grenade' });

        shockwavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: rad, lifetime: 0.37, maxLifetime: 0.37 });
        explosionsRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: rad, lifetime: 0.5, maxLifetime: 0.5, type: n.type });
        
        const soundRadius = n.type === 'grenade' ? 800 : 600;
        soundWavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: soundRadius * scale, lifetime: 0.67, maxLifetime: 0.67, type: 'explosion' });
        
        if (n.type === 'grenade') {
            const doorsToDestroy = new Set<number>();
            for (const door of doorsRef.current) {
                if (door.locked) {
                    const midX = door.hinge.x + (door.length / 2) * Math.cos(door.currentAngle);
                    const midY = door.hinge.y + (door.length / 2) * Math.sin(door.currentAngle);
                    if (Math.hypot(n.x - midX, n.y - midY) < rad) {
                        doorsToDestroy.add(door.id);
                    }
                }
            }
            if (doorsToDestroy.size > 0) {
                doorsRef.current = doorsRef.current.filter(d => !doorsToDestroy.has(d.id));
            }
        }


        const affectUnit = (unit: Player | Enemy, isPlayer: boolean) => {
            const dist = Math.hypot(unit.x - n.x, unit.y - n.y);
            if (dist > rad) return;

            let isObstructed = false;
            for (const segment of dynamicSegments) {
                if (intersectSegSeg(n.x, n.y, unit.x, unit.y, segment)) {
                    isObstructed = true;
                    break;
                }
            }

            if (n.type === 'grenade') {
                if (isObstructed) return;
                const damage = (1 - (dist / rad)) * (isPlayer ? 100 : 999);
                if(isPlayer) {
                    const player = unit as Player;
                    if(isEnded) return;
                    player.health -= damage;
                    player.hitTimer = 0.17; // seconds
                    
                    const dx = player.x - n.x;
                    const dy = player.y - n.y;
                    const impactDist = Math.hypot(dx, dy) || 1;
                    shakerRef.current.addImpulse({
                        amp: 20 * scale * (1 - impactDist/rad),
                        rotAmp: 0.05 * (1 - impactDist/rad),
                        freq: 30,
                        decay: 18,
                        dirx: dx / impactDist,
                        diry: dy / impactDist,
                    });

                    if (player.health <= 0) {
                        player.health = 0;
                        isGameOverRef.current = true;
                    }
                } else {
                    const enemy = unit as Enemy;
                    const healthBefore = enemy.health;
                    enemy.health -= damage;
                    if (enemy.health <= 0 && healthBefore > 0) {
                      hitEffectsRef.current.push({ x: unit.x, y: unit.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                    }
                }
            } else { // flashbang
                if (isPlayer) {
                    const player = unit as Player;
                    const viewPoly = getVisionPolygon(player, dynamicSegments, {width: canvas.width, height: canvas.height});
                    if (pointInPoly(n.x, n.y, viewPoly)) {
                        // Explosion is visible, check direction for flash effect reduction.
                        const mouse = mousePosRef.current;
                        const angleToMouse = Math.atan2(mouse.y - player.y, mouse.x - player.x);
                        const angleToFlash = Math.atan2(n.y - player.y, n.x - player.x);

                        let angleDiff = Math.abs(angleToMouse - angleToFlash);
                        if (angleDiff > Math.PI) {
                            angleDiff = 2 * Math.PI - angleDiff;
                        }

                        // angleDiff is now between 0 (front) and PI (behind)
                        const maxFlashDuration = 2.5; // seconds
                        const minFlashDuration = 0.5; // seconds

                        // Calculate flash intensity based on angle. 1.0 for front, 0.0 for back.
                        const flashFactor = Math.max(0, 1 - (angleDiff / Math.PI));
                        
                        const flashDuration = minFlashDuration + (maxFlashDuration - minFlashDuration) * flashFactor;
                        player.flashTimer = Math.max(player.flashTimer, flashDuration);
                    }
                } else { // is enemy
                    if (isObstructed) return;
                    const enemy = unit as Enemy;
                    const angleToFlash = Math.atan2(n.y - enemy.y, n.x - enemy.y);
                    
                    let angleDiff = Math.abs(enemy.direction - angleToFlash);
                    if (angleDiff > Math.PI) {
                        angleDiff = 2 * Math.PI - angleDiff;
                    }
            
                    const maxFlashDuration = 2.5; // seconds
                    const minFlashDuration = 0.5; // seconds
                    const flashFactor = Math.max(0, 1 - (angleDiff / Math.PI));
                    const flashDuration = minFlashDuration + (maxFlashDuration - minFlashDuration) * flashFactor;
                    
                    enemy.stunTimer = Math.max(enemy.stunTimer || 0, flashDuration);
                    enemy.isAlert = false;
                }
            }
        };

        affectUnit(playerRef.current, true);
        enemiesRef.current.forEach(e => {
            if (e.health > 0) {
                affectUnit(e, false)
            }
        });
    };

      const raycast = (px: number, py: number, ang: number, maxDist: number) => {
          const dx = Math.cos(ang), dy = Math.sin(ang); let best = maxDist;
          for(const s of dynamicSegments){ const hit=intersectRaySegment(px,py,dx,dy,s); if(hit) best=Math.min(best, hit.t); }
          return best;
      }

      const player = playerRef.current;
      const keys = keysPressedRef.current;
      const touchState = touchStateRef.current;

      if(player.shootCooldown > 0) player.shootCooldown -= dt;
      if (player.flashTimer > 0) player.flashTimer -= dt;
      if (player.hitTimer > 0) player.hitTimer -= dt;

      if (cookingThrowableRef.current) {
        cookingThrowableRef.current.timer -= dt;

        if (cookingThrowableRef.current.timer <= 0) {
            const cookState = cookingThrowableRef.current;

            if (cookState.type === 'flashbang') {
                // Player held the flashbang for too long. Full white screen effect.
                player.flashTimer = 2.5; // Max flash duration
            }

            const selfDetonation: Throwable = {
                id: nextThrowableId++, type: cookState.type,
                x: player.x, y: player.y, vx: 0, vy: 0, timer: 0, radius: 0,
            };
            detonate(selfDetonation);
            if ((player.throwables[cookState.type] ?? 0) > 0) { player.throwables[cookState.type]! -= 1; }
            isAimingThrowableRef.current = false;
            cookingThrowableRef.current = null;
        }
      }

      const currentWeapon = player.weapons[player.currentWeaponIndex];
      if (player.isReloading) {
          player.reloadTimer -= dt;
          if (player.reloadTimer <= 0) {
              player.isReloading = false;
              const ammoNeeded = currentWeapon.magSize - currentWeapon.ammoInMag;
              const ammoToReload = Math.min(ammoNeeded, currentWeapon.reserveAmmo);
              currentWeapon.ammoInMag += ammoToReload;
              currentWeapon.reserveAmmo -= ammoToReload;
          }
      }
      
      const isTouchFiring = (touchState.fire.id !== null || touchState.fixedFire.id !== null) &&
                            !isAimingThrowableRef.current &&
                            combatModeRef.current === 'gun';

      if ((isShootingRef.current || isTouchFiring) && currentWeapon.automatic) {
          fireWeapon(dynamicSegments);
      }
      
doorsRef.current.forEach(door => {
    const previousAngle = door.currentAngle;
    let newAngle = door.currentAngle;
    let deltaAngle = 0;

    if (door.targetAngle !== null) {
        const angleDiff = door.targetAngle - door.currentAngle;
        if (Math.abs(angleDiff) < 0.01) {
            newAngle = door.targetAngle;
            door.targetAngle = null;
        } else {
            deltaAngle = Math.sign(angleDiff) * door.autoSwingSpeed * dt;
        }
    } else {
        deltaAngle = door.angularVelocity * dt;
        if (!door.isPlayerHolding) {
            door.angularVelocity *= (1 - dt * 2.0);
        }
    }

    newAngle += deltaAngle;

    const angularSpeed = Math.abs(newAngle - previousAngle) / (dt || 1/60);
    if (angularSpeed > 1.5 && (now - (door.lastSoundTime || 0)) > 250) { // speed threshold and cooldown
        const soundRadius = angularSpeed > 3.0 ? 250 : 100; // Fast vs slow swing
        const midX = door.hinge.x + door.length / 2 * Math.cos(newAngle);
        const midY = door.hinge.y + door.length / 2 * Math.sin(newAngle);
        soundWavesRef.current.push({ x: midX, y: midY, radius: 0, maxRadius: soundRadius * scale, lifetime: 0.3, maxLifetime: 0.3, type: 'door' });
        door.lastSoundTime = now;
    }

    const minAngle = Math.min(door.closedAngle, door.closedAngle + door.maxOpenAngle * door.swingDirection);
    const maxAngle = Math.max(door.closedAngle, door.closedAngle + door.maxOpenAngle * door.swingDirection);
    newAngle = Math.max(minAngle, Math.min(maxAngle, newAngle));

    if (Math.abs(newAngle - previousAngle) < 1e-6) {
        if (Math.abs(door.angularVelocity) < 0.01) door.angularVelocity = 0;
        return;
    }

    const tempDoor = { ...door, currentAngle: newAngle };
    let isBlocked = false;
    const pushList: { unit: Player | Enemy; newPos: Point }[] = [];

    // --- NEW: Check for door-wall collision first ---
    const c = Math.cos(tempDoor.currentAngle);
    const s = Math.sin(tempDoor.currentAngle);
    const midPoint = { x: tempDoor.hinge.x + (tempDoor.length * 0.5) * c, y: tempDoor.hinge.y + (tempDoor.length * 0.5) * s };
    const endPoint = { x: tempDoor.hinge.x + tempDoor.length * c, y: tempDoor.hinge.y + tempDoor.length * s };

    for (const wall of wallsRef.current) {
        const pointInWall = (p: Point, w: Wall) => p.x >= w.x && p.x <= w.x + w.width && p.y >= w.y && p.y <= w.y + w.height;
        if (pointInWall(midPoint, wall) || pointInWall(endPoint, wall)) {
            isBlocked = true;
            break;
        }
    }
    // --- END NEW CHECK ---

    // Resolve player collision first
    const playerPushedPos = resolveCollisionWithDoor(playerRef.current, tempDoor);
    if (playerPushedPos) {
        let pushedPosIsValid = true;
        for (const wall of wallsRef.current) {
            if (checkCollision({ ...playerPushedPos, radius: playerRef.current.radius }, wall)) {
                pushedPosIsValid = false;
                break;
            }
        }
        if (pushedPosIsValid) {
            pushList.push({ unit: playerRef.current, newPos: playerPushedPos });
        } else {
            isBlocked = true;
        }
    }

    // Resolve enemy collisions if not already blocked
    if (!isBlocked) {
        for (const enemy of enemiesRef.current) {
            if (enemy.health <= 0) continue;
            const enemyPushedPos = resolveCollisionWithDoor(enemy, tempDoor);
            if (enemyPushedPos) {
                let pushedPosIsValid = true;
                for (const wall of wallsRef.current) {
                    if (checkCollision({ ...enemyPushedPos, radius: enemy.radius }, wall)) {
                        pushedPosIsValid = false;
                        break;
                    }
                }
                if (pushedPosIsValid) {
                    pushList.push({ unit: enemy, newPos: enemyPushedPos });
                } else {
                    isBlocked = true;
                    break;
                }
            }
        }
    }

    // Finalize door and unit positions
    if (isBlocked) {
        door.currentAngle = previousAngle;
        door.angularVelocity = 0;
        door.targetAngle = null;
    } else {
        door.currentAngle = newAngle;
        pushList.forEach(p => {
            p.unit.x = p.newPos.x;
            p.unit.y = p.newPos.y;
        });
    }
});
      interactionHintDoorIdRef.current = null;
      lockedDoorHintIdRef.current = null;
      if (interactingDoorIdRef.current === null) {
          const interactionRadius = 50 * scale;
          let closestDist = interactionRadius;
          let closestDoor: Door | null = null;

          for (const door of doorsRef.current) {
              const endPoint = { x: door.hinge.x + door.length * Math.cos(door.currentAngle), y: door.hinge.y + door.length * Math.sin(door.currentAngle) };
              const dist = pointToSegmentDistance({ x: player.x, y: player.y }, door.hinge, endPoint);
              if (dist < closestDist) {
                  closestDist = dist;
                  closestDoor = door;
              }
          }

          if (closestDoor) {
              if (closestDoor.locked) {
                  lockedDoorHintIdRef.current = closestDoor.id;
              } else {
                  interactionHintDoorIdRef.current = closestDoor.id;
              }
          }
      }

      if (!isEnded) {
        let dx = 0; let dy = 0;
        if (touchState.movement.id !== null) {
            dx = touchState.movement.dx;
            dy = touchState.movement.dy;
        } else {
            if (keys.has('w') || keys.has('arrowup')) dy -= 1;
            if (keys.has('s') || keys.has('arrowdown')) dy += 1;
            if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
            if (keys.has('d') || keys.has('arrowright')) dx += 1;
        }


        if (dx !== 0 || dy !== 0) {
          playerMoveSoundTimerRef.current -= dt;
          if (playerMoveSoundTimerRef.current <= 0) {
              playerMoveSoundTimerRef.current = 0.3; // sound every 0.3s
              soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 100 * scale, lifetime: 0.2, maxLifetime: 0.2, type: 'player_move' });
          }
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            dx /= len;
            dy /= len;
          }
          
          let newX = player.x + dx * player.speed * dt;
          let newY = player.y + dy * player.speed * dt;
          
          let tempPos = { x: newX, y: newY };
          
          // Iteratively resolve collisions for stability
          for (let i = 0; i < 3; i++) {
              for (const wall of wallsRef.current) {
                  const resolved = resolveCollisionWithWall({ ...tempPos, radius: player.radius }, wall);
                  if (resolved) tempPos = resolved;
              }
              for (const door of doorsRef.current) {
                  const resolved = resolveCollisionWithDoor({ ...tempPos, radius: player.radius }, door);
                  if (resolved) tempPos = resolved;
              }
          }

          player.x = tempPos.x;
          player.y = tempPos.y;
        }
      }

       takedownHintEnemyRef.current = null;
      if (!isEnded) {
        const takedownDist = player.radius + 15 * scale;
        let closestEnemy: Enemy | null = null;
        let closestDistSq = takedownDist * takedownDist;
    
        for (const enemy of enemiesRef.current) {
            if (enemy.health <= 0 || enemy.isAlert) continue;
    
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx * dx + dy * dy;
    
            if (distSq < closestDistSq) {
                const enemyForwardX = Math.cos(enemy.direction);
                const enemyForwardY = Math.sin(enemy.direction);
                const toPlayerX = player.x - enemy.x;
                const toPlayerY = player.y - enemy.y;
                const toPlayerLen = Math.hypot(toPlayerX, toPlayerY) || 1;
                const dot = (enemyForwardX * toPlayerX + enemyForwardY * toPlayerY) / toPlayerLen;
    
                if (dot < -0.3) {
                    closestEnemy = enemy;
                    closestDistSq = distSq;
                }
            }
        }
        takedownHintEnemyRef.current = closestEnemy;
      }

      const firstImpactPoint = (x1: number, y1: number, x2: number, y2: number) => {
        let best: { t: number, x: number, y: number } | null = null;
        for (const s of dynamicSegments) {
            const hit = intersectSegSeg(x1, y1, x2, y2, s);
            if (hit) {
                if (!best || hit.t < best.t) best = hit;
            }
        }
        return best;
      };

      const impact = (x: number, y: number) => {
        const shaker = shakerRef.current;
        const dx=playerRef.current.x-x, dy=playerRef.current.y-y; const dist=Math.hypot(dx,dy)||1; const k = Math.max(0, 1 - dist/ (900 * scaleRef.current));
        if(k>0){ shaker.addImpulse({ amp: 7*k, rotAmp: 0.012*k, freq: 55+40*Math.random(), decay: 18+6*Math.random(), dirx: dx/dist, diry: dy/dist }); }
      };

      const activeBullets: Bullet[] = [];
        for (const bullet of bulletsRef.current) {
            const nextX = bullet.x + bullet.dx * bullet.speed * dt;
            const nextY = bullet.y + bullet.dy * bullet.speed * dt;
            let removed = false;

            // --- Continuous Collision Detection ---
            
            // 1. Find the closest wall impact
            const wallHit = firstImpactPoint(bullet.x, bullet.y, nextX, nextY);
            let closestT = wallHit ? wallHit.t : 1.0;
            let hitUnit: Enemy | Player | null = null;
            let hitUnitType: 'enemy' | 'player' | null = null;
            
            // 2. Check for unit impacts (enemies or player) that happen before the wall impact
            if (bullet.owner === 'player') {
                for (const enemy of enemiesRef.current) {
                    if (enemy.health <= 0) continue;
                    const enemyHit = intersectSegCircle(
                        bullet.x, bullet.y, nextX, nextY,
                        enemy.x, enemy.y, bullet.radius + enemy.radius
                    );
                    if (enemyHit && enemyHit.t < closestT) {
                        closestT = enemyHit.t;
                        hitUnit = enemy;
                        hitUnitType = 'enemy';
                    }
                }
            } else { // bullet.owner === 'enemy'
                if (!isEnded) {
                    const playerHit = intersectSegCircle(
                        bullet.x, bullet.y, nextX, nextY,
                        player.x, player.y, bullet.radius + player.radius
                    );
                    if (playerHit && playerHit.t < closestT) {
                        closestT = playerHit.t;
                        hitUnit = player;
                        hitUnitType = 'player';
                    }
                }
            }
            
            // 3. Process the closest hit (if any)
            if (hitUnit) {
                removed = true;
                const impactX = bullet.x + (nextX - bullet.x) * closestT;
                const impactY = bullet.y + (nextY - bullet.y) * closestT;

                if (hitUnitType === 'enemy') {
                    const enemy = hitUnit as Enemy;
                    const healthBefore = enemy.health;
                    enemy.health -= bullet.damage;
                    if (enemy.health <= 0 && healthBefore > 0) {
                      hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                    }
                    impact(impactX, impactY);
                    soundWavesRef.current.push({ x: impactX, y: impactY, radius: 0, maxRadius: 50 * scale, lifetime: 0.2, maxLifetime: 0.2, type: 'impact' });
                } else { // hitUnitType === 'player'
                    const playerUnit = hitUnit as Player;
                    playerUnit.health -= bullet.damage;
                    playerUnit.hitTimer = 0.17;

                    // Add a distinct, directional screen shake for getting hit
                    shakerRef.current.addImpulse({
                        amp: 15 * scale,      // Stronger amplitude
                        rotAmp: 0.03,         // More rotational shake
                        freq: 40,             // Lower frequency for a "thud" feel
                        decay: 25,            // Quick decay
                        dirx: bullet.dx,      // Direction of the incoming shot
                        diry: bullet.dy
                    });

                    if (playerUnit.health <= 0) {
                        playerUnit.health = 0;
                        isGameOverRef.current = true;
                    }
                }
            } else if (wallHit && closestT === wallHit.t) { // Wall hit is the closest
                removed = true;
                impact(wallHit.x, wallHit.y);
                soundWavesRef.current.push({ x: wallHit.x, y: wallHit.y, radius: 0, maxRadius: 200 * scale, lifetime: 0.3, maxLifetime: 0.3, type: 'impact' });
                const ix = wallHit.x; const iy = wallHit.y;
                const apx = bullet.x - ix; const apy = bullet.y - iy;
                const al = Math.hypot(apx, apy) || 1;
                const reflectX = apx / al; const reflectY = apy / al;
                const spawnX = ix + reflectX * 1.5; const spawnY = iy + reflectY * 1.5;

                lightsRef.current.push({ x: spawnX, y: spawnY, ttl: 0.13, life: 0.13, power: 1.35, type: 'impact' });
                const sparkCount = 10 + Math.floor(Math.random() * 6);
                for (let i = 0; i < sparkCount; i++) {
                    const spread = 1.1;
                    const angle = Math.atan2(reflectY, reflectX) + (Math.random() - 0.5) * spread;
                    const speed = (270 + Math.random() * 360);
                    sparksRef.current.push({ x: spawnX, y: spawnY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl: 0.28, life: 0.28 });
                }
            }
            
            // 4. Update bullet position if it wasn't removed
            if (!removed) {
                bullet.x = nextX;
                bullet.y = nextY;
            }

            if (!removed) {
                activeBullets.push(bullet);
            }
        }
        bulletsRef.current = activeBullets;

      const activeThrowables: Throwable[] = [];
      for (const throwable of throwablesRef.current) {
          throwable.timer -= dt;
          throwable.vx *= (1 - dt * 1.5); throwable.vy *= (1 - dt * 1.5);
          const newX = throwable.x + throwable.vx * dt * 60, newY = throwable.y + throwable.vy * dt * 60; // Temp scale for physics
          const bounceDamping = -0.4;
          let collisionX = false, collisionY = false;
          const c = { x: 0, y: 0, radius: throwable.radius };
          c.x = newX; c.y = throwable.y;
          for (const wall of wallsRef.current) { if (checkCollision(c, wall)) { collisionX = true; break; } }
          if (!collisionX) { for (const door of doorsRef.current) { if (checkCollisionWithDoor(c, door)) { collisionX = true; break; } } }
          c.x = throwable.x; c.y = newY;
          for (const wall of wallsRef.current) { if (checkCollision(c, wall)) { collisionY = true; break; } }
          if (!collisionY) { for (const door of doorsRef.current) { if (checkCollisionWithDoor(c, door)) { collisionY = true; break; } } }
          
          if ((collisionX || collisionY) && !throwable.hasBounced) {
            throwable.hasBounced = true;
            soundWavesRef.current.push({ x: throwable.x, y: throwable.y, radius: 0, maxRadius: 120 * scale, lifetime: 0.2, maxLifetime: 0.2, type: 'bounce' });
          }

          if (collisionX) { throwable.vx *= bounceDamping; } else { throwable.x = newX; }
          if (collisionY) { throwable.vy *= bounceDamping; } else { throwable.y = newY; }
          
          if (throwable.timer <= 0) {
              detonate(throwable);
          } else { 
              activeThrowables.push(throwable); 
          }
      }
      throwablesRef.current = activeThrowables;

      if (slashStateRef.current.cdLeft > 0) slashStateRef.current.cdLeft -= dt;
      const slash = slashStateRef.current;
      if (slash.active) {
        slash.t += dt;
        const easeOutCubic = (x: number) => 1 - Math.pow(1-x,3);
        const p = Math.min(1, slash.t / slash.dur);
        const e = easeOutCubic(p);
        slash.prevA = slash.curA;
        slash.curA = slash.startA + (slash.endA - slash.startA) * e;
        const a1 = Math.min(slash.prevA, slash.curA);
        const a2 = Math.max(slash.prevA, slash.curA);

        const castDist = raycast(player.x, player.y, slash.curA, slash.range);
        const outer = Math.min(slash.range, castDist);
        slashArcsRef.current.push({ x:player.x, y:player.y, a1: a1 - slash.width*0.5, a2: a2 + slash.width*0.5, inner: slash.inner, outer, ttl: 0.13, life: 0.13 });

        for (const enemy of enemiesRef.current) {
            if (enemy.health <= 0 || slashHitThisSwingRef.current.has(enemy)) continue;
            const dx = enemy.x - player.x, dy = enemy.y - player.y; const dist=Math.hypot(dx,dy);
            if (dist < slash.inner || dist > slash.range) continue;
            const ang = Math.atan2(dy,dx);
            const withinSweep = ang >= a1 - slash.width*0.5 && ang <= a2 + slash.width*0.5;
            if (!withinSweep) continue;
            const dClear = raycast(player.x, player.y, ang, dist);
            if (dClear < dist - 1e-3) continue;

            const healthBefore = enemy.health;
            enemy.health = 0; // Slash is an instant kill
            if (healthBefore > 0) {
              slashHitThisSwingRef.current.add(enemy);
              hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
              shakerRef.current.addImpulse({ amp: 2 * scale, rotAmp: 0.005, freq: 100, decay: 20, dirx: dx/dist, diry: dy/dist });
            }
        }

        if (castDist < slash.range - 0.5){
            const ix = player.x + Math.cos(slash.curA)*castDist; const iy = player.y + Math.sin(slash.curA)*castDist;
            soundWavesRef.current.push({ x: ix, y: iy, radius: 0, maxRadius: 150 * scale, lifetime: 0.25, maxLifetime: 0.25, type: 'impact' });
            const angle = slash.curA + Math.PI; const sparkCount = 5;
            for (let i = 0; i < sparkCount; i++) {
                const spread = 0.9; const finalAngle = angle + (Math.random() - 0.5) * spread;
                const speed = (180 + Math.random() * 240);
                sparksRef.current.push({ x: ix, y: iy, vx: Math.cos(finalAngle) * speed, vy: Math.sin(finalAngle) * speed, ttl: 0.28, life: 0.28 });
            }
        }
        if (p >= 1) { slash.active = false; slash.cdLeft = slash.cd; slashHitThisSwingRef.current.clear(); }
      }
      slashArcsRef.current.forEach(a => a.ttl -= dt);
      slashArcsRef.current = slashArcsRef.current.filter(a => a.ttl > 0);

      explosionsRef.current.forEach(exp => exp.lifetime -= dt);
      explosionsRef.current = explosionsRef.current.filter(exp => exp.lifetime > 0);
      shockwavesRef.current.forEach(sw => sw.lifetime -= dt);
      shockwavesRef.current = shockwavesRef.current.filter(sw => sw.lifetime > 0);
      takedownEffectsRef.current.forEach(e => e.lifetime -= dt);
      takedownEffectsRef.current = takedownEffectsRef.current.filter(e => e.lifetime > 0);
      tracersRef.current.forEach(t => t.ttl -= dt);
      tracersRef.current = tracersRef.current.filter(t => t.ttl > 0);

      soundWavesRef.current.forEach(sw => {
        sw.lifetime -= dt;
        const lifePercentage = 1 - (sw.lifetime / sw.maxLifetime);
        sw.radius = sw.maxRadius * lifePercentage;
      });
      soundWavesRef.current = soundWavesRef.current.filter(sw => sw.lifetime > 0);
      
      hitEffectsRef.current.forEach(effect => effect.lifetime -= dt);
      hitEffectsRef.current = hitEffectsRef.current.filter(effect => effect.lifetime > 0);
      hitEffectsRef.current.forEach(effect => {
        const lifePercentage = 1 - (effect.lifetime / effect.maxLifetime);
        effect.radius = effect.maxRadius * Math.sin(lifePercentage * (Math.PI / 2));
      });

      lightsRef.current.forEach(light => light.ttl -= dt);
      lightsRef.current = lightsRef.current.filter(light => light.ttl > 0);
      
      sparksRef.current.forEach(spark => spark.ttl -= dt);
      sparksRef.current = sparksRef.current.filter(spark => spark.ttl > 0);
      sparksRef.current.forEach(spark => {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          spark.vy += 480 * scale * dt; // Gravity
          spark.vx *= (1 - dt * 1);
      });

      const activeEnemies: Enemy[] = [];
        for (const enemy of enemiesRef.current) {
            if (enemy.health <= 0) {
                // Keep dead enemies out of the active list
            } else {
                const wasAlert = enemy.isAlert;

                if (!isEnded) {
                    // Handle timers
                    if (enemy.stunTimer && enemy.stunTimer > 0) enemy.stunTimer -= dt;
                    if (enemy.suppressionTimer && enemy.suppressionTimer > 0) enemy.suppressionTimer -= dt;
                    if (enemy.reactionTimer && enemy.reactionTimer > 0) enemy.reactionTimer -= dt;
                    if (enemy.moveSoundTimer && enemy.moveSoundTimer > 0) enemy.moveSoundTimer -= dt;


                    // Stun overrides everything
                    if (enemy.stunTimer && enemy.stunTimer > 0) {
                        enemy.isAlert = false;
                        enemy.isInvestigating = false;
                        enemy.targetX = undefined;
                        enemy.targetY = undefined;
                        enemy.searchTimer = 0;
                        enemy.isReturningToPost = false;
                    } else {
                        // --- AI LOGIC ---
                        const lastKnownTargetX = enemy.targetX;

                        // 1. SIGHT
                        let canSeePlayer = false;
                        const dxPlayer = player.x - enemy.x;
                        const dyPlayer = player.y - enemy.y;
                        const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

                        if (distToPlayer > 0 && distToPlayer < enemy.viewDistance) {
                            const angleToPlayer = Math.atan2(dyPlayer, dxPlayer);
                            const normalizeAngle = (angle: number) => {
                                while (angle <= -Math.PI) angle += 2 * Math.PI;
                                while (angle > Math.PI) angle -= 2 * Math.PI;
                                return angle;
                            };
                            const angleDiff = normalizeAngle(angleToPlayer - normalizeAngle(enemy.direction));
                            if (Math.abs(angleDiff) < enemy.fov / 2) {
                                let isObstructed = false;
                                for (const segment of dynamicSegments) {
                                    if (intersectSegSeg(enemy.x, enemy.y, player.x, player.y, segment)) {
                                        isObstructed = true;
                                        break;
                                    }
                                }
                                if (!isObstructed) canSeePlayer = true;
                            }
                        }

                        if (canSeePlayer) {
                            enemy.isAlert = true;
                            enemy.isInvestigating = false;
                            enemy.targetX = player.x;
                            enemy.targetY = player.y;
                            enemy.searchTimer = 0;
                            enemy.isReturningToPost = false;
                            enemy.lastSeenTime = now;
                        } else {
                            if (enemy.isAlert) {
                                enemy.searchTimer = 5; // Start searching if player is lost
                            }
                             enemy.isAlert = false;
                        }
                        
                         // Check for nearby player fire to trigger suppression
                        if (!enemy.isAlert && !enemy.suppressionTimer) {
                            for (const wave of soundWavesRef.current) {
                                if (wave.type === 'player_shoot' && Math.hypot(enemy.x - wave.x, enemy.y - wave.y) < enemy.radius + 50 * scale) {
                                    enemy.suppressionTimer = 1.5; // Suppressed for 1.5s
                                    break;
                                }
                            }
                        }

                        // --- STATE MACHINE ---
                        if (enemy.isAlert) {
                            // --- COMBAT STATE ---
                            enemy.direction = Math.atan2(player.y - enemy.y, player.x - enemy.x);

                            if (!enemy.reactionTimer || enemy.reactionTimer <= 0) {
                                if (enemy.type === 'advanced') {
                                    // --- ADVANCED AI COMBAT ---
                                    if (enemy.axeState !== 'idle') {
                                        enemy.axeTimer! -= dt;
                                        if (enemy.axeTimer! <= 0) {
                                            if (enemy.axeState === 'windup') {
                                                enemy.axeState = 'swing';
                                                enemy.axeTimer = AXE_SWING_DURATION;
                                                const midX = enemy.x + (AXE_RANGE * 0.5 * scale) * Math.cos(enemy.direction);
                                                const midY = enemy.y + (AXE_RANGE * 0.5 * scale) * Math.sin(enemy.direction);
                                                soundWavesRef.current.push({ x: midX, y: midY, radius: 0, maxRadius: 100 * scale, lifetime: 0.2, maxLifetime: 0.2, type: 'slash' });
                                            } else if (enemy.axeState === 'swing') {
                                                enemy.axeState = 'recover';
                                                enemy.axeTimer = AXE_RECOVER_DURATION;
                                            } else if (enemy.axeState === 'recover') {
                                                enemy.axeState = 'idle';
                                            }
                                        }
                                    }
                                    
                                    if (enemy.axeState === 'swing') {
                                         const axeArc = 90 * (Math.PI / 180);
                                         const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                                         let angleDiff = Math.abs(enemy.direction - angleToPlayer);
                                         if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                                         if (distToPlayer < (AXE_RANGE * scale) + player.radius && angleDiff < axeArc / 2) {
                                            player.health = 0;
                                            isGameOverRef.current = true;
                                         }
                                         const outer = (AXE_RANGE * scale);
                                         slashArcsRef.current.push({ x: enemy.x, y: enemy.y, a1: enemy.direction - axeArc / 2, a2: enemy.direction + axeArc / 2, inner: 0, outer, ttl: 0.1, life: 0.1, isEnemy: true });
                                    } else if (distToPlayer < AXE_RANGE * scale && enemy.axeState === 'idle') {
                                        enemy.axeState = 'windup';
                                        enemy.axeTimer = AXE_WINDUP_DURATION;
                                    } else if (enemy.axeState === 'idle') {
                                        if (enemy.isReloadingRifle) {
                                            enemy.reloadRifleTimer! -= dt;
                                            if (enemy.reloadRifleTimer! <= 0) {
                                                enemy.isReloadingRifle = false;
                                                enemy.rifleAmmo = 30;
                                            }
                                        } else if (enemy.rifleAmmo! <= 0) {
                                            enemy.isReloadingRifle = true;
                                            enemy.reloadRifleTimer = RIFLE_RELOAD_TIME;
                                        } else if (enemy.burstCooldown! <= 0 && enemy.shootCooldown <= 0) {
                                            const finalUx = Math.cos(enemy.direction), finalUy = Math.sin(enemy.direction);
                                            let nearestWallT = 9999;
                                            dynamicSegments.forEach(s => { const hit = intersectRaySegment(enemy.x, enemy.y, finalUx, finalUy, s); if (hit && hit.t < nearestWallT) nearestWallT = hit.t; });
                                            
                                            let hitPlayer = false, playerT = nearestWallT;
                                            const dx = player.x - enemy.x, dy = player.y - enemy.y;
                                            const t = dx * finalUx + dy * finalUy;
                                            if (t > 0 && t < nearestWallT) {
                                                const ex = enemy.x + t * finalUx; const ey = enemy.y + t * finalUy;
                                                if (Math.hypot(ex - player.x, ey - player.y) < player.radius) {
                                                    hitPlayer = true; playerT = t;
                                                }
                                            }
                                            const hitDist = playerT;
                                            const hitX = enemy.x + finalUx * hitDist;
                                            const hitY = enemy.y + finalUy * hitDist;
                                            tracersRef.current.push({ x1: enemy.x, y1: enemy.y, x2: hitX, y2: hitY, ttl: 0.07, life: 0.07 });
                                            
                                            if (hitPlayer) {
                                                player.health -= 11;
                                                player.hitTimer = 0.17;
                                                shakerRef.current.addImpulse({ amp: 10 * scale, rotAmp: 0.02, freq: 45, decay: 22, dirx: finalUx, diry: finalUy });
                                                if (player.health <= 0) { player.health = 0; isGameOverRef.current = true; }
                                            } else {
                                               // wall impact fx from enemy
                                            }

                                            enemy.rifleAmmo!--;
                                            enemy.burstShotsFired!++;
                                            enemy.shootCooldown = RIFLE_INTER_BURST_DELAY;
                                            soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 400 * scale, lifetime: 0.5, maxLifetime: 0.5, type: 'enemy_shoot' });
                                            lightsRef.current.push({ x: enemy.x, y: enemy.y, ttl: 0.08, life: 0.08, power: 1.2, type: 'muzzle' });

                                            if (enemy.burstShotsFired! >= 3 || enemy.rifleAmmo! <= 0) {
                                                enemy.burstShotsFired = 0;
                                                enemy.burstCooldown = RIFLE_BURST_PAUSE;
                                            }
                                        }
                                    }
                                    if (enemy.burstCooldown! > 0) enemy.burstCooldown! -= dt;

                                } else {
                                    // --- STANDARD AI COMBAT ---
                                    if (enemy.shootCooldown <= 0) {
                                        bulletsRef.current.push({ x: enemy.x, y: enemy.y, dx: Math.cos(enemy.direction), dy: Math.sin(enemy.direction), radius: 4 * scale, speed: 360 * scale, damage: 15, owner: 'enemy' });
                                        soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 400 * scale, lifetime: 0.5, maxLifetime: 0.5, type: 'enemy_shoot' });
                                        lightsRef.current.push({ x: enemy.x, y: enemy.y, ttl: 0.08, life: 0.08, power: 1.5, type: 'muzzle', openWindow: true });
                                        enemy.shootCooldown = enemy.shootCooldownMax;
                                    }
                                }
                            }

                        } else if (enemy.searchTimer && enemy.searchTimer > 0) {
                            // --- SEARCHING STATE ---
                            enemy.searchTimer -= dt;
                            const baseAngle = enemy.patrolStartDirection ?? enemy.direction;
                            enemy.direction = baseAngle + Math.sin(now / 150) * (Math.PI / 3);

                            if (enemy.searchTimer <= 0) {
                                if (enemy.patrolStartX !== undefined) {
                                    enemy.isReturningToPost = true;
                                    enemy.targetX = enemy.patrolStartX;
                                    enemy.targetY = enemy.patrolStartY;
                                }
                            }
                        } else if ((enemy.isInvestigating || enemy.isReturningToPost) && enemy.targetX !== undefined && enemy.targetY !== undefined) {
                            // --- MOVING STATE (Investigating or Returning) ---
                            const targetDist = Math.hypot(enemy.x - enemy.targetX, enemy.y - enemy.targetY);

                            if (targetDist > enemy.radius * 1.5 && (!enemy.suppressionTimer || enemy.suppressionTimer <= 0)) {
                                let dxTarget = enemy.targetX - enemy.x, dyTarget = enemy.targetY - enemy.y;
                                const distToTarget = Math.hypot(dxTarget, dyTarget);
                                if (distToTarget > 0) {
                                    dxTarget /= distToTarget;
                                    dyTarget /= distToTarget;
                                }
                                
                                if ((enemy.moveSoundTimer || 0) <= 0) {
                                    soundWavesRef.current.push({
                                        x: enemy.x,
                                        y: enemy.y,
                                        radius: 0,
                                        maxRadius: 120 * scale,
                                        lifetime: 0.3,
                                        maxLifetime: 0.3,
                                        type: 'enemy_move'
                                    });
                                    enemy.moveSoundTimer = 0.4; // Cooldown
                                }
                                
                                enemy.direction = Math.atan2(dyTarget, dxTarget);
                                const moveSpeed = enemy.speed * (enemy.isInvestigating ? 0.7 : 1.0);
                                let newX = enemy.x + dxTarget * moveSpeed * dt;
                                let newY = enemy.y + dyTarget * moveSpeed * dt;
                                
                                let tempPos = { x: newX, y: newY };
                                
                                for(let i=0; i<2; i++) {
                                    for (const wall of wallsRef.current) {
                                        const resolved = resolveCollisionWithWall({ ...tempPos, radius: enemy.radius }, wall);
                                        if (resolved) tempPos = resolved;
                                    }
                                    for (const door of doorsRef.current) {
                                        const resolved = resolveCollisionWithDoor({ ...tempPos, radius: enemy.radius }, door);
                                        if (resolved) {
                                             tempPos = resolved;
                                        } else {
                                             // Check if trying to move through a closed door
                                            const doorIsBlocking = checkCollisionWithDoor({ ...tempPos, radius: enemy.radius }, door);
                                            if (doorIsBlocking) {
                                                const isClosed = Math.abs(door.currentAngle - door.closedAngle) < 0.1;
                                                if (isClosed && !door.locked && !isPlayerCampingDoor(door, enemy)) {
                                                    door.targetAngle = door.closedAngle + door.maxOpenAngle * door.swingDirection;
                                                }
                                            }
                                        }
                                    }
                                }

                                enemy.x = tempPos.x;
                                enemy.y = tempPos.y;

                            } else {
                                // Reached target or is suppressed
                                if (targetDist <= enemy.radius * 1.5) {
                                    enemy.targetX = undefined;
                                    enemy.targetY = undefined;
                                    if (enemy.isReturningToPost) {
                                        enemy.isReturningToPost = false;
                                        enemy.direction = enemy.patrolStartDirection ?? enemy.direction;
                                    } else {
                                        enemy.searchTimer = 3; 
                                    }
                                    enemy.isInvestigating = false;
                                }
                            }
                        } else {
                            // --- IDLE STATE ---
                            for (const wave of soundWavesRef.current) {
                                if (!enemy.isInvestigating && Math.hypot(enemy.x - wave.x, enemy.y - wave.y) < wave.radius) {
                                    enemy.isInvestigating = true;
                                    enemy.targetX = wave.x;
                                    enemy.targetY = wave.y;
                                    enemy.isReturningToPost = false;
                                    enemy.searchTimer = 0;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (enemy.shootCooldown > 0) enemy.shootCooldown -= dt;

                if (!wasAlert && enemy.isAlert) {
                    soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 300 * scale, lifetime: 0.4, maxLifetime: 0.4, type: 'enemy_shoot' });
                    enemy.reactionTimer = 0.75;
                }

                activeEnemies.push(enemy);
            }
        }
        enemiesRef.current = activeEnemies;

      if (!isEnded) {
        const allEnemiesEliminated = enemiesRef.current.length === 0;

        if (allEnemiesEliminated) {
            if (extractionZoneRef.current) {
                isExtractionActiveRef.current = true;
            } else {
                isMissionCompleteRef.current = true;
            }
        }

        if (isExtractionActiveRef.current && !isMissionCompleteRef.current) {
            const player = playerRef.current;
            const zone = extractionZoneRef.current!;
            if (checkCollision({ x: player.x, y: player.y, radius: player.radius }, zone)) {
                isMissionCompleteRef.current = true;
            }
        }
      }
      
      const viewPoly = getVisionPolygon(playerRef.current, dynamicSegments, {width: canvas.width, height: canvas.height});

      const renderSceneContent = () => {
        // Draw solid walls
        context.fillStyle = '#374151'; // A solid, dark gray
        context.strokeStyle = '#4b5563'; // A slightly lighter gray for borders
        context.lineWidth = 1 * scale;
        wallsRef.current.forEach(wall => {
            context.fillRect(wall.x, wall.y, wall.width, wall.height);
            context.strokeRect(wall.x, wall.y, wall.width, wall.height);
        });
        context.shadowBlur = 0;
  
        doorsRef.current.forEach(door => {
          const brightness = getBrightnessByDistance(door.hinge.x, door.hinge.y, visionRadius);
          const isLocked = door.locked;
          context.save();
          context.translate(door.hinge.x, door.hinge.y);
          context.rotate(door.currentAngle);
          const doorFillColor = isLocked ? `rgba(120, 40, 40, ${brightness})` : `rgba(136, 136, 136, ${brightness})`;
          const doorBorderColor = isLocked ? `rgba(239, 68, 68, ${brightness})` :`rgba(204, 204, 204, ${brightness})`;
          const borderWidth = 2 * scale;
          context.fillStyle = doorBorderColor;
          context.fillRect(0, -door.thickness / 2, door.length, door.thickness);
          context.fillStyle = doorFillColor;
          context.fillRect(borderWidth, (-door.thickness / 2) + borderWidth, door.length - (borderWidth * 2), door.thickness - (borderWidth * 2));
          context.restore();
        });
  
        enemiesRef.current.forEach(enemy => {
          if (enemy.health <= 0) return;
          const brightness = getBrightnessByDistance(enemy.x, enemy.y, visionRadius);

          const bodyColor = enemy.isAlert ? `rgba(238, 238, 238, ${brightness})` : `rgba(153, 153, 153, ${brightness})`;
          context.fillStyle = bodyColor;
          context.shadowColor = bodyColor;
          context.shadowBlur = 15 * scale;
          context.beginPath();
          context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          context.fill();
            if (enemy.type === 'advanced' && enemy.axeState === 'windup') {
              const chargeProgress = 1 - (enemy.axeTimer! / AXE_WINDUP_DURATION);
              context.strokeStyle = `rgba(255, 100, 100, ${brightness * 0.8})`;
              context.lineWidth = 3 * scale;
              context.beginPath();
              context.arc(enemy.x, enemy.y, enemy.radius + 4 * scale, -Math.PI/2, -Math.PI/2 + chargeProgress * Math.PI * 2);
              context.stroke();
            }
          if (enemy.stunTimer && enemy.stunTimer > 0) {
              context.font = `bold ${16 * scale}px mono`; 
              context.fillStyle = `rgba(255, 255, 255, ${brightness})`;
              context.textAlign = 'center';
              context.shadowColor = 'black'; context.shadowBlur = 5 * scale;
              context.fillText('???', enemy.x, enemy.y - enemy.radius - (10 * scale));
              context.shadowBlur = 0;
          }
        });
        context.shadowBlur = 0;
  
        if (!isEnded && !isAimingThrowableRef.current && combatModeRef.current === 'gun' && (hasUsedTouchRef.current || touchStateRef.current.movement.id === null)) {
          const laserEnd = getLaserEndpoint();
          const brightness = getBrightnessByDistance(laserEnd.x, laserEnd.y, visionRadius);
          context.beginPath();
          context.moveTo(player.x, player.y);
          context.lineTo(laserEnd.x, laserEnd.y);
          context.lineWidth = 1.5 * scale;
          context.strokeStyle = `rgba(255,255,255,${0.25 * brightness})`;
          context.stroke();
        }
  
        bulletsRef.current.forEach(bullet => {
          const brightness = getBrightnessByDistance(bullet.x, bullet.y, visionRadius);
          const color = bullet.owner === 'player' ? `rgba(255, 255, 255, ${brightness})` : `rgba(170, 170, 170, ${brightness})`;
          context.fillStyle = color;
          context.shadowColor = color;
          context.shadowBlur = 10 * scale;
          context.beginPath(); context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
          context.fill();
        });
        
        throwablesRef.current.forEach(t => {
          const brightness = getBrightnessByDistance(t.x, t.y, visionRadius);
          const color = t.type === 'grenade' ? `rgba(85, 85, 85, ${brightness})` : `rgba(255, 255, 255, ${brightness})`;
          context.fillStyle = color;
          context.strokeStyle = `rgba(31, 41, 55, ${brightness})`;
          context.lineWidth = 2 * scale;
          context.beginPath(); context.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
          context.fill(); context.stroke();
        });
        
        context.globalCompositeOperation = 'lighter';
        slashArcsRef.current.forEach(arc => {
            const f = Math.max(0, arc.ttl / arc.life);
            drawArcWedge(context, arc.x, arc.y, arc.a1, arc.a2, arc.inner, arc.outer, f, arc.isEnemy);
        });
        if (slashStateRef.current.active) {
            const slash = slashStateRef.current;
            const castDist = raycast(player.x, player.y, slash.curA, slash.range);
            const outer = Math.min(slash.range, castDist);
            const a1 = slash.curA - slash.width * 0.6;
            const a2 = slash.curA + slash.width * 0.6;
            drawArcWedge(context, player.x, player.y, a1, a2, slash.inner, outer, 1.0);
        }

        tracersRef.current.forEach(t => {
            const f = Math.max(0, t.ttl / t.life);
            const midX = (t.x1 + t.x2) / 2;
            const midY = (t.y1 + t.y2) / 2;
            const brightness = getBrightnessByDistance(midX, midY, visionRadius);
            if (brightness <= 0) return;

            context.beginPath();
            context.moveTo(t.x1, t.y1);
            context.lineTo(t.x2, t.y2);
            context.lineWidth = 2.5 * scale;
            context.strokeStyle = `rgba(255, 255, 255, ${0.3 * f * brightness})`;
            context.stroke();
        });
        context.globalCompositeOperation = 'source-over';

        if (!isEnded) {
          context.beginPath();
          context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
          context.fillStyle = player.hitTimer > 0 ? '#999999' : agentSkinColor;
          context.shadowColor = player.hitTimer > 0 ? '#999999' : agentSkinColor;
          context.shadowBlur = 15 * scale;
          context.fill();
          context.shadowBlur = 0;
        }
      }

      // Render Start
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.save();

      const { ox, oy, rot } = shakerRef.current.sample(dt);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      context.translate(cx, cy); context.rotate(rot); context.translate(-cx, -cy);
      context.translate(ox, oy);
      
      const lightPolys = lightsRef.current.map(light => ({
        light,
        poly: getVisionPolygon({ x: light.x, y: light.y }, dynamicSegments, {width: canvas.width, height: canvas.height})
      }));

      const renderCreamyOutlines = () => {
          context.strokeStyle = 'rgba(100, 116, 139, 0.4)'; // slate-500 @ 40%
          context.lineWidth = 1.5 * scale;
          context.shadowColor = 'rgba(100, 116, 139, 0.5)';
          context.shadowBlur = 8 * scale;

          wallsRef.current.forEach(wall => {
              context.strokeRect(wall.x, wall.y, wall.width, wall.height);
          });

          doorsRef.current.forEach(door => {
            context.save();
            context.translate(door.hinge.x, door.hinge.y);
            context.rotate(door.currentAngle);
            context.beginPath();
            context.moveTo(0,0);
            context.lineTo(door.length, 0);
            context.stroke();
            context.restore();
          });

          context.shadowBlur = 0;
      };

      // --- REVISED RENDERING LOGIC ---
      
      // 1. Draw "memory" layer: all known walls as creamy outlines everywhere.
      renderCreamyOutlines();

      // 2. Carve out temporary vision windows from lights (muzzle flashes, etc.)
      lightPolys.forEach(({ light, poly }) => {
          if (light.openWindow) {
              context.save();
              drawPathFromPoly(context, poly);
              context.clip();
              
              context.fillStyle = 'black';
              context.fillRect(0, 0, canvas.width, canvas.height); // Clear clipped area
              
              renderSceneContent();
      
              context.restore();
          }
      });

      // 3. Carve out the main player vision area.
      context.save();
      drawPathFromPoly(context, viewPoly);
      context.clip();

      // --- NEW: Apply Field of View Mask ---
      // This second clip intersects with the existing visibility polygon,
      // ensuring we only see what's both in line-of-sight AND in front of the player.
      const mouse = mousePosRef.current;
      const playerDirection = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      const fovAngle = 170 * (Math.PI / 180); // 170-degree field of view
      const viewDistance = Math.hypot(canvas.width, canvas.height); // A distance larger than the screen

      context.beginPath();
      context.moveTo(player.x, player.y);
      context.arc(player.x, player.y, viewDistance, playerDirection - fovAngle / 2, playerDirection + fovAngle / 2);
      context.closePath();
      context.clip();
      // --- END NEW ---

      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height); // Clear clipped area

      renderSceneContent();

      // Render the player's personal "glow" vignette ONLY inside their vision.
      const radius = visionRadius;
      const gradient = context.createRadialGradient(player.x, player.y, 8 * scale, player.x, player.y, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.20)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.08)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the vision polygon outline
      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.lineWidth = 1;
      drawPathFromPoly(context, viewPoly);
      context.stroke();

      context.restore(); // Restore from player vision clip
      
      // Additive lighting effects
      context.globalCompositeOperation = 'lighter';
      lightPolys.forEach(({ light, poly }) => {
        // Don't render glow for explosions the player can't see.
        if ((light.type === 'grenade' || light.type === 'flashbang') && !pointInPoly(light.x, light.y, viewPoly)) {
            return;
        }
        const f = Math.max(0, light.ttl / light.life);
        const p = light.power || 1;
        context.save();
        
        // If it's a flashbang or a bullet impact, the light effect should be contained within the player's vision.
        // Otherwise (muzzle flash, grenade), it can illuminate areas visible from the light's source.
        if (light.type === 'flashbang' || light.type === 'impact') {
            drawPathFromPoly(context, viewPoly);
            context.clip();
        } else {
            drawPathFromPoly(context, poly);
            context.clip();
        }

        let r1: number;
        let gradient: CanvasGradient;

        if (light.type === 'flashbang') {
            // Flashbangs create a very large, bright wash of light, but only in areas the player can see.
            r1 = 1200 * (0.65 + 0.35 * f) * scale;
            gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, r1);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.35 * f * p})`);
            gradient.addColorStop(0.25, `rgba(220, 220, 220, ${0.20 * f * p})`);
            gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
        } else {
            // Default lighting for other types
            r1 = (light.type === 'impact' ? 280 : 200) * (0.55 + 0.45 * f) * scale;
            gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, r1);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * f * p})`);
            gradient.addColorStop(0.25, `rgba(220, 220, 220, ${0.10 * f * p})`);
            gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
        }
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();
      });

      // Sparks
      sparksRef.current.forEach(spark => {
        const a = Math.max(0, spark.ttl / spark.life);
        const brightness = getBrightnessByDistance(spark.x, spark.y, visionRadius);
        const finalAlpha = a * brightness;
        if (finalAlpha <= 0) return;
        const len = 4 * scale;
        context.beginPath();
        context.moveTo(spark.x, spark.y);
        context.lineTo(spark.x - spark.vx * len * dt, spark.y - spark.vy * len * dt);
        context.lineWidth = 2.2 * scale;
        context.strokeStyle = `rgba(220,220,220,${0.28 * finalAlpha})`;
        context.stroke();
        context.beginPath();
        context.moveTo(spark.x, spark.y);
        context.lineTo(spark.x - spark.vx * len * 0.75 * dt, spark.y - spark.vy * len * 0.75 * dt);
        context.lineWidth = 1.2 * scale;
        context.strokeStyle = `rgba(255,255,255,${0.6 * finalAlpha})`;
        context.stroke();
        context.beginPath();
        context.arc(spark.x, spark.y, 1.6 * scale, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${0.6 * finalAlpha})`;
        context.fill();
      });
      context.globalCompositeOperation = 'source-over';

      if (showSoundWaves && !isEnded) {
        const radarRadius = 40 * scale;
        
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.lineWidth = 1 * scale;
        context.beginPath();
        context.arc(player.x, player.y, radarRadius, 0, Math.PI * 2);
        context.stroke();
        
        soundWavesRef.current.forEach(sw => {
          const lifeRemainingRatio = Math.max(0, sw.lifetime / sw.maxLifetime);

          if (sw.type === 'enemy_shoot' || sw.type === 'enemy_move') {
            const dx = sw.x - player.x;
            const dy = sw.y - player.y;
            const dist = Math.hypot(dx, dy);

            if (dist > sw.maxRadius || dist < player.radius) return;

            const angle = Math.atan2(dy, dx);
            const distanceFade = Math.max(0, 1 - dist / sw.maxRadius);
            const alpha = lifeRemainingRatio * distanceFade * 0.9;
            
            if (alpha <= 0) return;

            const color = sw.type === 'enemy_shoot' ? `rgba(255, 50, 50, ${alpha})` : `rgba(255, 255, 0, ${alpha})`;
            const arcWidth = sw.type === 'enemy_shoot' ? Math.PI / 9 : Math.PI / 12;
            const startAngle = angle - arcWidth / 2;
            const endAngle = angle + arcWidth / 2;
            
            context.lineCap = 'round';
            context.strokeStyle = color;
            context.lineWidth = 4 * scale;
            context.beginPath();
            context.arc(player.x, player.y, radarRadius, startAngle, endAngle);
            context.stroke();
            context.lineCap = 'butt';

          } else {
            let color: string;
            let lineWidth = 2 * scale;

            switch (sw.type) {
                case 'player_shoot':
                    color = `rgba(173, 216, 230, ${0.3 * lifeRemainingRatio})`;
                    break;
                case 'player_move':
                    color = `rgba(255, 255, 255, ${0.2 * lifeRemainingRatio})`;
                    break;
                case 'explosion':
                    color = `rgba(255, 165, 0, ${0.4 * lifeRemainingRatio})`;
                    lineWidth = 3 * scale;
                    break;
                case 'impact':
                case 'door':
                case 'bounce':
                case 'slash':
                default:
                    color = `rgba(160, 160, 160, ${0.25 * lifeRemainingRatio})`;
                    break;
            }
            
            context.strokeStyle = color;
            context.lineWidth = lineWidth;
            context.beginPath();
            context.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            context.stroke();
          }
        });
      }

       shockwavesRef.current.forEach(sw => {
          if (!pointInPoly(sw.x, sw.y, viewPoly)) return;
          const brightness = getBrightnessByDistance(sw.x, sw.y, visionRadius);
          const lifePercentage = 1 - sw.lifetime / sw.maxLifetime;
          const radius = sw.maxRadius * lifePercentage;
          context.strokeStyle = `rgba(255, 220, 150, ${0.45 * (1 - lifePercentage) * brightness})`;
          context.lineWidth = 2.5 * (1 - lifePercentage) * scale;
          context.beginPath();
          context.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
          context.stroke();
      });

      if (cookingThrowableRef.current) {
        const { timer, maxTimer } = cookingThrowableRef.current;
        const progress = Math.max(0, timer / maxTimer);
        
        context.save();
        context.translate(player.x, player.y);
        
        context.lineWidth = 4 * scale;
        context.strokeStyle = progress < 0.25 ? '#ef4444' : '#ffffff'; // Red when about to explode
        context.globalAlpha = 0.8;
        context.beginPath();
        context.arc(0, 0, player.radius + 6 * scale, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2, false);
        context.stroke();
        
        context.restore();
      }

      if (isAimingThrowableRef.current && !isEnded) {
        const currentThrowableType = player.throwableTypes[player.currentThrowableIndex];
        if ((player.throwables[currentThrowableType] ?? 0) > 0) {
            const mouse = mousePosRef.current;
            const dx = mouse.x - player.x, dy = mouse.y - player.y;
            const dist = Math.hypot(dx, dy);
            const launchPower = Math.min(dist / (20 * scale), 15 * scale);
            const angle = Math.atan2(dy, dx);
            let tx = player.x, ty = player.y;
            let tvx = Math.cos(angle) * launchPower, tvy = Math.sin(angle) * launchPower;
            context.beginPath(); context.strokeStyle = 'rgba(255, 255, 255, 0.5)'; context.lineWidth = 2 * scale; context.setLineDash([2 * scale, 5 * scale]);
            let cumulativeDt = 0;
            for (let i = 0; i < 5; i++) {
                // Approximate physics for trajectory
                const stepDt = 0.016 * 2; // Simulate a few steps
                tx += tvx * stepDt * 60; ty += tvy * stepDt * 60;
                tvx *= (1 - stepDt * 1.5); tvy *= (1 - stepDt * 1.5);
                context.lineTo(tx, ty);
            }
            context.stroke(); context.setLineDash([]);
        }
      }
      
      explosionsRef.current.forEach(exp => {
        if (!pointInPoly(exp.x, exp.y, viewPoly)) return;
        const lifePercentage = 1 - (exp.lifetime / exp.maxLifetime);
        exp.radius = exp.maxRadius * Math.sin(lifePercentage * Math.PI / 2);
        const brightness = getBrightnessByDistance(exp.x, exp.y, visionRadius);
        
        let grad;
        if (exp.type === 'grenade') {
            grad = context.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1-lifePercentage) * brightness})`);
            grad.addColorStop(0.3, `rgba(200, 200, 200, ${0.8 * (1-lifePercentage) * brightness})`);
            grad.addColorStop(1, `rgba(100, 100, 100, 0)`);
        } else {
            grad = context.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, ${1.0 * (1-lifePercentage) * brightness})`);
            grad.addColorStop(0.1, `rgba(255, 255, 255, ${0.9 * (1-lifePercentage) * brightness})`);
            grad.addColorStop(1, `rgba(230, 230, 230, 0)`);
        }
        context.fillStyle = grad;
        context.beginPath(); context.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2); context.fill();
      });

      hitEffectsRef.current.forEach(effect => {
          if (!pointInPoly(effect.x, effect.y, viewPoly)) return;
          const brightness = getBrightnessByDistance(effect.x, effect.y, visionRadius);
          const lifePercentage = effect.lifetime / effect.maxLifetime;
          const lineWidth = 4 * lifePercentage * scale;
          context.strokeStyle = `rgba(255, 255, 255, ${lifePercentage * 0.9 * brightness})`;
          context.lineWidth = lineWidth;
          context.beginPath();
          context.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          context.stroke();
      });
      
      takedownEffectsRef.current.forEach(effect => {
        if (!pointInPoly(effect.x, effect.y, viewPoly)) return;
        const lifePercentage = 1 - (effect.lifetime / effect.maxLifetime);
        const radius = effect.maxRadius * lifePercentage;
        const alpha = (1 - lifePercentage) * 0.8;
        context.strokeStyle = `rgba(156, 163, 175, ${alpha})`;
        context.lineWidth = 3 * scale * (1 - lifePercentage);
        context.beginPath();
        context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        context.stroke();
      });

      context.restore(); // Restore from camera transform
      
      if (isExtractionActiveRef.current && !isMissionCompleteRef.current) {
        const zone = extractionZoneRef.current!;
        const pulse = Math.sin(performance.now() / 200) * 0.1 + 0.3;
        context.fillStyle = `rgba(22, 163, 74, ${pulse})`; // Green with pulse
        context.fillRect(zone.x, zone.y, zone.width, zone.height);
        context.strokeStyle = `rgba(52, 211, 153, ${pulse * 2})`;
        context.lineWidth = 3 * scale;
        context.strokeRect(zone.x, zone.y, zone.width, zone.height);

        context.font = `bold ${24 * scale}px mono`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.shadowColor = 'black';
        context.shadowBlur = 10 * scale;
        context.fillText('EXTRACT', zone.x + zone.width / 2, zone.y + zone.height / 2 + 8 * scale);
        context.shadowBlur = 0;
      }

      if (player.hitTimer > 0) {
          const life = player.hitTimer / 0.17; // 1 down to 0
          const cx_vignette = canvas.width / 2;
          const cy_vignette = canvas.height / 2;
          const outerRadius = Math.hypot(cx_vignette, cy_vignette);
          const innerRadius = outerRadius * (0.4 + Math.sin(life * Math.PI) * 0.2);

          const gradient = context.createRadialGradient(cx_vignette, cy_vignette, innerRadius, cx_vignette, cy_vignette, outerRadius);
          gradient.addColorStop(0, 'rgba(179, 0, 0, 0)');
          gradient.addColorStop(0.8, `rgba(179, 0, 0, ${0.4 * life})`);
          gradient.addColorStop(1, `rgba(128, 0, 0, ${0.6 * life})`);
          
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (player.flashTimer > 0) {
        const fadeOutStart = 1.0; // seconds
        let alpha = 1.0;
        if(player.flashTimer < fadeOutStart) {
            alpha = player.flashTimer / fadeOutStart;
        }
        context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // --- UI ---
      const barWidth = 200 * scale, barHeight = 20 * scale, margin = 20 * scale;
      const healthPercentage = Math.max(0, player.health) / player.maxHealth;
      let healthColor = '#e5e5e5';
      if (healthPercentage < 0.6) healthColor = '#a3a3a3';
      if (healthPercentage < 0.3) healthColor = '#525252';
      context.font = `${14 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'left';
      context.fillText('HEALTH', margin, canvas.height - barHeight - margin - (5 * scale));
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)'; context.lineWidth = 2 * scale; context.strokeRect(margin, canvas.height - barHeight - margin, barWidth, barHeight);
      context.fillStyle = 'rgba(255, 255, 255, 0.1)'; context.fillRect(margin, canvas.height - barHeight - margin, barWidth, barHeight);
      context.fillStyle = healthColor; context.fillRect(margin, canvas.height - barHeight - margin, barWidth * healthPercentage, barHeight);

      const weaponTextY = canvas.height - barHeight - margin - (30 * scale);
      context.font = `bold ${18 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'left';

      if (combatModeRef.current === 'slash') {
        context.fillText('KNIFE [Q]', margin, weaponTextY - (20 * scale));
        const slash = slashStateRef.current;
        context.fillStyle = slash.cdLeft > 0 ? '#999999' : 'white';
        context.fillText(slash.cdLeft > 0 ? `COOLDOWN: ${(slash.cdLeft).toFixed(1)}s` : 'READY', margin, weaponTextY);
      } else {
        const weaponKey = player.currentWeaponIndex === 0 ? '[1]' : '[2]';
        context.fillText(`${currentWeapon.name.toUpperCase()} ${weaponKey} / [Q] MELEE`, margin, weaponTextY - (20 * scale));
        let ammoText = '';
        if (player.isReloading) {
            context.fillStyle = '#d4d4d4'; ammoText = 'RELOADING...';
        } else {
            context.fillStyle = (currentWeapon.magSize !== -1 && currentWeapon.ammoInMag === 0) ? '#999999' : 'white';
            ammoText = (currentWeapon.magSize === -1) ? '∞' : `${currentWeapon.ammoInMag} / ${currentWeapon.reserveAmmo}`;
        }
        context.fillText(ammoText, margin, weaponTextY);
      }

     const currentThrowableType = player.throwableTypes[player.currentThrowableIndex];
  const throwableCount = player.throwables[currentThrowableType] ?? 0;
  context.font = `bold ${18 * scale}px mono`;
  context.fillStyle = 'white';
  context.textAlign = 'right';
  if (currentThrowableType) {
    context.fillText(`[F] ${currentThrowableType.toUpperCase()}`, canvas.width - margin, weaponTextY - (20 * scale));
    context.fillText(`${throwableCount}`, canvas.width - margin, weaponTextY);
    context.font = `${14 * scale}px mono`;
    context.fillStyle = '#a3a3a3';
    if (isAimingThrowableRef.current) {
      context.fillText(`Release to throw`, canvas.width - margin, weaponTextY + (20 * scale));
    } else {
      context.fillText(`Hold to cook`, canvas.width - margin, weaponTextY + (20 * scale));
    }
  }

      if (touchState.movement.id === null) {
        const hintTextPos = { x: player.x, y: player.y - player.radius - (20 * scale) };
        // Display only one context hint at a time, with priority.
        if (takedownHintEnemyRef.current) { // Priority 1: Takedown
          const enemy = takedownHintEnemyRef.current;
          if(pointInPoly(enemy.x, enemy.y, viewPoly)) {
              hintTextPos.x = enemy.x;
              hintTextPos.y = enemy.y - enemy.radius - (15 * scale);
              context.font = `bold ${20 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'center';
              context.shadowColor = 'black'; context.shadowBlur = 5 * scale;
              context.fillText("[E] Takedown", hintTextPos.x, hintTextPos.y);
              context.shadowBlur = 0;
          }
        } else if (interactionHintDoorIdRef.current !== null && !isEnded) { // Priority 2: Door interaction
          context.font = `bold ${20 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'center';
          context.shadowColor = 'black'; context.shadowBlur = 5 * scale;
          context.fillText("[E] Door", hintTextPos.x, hintTextPos.y);
          context.shadowBlur = 0;
        } else if (lockedDoorHintIdRef.current !== null && !isEnded) { // Priority 2.5: Locked Door
          context.font = `bold ${20 * scale}px mono`; context.fillStyle = '#ef4444'; context.textAlign = 'center';
          context.shadowColor = 'black'; context.shadowBlur = 5 * scale;
          context.fillText("LOCKED", hintTextPos.x, hintTextPos.y);
          context.shadowBlur = 0;
        } else if (!isEnded && !player.isReloading && currentWeapon.magSize !== -1 && currentWeapon.ammoInMag === 0 && currentWeapon.reserveAmmo > 0) { // Priority 3: Reload
          context.font = `bold ${20 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'center';
          context.shadowColor = 'black'; context.shadowBlur = 5 * scale;
          context.fillText("[R]", hintTextPos.x, hintTextPos.y);
          context.shadowBlur = 0;
        }
      }
      
      if (isExtractionActiveRef.current) {
          context.textAlign = 'center';
          context.font = `bold ${28 * scale}px mono`;
          context.fillStyle = 'white'; context.shadowColor = '#34d399'; context.shadowBlur = 15 * scale;
          context.fillText('ALL HOSTILES NEUTRALIZED. PROCEED TO EXTRACTION.', canvas.width / 2, 50 * scale);
          context.shadowBlur = 0;
      }
      
      if (hasUsedTouchRef.current) {
          const { movement } = touchState;
          const joystickBaseRadius = touchButtonRectsRef.current.joystick?.r || 70 * scale;
          const joystickNubRadius = joystickBaseRadius * 0.4;

          if(movement.id !== null){
              context.fillStyle = `rgba(255, 255, 255, ${0.1 * customControls.opacity * 2})`;
              context.beginPath();
              context.arc(movement.startX, movement.startY, joystickBaseRadius, 0, Math.PI * 2);
              context.fill();
              
              context.fillStyle = `rgba(255, 255, 255, ${0.3 * customControls.opacity * 2})`;
              context.beginPath();
              context.arc(movement.currentX, movement.currentY, joystickNubRadius, 0, Math.PI * 2);
              context.fill();
          } else {
             const joystickRect = touchButtonRectsRef.current.joystick;
             if (joystickRect) {
                context.fillStyle = `rgba(255, 255, 255, ${0.1 * customControls.opacity * 2})`;
                context.beginPath();
                context.arc(joystickRect.x, joystickRect.y, joystickRect.r, 0, Math.PI * 2);
                context.fill();
             }
          }

          const drawTouchButton = (name: string, icon: string | (() => void), text?: string, glow?: boolean) => {
            const rect = touchButtonRectsRef.current[name];
            if (!rect) return;
            const isPressed = (touchState as any)[name].id !== null;

            context.save();
            const baseAlpha = customControls.opacity;
            if(isPressed) context.globalAlpha = Math.min(1.0, baseAlpha * 1.6);
            else context.globalAlpha = baseAlpha;

            context.beginPath();
            context.arc(rect.x, rect.y, rect.r, 0, Math.PI * 2);
            context.fillStyle = isPressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
            context.fill();
            context.strokeStyle = glow ? '#2dd4bf' : 'rgba(255, 255, 255, 0.4)';
            context.lineWidth = glow ? 4 * scale : 2 * scale;
            if (glow) {
                context.shadowColor = '#2dd4bf';
                context.shadowBlur = 15 * scale;
            }
            context.stroke();
            context.restore();

            context.save();
            context.globalAlpha = Math.min(1.0, baseAlpha * 1.8);
            const iconSize = rect.r * 0.9;
            if (typeof icon === 'function') {
                icon();
            } else {
                drawIcon(context, icon, rect.x, rect.y, iconSize, 'white');
            }

            if(text) {
                context.fillStyle = 'white';
                context.font = `bold ${rect.r * 0.4}px mono`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                const textX = rect.x + rect.r * 0.5;
                const textY = rect.y - rect.r * 0.5;
                context.shadowColor = 'black';
                context.shadowBlur = 5 * scale;
                context.fillText(text, textX, textY);
            }
            context.restore();
          }

          const drawIcon = (ctx: CanvasRenderingContext2D, iconName: string, x: number, y: number, size: number, color: string) => {
              ctx.save();
              ctx.strokeStyle = color;
              ctx.lineWidth = Math.max(1.5, size * 0.08);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.translate(x, y);
              ctx.scale(size / 24, size / 24); // Standard 24x24 grid
              ctx.beginPath();
              
              switch(iconName) {
                  case 'fire':
                      ctx.arc(0, 0, 8, 0, Math.PI * 2);
                      ctx.moveTo(0, -10); ctx.lineTo(0, -6);
                      ctx.moveTo(0, 10); ctx.lineTo(0, 6);
                      ctx.moveTo(-10, 0); ctx.lineTo(-6, 0);
                      ctx.moveTo(10, 0); ctx.lineTo(6, 0);
                      break;
                  case 'reload':
                      ctx.arc(0, 0, 8, -Math.PI/2, Math.PI);
                      ctx.moveTo(0, -8); ctx.lineTo(3, -11); ctx.lineTo(0, -14);
                      ctx.rect(-3, -2, 6, 4);
                      break;
                  case 'interact':
                      ctx.moveTo(-6, 10); ctx.lineTo(-6, -5); ctx.arc(-4.5, -5, 1.5, Math.PI, 0);
                      ctx.lineTo(-3, 3); ctx.arc(-1.5, 3, 1.5, Math.PI, 0);
                      ctx.lineTo(0, -5); ctx.arc(1.5, -5, 1.5, Math.PI, 0);
                      ctx.lineTo(3, 3); ctx.arc(4.5, 3, 1.5, Math.PI, 0);
                      ctx.lineTo(6, -8); ctx.arc(2, -9, 4, 0, -Math.PI * 0.8, true);
                      break;
                  case 'switchWeapon':
                      ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.lineTo(5, -8);
                      ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.lineTo(5, 8);
                      break;
                  case 'melee':
                      ctx.moveTo(-8, 8); ctx.lineTo(0, 0); ctx.lineTo(8, -8);
                      ctx.lineTo(5, -11); ctx.lineTo(-11, 5); ctx.closePath();
                      break;
                  case 'grenade':
                      ctx.arc(0, 2, 8, 0, Math.PI * 2);
                      ctx.rect(-2.5, -10, 5, 4);
                      break;
                  case 'flashbang':
                      ctx.rect(-5, -8, 10, 16);
                      ctx.moveTo(-5, -8); ctx.lineTo(5, -8);
                      break;
                  case 'throw':
                      ctx.arc(-2, 0, 8, Math.PI * 0.6, -Math.PI * 0.6);
                      ctx.moveTo(6, -8); ctx.lineTo(10, -5); ctx.lineTo(6, -2);
                      break;
              }
              ctx.stroke();
              ctx.restore();
          };

          const buttons = touchButtonRectsRef.current;
          let mainActionIcon = 'fire';
          if(isThrowableModeRef.current) mainActionIcon = 'throw';
          else if(combatModeRef.current === 'slash') mainActionIcon = 'melee';

          drawTouchButton('fixedFire', mainActionIcon);
          drawTouchButton('fire', mainActionIcon);
          drawTouchButton('reload', 'reload', undefined, playerRef.current.isReloading);
          const isInteracting = !!(takedownHintEnemyRef.current || interactionHintDoorIdRef.current);
          drawTouchButton('interact', 'interact', undefined, isInteracting);
          drawTouchButton('switchWeapon', 'switchWeapon');
          drawTouchButton('melee', 'melee', undefined, combatModeRef.current === 'slash');

          const throwableType = player.throwableTypes[player.currentThrowableIndex];
          const throwableCount = player.throwables[throwableType] ?? 0;
          const drawThrowableIcon = () => {
            if(!throwableType) return;
            const throwableRect = buttons.throwableSelect;
            if (!throwableRect) return;
            const iconSize = throwableRect.r * 0.8;
            drawIcon(context, throwableType, throwableRect.x, throwableRect.y, iconSize, 'white');
          };
          drawTouchButton('throwableSelect', drawThrowableIcon, `${throwableCount}`, isThrowableModeRef.current);
      }

      if (isEnded) {
        const timeSinceEnd = (now - (missionEndTimeRef.current || now)) / 1000;
        const fadeInDuration = 0.5;
        const bgAlpha = Math.min(1, timeSinceEnd / fadeInDuration) * 0.85;
        const contentAlpha = Math.min(1, Math.max(0, (timeSinceEnd - 0.2) / fadeInDuration));

        context.fillStyle = `rgba(15, 23, 42, ${bgAlpha})`; // slate-900
        context.fillRect(0, 0, canvas.width, canvas.height);

        const boxWidth = Math.min(600 * scale, canvas.width * 0.8);
        const boxHeight = 320 * scale;
        const boxX = canvas.width / 2 - boxWidth / 2;
        const boxY = canvas.height / 2 - boxHeight / 2 - 20 * scale;

        if (contentAlpha > 0) {
            context.save();
            context.globalAlpha = contentAlpha;
            context.strokeStyle = '#14b8a6'; // teal-500
            context.lineWidth = 3 * scale;
            context.strokeRect(boxX, boxY, boxWidth, boxHeight);

            context.fillStyle = 'rgba(15, 23, 42, 0.5)'; // slate-900 with alpha
            context.fillRect(boxX, boxY, boxWidth, boxHeight);

            context.textAlign = 'center';
            
            const isComplete = isMissionCompleteRef.current;
            
            context.font = `bold ${48 * scale}px mono`;
            context.shadowBlur = 20 * scale;
            if(isComplete) {
                context.fillStyle = '#2dd4bf'; // teal-400
                context.shadowColor = '#2dd4bf';
                context.fillText('MISSION COMPLETE', canvas.width / 2, boxY + 60 * scale);
            } else {
                context.fillStyle = '#f87171'; // red-400
                context.shadowColor = '#f87171';
                context.fillText('MISSION FAILED', canvas.width / 2, boxY + 60 * scale);
            }
            context.shadowBlur = 0;

            context.fillStyle = '#334155'; // slate-700
            context.fillRect(boxX + 40 * scale, boxY + 90 * scale, boxWidth - 80 * scale, 2 * scale);
            
            context.font = `${18 * scale}px mono`;
            context.fillStyle = '#cbd5e1';
            context.textAlign = 'left';

            const missionTime = missionTimeRef.current;
            const minutes = Math.floor(missionTime / 60);
            const seconds = Math.floor(missionTime % 60);
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            const enemiesKilled = initialEnemyCountRef.current - enemiesRef.current.length;
            const killBonus = enemiesKilled * 100;
            const survivalBonus = isComplete ? Math.floor(missionTime * 10) : 0;
            const totalScore = killBonus + survivalBonus;

            const statYStart = boxY + 120 * scale;
            const statLineHeight = 28 * scale;
            const statLabelX = boxX + 50 * scale;
            const statValueX = boxX + boxWidth - 50 * scale;

            context.fillText('MISSION TIME', statLabelX, statYStart);
            context.fillText('HOSTILES KILLED', statLabelX, statYStart + statLineHeight);

            context.textAlign = 'right';
            context.fillText(timeString, statValueX, statYStart);
            context.fillText(`${enemiesKilled} / ${initialEnemyCountRef.current}`, statValueX, statYStart + statLineHeight);
            
            if (isComplete) {
                context.fillStyle = '#334155';
                context.fillRect(boxX + 40 * scale, statYStart + statLineHeight * 1.6, boxWidth - 80 * scale, 1 * scale);
                
                context.fillStyle = '#cbd5e1';
                context.textAlign = 'left';
                context.fillText('KILL BONUS', statLabelX, statYStart + statLineHeight * 2.5);
                context.fillText('SURVIVAL BONUS', statLabelX, statYStart + statLineHeight * 3.5);
                
                context.textAlign = 'right';
                context.fillText(`${killBonus}`, statValueX, statYStart + statLineHeight * 2.5);
                context.fillText(`${survivalBonus}`, statValueX, statYStart + statLineHeight * 3.5);

                context.fillStyle = '#334155';
                context.fillRect(boxX + 40 * scale, statYStart + statLineHeight * 4.3, boxWidth - 80 * scale, 1 * scale);
                
                context.font = `bold ${22 * scale}px mono`;
                context.fillStyle = '#e2e8f0';
                context.textAlign = 'left';
                context.fillText('TOTAL SCORE', statLabelX, statYStart + statLineHeight * 5.5);
                context.textAlign = 'right';
                context.fillText(`${totalScore}`, statValueX, statYStart + statLineHeight * 5.5);
            }

            context.font = `${24 * scale}px mono`;
            context.fillStyle = '#e2e8f0';
            const promptAlpha = (Math.sin(performance.now() / 400) * 0.25 + 0.75);
            context.globalAlpha = contentAlpha * promptAlpha;
            context.textAlign = 'center';
            context.fillText("Tap or Press [R] to Return", canvas.width / 2, boxY + boxHeight + 40 * scale);

            context.restore();
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === 'r' && (isGameOverRef.current || isMissionCompleteRef.current)) {
        onMissionEnd(); return;
      }
      if (isGameOverRef.current || isMissionCompleteRef.current) return;
      
      if (key === 'q') {
          combatModeRef.current = combatModeRef.current === 'gun' ? 'slash' : 'gun';
          if (isAimingThrowableRef.current) {
              isAimingThrowableRef.current = false;
              cookingThrowableRef.current = null;
          }
          return;
      }

      if (key === 'f') {
    const player = playerRef.current;
    if (player.throwableTypes.length > 1 && !isAimingThrowableRef.current) { // Don't switch while cooking
        player.currentThrowableIndex = (player.currentThrowableIndex + 1) % player.throwableTypes.length;
    }
    return;
  }
    
      if (['1', '2'].includes(key)) {
        const weaponIndex = parseInt(key, 10) - 1;
        const player = playerRef.current;
        if (weaponIndex < player.weapons.length && player.currentWeaponIndex !== weaponIndex) {
            player.currentWeaponIndex = weaponIndex; 
            player.isReloading = false; 
            player.reloadTimer = 0; 
            isShootingRef.current = false;
            combatModeRef.current = 'gun';
            isThrowableModeRef.current = false;
            isAimingThrowableRef.current = false;
            cookingThrowableRef.current = null;
        }
        return;
      }

      if (key === 'r') {
        const player = playerRef.current;
        const weapon = player.weapons[player.currentWeaponIndex];
        if (!player.isReloading && weapon.magSize !== -1 && weapon.ammoInMag < weapon.magSize && weapon.reserveAmmo > 0) {
            player.isReloading = true; player.reloadTimer = weapon.reloadTime;
        }
        return;
      }
      
      if (key === 'e') {
          if (takedownHintEnemyRef.current) {
              const enemy = takedownHintEnemyRef.current;
              const healthBefore = enemy.health;
              enemy.health = 0;
              if (healthBefore > 0) {
                takedownEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: enemy.radius * 2.5, lifetime: 0.25, maxLifetime: 0.25 });
              }
              takedownHintEnemyRef.current = null;
              return;
          }

          const now = performance.now();
          const doorToInteract = doorsRef.current.find(d => d.id === interactionHintDoorIdRef.current);

          if (doorToInteract && !doorToInteract.locked) {
              if (now - lastEKeyPressTimeRef.current < 300 && doorToInteract.id === lastInteractedDoorIdRef.current) {
                  const openPosition = doorToInteract.closedAngle + doorToInteract.maxOpenAngle * doorToInteract.swingDirection;
                  const isMostlyOpen = Math.abs(doorToInteract.currentAngle - doorToInteract.closedAngle) > doorToInteract.maxOpenAngle / 2;
                  
                  doorToInteract.targetAngle = isMostlyOpen ? doorToInteract.closedAngle : openPosition;
                  doorToInteract.angularVelocity = 0;
                  doorToInteract.isPlayerHolding = false;
                  interactingDoorIdRef.current = null;
                  lastEKeyPressTimeRef.current = 0;
                  lastInteractedDoorIdRef.current = null;
                  return;
              }
              
              lastEKeyPressTimeRef.current = now;
              lastInteractedDoorIdRef.current = doorToInteract.id;
              interactingDoorIdRef.current = doorToInteract.id;
              doorToInteract.isPlayerHolding = true;
              doorToInteract.targetAngle = null;

              const relX = playerRef.current.x - doorToInteract.hinge.x;
              const relY = playerRef.current.y - doorToInteract.hinge.y;
              const doorHingeVectorX = Math.cos(doorToInteract.closedAngle - Math.PI / 2);
              const doorHingeVectorY = Math.sin(doorToInteract.closedAngle - Math.PI / 2);
              const crossProduct = doorHingeVectorX * relY - doorHingeVectorY * relX;
              
              let pushDirection = (crossProduct * doorToInteract.swingDirection > 0) ? 1 : -1;
              
              if (event.shiftKey) {
                  pushDirection = -1;
              }

              doorToInteract.angularVelocity = 1.8 * pushDirection;
          }
      }

      keysPressedRef.current.add(key);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (key === 'e') {
            if (interactingDoorIdRef.current !== null) {
                const door = doorsRef.current.find(d => d.id === interactingDoorIdRef.current);
                if (door) {
                    door.isPlayerHolding = false;
                    door.angularVelocity = 0; 
                }
                interactingDoorIdRef.current = null;
            }
        }
        keysPressedRef.current.delete(key);
    };
    
    const handleResize = () => { 
        setIsPortrait(window.innerHeight > window.innerWidth);
        resetGame(); 
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (isGameOverRef.current || isMissionCompleteRef.current) return;
        const rect = canvas.getBoundingClientRect();
        mousePosRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, };
    };
const handleMouseDown = (event: MouseEvent) => {
    if (isGameOverRef.current || isMissionCompleteRef.current) return;
    
    const dynamicSegments = [...wallSegmentsRef.current];
    doorsRef.current.forEach(door => {
        const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
        const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
        dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
    });

    if (event.button === 2) { // Right mouse button
        event.preventDefault(); // Prevent context menu
        const player = playerRef.current;
        const throwableType = player.throwableTypes[player.currentThrowableIndex];
        if ((player.throwables[throwableType] ?? 0) > 0 && !cookingThrowableRef.current) {
            isAimingThrowableRef.current = true;
            const maxTimer = throwableType === 'grenade' ? 4.0 : 2.5; // seconds
            cookingThrowableRef.current = { type: throwableType, timer: maxTimer, maxTimer: maxTimer };
        }
        return;
    }
    
    if (event.button === 0) { // Left mouse button
        if (isAimingThrowableRef.current) return; // Don't shoot while aiming a throwable

        if (combatModeRef.current === 'slash') {
            startSlash();
            return;
        }
        isShootingRef.current = true;
        if (!playerRef.current.weapons[playerRef.current.currentWeaponIndex].automatic) {
            fireWeapon(dynamicSegments);
        }
    }
};
const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) { // Left mouse button up
        isShootingRef.current = false;
    }
    if (event.button === 2) { // Right mouse button up
        if (cookingThrowableRef.current) {
            throwThrowable();
            isAimingThrowableRef.current = false;
            cookingThrowableRef.current = null;
        }
    }
};

const handleTouchStart = (event: TouchEvent) => {
    if (!hasUsedTouchRef.current) {
        hasUsedTouchRef.current = true;
    }
    event.preventDefault();
    if (isGameOverRef.current || isMissionCompleteRef.current) {
      onMissionEnd();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const w = canvas.width;

    for (const touch of Array.from(event.changedTouches)) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        let consumed = false;
        for (const [name, rect] of Object.entries(touchButtonRectsRef.current)) {
            if (name !== 'joystick' && Math.hypot(x - rect.x, y - rect.y) < rect.r) {
                if ((touchStateRef.current as any)[name].id === null) {
                    
                    if (name === 'fire') {
                        const fireState = touchStateRef.current.fire;
                        fireState.id = touch.identifier;
                        fireState.lastX = x;
                        fireState.lastY = y;
                    } else if (name === 'fixedFire') {
                        touchStateRef.current.fixedFire.id = touch.identifier;
                    } else {
                        (touchStateRef.current as any)[name].id = touch.identifier;
                    }

                    if (name === 'fire' || name === 'fixedFire') {
                        if (isThrowableModeRef.current) {
                            const player = playerRef.current;
                            const throwableType = player.throwableTypes[player.currentThrowableIndex];
                            if ((player.throwables[throwableType] ?? 0) > 0 && !cookingThrowableRef.current) {
                                isAimingThrowableRef.current = true;
                                const maxTimer = throwableType === 'grenade' ? 4.0 : 2.5;
                                cookingThrowableRef.current = { type: throwableType, timer: maxTimer, maxTimer: maxTimer };
                            }
                        } else if (combatModeRef.current === 'slash') {
                            startSlash();
                        } else {
                            if (!playerRef.current.weapons[playerRef.current.currentWeaponIndex].automatic) {
                                const dynamicSegments = [...wallSegmentsRef.current];
                                doorsRef.current.forEach(door => {
                                    const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
                                    const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
                                    dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
                                });
                                fireWeapon(dynamicSegments);
                            }
                        }
                    } else if (name === 'reload') {
                        const player = playerRef.current;
                        const weapon = player.weapons[player.currentWeaponIndex];
                        if (!player.isReloading && weapon.magSize !== -1 && weapon.ammoInMag < weapon.magSize && weapon.reserveAmmo > 0) {
                            player.isReloading = true;
                            player.reloadTimer = weapon.reloadTime;
                        }
                    } else if (name === 'interact') {
                        if (takedownHintEnemyRef.current) {
                            const enemy = takedownHintEnemyRef.current;
                            enemy.health = 0;
                            takedownEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: enemy.radius * 2.5, lifetime: 0.25, maxLifetime: 0.25 });
                            takedownHintEnemyRef.current = null;
                        } else {
                            const doorToInteract = doorsRef.current.find(d => d.id === interactionHintDoorIdRef.current);
                            if (doorToInteract && !doorToInteract.locked) {
                                const openPosition = doorToInteract.closedAngle + doorToInteract.maxOpenAngle * doorToInteract.swingDirection;
                                const isMostlyOpen = Math.abs(doorToInteract.currentAngle - doorToInteract.closedAngle) > doorToInteract.maxOpenAngle / 2;
                                doorToInteract.targetAngle = isMostlyOpen ? doorToInteract.closedAngle : openPosition;
                            }
                        }
                    } else if (name === 'switchWeapon') {
                        const player = playerRef.current;
                        player.currentWeaponIndex = (player.currentWeaponIndex + 1) % player.weapons.length;
                        player.isReloading = false;
                        player.reloadTimer = 0;
                        combatModeRef.current = 'gun';
                        isThrowableModeRef.current = false;
                        isAimingThrowableRef.current = false;
                        cookingThrowableRef.current = null;
                    } else if (name === 'melee') {
                        combatModeRef.current = combatModeRef.current === 'gun' ? 'slash' : 'gun';
                        isThrowableModeRef.current = false;
                        if (isAimingThrowableRef.current) {
                            isAimingThrowableRef.current = false;
                            cookingThrowableRef.current = null;
                        }
                    } else if (name === 'throwableSelect') {
                        const player = playerRef.current;
                        if (player.throwableTypes.length > 0) {
                            if (isThrowableModeRef.current) {
                                player.currentThrowableIndex = (player.currentThrowableIndex + 1) % player.throwableTypes.length;
                            } else {
                                isThrowableModeRef.current = true;
                                combatModeRef.current = 'gun';
                            }
                        }
                    }
                    consumed = true;
                    break;
                }
            }
        }

        if (consumed) continue;

        const joystickRect = touchButtonRectsRef.current.joystick;
        if (joystickRect && touchStateRef.current.movement.id === null && Math.hypot(x - joystickRect.x, y - joystickRect.y) < joystickRect.r) {
            const movement = touchStateRef.current.movement;
            movement.id = touch.identifier;
            movement.startX = joystickRect.x;
            movement.startY = joystickRect.y;
            movement.currentX = x;
            movement.currentY = y;
            movement.dx = 0;
            movement.dy = 0;
            continue;
        }
        
        if (touchStateRef.current.aim.id === null) {
            touchStateRef.current.aim.id = touch.identifier;
            mousePosRef.current = { x, y };
        }
    }
};

const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();
    if (isGameOverRef.current || isMissionCompleteRef.current || !canvas) return;
    const rect = canvas.getBoundingClientRect();

    for (const touch of Array.from(event.changedTouches)) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (touch.identifier === touchStateRef.current.movement.id) {
            const movement = touchStateRef.current.movement;
            movement.currentX = x;
            movement.currentY = y;
            const dx = movement.currentX - movement.startX;
            const dy = movement.currentY - movement.startY;
            const dist = Math.hypot(dx, dy);
            const maxDist = touchButtonRectsRef.current.joystick?.r || 60 * scaleRef.current;

            if (dist > 0) {
                const limitedDist = Math.min(dist, maxDist);
                movement.dx = (dx / dist) * (limitedDist / maxDist);
                movement.dy = (dy / dist) * (limitedDist / maxDist);
                
                movement.currentX = movement.startX + movement.dx * maxDist;
                movement.currentY = movement.startY + movement.dy * maxDist;
            } else {
                movement.dx = 0;
                movement.dy = 0;
            }
        } else if (touch.identifier === touchStateRef.current.fire.id) {
            const fireState = touchStateRef.current.fire;
            fireState.lastX = x;
            fireState.lastY = y;
            if (touchStateRef.current.aim.id === null) {
                mousePosRef.current = { x, y };
            }
        } else if (touch.identifier === touchStateRef.current.aim.id) {
            mousePosRef.current = { x, y };
        }
    }
};

const handleTouchEnd = (event: TouchEvent) => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
        const id = touch.identifier;
        if (id === touchStateRef.current.movement.id) {
            const movement = touchStateRef.current.movement;
            movement.id = null;
            movement.dx = 0;
            movement.dy = 0;
        } else if (id === touchStateRef.current.fire.id) {
            touchStateRef.current.fire.id = null;
            if (cookingThrowableRef.current) {
                throwThrowable();
                isAimingThrowableRef.current = false;
                cookingThrowableRef.current = null;
            }
        } else if (id === touchStateRef.current.fixedFire.id) {
            touchStateRef.current.fixedFire.id = null;
            if (cookingThrowableRef.current) {
                throwThrowable();
                isAimingThrowableRef.current = false;
                cookingThrowableRef.current = null;
            }
        } else if (id === touchStateRef.current.aim.id) {
            touchStateRef.current.aim.id = null;
        } else {
            for (const key in touchStateRef.current) {
                const state = (touchStateRef.current as any)[key];
                if (state && state.id === id) {
                    state.id = null;
                }
            }
        }
    }
};

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('contextmenu', e => e.preventDefault());
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [level, loadout, onMissionEnd, showSoundWaves, agentSkinColor, isPortrait, customControls]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default GameCanvas;