import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelDefinition } from '../levels/level-definitions';
import { PlayerLoadout, CustomControls } from '../types';
import { Weapon, ThrowableType, Throwable } from '../data/definitions';
import { WEAPONS, THROWABLES } from '../data/weapons';
import ControlCustomizer from './ControlCustomizer';
import { Difficulty } from '../App';
import { Operator } from '../data/operators';
import { MockNetworkClient, RemotePlayer, PlayerState, FireEventPayload } from '../network';

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
    isIncendiary?: boolean;
    weaponName?: string;
    // Kunai specific
    isKunai?: boolean;
    originX?: number;
    originY?: number;
    maxTravelDistance?: number; // pixels
    isCharged?: boolean;
    hasReachedMax?: boolean;
    // New properties for Kunai homing
    homingTarget?: Enemy | null;
    hasHomed?: boolean;
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
    isDummy?: boolean;
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
    burnTimer?: number;
    burnDamage?: number;
    // Kunai bleed state
    bleedLayers?: number; // 0..2
    bleedTimer?: number; // seconds remaining for bleed (shared timer for layers)
    hitTimer?: number;
    hasScored?: boolean;
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
    medkits: number;
    isHealing: boolean;
    healTimer: number; // seconds
    burnTimer?: number;
    burnDamage?: number;
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
type SmokeCloud = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
};
type FirePatch = {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    lifetime: number; // seconds
    maxLifetime: number; // seconds
    damagePerSecond: number;
};
type StuckKunai = {
    x: number;
    y: number;
    detonationTimer: number;
    owner: 'player' | 'enemy';
}

type WeaponDrop = {
    id: string;
    weaponName: string;
    x: number;
    y: number;
};


interface GameCanvasProps {
    level: LevelDefinition;
    loadout: PlayerLoadout;
    operator: Operator;
    onMissionEnd: () => void;
    showSoundWaves: boolean;
    agentSkinColor: string;
    customControls: CustomControls;
    aimSensitivity: number;
    onAimSensitivityChange: (value: number) => void;
    onCustomControlsChange: (layout: CustomControls) => void;
    defaultControlsLayout: CustomControls;
    difficulty: Difficulty;
    isMultiplayer?: boolean;
    networkClient?: MockNetworkClient | null;
    // Score callbacks/state
    onScoreChange?: (newScore: number) => void;
    initialRunScore?: number;
    // Global persisted scores (from App)
    totalScore?: number;
    highScore?: number;
}

const BASE_LOGICAL_HEIGHT = 720; // Design resolution
const BASE_AIM_SENSITIVITY = 0.0025; // Base sensitivity for mouse and touch aiming

// Minimum time (ms) to show the end screen before allowing immediate exit/back
const END_SCREEN_MIN_DELAY = 1500;

// Scoring constants
const SCORE_PER_KILL = 100;

// Difficulty multipliers
const DIFFICULTY_MULTIPLIERS: { [key in import('../App').Difficulty]: number } = {
    simple: 0.75,
    normal: 1.0,
    hard: 1.5,
};

// --- Manual Healing Constants ---
const HEAL_DURATION = 2.0; // seconds
const HEAL_AMOUNT = 40; // HP
const INITIAL_MEDKITS = 2;

// --- Advanced AI Constants ---
const AXE_RANGE = 50; // pixels
const AXE_WINDUP_DURATION = 0.4; // seconds
const AXE_SWING_DURATION = 0.15; // seconds
const AXE_RECOVER_DURATION = 0.6; // seconds
const RIFLE_RELOAD_TIME = 2.5; // seconds
const RIFLE_BURST_PAUSE = 0.8; // seconds between bursts
const RIFLE_INTER_BURST_DELAY = 0.1; // seconds between shots in a burst

// --- Kunai Homing Constants ---
const KUNAI_HOMING_ACQUISITION_RANGE = 120; // pixels from flight path
const KUNAI_HOMING_TURN_RATE = Math.PI * 2.5; // radians per second
// --- Kunai Gameplay Constants (meters-based in design) ---
const METERS_TO_PIXELS = 48; // 1 meter = 48 pixels (adjust as needed)
const KUNAI_NORMAL_DISTANCE_M = 12; // meters
const KUNAI_NORMAL_SPEED_MPS = 20; // meters per second
const KUNAI_AIRBURST_RADIUS_M = 5; // meters
const KUNAI_AIRBURST_BASE_DAMAGE = 40; // instant HP
const KUNAI_BLEED_DPS = 8; // HP per second per layer
const KUNAI_BLEED_DURATION = 5.0; // seconds
const KUNAI_BLEED_MAX_LAYERS = 2;

// Charged throw parameters (meters)
const CHARGE_MIN_TIME = 0.3;
const CHARGE_MAX_TIME = 2.0;
const CHARGE_MAP = [{ t: 0.3, d: 5 }, { t: 1.0, d: 10 }, { t: 2.0, d: 20 }];

const normalizeAngle = (angle: number) => {
    while (angle <= -Math.PI) angle += 2 * Math.PI;
    while (angle > Math.PI) angle -= 2 * Math.PI;
    return angle;
};

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
const getVisionPolygon = (origin: Point, segments: Segment[], canvasSize: { width: number, height: number }): Point[] => {
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

// FIX: Moved weaponShakeFunctions outside the component to be accessible by network event handlers.
const weaponShakeFunctions: { [key: string]: (shaker: any, scale: number, ux: number, uy: number) => void } = {
    'Pistol': (shaker, scale, ux, uy) => {
        shaker.addImpulse({ amp: 8 * scale, rotAmp: 0.020, freq: 70, decay: 22, dirx: -ux, diry: -uy });
        shaker.addImpulse({ amp: 3 * scale, rotAmp: 0.010, freq: 120, decay: 28, dirx: -ux * 0.2, diry: -uy * 0.2 });
    },
    'Heavy Pistol': (shaker, scale, ux, uy) => {
        shaker.addImpulse({ amp: 12 * scale, rotAmp: 0.025, freq: 60, decay: 23, dirx: -ux, diry: -uy });
        shaker.addImpulse({ amp: 5 * scale, rotAmp: 0.012, freq: 110, decay: 29, dirx: -ux * 0.2, diry: -uy * 0.2 });
    }
};

export default function GameCanvas({
    level,
    loadout,
    operator,
    onMissionEnd,
    showSoundWaves,
    agentSkinColor,
    customControls,
    aimSensitivity,
    onAimSensitivityChange,
    onCustomControlsChange,
    defaultControlsLayout,
    difficulty,
    isMultiplayer,
    networkClient,
    onScoreChange,
    initialRunScore,
    totalScore,
    highScore
}: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const scaleRef = useRef(1);
    const [cameraScale, setCameraScale] = useState(1);
    const cameraScaleRef = useRef(1);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const gameRoomRef = useRef<any>(null);
    const remotePlayersMapRef = useRef<Map<string, RemotePlayer>>(new Map());
    const playerRef = useRef<Player>({
        x: 0, y: 0, radius: 12, speed: 150,
        health: 100, maxHealth: 100, hitTimer: 0,
        weapons: [], currentWeaponIndex: 0, shootCooldown: 0,
        isReloading: false, reloadTimer: 0,
        throwables: {}, throwableTypes: [], currentThrowableIndex: 0,
        flashTimer: 0, medkits: 0, isHealing: false, healTimer: 0
    });
    const playerDirectionRef = useRef(0);
    const lastTimeRef = useRef(0);
    const [isPortrait, setIsPortrait] = useState(false);

    // 绘制远程玩家
    const drawRemotePlayers = useCallback((ctx: CanvasRenderingContext2D, scale: number, cameraScale: number) => {
        if (!isMultiplayer) return;

        const now = performance.now();
        const players = Array.from(remotePlayersMapRef.current.values()).filter(p => now - p.lastUpdateTime < 5000); // 只显示最近5秒内有更新的玩家

        players.forEach(player => {
            const { targetX: x, targetY: y, health, maxHealth, team, isReady, id } = player;

            // 绘制玩家身体
            ctx.fillStyle = team === 'red' ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 100, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x * scale, y * scale, 10 * scale * cameraScale, 0, Math.PI * 2);
            ctx.fill();

            // 绘制玩家轮廓
            ctx.strokeStyle = team === 'red' ? 'rgba(255, 50, 50, 0.9)' : 'rgba(50, 50, 255, 0.9)';
            ctx.lineWidth = 2 * scale * cameraScale;
            ctx.stroke();

            // 绘制血条
            const healthPercent = health / maxHealth;
            const barWidth = 20 * scale * cameraScale;
            const barHeight = 3 * scale * cameraScale;
            const barX = x * scale - barWidth / 2;
            const barY = y * scale - 15 * scale * cameraScale;

            // 背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // 血量
            ctx.fillStyle = healthPercent > 0.7 ? 'rgba(100, 255, 100, 0.9)' :
                healthPercent > 0.3 ? 'rgba(255, 255, 100, 0.9)' :
                    'rgba(255, 100, 100, 0.9)';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            // 绘制准备状态
            if (isReady) {
                ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
                ctx.beginPath();
                ctx.arc(x * scale, y * scale - 25 * scale * cameraScale, 3 * scale * cameraScale, 0, Math.PI * 2);
                ctx.fill();
            }

            // 绘制玩家ID
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = `${10 * scale * cameraScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText((id || '').substring(0, 8), x * scale, y * scale + 20 * scale * cameraScale);
        });
    }, [isMultiplayer]);

    // 绘制团队信息
    const drawTeamInfo = useCallback((ctx: CanvasRenderingContext2D, scale: number, cameraScale: number) => {
        if (!isMultiplayer || !gameRoomRef.current) return;

        const room = gameRoomRef.current;
        const redPlayers = Object.values(room.players).filter((p: any) => p.team === 'red');
        const bluePlayers = Object.values(room.players).filter((p: any) => p.team === 'blue');

        const panelWidth = 200 * scale * cameraScale;
        const panelHeight = 100 * scale * cameraScale;
        const panelX = 10 * scale * cameraScale;
        const panelY = 10 * scale * cameraScale;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // 边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2 * scale * cameraScale;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // 团队信息
        ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.font = `${12 * scale * cameraScale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`红队: ${redPlayers.length} 玩家`, panelX + 10 * scale * cameraScale, panelY + 20 * scale * cameraScale);

        ctx.fillStyle = 'rgba(100, 100, 255, 0.9)';
        ctx.fillText(`蓝队: ${bluePlayers.length} 玩家`, panelX + 10 * scale * cameraScale, panelY + 40 * scale * cameraScale);

        // 房间状态
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`房间: ${room.name || '未命名'}`, panelX + 10 * scale * cameraScale, panelY + 60 * scale * cameraScale);
        ctx.fillText(`状态: ${room.status}`, panelX + 10 * scale * cameraScale, panelY + 80 * scale * cameraScale);
    }, [isMultiplayer]);
    const [runScore, setRunScore] = useState<number>(initialRunScore || 0);
    const runScoreRef = useRef<number>(initialRunScore || 0);

    // Round currency (1 score = 2 money)
    const [roundMoney, setRoundMoney] = useState<number>(Math.floor((initialRunScore || 0) * 2));
    const roundMoneyRef = useRef<number>(Math.floor((initialRunScore || 0) * 2));

    // Weapon drops on the ground (manual pickup)
    const weaponDropsRef = useRef<WeaponDrop[]>([]);

    // Round and shop state
    const [isRoundActive, setIsRoundActive] = useState<boolean>(false);
    const isRoundActiveRef = useRef<boolean>(false);
    const [showShop, setShowShop] = useState<boolean>(false);

    const createWeaponFromDef = (weaponName: string): Weapon | null => {
        const def = WEAPONS[weaponName];
        if (!def) return null;
        const scale = scaleRef.current;
        const cameraScale = cameraScaleRef.current || 1;
        const w: any = { ...def };
        w.bulletSpeed = def.bulletSpeed * scale / cameraScale;
        w.bulletRadius = def.bulletRadius * scale / cameraScale;
        w.ammoInMag = def.magSize;
        w.reserveAmmo = def.reserveAmmo;
        w.allowedFireModes = [...def.allowedFireModes];
        w.currentFireMode = def.defaultFireMode;
        w.shake = (ux: number, uy: number) => { };
        return w as Weapon;
    };

    // Create a full Weapon instance applying attachments (attachments: { slotName: attachmentName })
    const createWeaponWithAttachments = (weaponName: string, attachments: { [slot: string]: string }): Weapon | null => {
        const def = WEAPONS[weaponName];
        if (!def) return null;
        const scale = scaleRef.current;
        const cameraScale = cameraScaleRef.current || 1;
        const w: any = { ...def };
        w.bulletSpeed = def.bulletSpeed * scale / cameraScale;
        w.bulletRadius = def.bulletRadius * scale / cameraScale;
        w.ammoInMag = def.magSize;
        w.reserveAmmo = def.reserveAmmo;
        w.allowedFireModes = [...def.allowedFireModes];
        w.currentFireMode = def.defaultFireMode;
        w.shake = (ux: number, uy: number) => { };

        // Apply attachment modifiers if definitions exist
        if (def.attachmentSlots && attachments) {
            for (const slotName in attachments) {
                const attName = attachments[slotName];
                if (!attName) continue;
                const slotList = def.attachmentSlots[slotName];
                if (!slotList) continue;
                const att = slotList.find(a => a.name === attName);
                if (!att) continue;
                const mod = att.modifiers;
                if (mod.damage) w.damage = (w.damage || def.damage) * mod.damage;
                if (mod.soundRadius) w.soundRadius = (w.soundRadius || def.soundRadius) * mod.soundRadius;
                if (mod.fireRate) w.fireRate = (w.fireRate || def.fireRate) * mod.fireRate;
                if (mod.reloadTime) w.reloadTime = (w.reloadTime || def.reloadTime) * mod.reloadTime;
                if (mod.bulletRadius) w.bulletRadius = (w.bulletRadius || def.bulletRadius) + mod.bulletRadius * scale / cameraScale;
                if (mod.pellets) w.pellets = (w.pellets || def.pellets) + mod.pellets;
                if (mod.magSize) {
                    w.magSize = Math.round((w.magSize || def.magSize) * mod.magSize);
                    w.ammoInMag = w.magSize;
                }
                if (mod.spread) w.spread = (w.spread || def.spread) * mod.spread;
                if (mod.addFireModes) {
                    mod.addFireModes.forEach((m: any) => { if (!w.allowedFireModes.includes(m)) w.allowedFireModes.push(m); });
                }
                if (mod.specialEffect) w.specialEffect = mod.specialEffect;
            }
        }
        return w as Weapon;
    };

    // Shop state includes a 15s pre-round customization window
    const [shopTimer, setShopTimer] = useState<number | null>(null);
    const selectedAttachmentsRef = useRef<{ [weaponName: string]: { [slot: string]: string } }>({});
    const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
    const openShopForRound = () => {
        setShowShop(true);
        // Start a 15s timer to auto-close shop
        setShopTimer(15);
    };

    const startRound = () => {
        setIsRoundActive(true);
        isRoundActiveRef.current = true;
        setShowShop(false);
        setShopTimer(null);
    };

    // Shop timer countdown effect
    useEffect(() => {
        if (shopTimer == null) return;
        if (shopTimer <= 0) {
            startRound();
            return;
        }
        const id = setInterval(() => {
            setShopTimer(t => (t !== null ? t - 1 : null));
        }, 1000);
        return () => clearInterval(id);
    }, [shopTimer]);

    const buyWeapon = (weaponName: string, targetSlot: 'primary' | 'secondary' | 'melee' | 'special' | 'auto' = 'auto') => {
        const def = WEAPONS[weaponName];
        if (!def) return;
        const cost = (def as any).cost || 0;
        if (roundMoneyRef.current < cost) return; // not enough
        const player = playerRef.current;
        // Deduct money
        const nextMoney = roundMoneyRef.current - cost;
        roundMoneyRef.current = nextMoney;
        setRoundMoney(nextMoney);
        // Decide which slot to put the purchased weapon into based on weapon.category or explicit targetSlot
        let slotIndex = player.currentWeaponIndex;
        if (targetSlot !== 'auto') {
            if (targetSlot === 'primary') slotIndex = 0;
            else if (targetSlot === 'secondary') slotIndex = 1;
            else if (targetSlot === 'melee') slotIndex = 2;
            else if (targetSlot === 'special') slotIndex = 3;
        } else {
            switch (def.category) {
                case 'primary': slotIndex = 0; break;
                case 'secondary': slotIndex = 1; break;
                case 'melee': slotIndex = 2; break;
                case 'special': slotIndex = 3; break;
                default: slotIndex = player.currentWeaponIndex; break;
            }
        }
        // Create weapon instance with attachments applied if present
        const attachments = selectedAttachmentsRef.current[weaponName] || {};
        const inst = createWeaponWithAttachments(weaponName, attachments) || createWeaponFromDef(weaponName);
        if (inst) {
            player.weapons[slotIndex] = inst;
        }
        // Broadcast buy
        try { networkClient && (networkClient as any).send('buy-weapon', { playerId: networkClient.ownId, weaponName, cost, attachments }); } catch { }
    };

    // Helper to increment score and notify parent (applies difficulty multiplier)
    const addScore = (amount: number) => {
        const mult = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;
        const applied = Math.round(amount * mult);

        console.log(`[addScore] amount=${amount}, mult=${mult}, applied=${applied}, isTrainingGround=${level.isTrainingGround}`);

        // Update runScore state and ref so canvas draw can read the latest value synchronously
        const prev = runScoreRef.current;
        const next = prev + applied;
        console.log(`[addScore] prev=${prev}, next=${next}`);
        runScoreRef.current = next;
        try { setRunScore(next); } catch { }
        try { console.log('[addScore] runScoreRef now=', runScoreRef.current); } catch { }

        // Only notify parent (for accumulation) if not training ground
        if (!level.isTrainingGround) {
            console.log(`[addScore] Notifying parent with score: ${next}`);
            try { if (onScoreChange) onScoreChange(next); } catch { }
        } else {
            console.log(`[addScore] Training ground - not notifying parent`);
        }
    };
    const previousWeaponIndexRef = useRef<number>(0);
    // Remote players map: playerId -> RemotePlayer data

    const playerMoveSoundTimerRef = useRef<number>(0);
    const keysPressedRef = useRef<Set<string>>(new Set());
    const wallsRef = useRef<Array<Wall>>([]);
    const doorsRef = useRef<Array<Door>>([]);
    const wallSegmentsRef = useRef<Array<Segment>>([]); // Static wall segments for raycasting
    const mousePosRef = useRef({ x: 0, y: 0 }); // World coordinates
    const mouseScreenPosRef = useRef({ x: 0, y: 0 }); // Screen coordinates
    const bulletsRef = useRef<Array<Bullet>>([]);
    const enemiesRef = useRef<Array<Enemy>>([]);
    const initialEnemyCountRef = useRef<number>(0);
    const initialDummyEnemiesRef = useRef<Array<Enemy>>([]);
    const respawningDummiesRef = useRef<Array<{ enemy: Enemy; respawnTimer: number }>>([]);
    const missionTimeRef = useRef<number>(0);
    const enemyRangeDisplayTimerRef = useRef<number>(0);
    const lightsRef = useRef<Array<Light>>([]);
    const sparksRef = useRef<Array<Spark>>([]);
    const throwablesRef = useRef<Array<Throwable>>([]);
    const explosionsRef = useRef<Array<Explosion>>([]);
    const smokeCloudsRef = useRef<Array<SmokeCloud>>([]);
    const firePatchesRef = useRef<Array<FirePatch>>([]);
    const shockwavesRef = useRef<Array<Shockwave>>([]);
    const hitEffectsRef = useRef<Array<HitEffect>>([]);
    const isGameOverRef = useRef<boolean>(false);
    const isMissionCompleteRef = useRef<boolean>(false);
    const missionEndTimeRef = useRef<number | null>(null);
    const endAutoCloseTimerRef = useRef<number | null>(null);
    const interactingDoorIdRef = useRef<number | null>(null);
    const interactionHintDoorIdRef = useRef<number | null>(null);
    const lockedDoorHintIdRef = useRef<number | null>(null);
    const lastEKeyPressTimeRef = useRef<number>(0);
    const lastInteractedDoorIdRef = useRef<number | null>(null);
    const isShootingRef = useRef<boolean>(false); // For mouse input ONLY
    const isAimingThrowableRef = useRef<boolean>(false);
    const cookingThrowableRef = useRef<{ type: ThrowableType; timer: number; maxTimer: number; } | null>(null);
    let nextThrowableId = 0;
    const isThrowableModeRef = useRef<boolean>(false);
    // Kunai charging refs
    const isChargingKunaiRef = useRef<boolean>(false);
    const kunaiChargeStartRef = useRef<number>(0);
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
        addImpulse({ amp = 6, rotAmp = 0.015, freq = 60, decay = 16, dirx = 0, diry = 0 }) {
            const n = Math.hypot(dirx, diry) || 1; this.waves.push({ t: 0, amp, rotAmp, freq, decay, dirx: dirx / n, diry: diry / n, phase: Math.random() * Math.PI * 2 });
        },
        sample(dt: number) {
            let ox = 0, oy = 0, rot = 0; const TWO_PI = Math.PI * 2;
            for (let i = this.waves.length - 1; i >= 0; i--) {
                const w = this.waves[i]; w.t += dt; const env = Math.exp(-w.decay * w.t); if (env < 0.015) { this.waves.splice(i, 1); continue; }
                const s = Math.sin(w.phase + TWO_PI * w.freq * w.t);
                ox += w.dirx * w.amp * env * s;
                oy += w.diry * w.amp * env * s;
                rot += w.rotAmp * env * s;
            }
            return { ox, oy, rot };
        }
    });
    const hasUsedTouchRef = useRef<boolean>(false);
    const burstStateRef = useRef({ active: false, shotsLeft: 0 });
    const hasFiredSemiThisPressRef = useRef(false);
    const hasStartedBurstThisPressRef = useRef(false);
    const stuckKunaisRef = useRef<Array<StuckKunai>>([]);

    const [isPaused, setIsPaused] = useState(false);
    const [showInGameSettings, setShowInGameSettings] = useState(false);
    const [isCustomizingInGame, setIsCustomizingInGame] = useState(false);
    const isPausedRef = useRef(isPaused);
    useEffect(() => { isPausedRef.current = isPaused }, [isPaused]);

    const touchStateRef = useRef({
        joystick: { id: null as number | null, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 },
        aim: { id: null as number | null, lastX: 0, lastY: 0 },
        fire: { id: null as number | null, lastX: 0, lastY: 0 },
        fixedFire: { id: null as number | null },
        reload: { id: null as number | null },
        interact: { id: null as number | null },
        switchWeapon: { id: null as number | null },
        melee: { id: null as number | null },
        throwableSelect: { id: null as number | null, startX: 0, startY: 0, currentX: 0, currentY: 0 }, // 新增投掷滑动起点和当前位置
        switchThrowable: { id: null as number | null },
        fireModeSwitch: { id: null as number | null },
        heal: { id: null as number | null },
        special: { id: null as number | null },
    });
    const touchButtonRectsRef = useRef<{ [key: string]: { x: number; y: number; r: number } }>({});
    const pauseButtonCircleRef = useRef({ x: 0, y: 0, r: 0 });

    // FIX: Moved door interaction functions into component scope to be accessible by multiple effects.
    const startDoorInteraction = useCallback(() => {
        const doorToInteract = doorsRef.current.find(d => d.id === interactionHintDoorIdRef.current);
        if (!doorToInteract || doorToInteract.locked || playerRef.current.isHealing) return;

        interactingDoorIdRef.current = doorToInteract.id;
        doorToInteract.isPlayerHolding = true;
        doorToInteract.targetAngle = null;

        const relX = playerRef.current.x - doorToInteract.hinge.x;
        const relY = playerRef.current.y - doorToInteract.hinge.y;
        const doorHingeVectorX = Math.cos(doorToInteract.closedAngle - Math.PI / 2);
        const doorHingeVectorY = Math.sin(doorToInteract.closedAngle - Math.PI / 2);
        const crossProduct = doorHingeVectorX * relY - doorHingeVectorY * relX;

        const pushDirection = (crossProduct * doorToInteract.swingDirection > 0) ? 1 : -1;

        doorToInteract.angularVelocity = 1.8 * pushDirection;
    }, []);

    const stopDoorInteraction = useCallback(() => {
        if (interactingDoorIdRef.current !== null) {
            const door = doorsRef.current.find(d => d.id === interactingDoorIdRef.current);
            if (door) {
                door.isPlayerHolding = false;
                door.angularVelocity = 0;
            }
            interactingDoorIdRef.current = null;
        }
    }, []);

    // Circle-Rectangle collision detection helper function
    const checkCollision = (circle: { x: number, y: number, radius: number }, rect: { x: number, y: number, width: number, height: number }) => {
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
    const checkCollisionWithDoor = (circle: { x: number, y: number, radius: number }, door: Door) => {
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
        if (isGameOverRef.current || player.shootCooldown > 0 || player.isReloading || isThrowableModeRef.current || player.isHealing) return;

        const currentWeapon = player.weapons[player.currentWeaponIndex];
        if (currentWeapon.category === 'melee') return; // Melee has its own function
        // If no ammo, block firing (except in TRAINING GROUND)
        if (currentWeapon.ammoInMag === 0 && level.name !== 'TRAINING GROUND') {
            return;
        }

        // Consume ammo when appropriate (magSize === -1 means infinite)
        if (currentWeapon.magSize !== -1 && level.name !== 'TRAINING GROUND') {
            currentWeapon.ammoInMag--;
            if (currentWeapon.ammoInMag < 0) currentWeapon.ammoInMag = 0;
        }

        const baseAngle = playerDirectionRef.current;

        if (isMultiplayer && networkClient) {
            (networkClient as any).send('fire-weapon', {
                ownerId: networkClient.ownId,
                weaponName: currentWeapon.name,
                baseAngle: baseAngle,
            });
        }

        createFireEffects(player.x, player.y, player.radius, baseAngle, currentWeapon, 'player', dynamicSegments);

        player.shootCooldown = currentWeapon.fireRate;
    };
    const createFireEffects = (ownerX: number, ownerY: number, ownerRadius: number, baseAngle: number, weapon: Weapon, ownerType: 'player' | 'enemy', dynamicSegments: Segment[]) => {
        const ux = Math.cos(baseAngle), uy = Math.sin(baseAngle);
        weapon.shake(ux, uy);
        const muzzleFlashOffset = ownerRadius + (2 * scaleRef.current);
        const muzzleX = ownerX + ux * muzzleFlashOffset;
        const muzzleY = ownerY + uy * muzzleFlashOffset;

        const impact = (x: number, y: number) => {
            const shaker = shakerRef.current;
            const dx = playerRef.current.x - x, dy = playerRef.current.y - y; const dist = Math.hypot(dx, dy) || 1; const k = Math.max(0, 1 - dist / (900 * scaleRef.current));
            if (k > 0) { shaker.addImpulse({ amp: 7 * k, rotAmp: 0.012 * k, freq: 55 + 40 * Math.random(), decay: 18 + 6 * Math.random(), dirx: dx / dist, diry: dy / dist }); }
        };

        if (weapon.type === 'hitscan') {
            for (let i = 0; i < weapon.pellets; i++) {
                const spreadAmount = (weapon.pellets > 1) ? (Math.random() - 0.5) * weapon.spread : 0;
                const finalAngle = baseAngle + spreadAmount;
                const finalUx = Math.cos(finalAngle), finalUy = Math.sin(finalAngle);

                let nearestWallT = 9999;
                for (const s of dynamicSegments) {
                    const hit = intersectRaySegment(ownerX, ownerY, finalUx, finalUy, s);
                    if (hit && hit.t < nearestWallT) nearestWallT = hit.t;
                }

                let hitEnemy = null, nearestEnemyT = nearestWallT;
                if (ownerType === 'player') {
                    for (const enemy of enemiesRef.current) {
                        if (enemy.health <= 0) continue;
                        const dx = enemy.x - ownerX, dy = enemy.y - ownerY;
                        const t = dx * finalUx + dy * finalUy;
                        if (t > 0 && t < nearestEnemyT) {
                            const ex = ownerX + t * finalUx;
                            const ey = ownerY + t * finalUy;
                            const distToRay = Math.hypot(ex - enemy.x, ey - enemy.y);
                            if (distToRay < enemy.radius) {
                                hitEnemy = enemy;
                                nearestEnemyT = t;
                            }
                        }
                    }
                }

                const hitDist = nearestEnemyT;
                const hitX = ownerX + finalUx * hitDist;
                const hitY = ownerY + finalUy * hitDist;

                tracersRef.current.push({ x1: muzzleX, y1: muzzleY, x2: hitX, y2: hitY, ttl: 0.07, life: 0.07 });

                if (hitEnemy) {
                    const healthBefore = hitEnemy.health;
                    hitEnemy.health -= weapon.damage;
                    if (hitEnemy.health <= 0 && healthBefore > 0) {
                        hitEffectsRef.current.push({ x: hitEnemy.x, y: hitEnemy.y, radius: 0, maxRadius: 40 * scaleRef.current, lifetime: 0.33, maxLifetime: 0.33 });
                        try { addScore(SCORE_PER_KILL); } catch { }
                        try {
                            const dropCandidates = Object.keys(WEAPONS);
                            const pick = dropCandidates[Math.floor(Math.random() * dropCandidates.length)];
                            const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: pick, x: hitEnemy.x, y: hitEnemy.y };
                            weaponDropsRef.current.push(drop);
                            try { networkClient && (networkClient as any).send('drop-weapon', { id: drop.id, playerId: networkClient.ownId, weaponName: pick, x: drop.x, y: drop.y }); } catch { }
                        } catch (e) { }
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
                // Check remote players in multiplayer for hitscan weapons (send player-hit instead of applying local damage)
                if (ownerType === 'player' && isMultiplayer && networkClient) {
                    for (const rpRaw of Array.from(remotePlayersMapRef.current.values())) {
                        const rp = rpRaw as RemotePlayer;
                        try {
                            const dx = rp.x - ownerX, dy = rp.y - ownerY;
                            const t = dx * finalUx + dy * finalUy;
                            if (t > 0 && t < nearestEnemyT) {
                                const ex = ownerX + t * finalUx;
                                const ey = ownerY + t * finalUy;
                                const distToRay = Math.hypot(ex - rp.x, ey - rp.y);
                                if (distToRay < playerRef.current.radius) {
                                    // Hit remote player: request server/remote to apply damage
                                    try {
                                        console.debug('[Net] send player-hit', { targetId: rp.id, damage: weapon.damage, attackerId: networkClient.ownId });
                                        (networkClient as any).send('player-hit', { targetId: rp.id, damage: weapon.damage, attackerId: networkClient.ownId, impact: { x: ex, y: ey }, sourceDir: { x: finalUx, y: finalUy } });
                                    } catch (e) { }
                                    tracersRef.current.push({ x1: muzzleX, y1: muzzleY, x2: ex, y2: ey, ttl: 0.07, life: 0.07 });
                                    impact(ex, ey);
                                    break;
                                }
                            }
                        } catch (e) { }
                    }
                }
            }
        } else { // Projectile
            if (weapon.pellets > 1) { // Shotgun logic
                const pelletSpread = weapon.pelletSpread || weapon.spread;
                for (let i = 0; i < weapon.pellets; i++) {
                    const jitter = (Math.random() - 0.5) * pelletSpread + (Math.random() - 0.5) * weapon.spread;
                    const finalAngle = baseAngle + jitter;
                    const speed = weapon.bulletSpeed * (0.92 + Math.random() * 0.16);
                    bulletsRef.current.push({
                        x: muzzleX,
                        y: muzzleY,
                        dx: Math.cos(finalAngle),
                        dy: Math.sin(finalAngle),
                        radius: weapon.bulletRadius,
                        speed: speed,
                        damage: weapon.damage,
                        owner: ownerType,
                        isIncendiary: weapon.specialEffect === 'burn',
                        weaponName: weapon.name,
                    });
                }
            } else { // Single projectile logic (e.g., Pistol)
                const spreadAmount = (Math.random() - 0.5) * weapon.spread;
                const finalAngle = baseAngle + spreadAmount;
                bulletsRef.current.push({
                    x: muzzleX,
                    y: muzzleY,
                    dx: Math.cos(finalAngle),
                    dy: Math.sin(finalAngle),
                    radius: weapon.bulletRadius,
                    damage: weapon.damage,
                    owner: ownerType,
                    isIncendiary: weapon.specialEffect === 'burn',
                    weaponName: weapon.name,
                    // Kunai specific initializers
                    homingTarget: null,
                    hasHomed: false,
                    isKunai: weapon.name === 'Explosive Kunai',
                    originX: muzzleX,
                    originY: muzzleY,
                    maxTravelDistance: KUNAI_NORMAL_DISTANCE_M * METERS_TO_PIXELS,
                    speed: (weapon.name === 'Explosive Kunai') ? (KUNAI_NORMAL_SPEED_MPS * METERS_TO_PIXELS) : weapon.bulletSpeed,
                });
            }
        }

        const scale = scaleRef.current;
        const cameraScale = cameraScaleRef.current;
        soundWavesRef.current.push({ x: ownerX, y: ownerY, radius: 0, maxRadius: weapon.soundRadius * scale / cameraScale, lifetime: 0.5, maxLifetime: 0.5, type: 'player_shoot' });

        lightsRef.current.push({ x: muzzleX, y: muzzleY, ttl: 0.08, life: 0.08, power: 1.0 + weapon.pellets * 0.1, type: 'muzzle', openWindow: true });
    }

    const startSlash = () => {
        const slash = slashStateRef.current;
        const player = playerRef.current;
        if (slash.active || player.shootCooldown > 0 || player.isHealing) return;
        const scale = scaleRef.current;
        const cameraScale = cameraScaleRef.current;
        const ang = playerDirectionRef.current;
        const sweep = 120 * Math.PI / 180;
        soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 80 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2, type: 'slash' });

        slash.startA = ang - sweep * 0.5;
        slash.endA = ang + sweep * 0.5;
        slash.curA = slash.prevA = slash.startA;
        slash.t = 0;
        slash.active = true;
        shakerRef.current.addImpulse({ amp: 4, rotAmp: 0.01, freq: 80, decay: 20, dirx: Math.cos(ang + Math.PI), diry: Math.sin(ang + Math.PI) });
    };

    const meleeAttack = () => {
        const player = playerRef.current;
        if (isGameOverRef.current || player.shootCooldown > 0 || player.isReloading || player.isHealing) return;

        const currentMelee = player.weapons[player.currentWeaponIndex];
        if (currentMelee.category !== 'melee') return;

        if (currentMelee.name === 'Riot Shield') {
            if (!currentMelee.durability || currentMelee.durability <= 0) return; // Can't bash with broken shield

            const scale = scaleRef.current;
            const cameraScale = cameraScaleRef.current;
            const bashRange = 60 * scale / cameraScale;
            const playerDirection = playerDirectionRef.current;
            const ux = Math.cos(playerDirection);
            const uy = Math.sin(playerDirection);

            for (const enemy of enemiesRef.current) {
                if (enemy.health <= 0) continue;
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.hypot(dx, dy);

                if (dist < bashRange + enemy.radius) {
                    const angleToEnemy = Math.atan2(dy, dx);
                    let angleDiff = Math.abs(normalizeAngle(angleToEnemy - playerDirection));
                    if (angleDiff < Math.PI / 4) { // 45 degree cone
                        const healthBefore = enemy.health;
                        enemy.health -= currentMelee.damage;
                        enemy.stunTimer = Math.max(enemy.stunTimer || 0, 1.5);
                        if (enemy.health <= 0 && healthBefore > 0) {
                            hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                            try { addScore(SCORE_PER_KILL); } catch { }
                            try {
                                const pickList = Object.keys(WEAPONS);
                                const pick = pickList[Math.floor(Math.random() * pickList.length)];
                                const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: pick, x: enemy.x, y: enemy.y };
                                weaponDropsRef.current.push(drop);
                                try { networkClient && networkClient.send('drop-weapon', { id: drop.id, playerId: networkClient.ownId, weaponName: pick, x: drop.x, y: drop.y }); } catch { }
                            } catch (e) { }
                        }
                    }
                }
            }
            shockwavesRef.current.push({ x: player.x + ux * 30, y: player.y + uy * 30, radius: 0, maxRadius: 50 * scale, lifetime: 0.2, maxLifetime: 0.2 });
            soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 100 * scale / cameraScaleRef.current, lifetime: 0.2, maxLifetime: 0.2, type: 'slash' });
        } else { // Combat Knife
            startSlash();
        }
        player.shootCooldown = currentMelee.fireRate;
    };

    const applyDamageToPlayer = (damage: number, sourceDirection: { x: number, y: number }, impactPoint: { x: number, y: number }) => {
        const player = playerRef.current;
        if (isGameOverRef.current) return;

        let damageToApply = damage;
        const shield = player.weapons.find(w => w.name === 'Riot Shield' && w.durability && w.durability > 0);

        if (shield) {
            const angleToDamageSource = Math.atan2(sourceDirection.y, sourceDirection.x);
            const angleDiff = Math.abs(normalizeAngle(angleToDamageSource - playerDirectionRef.current));
            const isEquipped = player.weapons[player.currentWeaponIndex] === shield;

            if (isEquipped && angleDiff > Math.PI / 2) { // Frontal block
                shield.durability! -= damageToApply;
                damageToApply = 0;
                // Play shield hit sparks
                const sparkCount = 4 + Math.floor(Math.random() * 3);
                for (let j = 0; j < sparkCount; j++) {
                    const sparkAngle = angleToDamageSource + Math.PI + (Math.random() - 0.5) * 0.8; // Sparks fly back
                    const speed = (180 + Math.random() * 240);
                    sparksRef.current.push({ x: impactPoint.x, y: impactPoint.y, vx: Math.cos(sparkAngle) * speed, vy: Math.sin(sparkAngle) * speed, ttl: 0.2, life: 0.2 });
                }
            } else if (!isEquipped && angleDiff > Math.PI * 0.75) { // Back protection
                shield.durability! -= damage * 0.8;
                damageToApply *= 0.2;
            }
        }

        if (damageToApply > 0) {
            player.health -= damageToApply;
            player.hitTimer = 0.17;
        }

        if (player.health <= 0) {
            player.health = 0;
            isGameOverRef.current = true;
        }
    };


    const throwThrowable = (customLaunchPower?: number) => {
        const player = playerRef.current;
        if (player.isHealing) return;
        const cookState = cookingThrowableRef.current;
        if (!cookState) return;

        const throwableType = cookState.type;
        if ((player.throwables[throwableType] ?? 0) <= 0 && level.name !== 'TRAINING GROUND') {
            return;
        }
        if (level.name !== 'TRAINING GROUND') {
            player.throwables[throwableType]! -= 1;
        }

        const scale = scaleRef.current;
        let angle: number;
        let launchPower: number;

        if (hasUsedTouchRef.current) {
            // For touch controls, throw in the direction the player is facing with a fixed power.
            angle = playerDirectionRef.current;
            launchPower = customLaunchPower !== undefined ? customLaunchPower : 12 * scale;
        } else {
            // For KBM, use mouse position to determine direction and power.
            const mouse = mousePosRef.current;
            const dx = mouse.x - player.x;
            const dy = mouse.y - player.y;
            const dist = Math.hypot(dx, dy);
            launchPower = Math.min(dist / (20 * scale), 15 * scale);
            angle = Math.atan2(dy, dx);
        }

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

    const switchThrowable = () => {
        const player = playerRef.current;
        if (player.throwableTypes.length <= 1) return;

        const availableCount = player.throwableTypes.filter(t => (player.throwables[t] ?? 0) > 0).length;
        if (availableCount <= 1 && level.name !== 'TRAINING GROUND') return;

        let nextIndex = (player.currentThrowableIndex + 1) % player.throwableTypes.length;

        if (level.name !== 'TRAINING GROUND') {
            let attempts = 0;
            while ((player.throwables[player.throwableTypes[nextIndex]] ?? 0) <= 0 && attempts < player.throwableTypes.length) {
                nextIndex = (nextIndex + 1) % player.throwableTypes.length;
                attempts++;
            }
        }

        player.currentThrowableIndex = nextIndex;
    };

    const switchFireMode = () => {
        const player = playerRef.current;
        if (isGameOverRef.current || player.isReloading || burstStateRef.current.active || player.isHealing) return;

        const weapon = player.weapons[player.currentWeaponIndex];
        if (weapon.allowedFireModes.length <= 1) return;

        const currentIndex = weapon.allowedFireModes.indexOf(weapon.currentFireMode);
        const nextIndex = (currentIndex + 1) % weapon.allowedFireModes.length;
        weapon.currentFireMode = weapon.allowedFireModes[nextIndex];

        hasFiredSemiThisPressRef.current = false;
    };

    const startHealing = () => {
        const player = playerRef.current;
        if (player.isHealing || player.medkits <= 0 || player.health >= player.maxHealth || player.isReloading) {
            return;
        }
        player.isHealing = true;
        player.healTimer = HEAL_DURATION;
        player.medkits--;
    };
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        cameraScaleRef.current = level.cameraScale || 1.0;

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
            const campingThreshold = player.radius + (door.thickness / 2) + (30 * scaleRef.current / cameraScaleRef.current);

            return distToDoor < campingThreshold;
        };

        const getLaserEndpoint = (playerDirection: number): Point => {
            const player = playerRef.current;
            const dynamicSegments: Segment[] = [...wallSegmentsRef.current];
            doorsRef.current.forEach(door => {
                const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
                const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
                dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
            });

            // The laser direction is now fixed to the player's forward direction
            const ux = Math.cos(playerDirection);
            const uy = Math.sin(playerDirection);

            // Raycast to a long distance
            let nearestT = Math.hypot(canvas.width, canvas.height);
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
            const cameraScale = level.cameraScale || 1.0;
            const wallThickness = 15 * scale / cameraScale;

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
                // Algorithmic length selection by aspect ratio:
                // - portrait (aspect ~< 1): use canvas.height as base
                // - square: interpolate between height and width
                // - wide desktop: smoothly bias toward canvas.width but cap to avoid excessive length
                const aspect = canvas.width / canvas.height;
                // map aspect 1.0..2.0 to t 0..1, clamp
                const tRaw = (aspect - 1.0) / (2.0 - 1.0);
                const t = Math.max(0, Math.min(1, tRaw));
                // smoothstep for nicer transition
                const smooth = t * t * (3 - 2 * t);
                const base = canvas.height + (canvas.width - canvas.height) * smooth; // lerp(height, width, smooth)

                // Scale down doors slightly to avoid visually oversized doors across modes.
                const DOOR_LENGTH_SCALE = 0.7; // Reduce by ~30% (adjustable)
                let lengthPixels = d.length * base * DOOR_LENGTH_SCALE;
                // Cap: do not exceed 65% of the longer canvas side
                const maxLen = Math.max(canvas.width, canvas.height) * 0.65;
                const minLen = Math.min(canvas.width, canvas.height) * 0.06; // ensure not vanishingly small
                lengthPixels = Math.max(minLen, Math.min(lengthPixels, maxLen));

                doorsRef.current.push({
                    ...d,
                    hinge: { x: d.hinge.x * canvas.width, y: d.hinge.y * canvas.height },
                    length: lengthPixels,
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
            if (isMultiplayer) {
                enemiesRef.current = [];
                initialEnemyCountRef.current = 0;
                return;
            }
            const scale = scaleRef.current;
            const cameraScale = level.cameraScale || 1.0;
            const viewDistance = canvas.width * 0.5;
            const enemySpeed = 120 * scale / cameraScale; // pixels/sec
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
            // Determine enemy count for this run. Support dynamic per-level ranges.
            let enemyCount = level.enemyCount || level.enemies.length;
            if ((level as any).enemyCountRange) {
                const range = (level as any).enemyCountRange as { min: number; max: number };
                const minC = Math.max(0, Math.floor(range.min));
                const maxC = Math.max(minC, Math.floor(range.max));
                const cappedMax = Math.min(maxC, level.enemies.length);
                // Random integer in [minC, cappedMax]
                enemyCount = Math.min(level.enemies.length, Math.floor(Math.random() * (cappedMax - minC + 1)) + minC);
                if (enemyCount < 0) enemyCount = 0;
            }
            const chosenSpawns = enemyPool.slice(0, enemyCount);
            initialEnemyCountRef.current = chosenSpawns.length;

            enemiesRef.current = chosenSpawns.map(e => {
                const startX = e.x * canvas.width;
                const startY = e.y * canvas.height;
                const enemyType = e.type || 'standard';
                const maxHealth = enemyType === 'advanced' ? 150 : 100;

                let finalEnemy: Enemy;

                const baseEnemy: Enemy = {
                    x: startX,
                    y: startY,
                    direction: e.direction,
                    radius: 12 * scale / cameraScale,
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
                    isDummy: e.isDummy || false,
                    patrolStartX: startX,
                    patrolStartY: startY,
                    patrolStartDirection: e.direction,
                    isInvestigating: false,
                    searchTimer: 0,
                    isReturningToPost: false,
                    moveSoundTimer: 0,
                    hasScored: false,
                };

                if (difficulty === 'normal') {
                    baseEnemy.fov = 160 * (Math.PI / 180);
                    baseEnemy.shootCooldownMax = 1.7; // Shoots slightly faster than simple's 2.0
                }

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
                    finalEnemy = {
                        ...baseEnemy,
                        rifleAmmo: 30,
                        isReloadingRifle: false,
                        reloadRifleTimer: 0,
                        burstCooldown: 0,
                        burstShotsFired: 0,
                        axeState: 'idle' as const,
                        axeTimer: 0,
                    };
                } else {
                    finalEnemy = baseEnemy;
                }

                if (finalEnemy.isDummy) {
                    initialDummyEnemiesRef.current.push(JSON.parse(JSON.stringify(finalEnemy)));
                }

                return finalEnemy;
            });
        };

        const initializePlayer = () => {
            if (!canvas) return;
            const scale = scaleRef.current;
            const cameraScale = level.cameraScale || 1.0;
            const player = playerRef.current;
            player.x = level.playerStart.x * canvas.width;
            player.y = level.playerStart.y * canvas.height;
            player.health = player.maxHealth;
            player.hitTimer = 0;
            player.radius = 10 * scale / cameraScale;
            player.speed = 240 * scale / cameraScale; // pixels/sec
            player.medkits = INITIAL_MEDKITS;
            player.isHealing = false;
            player.healTimer = 0;
            player.burnTimer = 0;
            player.burnDamage = 0;

            const shaker = shakerRef.current;

            const createWeaponInstance = (weaponName: string, attachments: { [slot: string]: string }): Weapon => {
                const def = WEAPONS[weaponName];
                if (!def) throw new Error(`Weapon definition not found for ${weaponName}`);

                const weapon: Weapon = {
                    ...def,
                    bulletSpeed: def.bulletSpeed * scale / cameraScale,
                    bulletRadius: def.bulletRadius * scale / cameraScale,
                    ammoInMag: def.magSize, // Start with a full mag
                    reserveAmmo: def.reserveAmmo,
                    shake: (ux: number, uy: number) => {
                        const shakeFunc = weaponShakeFunctions[def.name];
                        if (shakeFunc) {
                            shakeFunc(shakerRef.current, scale, ux, uy);
                        }
                    },
                    allowedFireModes: [...def.allowedFireModes],
                    currentFireMode: def.defaultFireMode,
                };

                if (def.durability) {
                    weapon.durability = def.durability;
                    weapon.maxDurability = def.durability;
                }

                // Apply attachment modifiers
                Object.values(attachments).forEach(attachmentName => {
                    if (!def.attachmentSlots) return;
                    for (const slotName in def.attachmentSlots) {
                        const attachment = def.attachmentSlots[slotName].find(a => a.name === attachmentName);
                        if (attachment) {
                            const mod = attachment.modifiers;
                            if (mod.damage) weapon.damage *= mod.damage;
                            if (mod.soundRadius) weapon.soundRadius *= mod.soundRadius;
                            if (mod.fireRate) weapon.fireRate *= mod.fireRate;
                            if (mod.reloadTime) weapon.reloadTime *= mod.reloadTime;
                            if (mod.bulletRadius) weapon.bulletRadius += mod.bulletRadius * scale / cameraScale;
                            if (mod.pellets) weapon.pellets += mod.pellets;
                            if (mod.magSize) {
                                weapon.magSize = Math.round(weapon.magSize * mod.magSize);
                                weapon.ammoInMag = weapon.magSize; // Refill mag when applying mod
                            }
                            if (mod.spread) weapon.spread *= mod.spread;
                            if (mod.addFireModes) {
                                mod.addFireModes.forEach(mode => {
                                    if (!weapon.allowedFireModes.includes(mode)) {
                                        weapon.allowedFireModes.push(mode);
                                    }
                                });
                            }
                            if (mod.specialEffect) {
                                weapon.specialEffect = mod.specialEffect;
                            }
                            break;
                        }
                    }
                });

                return weapon;
            }

            // For custom rooms/pvp prototype: start player with only a basic pistol (no attachments) in secondary slot
            // Use a simplified pistol-only loadout for multiplayer prototype, but keep full loadout for singleplayer
            try {
                if (isMultiplayer) {
                    const empty = { name: '__EMPTY__' } as unknown as Weapon;
                    const basicPistol = createWeaponInstance('Pistol', {});
                    player.weapons = [empty, basicPistol, createWeaponInstance(loadout.melee, {}), createWeaponInstance(loadout.special, loadout.specialAttachments)];
                    // Default to secondary (index 1) so player holds the pistol in multiplayer
                    player.currentWeaponIndex = 1;
                } else {
                    player.weapons = [
                        createWeaponInstance(loadout.primary, loadout.primaryAttachments),
                        createWeaponInstance(loadout.secondary, loadout.secondaryAttachments),
                        createWeaponInstance(loadout.melee, {}),
                        createWeaponInstance(loadout.special, loadout.specialAttachments)
                    ];
                    // Default to primary in singleplayer
                    player.currentWeaponIndex = 0;
                }
            } catch (e) {
                // fallback safe state
                try { player.weapons = [createWeaponInstance(loadout.primary, loadout.primaryAttachments)]; } catch { }
                player.currentWeaponIndex = 0;
            }
            previousWeaponIndexRef.current = 0;
            player.shootCooldown = 0;
            player.isReloading = false;
            player.reloadTimer = 0;
            player.throwables = { ...loadout.throwables };
            player.throwableTypes = Object.keys(loadout.throwables).filter(t => (loadout.throwables[t as ThrowableType] ?? 0) > 0) as ThrowableType[];
            player.currentThrowableIndex = 0;
            player.flashTimer = 0;
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
            initialDummyEnemiesRef.current = [];
            respawningDummiesRef.current = [];
            stuckKunaisRef.current = [];
            remotePlayersMapRef.current.clear();
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                scaleRef.current = canvas.height / BASE_LOGICAL_HEIGHT;
                mouseScreenPosRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
            }

            // Calculate touch button positions right after sizing the canvas
            const { width, height } = canvas;
            if (width > 0 && height > 0 && customControls) {
                const newRects: { [key: string]: { x: number; y: number; r: number } } = {};
                const baseRadius = (height * 0.06) * customControls.baseScale;
                for (const key in customControls.layout) {
                    const control = customControls.layout[key as keyof typeof customControls.layout];
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
            // Show enemy range on start for 4 seconds
            enemyRangeDisplayTimerRef.current = 4.0;
            initializePlayer();
            bulletsRef.current = [];
            keysPressedRef.current.clear();
            lightsRef.current = [];
            sparksRef.current = [];
            throwablesRef.current = [];
            explosionsRef.current = [];
            smokeCloudsRef.current = [];
            firePatchesRef.current = [];
            shockwavesRef.current = [];
            hitEffectsRef.current = [];
            isAimingThrowableRef.current = false;
            cookingThrowableRef.current = null;
            isThrowableModeRef.current = false;
            tracersRef.current = [];
            soundWavesRef.current = [];
            shakerRef.current.waves = [];
            const scale = scaleRef.current;
            const cameraScale = level.cameraScale || 1.0;
            slashStateRef.current.active = false;
            slashStateRef.current.cdLeft = 0;
            slashStateRef.current.range = 90 * scale / cameraScale;
            slashStateRef.current.inner = 15 * scale / cameraScale;
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
            if (isPausedRef.current) {
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            }
            const now = performance.now();
            const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
            lastTimeRef.current = now;

            const scale = scaleRef.current;
            const cameraScale = cameraScaleRef.current;
            const isEnded = isGameOverRef.current || isMissionCompleteRef.current;
            if (isEnded && missionEndTimeRef.current === null) {
                missionEndTimeRef.current = now;
                // Start auto-close timer (60s)
                if (!endAutoCloseTimerRef.current) {
                    endAutoCloseTimerRef.current = window.setTimeout(() => {
                        // Clear ref before calling
                        endAutoCloseTimerRef.current && clearTimeout(endAutoCloseTimerRef.current);
                        endAutoCloseTimerRef.current = null;
                        onMissionEnd();
                    }, 60000);
                }
            }
            if (!isEnded) {
                missionTimeRef.current += dt;
            }
            const visionRadius = Math.max(220, Math.min(520, Math.max(canvas.width, canvas.height) * 0.45)) * scale;

            const player = playerRef.current;
            const keys = keysPressedRef.current;
            const touchState = touchStateRef.current;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;


            // Calculate world coordinates of the mouse. This is always needed for aiming throwables.
            const mx_s = (mouseScreenPosRef.current.x - cx) / cameraScale;
            const my_s = (mouseScreenPosRef.current.y - cy) / cameraScale;

            const camAngle = hasUsedTouchRef.current ? playerDirectionRef.current + Math.PI / 2 : 0;
            const rot_inv = camAngle;
            const cos_rot_inv = Math.cos(rot_inv);
            const sin_rot_inv = Math.sin(rot_inv);
            const mx_w = mx_s * cos_rot_inv - my_s * sin_rot_inv;
            const my_w = mx_s * sin_rot_inv + my_s * cos_rot_inv;
            mousePosRef.current = {
                x: mx_w + player.x,
                y: my_w + player.y,
            };

            // --- Aiming and Direction Logic ---
            if (!isEnded && !hasUsedTouchRef.current) {
                // For KBM, player aims at the mouse cursor. Direction is calculated every frame.
                const dx_aim = mousePosRef.current.x - player.x;
                const dy_aim = mousePosRef.current.y - player.y;
                playerDirectionRef.current = Math.atan2(dy_aim, dx_aim);
            }
            const playerDirection = playerDirectionRef.current;


            const dynamicSegments = [...wallSegmentsRef.current];
            doorsRef.current.forEach(door => {
                const endX = door.hinge.x + door.length * Math.cos(door.currentAngle);
                const endY = door.hinge.y + door.length * Math.sin(door.currentAngle);
                dynamicSegments.push({ a: door.hinge, b: { x: endX, y: endY } });
            });

            const detonate = (n: Throwable) => {
                const scale = scaleRef.current;
                const cameraScale = cameraScaleRef.current;

                if (n.type === 'smoke') {
                    soundWavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: 150 * scale / cameraScale, lifetime: 0.3, maxLifetime: 0.3, type: 'door' });
                    smokeCloudsRef.current.push({
                        x: n.x, y: n.y,
                        radius: 0, maxRadius: 180 * scale / cameraScale,
                        lifetime: 15.0, maxLifetime: 15.0,
                    });
                    return;
                }

                if (n.type === 'molotov') {
                    soundWavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: 200 * scale / cameraScale, lifetime: 0.3, maxLifetime: 0.3, type: 'explosion' });
                    shockwavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: 80 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2 });
                    firePatchesRef.current.push({
                        x: n.x,
                        y: n.y,
                        radius: 0,
                        maxRadius: 120 * scale / cameraScale,
                        lifetime: 7.0, // burns for 7 seconds
                        maxLifetime: 7.0,
                        damagePerSecond: 35,
                    });
                    return;
                }

                const rad = (n.type === 'grenade' ? 230 : 280) * scale / cameraScale;

                shakerRef.current.addImpulse({ amp: (n.type === 'grenade' ? 18 : 12) * scale, rotAmp: 0.04, freq: 50, decay: 15, dirx: 0, diry: 0 });

                const lightTTL = n.type === 'grenade' ? 0.23 : 0.3; // seconds
                const lightPow = n.type === 'grenade' ? 2.0 : 3.5;
                lightsRef.current.push({ x: n.x, y: n.y, ttl: lightTTL, life: lightTTL, power: lightPow, type: n.type, openWindow: n.type === 'grenade' });

                shockwavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: rad, lifetime: 0.37, maxLifetime: 0.37 });
                explosionsRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: rad, lifetime: 0.5, maxLifetime: 0.5, type: n.type });

                const soundRadius = n.type === 'grenade' ? 800 : 600;
                soundWavesRef.current.push({ x: n.x, y: n.y, radius: 0, maxRadius: soundRadius * scale / cameraScale, lifetime: 0.67, maxLifetime: 0.67, type: 'explosion' });

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
                        if (isPlayer) {
                            const player = unit as Player;
                            if (isEnded) return;

                            let damageToApply = damage;
                            const shield = player.weapons.find(w => w.name === 'Riot Shield' && w.durability && w.durability > 0);
                            if (shield) {
                                const angleToExplosion = Math.atan2(n.y - player.y, n.x - player.x);
                                const angleDiff = Math.abs(normalizeAngle(angleToExplosion - playerDirectionRef.current));
                                const isEquipped = player.weapons[player.currentWeaponIndex] === shield;

                                if (isEquipped && angleDiff < Math.PI / 2) {
                                    shield.durability! -= damageToApply;
                                    damageToApply = 0;
                                } else if (!isEquipped && angleDiff > Math.PI * 0.75) { // Back protection
                                    shield.durability! -= damage * 0.8;
                                    damageToApply *= 0.2;
                                }
                            }

                            if (damageToApply > 0) {
                                player.health -= damageToApply;
                                player.hitTimer = 0.17;
                            }

                            const dx = player.x - n.x;
                            const dy = player.y - n.y;
                            const impactDist = Math.hypot(dx, dy) || 1;
                            shakerRef.current.addImpulse({
                                amp: 20 * scale * (1 - impactDist / rad),
                                rotAmp: 0.05 * (1 - impactDist / rad),
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
                                try { addScore(SCORE_PER_KILL); } catch { }
                            }
                        }
                    } else { // flashbang
                        if (isPlayer) {
                            const player = unit as Player;
                            const viewPoly = getVisionPolygon(player, dynamicSegments, { width: canvas.width, height: canvas.height });
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
                            const angleToFlash = Math.atan2(n.y - enemy.y, n.x - enemy.x);

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

            const createExplosion = (x: number, y: number, radius: number, maxDamage: number, dynamicSegments: Segment[]) => {
                const scale = scaleRef.current;
                const cameraScale = cameraScaleRef.current;

                shakerRef.current.addImpulse({ amp: 18 * scale, rotAmp: 0.04, freq: 50, decay: 15, dirx: 0, diry: 0 });

                lightsRef.current.push({ x, y, ttl: 0.23, life: 0.23, power: 2.0, type: 'grenade', openWindow: true });
                shockwavesRef.current.push({ x, y, radius: 0, maxRadius: radius, lifetime: 0.37, maxLifetime: 0.37 });
                explosionsRef.current.push({ x, y, radius: 0, maxRadius: radius, lifetime: 0.5, maxLifetime: 0.5, type: 'grenade' });
                soundWavesRef.current.push({ x, y, radius: 0, maxRadius: 800 * scale / cameraScale, lifetime: 0.67, maxLifetime: 0.67, type: 'explosion' });

                const affectUnit = (unit: Player | Enemy, isPlayer: boolean) => {
                    const dist = Math.hypot(unit.x - x, unit.y - y);
                    if (dist > radius) return;

                    let isObstructed = false;
                    for (const segment of dynamicSegments) {
                        if (intersectSegSeg(x, y, unit.x, unit.y, segment)) {
                            isObstructed = true;
                            break;
                        }
                    }
                    if (isObstructed) return;

                    const damage = (1 - (dist / radius)) * maxDamage;
                    if (isPlayer) {
                        const player = unit as Player;
                        if (isEnded) return;

                        let damageToApply = damage;
                        const shield = player.weapons.find(w => w.name === 'Riot Shield' && w.durability && w.durability > 0);
                        if (shield) {
                            const angleToExplosion = Math.atan2(y - player.y, x - player.x);
                            const angleDiff = Math.abs(normalizeAngle(angleToExplosion - playerDirectionRef.current));
                            const isEquipped = player.weapons[player.currentWeaponIndex] === shield;

                            if (isEquipped && angleDiff < Math.PI / 2) {
                                shield.durability! -= damageToApply;
                                damageToApply = 0;
                            } else if (!isEquipped && angleDiff > Math.PI * 0.75) {
                                shield.durability! -= damage * 0.8;
                                damageToApply *= 0.2;
                            }
                        }

                        if (damageToApply > 0) {
                            player.health -= damageToApply;
                            player.hitTimer = 0.17;
                        }

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
                for (const s of dynamicSegments) { const hit = intersectRaySegment(px, py, dx, dy, s); if (hit) best = Math.min(best, hit.t); }
                return best;
            }

            if (player.shootCooldown > 0) player.shootCooldown -= dt;
            if (player.flashTimer > 0) player.flashTimer -= dt;
            if (player.hitTimer > 0) player.hitTimer -= dt;
            if (player.burnTimer && player.burnTimer > 0) {
                const damageToApply = player.burnDamage! * dt;
                // Use a dummy direction for DoT, as it's not from a specific angle
                applyDamageToPlayer(damageToApply, { x: 0, y: 0 }, { x: player.x, y: player.y });
                player.burnTimer -= dt;
            }

            // --- Kunai Bleed DOT for enemies ---
            for (const enemy of enemiesRef.current) {
                if (enemy.health <= 0) continue;
                if (enemy.bleedTimer && enemy.bleedTimer > 0 && enemy.bleedLayers && enemy.bleedLayers > 0) {
                    const totalDPS = KUNAI_BLEED_DPS * enemy.bleedLayers; // DPS per second
                    const damageToApply = totalDPS * dt;
                    enemy.health -= damageToApply;
                    enemy.bleedTimer -= dt;
                    enemy.hitTimer = 0.12;
                    if (enemy.health <= 0) enemy.health = 0;
                }
            }

            if (cookingThrowableRef.current) {
                cookingThrowableRef.current.timer -= dt;

                if (cookingThrowableRef.current.timer <= 0) {
                    const cookState = cookingThrowableRef.current;
                    const throwableInfo = THROWABLES[cookState.type];

                    if (throwableInfo.type === 'flashbang') {
                        // Player held the flashbang for too long. Full white screen effect.
                        player.flashTimer = 2.5; // Max flash duration
                    }

                    const selfDetonation: Throwable = {
                        id: nextThrowableId++, type: cookState.type,
                        x: player.x, y: player.y, vx: 0, vy: 0, timer: 0, radius: 0,
                    };
                    // Detonate once and consume one throwable. Guard against double-detonation by clearing cook state first.
                    cookingThrowableRef.current = null;
                    isAimingThrowableRef.current = false;
                    detonate(selfDetonation);
                    if ((player.throwables[cookState.type] ?? 0) > 0 && level.name !== 'TRAINING GROUND') { player.throwables[cookState.type]! -= 1; }
                    isAimingThrowableRef.current = false;
                    cookingThrowableRef.current = null;
                }
            }

            const currentWeapon = player.weapons[player.currentWeaponIndex];
            if (player.isReloading) {
                player.reloadTimer -= dt;
                if (player.reloadTimer <= 0) {
                    player.isReloading = false;
                    if (level.name === 'TRAINING GROUND' && currentWeapon.magSize !== -1) {
                        currentWeapon.ammoInMag = currentWeapon.magSize;
                    } else {
                        const ammoNeeded = currentWeapon.magSize - currentWeapon.ammoInMag;
                        const ammoToReload = Math.min(ammoNeeded, currentWeapon.reserveAmmo);
                        currentWeapon.ammoInMag += ammoToReload;
                        currentWeapon.reserveAmmo -= ammoToReload;
                    }
                }
            }

            const isTryingToFire = (touchState.fire.id !== null || touchState.fixedFire.id !== null || isShootingRef.current) && !isAimingThrowableRef.current;

            if (!isTryingToFire) { // Reset press-based flags when input is released
                hasFiredSemiThisPressRef.current = false;
                hasStartedBurstThisPressRef.current = false;
            }

            const burstState = burstStateRef.current;

            // Handle player input
            if (isTryingToFire) {
                if (currentWeapon.category === 'melee') {
                    meleeAttack();
                } else {
                    // Handle ongoing burst
                    if (burstState.active && burstState.shotsLeft > 0 && player.shootCooldown <= 0) {
                        fireWeapon(dynamicSegments);
                        burstState.shotsLeft--;
                        if (burstState.shotsLeft <= 0) {
                            burstState.active = false;
                        }
                    }
                    // Handle new shot if not in a burst
                    else if (!burstState.active) {
                        switch (currentWeapon.currentFireMode) {
                            case 'auto':
                                fireWeapon(dynamicSegments);
                                break;
                            case 'burst':
                                if (!hasStartedBurstThisPressRef.current) {
                                    hasStartedBurstThisPressRef.current = true;
                                    burstState.active = true;
                                    burstState.shotsLeft = 3;
                                    fireWeapon(dynamicSegments);
                                    burstState.shotsLeft--;
                                }
                                break;
                            case 'semi':
                                if (!hasFiredSemiThisPressRef.current) {
                                    hasFiredSemiThisPressRef.current = true;
                                    fireWeapon(dynamicSegments);
                                }
                                break;
                        }
                    }
                }
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

                const angularSpeed = Math.abs(newAngle - previousAngle) / (dt || 1 / 60);
                if (angularSpeed > 1.5 && (now - (door.lastSoundTime || 0)) > 250) { // speed threshold and cooldown
                    const soundRadius = angularSpeed > 3.0 ? 250 : 100; // Fast vs slow swing
                    const midX = door.hinge.x + door.length / 2 * Math.cos(newAngle);
                    const midY = door.hinge.y + door.length / 2 * Math.sin(newAngle);
                    soundWavesRef.current.push({ x: midX, y: midY, radius: 0, maxRadius: soundRadius * scale / cameraScale, lifetime: 0.3, maxLifetime: 0.3, type: 'door' });
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
                const interactionRadius = 50 * scale / cameraScale;
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
                // Get screen-relative input vector from keys or touch
                if (touchState.joystick.id !== null) {
                    dx = touchState.joystick.dx;
                    dy = touchState.joystick.dy;
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
                        soundWavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 100 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2, type: 'player_move' });
                    }

                    let world_dx: number, world_dy: number;

                    if (hasUsedTouchRef.current) {
                        // Touch controls: movement is relative to player's aiming direction
                        const cos_rot_move = Math.cos(playerDirection);
                        const sin_rot_move = Math.sin(playerDirection);
                        world_dx = (dx * -sin_rot_move) - (dy * cos_rot_move);
                        world_dy = (dx * cos_rot_move) - (dy * sin_rot_move);
                    } else {
                        // KBM controls: movement is absolute to the map (W=up, A=left)
                        world_dx = dx;
                        world_dy = dy;
                    }

                    const len = Math.hypot(world_dx, world_dy);
                    let final_dx = world_dx, final_dy = world_dy;
                    if (len > 0) {
                        final_dx /= len;
                        final_dy /= len;
                    }

                    let speedPenalty = 1.0;
                    const shield = player.weapons[player.currentWeaponIndex];
                    if (shield.name === 'Riot Shield' && shield.durability && shield.durability > 0) {
                        speedPenalty = 0.8; // 20% speed reduction
                    }
                    const currentSpeed = player.speed * (player.isHealing ? 0.5 : 1.0) * speedPenalty;
                    let newX = player.x + final_dx * currentSpeed * dt;
                    let newY = player.y + final_dy * currentSpeed * dt;

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
            if (!isEnded && !isMultiplayer) {
                const takedownDist = player.radius + 15 * scale / cameraScale;
                let closestEnemy: Enemy | null = null;
                let closestDistSq = takedownDist * takedownDist;

                for (const enemy of enemiesRef.current) {
                    if (enemy.health <= 0 || enemy.isAlert) continue;

                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distSq = dx * dx * dy * dy;

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

            // --- Manual Healing Logic ---
            if (player.isHealing) {
                player.healTimer -= dt;
                if (player.healTimer <= 0) {
                    player.isHealing = false;
                    player.health = Math.min(player.maxHealth, player.health + HEAL_AMOUNT);
                    // Optional: add a small visual/sound effect on heal completion
                    shockwavesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 60 * scale / cameraScale, lifetime: 0.25, maxLifetime: 0.25 });
                }
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
                const dx = playerRef.current.x - x, dy = playerRef.current.y - y; const dist = Math.hypot(dx, dy) || 1; const k = Math.max(0, 1 - dist / (900 * scaleRef.current));
                if (k > 0) { shaker.addImpulse({ amp: 7 * k, rotAmp: 0.012 * k, freq: 55 + 40 * Math.random(), decay: 18 + 6 * Math.random(), dirx: dx / dist, diry: dy / dist }); }
            };

            const activeBullets: Bullet[] = [];
            for (const bullet of bulletsRef.current) {
                // --- NEW: KUNAI HOMING LOGIC ---
                if (bullet.weaponName === 'Explosive Kunai' && !bullet.hasHomed) {
                    let bestTarget: Enemy | null = null;
                    let bestDistSq = (KUNAI_HOMING_ACQUISITION_RANGE * scale) ** 2;

                    const futureX = bullet.x + bullet.dx * bullet.speed * dt * 5; // Look ahead a bit
                    const futureY = bullet.y + bullet.dy * bullet.speed * dt * 5;

                    for (const enemy of enemiesRef.current) {
                        if (enemy.health <= 0) continue;

                        // Check if enemy is in front of the kunai
                        const toEnemyX = enemy.x - bullet.x;
                        const toEnemyY = enemy.y - bullet.y;
                        const dot = toEnemyX * bullet.dx + toEnemyY * bullet.dy;
                        if (dot < 0) continue; // Enemy is behind

                        const { d2 } = distPtSegSquared(enemy.x, enemy.y, bullet.x, bullet.y, futureX, futureY);

                        if (d2 < bestDistSq) {
                            bestDistSq = d2;
                            bestTarget = enemy;
                        }
                    }

                    if (bestTarget) {
                        bullet.homingTarget = bestTarget;
                        bullet.hasHomed = true; // Lock in the turn, it won't change target again.
                    }
                }

                if (bullet.homingTarget) {
                    const target = bullet.homingTarget;
                    const targetAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
                    const currentAngle = Math.atan2(bullet.dy, bullet.dx);
                    const angleDiff = normalizeAngle(targetAngle - currentAngle);

                    const turnAmount = Math.min(Math.abs(angleDiff), KUNAI_HOMING_TURN_RATE * dt);
                    const newAngle = currentAngle + Math.sign(angleDiff) * turnAmount;

                    bullet.dx = Math.cos(newAngle);
                    bullet.dy = Math.sin(newAngle);

                    // If we are close enough to the target angle, stop turning.
                    if (Math.abs(angleDiff) < 0.1) {
                        bullet.homingTarget = null;
                    }
                }
                // --- END KUNAI LOGIC ---

                // If kunai has a maxTravelDistance, check traveled distance and mark reached max
                if (bullet.isKunai && bullet.maxTravelDistance && !bullet.hasReachedMax) {
                    const traveled = Math.hypot(bullet.x - (bullet.originX || 0), bullet.y - (bullet.originY || 0));
                    if (traveled >= bullet.maxTravelDistance) {
                        // Trigger airburst behavior at this location similar to proximity detonation
                        bullet.hasReachedMax = true;
                        // perform airburst now
                        const airburstX = bullet.x;
                        const airburstY = bullet.y;
                        const radiusPx = KUNAI_AIRBURST_RADIUS_M * METERS_TO_PIXELS;
                        let bestCenter = { x: airburstX, y: airburstY };
                        let bestCount = 0;
                        const candidates: Point[] = [];
                        for (const e of enemiesRef.current) {
                            if (e.health <= 0) continue;
                            const d = Math.hypot(e.x - airburstX, e.y - airburstY);
                            if (d <= radiusPx + e.radius) candidates.push({ x: e.x, y: e.y });
                        }
                        if (candidates.length > 0) {
                            for (const c of candidates) {
                                let cnt = 0;
                                for (const e of enemiesRef.current) {
                                    if (e.health <= 0) continue;
                                    const dd = Math.hypot(e.x - c.x, e.y - c.y);
                                    if (dd <= radiusPx + e.radius) cnt++;
                                }
                                if (cnt > bestCount) { bestCount = cnt; bestCenter = c; }
                            }
                        }
                        for (const e of enemiesRef.current) {
                            if (e.health <= 0) continue;
                            const d = Math.hypot(e.x - bestCenter.x, e.y - bestCenter.y);
                            if (d <= radiusPx + e.radius) {
                                e.health -= KUNAI_AIRBURST_BASE_DAMAGE;
                                e.hitTimer = 0.17;
                                e.bleedLayers = Math.min(KUNAI_BLEED_MAX_LAYERS, (e.bleedLayers || 0) + 1);
                                e.bleedTimer = KUNAI_BLEED_DURATION;
                                if (e.health <= 0) e.health = 0;
                            }
                        }
                        stuckKunaisRef.current.push({ x: airburstX, y: airburstY, detonationTimer: 0.01, owner: bullet.owner });
                    }
                }

                const nextX = bullet.x + bullet.dx * bullet.speed * dt;
                const nextY = bullet.y + bullet.dy * bullet.speed * dt;
                let removed = false;

                // --- Proximity Detonation Logic ---
                const isProximityFuseWeapon = bullet.weaponName === 'Rocket Launcher' || bullet.weaponName === 'Explosive Kunai';
                if (isProximityFuseWeapon && bullet.owner === 'player' && !isEnded) {
                    let triggered = false;
                    for (const enemy of enemiesRef.current) {
                        if (enemy.health <= 0) continue;

                        const proximityRadius = (bullet.weaponName === 'Rocket Launcher' ? 40 : 35) * scale;
                        // Check distance from the bullet's path segment to the enemy center
                        const { d2 } = distPtSegSquared(enemy.x, enemy.y, bullet.x, bullet.y, nextX, nextY);

                        if (d2 < (enemy.radius + proximityRadius) ** 2) {
                            triggered = true;
                            break;
                        }
                    }

                    if (triggered) {
                        removed = true;
                        if (bullet.weaponName === 'Rocket Launcher') {
                            createExplosion(bullet.x, bullet.y, 200 * scale, bullet.damage, dynamicSegments);
                        } else { // Explosive Kunai - airburst at current bullet position
                            // Instead of immediate explosion, perform airburst selection at this point
                            const airburstX = bullet.x;
                            const airburstY = bullet.y;
                            // Choose best center: for each enemy within airburst radius, count neighbors within airburst radius
                            const radiusPx = KUNAI_AIRBURST_RADIUS_M * METERS_TO_PIXELS;
                            let bestCenter = { x: airburstX, y: airburstY };
                            let bestCount = 0;
                            // Candidate centers: each enemy position within radius
                            const candidates: Point[] = [];
                            for (const e of enemiesRef.current) {
                                if (e.health <= 0) continue;
                                const d = Math.hypot(e.x - airburstX, e.y - airburstY);
                                if (d <= radiusPx + e.radius) candidates.push({ x: e.x, y: e.y });
                            }
                            if (candidates.length === 0) {
                                // No enemies nearby; default to current point
                            } else {
                                for (const c of candidates) {
                                    let cnt = 0;
                                    for (const e of enemiesRef.current) {
                                        if (e.health <= 0) continue;
                                        const dd = Math.hypot(e.x - c.x, e.y - c.y);
                                        if (dd <= radiusPx + e.radius) cnt++;
                                    }
                                    if (cnt > bestCount) { bestCount = cnt; bestCenter = c; }
                                }
                            }
                            // Apply bleed to enemies within radius of bestCenter
                            for (const e of enemiesRef.current) {
                                if (e.health <= 0) continue;
                                const d = Math.hypot(e.x - bestCenter.x, e.y - bestCenter.y);
                                if (d <= radiusPx + e.radius) {
                                    // Apply instant damage
                                    e.health -= KUNAI_AIRBURST_BASE_DAMAGE;
                                    e.hitTimer = 0.17;
                                    // Apply bleed layers
                                    e.bleedLayers = Math.min(KUNAI_BLEED_MAX_LAYERS, (e.bleedLayers || 0) + 1);
                                    e.bleedTimer = KUNAI_BLEED_DURATION;
                                    if (e.health <= 0) e.health = 0;
                                }
                            }
                            // Spawn a visual stuck kunai for consistency
                            stuckKunaisRef.current.push({ x: airburstX, y: airburstY, detonationTimer: 0.01, owner: bullet.owner });
                        }
                    }
                }
                // --- End Proximity Logic ---

                if (!removed) {
                    const wallHit = firstImpactPoint(bullet.x, bullet.y, nextX, nextY);
                    let closestT = wallHit ? wallHit.t : 1.0;
                    let hitUnit: Enemy | Player | null = null;
                    let hitUnitType: 'enemy' | 'player' | null = null;

                    if (bullet.owner === 'player') {
                        // Hit enemies
                        for (const enemy of enemiesRef.current) {
                            if (enemy.health <= 0) continue;
                            const enemyHit = intersectSegCircle(bullet.x, bullet.y, nextX, nextY, enemy.x, enemy.y, bullet.radius + enemy.radius);
                            if (enemyHit && enemyHit.t < closestT) {
                                closestT = enemyHit.t;
                                hitUnit = enemy;
                                hitUnitType = 'enemy';
                            }
                        }
                        // Hit remote players in multiplayer
                        if (isMultiplayer) {
                            remotePlayersMapRef.current.forEach(rp => {
                                try {
                                    // Remote players do not have a local Player object; approximate with rp.x/rp.y and assume radius similar to player
                                    const playerHit = intersectSegCircle(bullet.x, bullet.y, nextX, nextY, rp.x, rp.y, bullet.radius + (player.radius || 10));
                                    if (playerHit && playerHit.t < closestT) {
                                        closestT = playerHit.t;
                                        hitUnit = rp as any as Player; // treat as generic unit for handling (we will branch on hitUnitType)
                                        hitUnitType = 'player';
                                    }
                                } catch (e) { }
                            });
                        }
                    } else {
                        // bullets from enemies should still be able to hit the local player
                        if (!isEnded) {
                            const playerHit = intersectSegCircle(bullet.x, bullet.y, nextX, nextY, player.x, player.y, bullet.radius + player.radius);
                            if (playerHit && playerHit.t < closestT) {
                                closestT = playerHit.t;
                                hitUnit = player;
                                hitUnitType = 'player';
                            }
                        }
                    }

                    if (closestT < 1.0) {
                        removed = true;
                        const impactX = bullet.x + (nextX - bullet.x) * closestT;
                        const impactY = bullet.y + (nextY - bullet.y) * closestT;

                        if (bullet.weaponName === 'Rocket Launcher') {
                            createExplosion(impactX, impactY, 200 * scale, bullet.damage, dynamicSegments);
                        } else if (bullet.weaponName === 'Explosive Kunai') {
                            stuckKunaisRef.current.push({ x: impactX, y: impactY, detonationTimer: 0.5, owner: bullet.owner });
                            if (hitUnit) { // Apply direct impact damage as well
                                if (hitUnitType === 'enemy') {
                                    const enemy = hitUnit as Enemy;
                                    const healthBefore = enemy.health;
                                    enemy.health = 0; // Instant kill
                                    enemy.hitTimer = 0.17; // Red flash
                                    if (healthBefore > 0) {
                                        hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                                        try { addScore(SCORE_PER_KILL); } catch { }
                                        try {
                                            const pickList = Object.keys(WEAPONS);
                                            const pick = pickList[Math.floor(Math.random() * pickList.length)];
                                            const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: pick, x: enemy.x, y: enemy.y };
                                            weaponDropsRef.current.push(drop);
                                            try { networkClient && (networkClient as any).send('drop-weapon', { id: drop.id, playerId: networkClient.ownId, weaponName: pick, x: drop.x, y: drop.y }); } catch { }
                                        } catch (e) { }
                                    }
                                } else {
                                    // If hitUnit is a remote player object (approx), request remote damage via network instead
                                    try {
                                        if (hitUnit && (hitUnit as any).id && networkClient) {
                                            const targetId = (hitUnit as any).id as string;
                                            // Send player-hit for authoritative application on the target client
                                            try {
                                                console.debug('[Net] send player-hit', { targetId, damage: bullet.damage, attackerId: networkClient.ownId });
                                                (networkClient as any).send('player-hit', { targetId, damage: bullet.damage, attackerId: networkClient.ownId, impact: { x: impactX, y: impactY }, sourceDir: { x: bullet.dx, y: bullet.dy } });
                                            } catch (e) { }
                                        } else {
                                            applyDamageToPlayer(bullet.damage, { x: bullet.dx, y: bullet.dy }, { x: impactX, y: impactY });
                                        }
                                    } catch (e) {
                                        applyDamageToPlayer(bullet.damage, { x: bullet.dx, y: bullet.dy }, { x: impactX, y: impactY });
                                    }
                                }
                            }
                        } else { // Standard projectile logic
                            if (hitUnit) {
                                if (hitUnitType === 'enemy') {
                                    const enemy = hitUnit as Enemy;
                                    const healthBefore = enemy.health;
                                    enemy.health -= bullet.damage;
                                    enemy.hitTimer = 0.17; // Red flash
                                    if (bullet.isIncendiary) {
                                        enemy.burnTimer = (enemy.burnTimer || 0) + 3.0;
                                        enemy.burnDamage = 20;
                                        enemy.isAlert = true;
                                    }
                                    if (enemy.health <= 0 && healthBefore > 0) {
                                        hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                                        try { addScore(SCORE_PER_KILL); } catch { }
                                        try {
                                            const pickList = Object.keys(WEAPONS);
                                            const pick = pickList[Math.floor(Math.random() * pickList.length)];
                                            const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: pick, x: enemy.x, y: enemy.y };
                                            weaponDropsRef.current.push(drop);
                                            try { networkClient && (networkClient as any).send('drop-weapon', { playerId: networkClient.ownId, weaponName: pick, x: drop.x, y: drop.y }); } catch { }
                                        } catch (e) { }
                                    }
                                    impact(impactX, impactY);
                                    soundWavesRef.current.push({ x: impactX, y: impactY, radius: 0, maxRadius: 50 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2, type: 'impact' });
                                } else { // Player hit (could be local or remote)
                                    // If this hit corresponds to a remote player object (has an id) and we're in multiplayer,
                                    // request the network/server to apply damage to that target. Only apply locally if the
                                    // target is this client (ownId) or if no network is available.
                                    const maybeId = (hitUnit as any).id as string | undefined;
                                    const isRemotePlayer = !!maybeId && isMultiplayer && networkClient && maybeId !== (networkClient && networkClient.ownId);
                                    if (isRemotePlayer) {
                                        try {
                                            console.debug('[Net] send player-hit (proj)', { targetId: maybeId, damage: bullet.damage, attackerId: networkClient.ownId });
                                            (networkClient as any) && (networkClient as any).send('player-hit', { targetId: maybeId, damage: bullet.damage, attackerId: networkClient.ownId, impact: { x: impactX, y: impactY }, sourceDir: { x: bullet.dx, y: bullet.dy } });
                                        } catch (e) { }
                                    } else {
                                        const healthBefore = player.health;
                                        applyDamageToPlayer(bullet.damage, { x: bullet.dx, y: bullet.dy }, { x: impactX, y: impactY });
                                        if (bullet.isIncendiary) {
                                            player.burnTimer = (player.burnTimer || 0) + 3.0;
                                            player.burnDamage = 20;
                                        }
                                        if (player.health < healthBefore) {
                                            shakerRef.current.addImpulse({ amp: 15 * scale, rotAmp: 0.03, freq: 40, decay: 25, dirx: bullet.dx, diry: bullet.dy });
                                        }
                                    }
                                }
                            } else { // Wall hit
                                impact(impactX, impactY);
                                soundWavesRef.current.push({ x: impactX, y: impactY, radius: 0, maxRadius: 200 * scale / cameraScale, lifetime: 0.3, maxLifetime: 0.3, type: 'impact' });
                                const apx = bullet.x - impactX, apy = bullet.y - impactY;
                                const al = Math.hypot(apx, apy) || 1;
                                const reflectX = apx / al, reflectY = apy / al;
                                const spawnX = impactX + reflectX * 1.5, spawnY = impactY + reflectY * 1.5;
                                lightsRef.current.push({ x: spawnX, y: spawnY, ttl: 0.13, life: 0.13, power: 1.35, type: 'impact' });
                                const sparkCount = 10 + Math.floor(Math.random() * 6);
                                for (let i = 0; i < sparkCount; i++) {
                                    const angle = Math.atan2(reflectY, reflectX) + (Math.random() - 0.5) * 1.1;
                                    const speed = (270 + Math.random() * 360);
                                    sparksRef.current.push({ x: spawnX, y: spawnY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl: 0.28, life: 0.28 });
                                }
                            }
                        }
                    }
                }

                if (!removed) {
                    bullet.x = nextX;
                    bullet.y = nextY;
                    activeBullets.push(bullet);
                }
            }
            bulletsRef.current = activeBullets;

            const activeKunais: StuckKunai[] = [];
            for (const kunai of stuckKunaisRef.current) {
                kunai.detonationTimer -= dt;
                if (kunai.detonationTimer <= 0) {
                    explosionsRef.current.push({ x: kunai.x, y: kunai.y, radius: 0, maxRadius: 150 * scale, lifetime: 0.4, maxLifetime: 0.4, type: 'grenade' });
                    soundWavesRef.current.push({ x: kunai.x, y: kunai.y, radius: 0, maxRadius: 300 * scale, lifetime: 0.4, maxLifetime: 0.4, type: 'explosion' });

                    const explosionRadius = 180 * scale;
                    enemiesRef.current.forEach(enemy => {
                        if (enemy.health <= 0) return;
                        const dist = Math.hypot(kunai.x - enemy.x, kunai.y - enemy.y);
                        if (dist < explosionRadius + enemy.radius) {
                            let isObstructed = false;
                            for (const segment of dynamicSegments) {
                                if (intersectSegSeg(kunai.x, kunai.y, enemy.x, enemy.y, segment)) {
                                    isObstructed = true;
                                    break;
                                }
                            }
                            if (!isObstructed) {
                                const KUNAI_EXPLOSION_DAMAGE = 120;
                                const healthBefore = enemy.health;
                                enemy.health -= KUNAI_EXPLOSION_DAMAGE;
                                enemy.hitTimer = 0.17; // Add red flash
                                if (enemy.health <= 0 && healthBefore > 0) {
                                    hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                                }
                            }
                        }
                    });

                } else {
                    activeKunais.push(kunai);
                }
            }
            stuckKunaisRef.current = activeKunais;


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
                    soundWavesRef.current.push({ x: throwable.x, y: throwable.y, radius: 0, maxRadius: 120 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2, type: 'bounce' });
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
                const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
                const p = Math.min(1, slash.t / slash.dur);
                const e = easeOutCubic(p);
                slash.prevA = slash.curA;
                slash.curA = slash.startA + (slash.endA - slash.startA) * e;

                const castDist = raycast(player.x, player.y, slash.curA, slash.range);
                const outer = Math.min(slash.range, castDist);
                slashArcsRef.current.push({ x: player.x, y: player.y, a1: slash.prevA - slash.width * 0.5, a2: slash.curA + slash.width * 0.5, inner: slash.inner, outer, ttl: 0.13, life: 0.13 });

                // Helper to check if an angle is within a sweep that might wrap around PI
                const isAngleBetween = (start: number, end: number, mid: number) => {
                    if (start <= end) { // Normal case, e.g., from -1 to 1 rad
                        return mid >= start && mid <= end;
                    } else { // Wraps around PI, e.g., from 3 to -3 rad
                        return mid >= start || mid <= end;
                    }
                };

                const sweepStart = normalizeAngle(slash.startA - slash.width * 0.5);
                const sweepEnd = normalizeAngle(slash.curA + slash.width * 0.5);

                for (const enemy of enemiesRef.current) {
                    if (enemy.health <= 0 || slashHitThisSwingRef.current.has(enemy)) continue;
                    const dx = enemy.x - player.x, dy = enemy.y - player.y; const dist = Math.hypot(dx, dy);
                    if (dist < slash.inner || dist > slash.range) continue;

                    const ang = Math.atan2(dy, dx); // This is already in (-PI, PI]

                    if (!isAngleBetween(sweepStart, sweepEnd, ang)) continue;

                    const dClear = raycast(player.x, player.y, ang, dist);
                    if (dClear < dist - 1e-3) continue;

                    const healthBefore = enemy.health;
                    enemy.health = 0; // Slash is an instant kill
                    if (healthBefore > 0) {
                        slashHitThisSwingRef.current.add(enemy);
                        hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                        shakerRef.current.addImpulse({ amp: 2 * scale, rotAmp: 0.005, freq: 100, decay: 20, dirx: dx / dist, diry: dy / dist });
                        try { addScore(SCORE_PER_KILL); } catch { }
                        try {
                            const pickList = Object.keys(WEAPONS);
                            const pick = pickList[Math.floor(Math.random() * pickList.length)];
                            const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: pick, x: enemy.x, y: enemy.y };
                            weaponDropsRef.current.push(drop);
                            try { networkClient && (networkClient as any).send('drop-weapon', { playerId: networkClient.ownId, weaponName: pick, x: drop.x, y: drop.y }); } catch { }
                        } catch (e) { }
                    }
                }

                if (castDist < slash.range - 0.5) {
                    const ix = player.x + Math.cos(slash.curA) * castDist; const iy = player.y + Math.sin(slash.curA) * castDist;
                    soundWavesRef.current.push({ x: ix, y: iy, radius: 0, maxRadius: 150 * scale / cameraScale, lifetime: 0.25, maxLifetime: 0.25, type: 'impact' });
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

            smokeCloudsRef.current.forEach(cloud => {
                cloud.lifetime -= dt;
                const expansionRate = 2.0;
                if (cloud.radius < cloud.maxRadius) {
                    cloud.radius += cloud.maxRadius * expansionRate * dt;
                    if (cloud.radius > cloud.maxRadius) cloud.radius = cloud.maxRadius;
                }
            });
            smokeCloudsRef.current = smokeCloudsRef.current.filter(c => c.lifetime > 0);

            firePatchesRef.current.forEach(patch => {
                patch.lifetime -= dt;
                const expansionRate = 1.5;
                if (patch.radius < patch.maxRadius) {
                    patch.radius += patch.maxRadius * expansionRate * dt;
                    if (patch.radius > patch.maxRadius) patch.radius = patch.maxRadius;
                }
            });
            firePatchesRef.current = firePatchesRef.current.filter(p => p.lifetime > 0);

            // Interpolate remote players
            if (isMultiplayer) {
                remotePlayersMapRef.current.forEach(p => {
                    const t = Math.min(1.5, (now - p.lastUpdateTime) / 100); // Allow some extrapolation
                    p.x += (p.targetX - p.x) * t;
                    p.y += (p.targetY - p.y) * t;
                });
            }

            for (const patch of firePatchesRef.current) {
                // Check player
                if (!isEnded && Math.hypot(player.x - patch.x, player.y - patch.y) < player.radius + patch.radius) {
                    player.burnTimer = 1.0; // Refresh burn timer while in fire
                    player.burnDamage = patch.damagePerSecond;
                }
                // Check enemies
                for (const enemy of enemiesRef.current) {
                    if (enemy.health > 0 && Math.hypot(enemy.x - patch.x, enemy.y - patch.y) < enemy.radius + patch.radius) {
                        enemy.burnTimer = 1.0;
                        enemy.burnDamage = patch.damagePerSecond;
                        if (!enemy.isAlert) {
                            enemy.isAlert = true; // Make them react to being on fire
                        }
                    }
                }
            }

            const activeEnemies: Enemy[] = [];
            for (const enemy of enemiesRef.current) {
                if (enemy.health <= 0) {
                    if (enemy.isDummy && level.name === 'TRAINING GROUND') {
                        const originalState = initialDummyEnemiesRef.current.find(d =>
                            d.patrolStartX === enemy.patrolStartX && d.patrolStartY === enemy.patrolStartY
                        );
                        if (originalState && !respawningDummiesRef.current.some(item => item.enemy.patrolStartX === originalState.patrolStartX && item.enemy.patrolStartY === originalState.patrolStartY)) {
                            respawningDummiesRef.current.push({
                                enemy: JSON.parse(JSON.stringify(originalState)),
                                respawnTimer: 5.0
                            });
                        }
                    }
                } else {
                    if (enemy.hitTimer && enemy.hitTimer > 0) enemy.hitTimer -= dt;
                    if (enemy.isDummy) {
                        activeEnemies.push(enemy);
                        continue; // Skip all AI logic for dummy enemies
                    }

                    // Universal Timer Decrements
                    if (enemy.stunTimer && enemy.stunTimer > 0) enemy.stunTimer -= dt;
                    if (enemy.suppressionTimer && enemy.suppressionTimer > 0) enemy.suppressionTimer -= dt;
                    if (enemy.reactionTimer && enemy.reactionTimer > 0) enemy.reactionTimer -= dt;
                    if (enemy.moveSoundTimer && enemy.moveSoundTimer > 0) enemy.moveSoundTimer -= dt;

                    if (enemy.burnTimer && enemy.burnTimer > 0) {
                        const healthBefore = enemy.health;
                        const damageToApply = enemy.burnDamage! * dt;
                        enemy.health -= damageToApply;
                        enemy.hitTimer = 0.17;
                        enemy.burnTimer -= dt;

                        if (enemy.health <= 0 && healthBefore > 0) {
                            hitEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 40 * scale, lifetime: 0.33, maxLifetime: 0.33 });
                        }
                    }

                    // Stun overrides ALL AI logic
                    if (enemy.stunTimer && enemy.stunTimer > 0) {
                        enemy.isAlert = false;
                        enemy.isInvestigating = false;
                        enemy.targetX = undefined;
                        enemy.targetY = undefined;
                        enemy.searchTimer = 0;
                        enemy.isReturningToPost = false;
                        if (enemy.type === 'advanced') {
                            enemy.axeState = 'idle';
                            enemy.axeTimer = 0;
                            enemy.isReloadingRifle = false;
                        }
                        activeEnemies.push(enemy);
                        continue;
                    }

                    const wasAlert = enemy.isAlert;

                    if (difficulty === 'hard' && !isEnded) {
                        // --- HARD MODE AI ---
                        const attackRange = visionRadius;
                        const dxPlayer = player.x - enemy.x;
                        const dyPlayer = player.y - enemy.y;
                        const distToPlayer = Math.hypot(dxPlayer, dyPlayer);
                        let canSeePlayer = false;

                        if (distToPlayer < attackRange) {
                            let isObstructed = false;
                            for (const segment of dynamicSegments) {
                                if (intersectSegSeg(enemy.x, enemy.y, player.x, player.y, segment)) {
                                    isObstructed = true;
                                    break;
                                }
                            }
                            if (!isObstructed) {
                                for (const smoke of smokeCloudsRef.current) {
                                    if (intersectSegCircle(enemy.x, enemy.y, player.x, player.y, smoke.x, smoke.y, smoke.radius)) {
                                        isObstructed = true;
                                        break;
                                    }
                                }
                            }
                            if (!isObstructed) canSeePlayer = true;
                        }

                        if (canSeePlayer) {
                            enemy.isAlert = true;
                            enemy.direction = Math.atan2(dyPlayer, dxPlayer);

                            if (enemy.shootCooldown <= 0) {
                                soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 400 * scale / cameraScale, lifetime: 0.5, maxLifetime: 0.5, type: 'enemy_shoot' });
                                lightsRef.current.push({ x: enemy.x, y: enemy.y, ttl: 0.08, life: 0.08, power: 1.5, type: 'muzzle', openWindow: true });

                                if (enemy.type === 'advanced') {
                                    const finalUx = Math.cos(enemy.direction), finalUy = Math.sin(enemy.direction);
                                    tracersRef.current.push({ x1: enemy.x, y1: enemy.y, x2: player.x, y2: player.y, ttl: 0.07, life: 0.07 });

                                    const healthBefore = player.health;
                                    applyDamageToPlayer(15, { x: finalUx, y: finalUy }, { x: player.x, y: player.y });
                                    if (player.health < healthBefore) {
                                        shakerRef.current.addImpulse({ amp: 10 * scale, rotAmp: 0.02, freq: 45, decay: 22, dirx: finalUx, diry: finalUy });
                                    }

                                    enemy.shootCooldown = RIFLE_INTER_BURST_DELAY;
                                } else {
                                    bulletsRef.current.push({ x: enemy.x, y: enemy.y, dx: Math.cos(enemy.direction), dy: Math.sin(enemy.direction), radius: 4 * scale, speed: 360 * scale, damage: 30, owner: 'enemy' });
                                    enemy.shootCooldown = enemy.shootCooldownMax * 0.4;
                                }
                            }
                        } else {
                            enemy.isAlert = false;
                        }
                    } else {
                        // --- SIMPLE / NORMAL MODE AI ---
                        if (!isEnded) {
                            const lastKnownTargetX = enemy.targetX;

                            // 1. SIGHT
                            let canSeePlayer = false;
                            const dxPlayer = player.x - enemy.x;
                            const dyPlayer = player.y - enemy.y;
                            const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

                            if (distToPlayer > 0 && distToPlayer < enemy.viewDistance) {
                                const angleToPlayer = Math.atan2(dyPlayer, dxPlayer);
                                const angleDiff = normalizeAngle(angleToPlayer - normalizeAngle(enemy.direction));
                                if (Math.abs(angleDiff) < enemy.fov / 2) {
                                    let isObstructed = false;
                                    for (const segment of dynamicSegments) {
                                        if (intersectSegSeg(enemy.x, enemy.y, player.x, player.y, segment)) {
                                            isObstructed = true;
                                            break;
                                        }
                                    }
                                    if (!isObstructed) {
                                        for (const smoke of smokeCloudsRef.current) {
                                            if (intersectSegCircle(enemy.x, enemy.y, player.x, player.y, smoke.x, smoke.y, smoke.radius)) {
                                                isObstructed = true;
                                                break;
                                            }
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
                                        const scaledAxeRange = AXE_RANGE * scale / cameraScale;
                                        // --- ADVANCED AI COMBAT ---
                                        if (enemy.axeState !== 'idle') {
                                            enemy.axeTimer! -= dt;
                                            if (enemy.axeTimer! <= 0) {
                                                if (enemy.axeState === 'windup') {
                                                    enemy.axeState = 'swing';
                                                    enemy.axeTimer = AXE_SWING_DURATION;
                                                    const midX = enemy.x + (scaledAxeRange * 0.5) * Math.cos(enemy.direction);
                                                    const midY = enemy.y + (scaledAxeRange * 0.5) * Math.sin(enemy.direction);
                                                    soundWavesRef.current.push({ x: midX, y: midY, radius: 0, maxRadius: 100 * scale / cameraScale, lifetime: 0.2, maxLifetime: 0.2, type: 'slash' });
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
                                            if (distToPlayer < scaledAxeRange + player.radius && angleDiff < axeArc / 2) {
                                                // Enemy melee hit — check for player's riot shield to block
                                                const player = playerRef.current;
                                                const shield = player.weapons.find(w => w.name === 'Riot Shield' && w.durability && w.durability > 0);
                                                const angleFromPlayerToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                                                const playerAngleDiff = Math.abs(normalizeAngle(angleFromPlayerToEnemy - playerDirectionRef.current));
                                                const isEquipped = player.weapons[player.currentWeaponIndex] === shield;

                                                if (shield && shield.durability && isEquipped && playerAngleDiff < Math.PI / 2) {
                                                    // Blocked by shield: reduce shield durability by 1/4 of maxDurability
                                                    const maxDur = shield.maxDurability || shield.durability || 0;
                                                    const reduce = Math.max(1, Math.floor(maxDur / 4));
                                                    shield.durability! -= reduce;
                                                    // Visual sparks at impact
                                                    const impactX = player.x + Math.cos(angleFromPlayerToEnemy) * (player.radius + 8 * scaleRef.current);
                                                    const impactY = player.y + Math.sin(angleFromPlayerToEnemy) * (player.radius + 8 * scaleRef.current);
                                                    const sparkCount = 6 + Math.floor(Math.random() * 4);
                                                    for (let s = 0; s < sparkCount; s++) {
                                                        const sparkAngle = angleFromPlayerToEnemy + Math.PI + (Math.random() - 0.5) * 1.2;
                                                        const spd = 160 + Math.random() * 200;
                                                        sparksRef.current.push({ x: impactX, y: impactY, vx: Math.cos(sparkAngle) * spd, vy: Math.sin(sparkAngle) * spd, ttl: 0.22, life: 0.22 });
                                                    }
                                                    player.hitTimer = 0.12;
                                                    if (shield.durability! <= 0) {
                                                        shield.durability = 0;
                                                        shockwavesRef.current.push({ x: impactX, y: impactY, radius: 0, maxRadius: 40 * scaleRef.current, lifetime: 0.2, maxLifetime: 0.2 });
                                                    }
                                                } else {
                                                    // No effective shield — melee is lethal
                                                    player.health = 0;
                                                    isGameOverRef.current = true;
                                                }
                                            }
                                            const outer = scaledAxeRange;
                                            slashArcsRef.current.push({ x: enemy.x, y: enemy.y, a1: enemy.direction - axeArc / 2, a2: enemy.direction + axeArc / 2, inner: 0, outer, ttl: 0.1, life: 0.1, isEnemy: true });
                                        } else if (distToPlayer < scaledAxeRange && enemy.axeState === 'idle') {
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
                                                    const healthBefore = player.health;
                                                    applyDamageToPlayer(15, { x: finalUx, y: finalUy }, { x: player.x, y: player.y });
                                                    if (player.health < healthBefore) {
                                                        shakerRef.current.addImpulse({ amp: 10 * scale, rotAmp: 0.02, freq: 45, decay: 22, dirx: finalUx, diry: finalUy });
                                                    }
                                                } else {
                                                    // wall impact fx from enemy
                                                }

                                                enemy.rifleAmmo!--;
                                                enemy.burstShotsFired!++;
                                                enemy.shootCooldown = RIFLE_INTER_BURST_DELAY;
                                                soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 400 * scale / cameraScale, lifetime: 0.5, maxLifetime: 0.5, type: 'enemy_shoot' });
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
                                            bulletsRef.current.push({ x: enemy.x, y: enemy.y, dx: Math.cos(enemy.direction), dy: Math.sin(enemy.direction), radius: 4 * scale, speed: 360 * scale, damage: 30, owner: 'enemy' });
                                            soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 400 * scale / cameraScale, lifetime: 0.5, maxLifetime: 0.5, type: 'enemy_shoot' });
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
                                            maxRadius: 120 * scale / cameraScale,
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

                                    for (let i = 0; i < 2; i++) {
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
                        soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 300 * scale / cameraScale, lifetime: 0.4, maxLifetime: 0.4, type: 'enemy_shoot' });
                        if (difficulty === 'simple') {
                            enemy.reactionTimer = 0.75;
                        } else if (difficulty === 'normal') {
                            enemy.reactionTimer = 0.4;
                        }
                    }

                    activeEnemies.push(enemy);
                }
            }
            enemiesRef.current = activeEnemies;

            if (level.name === 'TRAINING GROUND') {
                for (let i = respawningDummiesRef.current.length - 1; i >= 0; i--) {
                    const item = respawningDummiesRef.current[i];
                    item.respawnTimer -= dt;
                    if (item.respawnTimer <= 0) {
                        enemiesRef.current.push(item.enemy);
                        respawningDummiesRef.current.splice(i, 1);
                    }
                }
            }

            if (!isEnded && level.name !== 'TRAINING GROUND' && !isMultiplayer) {
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
            const viewPoly = getVisionPolygon(playerRef.current, dynamicSegments, { width: canvas.width, height: canvas.height });

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

                // Draw Door Frames (the opening in the wall)
                context.fillStyle = '#374151'; // Match the wall color for a "cutout" look
                doorsRef.current.forEach(door => {
                    const brightness = getBrightnessByDistance(door.hinge.x, door.hinge.y, visionRadius);
                    if (brightness <= 0) return;

                    context.save();
                    context.translate(door.hinge.x, door.hinge.y);
                    context.rotate(door.closedAngle);
                    context.globalAlpha = brightness;

                    const framePadding = 2 * scale; // How much bigger the opening is than the door

                    // Draw a slightly larger rectangle behind the door to simulate the frame/opening
                    context.fillRect(
                        -framePadding,
                        -(door.thickness / 2) - framePadding,
                        door.length + (framePadding * 2),
                        door.thickness + (framePadding * 2)
                    );

                    // Also draw a stroke to define the edge of the opening
                    context.strokeStyle = '#4b5563';
                    context.lineWidth = 1 * scale;
                    context.strokeRect(
                        -framePadding,
                        -(door.thickness / 2) - framePadding,
                        door.length + (framePadding * 2),
                        door.thickness + (framePadding * 2)
                    );

                    context.restore();
                });
                context.globalAlpha = 1.0; // Reset alpha

                doorsRef.current.forEach(door => {
                    const brightness = getBrightnessByDistance(door.hinge.x, door.hinge.y, visionRadius);
                    const isLocked = door.locked;
                    context.save();
                    context.translate(door.hinge.x, door.hinge.y);
                    context.rotate(door.currentAngle);
                    const doorFillColor = isLocked ? `rgba(120, 40, 40, ${brightness})` : `rgba(136, 136, 136, ${brightness})`;
                    const doorBorderColor = isLocked ? `rgba(239, 68, 68, ${brightness})` : `rgba(204, 204, 204, ${brightness})`;
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

                    const isHit = enemy.hitTimer && enemy.hitTimer > 0;
                    const bodyColor = isHit ? `rgba(239, 68, 68, ${brightness})` // red-500
                        : enemy.isAlert ? `rgba(238, 238, 238, ${brightness})`
                            : `rgba(153, 153, 153, ${brightness})`;
                    context.fillStyle = bodyColor;
                    context.shadowColor = bodyColor;
                    context.shadowBlur = 15 * scale;
                    context.beginPath();
                    context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                    context.fill();

                    if (enemy.burnTimer && enemy.burnTimer > 0) {
                        context.globalCompositeOperation = 'lighter';
                        const flicker = Math.sin(performance.now() / 60) * 0.5 + 0.5;
                        const radius = enemy.radius * (1.2 + flicker * 0.3);
                        const grad = context.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, radius);
                        grad.addColorStop(0, `rgba(255, 200, 0, ${0.8 * flicker * brightness})`);
                        grad.addColorStop(0.7, `rgba(255, 100, 0, ${0.5 * flicker * brightness})`);
                        grad.addColorStop(1, `rgba(255, 0, 0, 0)`);
                        context.fillStyle = grad;
                        context.beginPath();
                        context.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                        context.fill();
                        context.globalCompositeOperation = 'source-over';
                    }

                    if (enemy.type === 'advanced' && enemy.axeState === 'windup') {
                        const chargeProgress = 1 - (enemy.axeTimer! / AXE_WINDUP_DURATION);
                        context.strokeStyle = `rgba(255, 100, 100, ${brightness * 0.8})`;
                        context.lineWidth = 3 * scale;
                        context.beginPath();
                        context.arc(enemy.x, enemy.y, enemy.radius + 4 * scale, -Math.PI / 2, -Math.PI / 2 + chargeProgress * Math.PI * 2);
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

                if (!isEnded && currentWeapon.category !== 'melee' && (hasUsedTouchRef.current || touchStateRef.current.joystick.id === null)) {
                    const laserEnd = getLaserEndpoint(playerDirection);
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

                    if (player.burnTimer && player.burnTimer > 0) {
                        context.globalCompositeOperation = 'lighter';
                        const flicker = Math.sin(performance.now() / 60) * 0.5 + 0.5;
                        const radius = player.radius * (1.5 + flicker * 0.4);
                        const grad = context.createRadialGradient(player.x, player.y, 0, player.x, player.y, radius);
                        grad.addColorStop(0, `rgba(255, 200, 0, ${0.8 * flicker})`);
                        grad.addColorStop(0.7, `rgba(255, 100, 0, ${0.5 * flicker})`);
                        grad.addColorStop(1, `rgba(255, 0, 0, 0)`);
                        context.fillStyle = grad;
                        context.beginPath();
                        context.arc(player.x, player.y, radius, 0, Math.PI * 2);
                        context.fill();
                        context.globalCompositeOperation = 'source-over';
                    }

                    const shield = player.weapons[player.currentWeaponIndex];
                    if (shield && shield.name === 'Riot Shield' && shield.durability && shield.durability > 0) {
                        context.save();
                        context.translate(player.x, player.y);
                        context.rotate(playerDirection);

                        const cameraScale = cameraScaleRef.current;
                        const shieldWidth = 25 * scale / cameraScale;
                        const shieldHeight = 45 * scale / cameraScale;

                        context.fillStyle = '#404040';
                        context.strokeStyle = '#a3a3a3';
                        context.lineWidth = 2 * scale;
                        context.beginPath();
                        // A DOMRect-like method for rounded rectangles isn't standard, using a path.
                        context.moveTo(player.radius + 5 * scale, -shieldHeight / 2);
                        context.lineTo(player.radius + shieldWidth - 5 * scale, -shieldHeight / 2);
                        context.quadraticCurveTo(player.radius + shieldWidth, -shieldHeight / 2, player.radius + shieldWidth, -shieldHeight / 2 + 5 * scale);
                        context.lineTo(player.radius + shieldWidth, shieldHeight / 2 - 5 * scale);
                        context.quadraticCurveTo(player.radius + shieldWidth, shieldHeight / 2, player.radius + shieldWidth - 5 * scale, shieldHeight / 2);
                        context.lineTo(player.radius + 5 * scale, shieldHeight / 2);
                        context.quadraticCurveTo(player.radius, shieldHeight / 2, player.radius, shieldHeight / 2 - 5 * scale);
                        context.lineTo(player.radius, -shieldHeight / 2 + 5 * scale);
                        context.quadraticCurveTo(player.radius, -shieldHeight / 2, player.radius + 5 * scale, -shieldHeight / 2);
                        context.closePath();
                        context.fill();
                        context.stroke();

                        if (shield.maxDurability) {
                            const damageRatio = 1 - (shield.durability / shield.maxDurability);
                            if (damageRatio > 0.2) {
                                context.globalAlpha = Math.min(1.0, (damageRatio - 0.2) / 0.6);
                                context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                                context.lineWidth = 1.5 * scale;
                                context.beginPath();
                                context.moveTo(player.radius + shieldWidth * 0.5, -shieldHeight * 0.4);
                                context.lineTo(player.radius + shieldWidth * 0.7, -shieldHeight * 0.2);
                                context.lineTo(player.radius + shieldWidth * 0.4, -shieldHeight * 0.1);
                                context.lineTo(player.radius + shieldWidth * 0.6, shieldHeight * 0.3);
                                context.stroke();
                                context.globalAlpha = 1;
                            }
                        }

                        context.restore();
                    }

                    // Render remote players
                    if (isMultiplayer) {
                        remotePlayersMapRef.current.forEach(p => {
                            const brightness = getBrightnessByDistance(p.x, p.y, visionRadius);
                            if (brightness <= 0) return;

                            context.save();
                            context.globalAlpha = brightness;
                            context.beginPath();
                            context.arc(p.x, p.y, player.radius, 0, Math.PI * 2);
                            context.fillStyle = p.skinColor;
                            context.shadowColor = p.skinColor;
                            context.shadowBlur = 15 * scale;
                            context.fill();
                            context.shadowBlur = 0;
                            context.restore();
                        });
                    }
                }

                // Draw multiplayer elements
                if (isMultiplayer) {
                    drawRemotePlayers(context, scale, cameraScaleRef.current || 1);
                    drawTeamInfo(context, scale, cameraScaleRef.current || 1);
                }
            }

            // Render Start
            context.fillStyle = 'black';
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.save();

            // Apply camera shake and center view on player
            const { ox, oy, rot } = shakerRef.current.sample(dt);

            // Screen-space shake effect
            context.translate(ox, oy);

            // --- View Rotation & Coordinate Logic ---
            context.translate(cx, cy);
            context.scale(cameraScale, cameraScale);

            // For touch, camera rotates with player. For KBM, it's fixed north-up.
            if (hasUsedTouchRef.current) {
                context.rotate(-(playerDirection + Math.PI / 2) + rot);
            } else {
                context.rotate(rot); // Only apply camera shake rotation
            }
            context.translate(-player.x, -player.y);

            const lightPolys = lightsRef.current.map(light => ({
                light,
                poly: getVisionPolygon({ x: light.x, y: light.y }, dynamicSegments, { width: canvas.width, height: canvas.height })
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
                    context.moveTo(0, 0);
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
                if (!Number.isFinite(light.x) || !Number.isFinite(light.y)) return;
                const f = (light.life > 0) ? Math.max(0, light.ttl / light.life) : 0;
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
                    if (!Number.isFinite(r1) || r1 <= 0) { context.restore(); return; }
                    gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, r1);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.35 * f * p})`);
                    gradient.addColorStop(0.25, `rgba(220, 220, 220, ${0.20 * f * p})`);
                    gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
                } else {
                    // Default lighting for other types
                    r1 = (light.type === 'impact' ? 280 : 200) * (0.55 + 0.45 * f) * scale;
                    if (!Number.isFinite(r1) || r1 <= 0) { context.restore(); return; }
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

            // Render smoke clouds
            context.globalCompositeOperation = 'lighter';
            smokeCloudsRef.current.forEach(cloud => {
                if (!pointInPoly(cloud.x, cloud.y, viewPoly)) return; // Simple culling
                const life_p = cloud.lifetime / cloud.maxLifetime;
                const numParticles = 15;
                for (let i = 0; i < numParticles; i++) {
                    const p_rad = cloud.radius * (0.2 + (i / numParticles) * 0.8) * (Math.sin((now / 400 + i * 0.5)) * 0.1 + 0.95);
                    const p_alpha = life_p * (1 - p_rad / cloud.radius) * 0.2;
                    const angle = i * (Math.PI * 2 / numParticles) + (now / 800);
                    const px = cloud.x + Math.cos(angle) * p_rad * 0.3;
                    const py = cloud.y + Math.sin(angle) * p_rad * 0.3;
                    context.fillStyle = `rgba(200, 200, 200, ${p_alpha})`;
                    context.beginPath();
                    context.arc(px, py, p_rad * 0.6, 0, Math.PI * 2);
                    context.fill();
                }
            });
            firePatchesRef.current.forEach(patch => {
                if (!pointInPoly(patch.x, patch.y, viewPoly)) return;
                const life_p = patch.lifetime / patch.maxLifetime;
                const numFlames = 10;
                for (let i = 0; i < numFlames; i++) {
                    const angle = i * (Math.PI * 2 / numFlames) + (now / 300) + (i % 2 * Math.PI);
                    const dist = patch.radius * (0.2 + (i / numFlames) * 0.7) * (Math.sin((now / 200 + i * 0.7)) * 0.1 + 0.95);
                    const flicker = Math.sin(now / 80 + i * 2) * 0.5 + 0.5;
                    const flameRadius = patch.radius * 0.4 * flicker * life_p;
                    const px = patch.x + Math.cos(angle) * dist;
                    const py = patch.y + Math.sin(angle) * dist;

                    const grad = context.createRadialGradient(px, py, 0, px, py, flameRadius);
                    grad.addColorStop(0, `rgba(255, 220, 150, ${0.6 * life_p * flicker})`);
                    grad.addColorStop(0.5, `rgba(255, 120, 0, ${0.4 * life_p * flicker})`);
                    grad.addColorStop(1, `rgba(200, 0, 0, 0)`);
                    context.fillStyle = grad;

                    context.beginPath();
                    context.arc(px, py, flameRadius, 0, Math.PI * 2);
                    context.fill();
                }
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

            if (player.isHealing) {
                context.save();
                context.translate(player.x, player.y);
                const healProgress = 1 - (player.healTimer / HEAL_DURATION);
                context.strokeStyle = 'rgba(74, 222, 128, 0.8)'; // green-400
                context.lineWidth = 4 * scale;
                context.beginPath();
                context.arc(0, 0, player.radius + 6 * scale, -Math.PI / 2, -Math.PI / 2 + healProgress * Math.PI * 2);
                context.stroke();
                context.restore();
            }

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
                if ((player.throwables[currentThrowableType] ?? 0) > 0 || level.name === 'TRAINING GROUND') {
                    let angle: number;
                    let launchPower: number;

                    if (hasUsedTouchRef.current) {
                        angle = playerDirectionRef.current;
                        // 触屏模式下，实时计算滑动距离对应的力度
                        const touchState = touchStateRef.current;
                        if (touchState.throwableSelect.id !== null) {
                            // 正在滑动中，使用实时更新的当前位置
                            const startX = touchState.throwableSelect.startX;
                            const startY = touchState.throwableSelect.startY;
                            const currentX = touchState.throwableSelect.currentX;
                            const currentY = touchState.throwableSelect.currentY;
                            const dist = Math.hypot(currentX - startX, currentY - startY);

                            // 使用与processTouchEnd相同的映射公式
                            const minPower = 3 * scale;
                            const maxPower = 18 * scale;
                            launchPower = Math.max(minPower, Math.min(maxPower, minPower + (dist / 5) * scale));
                        } else {
                            launchPower = 12 * scale; // 默认力度
                        }
                    } else {
                        const mouse = mousePosRef.current;
                        const dx = mouse.x - player.x, dy = mouse.y - player.y;
                        const dist = Math.hypot(dx, dy);
                        launchPower = Math.min(dist / (20 * scale), 15 * scale);
                        angle = Math.atan2(dy, dx);
                    }

                    let tx = player.x, ty = player.y;
                    let tvx = Math.cos(angle) * launchPower, tvy = Math.sin(angle) * launchPower;
                    context.beginPath(); context.strokeStyle = 'rgba(255, 255, 255, 0.5)'; context.lineWidth = 2 * scale; context.setLineDash([2 * scale, 5 * scale]);
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
                    grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - lifePercentage) * brightness})`);
                    grad.addColorStop(0.3, `rgba(200, 200, 200, ${0.8 * (1 - lifePercentage) * brightness})`);
                    grad.addColorStop(1, `rgba(100, 100, 100, 0)`);
                } else {
                    grad = context.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${1.0 * (1 - lifePercentage) * brightness})`);
                    grad.addColorStop(0.1, `rgba(255, 255, 255, ${0.9 * (1 - lifePercentage) * brightness})`);
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

            // Show enemy count range hint at start of mission (non-specific, do not show exact number)
            if (enemyRangeDisplayTimerRef.current > 0) {
                enemyRangeDisplayTimerRef.current -= dt;
                const rangeInfo = (level as any).enemyCountRange ? `${(level as any).enemyCountRange.min} - ${(level as any).enemyCountRange.max}` : (level.enemyCount ? `${level.enemyCount}` : `${level.enemies.length}`);
                context.save();
                context.font = `bold ${18 * scale}px mono`;
                context.fillStyle = 'rgba(255, 255, 255, 0.95)';
                context.textAlign = 'center';
                context.fillText(`Enemy density: ${rangeInfo}`, canvas.width / 2, 40 * scale);
                context.restore();
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
                if (player.flashTimer < fadeOutStart) {
                    alpha = player.flashTimer / fadeOutStart;
                }
                context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                context.fillRect(0, 0, canvas.width, canvas.height);
            }

            // --- UI ---
            const barWidth = 200 * scale, barHeight = 20 * scale, margin = 20 * scale;
            let uiY = canvas.height - barHeight - margin;

            const shield = player.weapons.find(w => w.name === 'Riot Shield');
            if (shield && shield.maxDurability) {
                const shieldBarHeight = 10 * scale;
                const shieldPercentage = Math.max(0, shield.durability || 0) / shield.maxDurability;
                context.font = `${14 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'left';
                context.fillText('SHIELD', margin, uiY - (5 * scale));
                context.strokeStyle = 'rgba(255, 255, 255, 0.5)'; context.lineWidth = 2 * scale; context.strokeRect(margin, uiY, barWidth, shieldBarHeight);
                context.fillStyle = 'rgba(255, 255, 255, 0.1)'; context.fillRect(margin, uiY, barWidth, shieldBarHeight);
                context.fillStyle = '#60a5fa'; // Blue color for shield
                context.fillRect(margin, uiY, barWidth * shieldPercentage, shieldBarHeight);
                uiY -= (shieldBarHeight + 20 * scale);
            }

            const healthPercentage = Math.max(0, player.health) / player.maxHealth;
            let healthColor = '#e5e5e5';
            if (healthPercentage < 0.6) healthColor = '#a3a3a3';
            if (healthPercentage < 0.3) healthColor = '#525252';

            context.font = `${14 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'left';
            context.fillText('HEALTH', margin, uiY - (5 * scale));
            context.strokeStyle = 'rgba(255, 255, 255, 0.5)'; context.lineWidth = 2 * scale; context.strokeRect(margin, uiY, barWidth, barHeight);
            context.fillStyle = 'rgba(255, 255, 255, 0.1)'; context.fillRect(margin, uiY, barWidth, barHeight);
            context.fillStyle = healthColor; context.fillRect(margin, uiY, barWidth * healthPercentage, barHeight);

            // Medkit display
            const medkitX = margin + barWidth + 15 * scale;
            const medkitY = uiY + barHeight / 2;
            context.font = `bold ${24 * scale}px mono`;
            context.fillStyle = 'white';
            context.textAlign = 'left';
            context.textBaseline = 'middle';
            context.fillText('+', medkitX, medkitY + 2 * scale); // Simple cross icon
            context.font = `bold ${20 * scale}px mono`;
            context.fillText(player.medkits.toString(), medkitX + 20 * scale, medkitY);
            context.textBaseline = 'alphabetic';

            const weaponTextY = canvas.height - barHeight - margin - (30 * scale);
            context.font = `bold ${18 * scale}px mono`; context.fillStyle = 'white'; context.textAlign = 'left';

            if (currentWeapon && currentWeapon.category === 'melee') {
                const weaponKey = '[3]';
                const isReady = player.shootCooldown <= 0;
                const wname = currentWeapon.name ? String(currentWeapon.name).toUpperCase() : 'NO WEAPON';
                context.fillText(`${wname} ${weaponKey}`, margin, weaponTextY - (20 * scale));
                context.fillStyle = isReady ? 'white' : '#999999';
                context.fillText(isReady ? `READY` : `COOLDOWN: ${(player.shootCooldown).toFixed(1)}s`, margin, weaponTextY);
            } else {
                let weaponKey = '';
                if (player.currentWeaponIndex === 0) weaponKey = '[1]';
                else if (player.currentWeaponIndex === 1) weaponKey = '[2]';
                else if (player.currentWeaponIndex === 3) weaponKey = '[4]';
                const fireModeText = currentWeapon && currentWeapon.currentFireMode ? `[${String(currentWeapon.currentFireMode).toUpperCase()}]` : '';
                const wname = currentWeapon && currentWeapon.name ? String(currentWeapon.name).toUpperCase() : 'NO WEAPON';
                context.fillText(`${wname} ${weaponKey} ${fireModeText}`, margin, weaponTextY - (20 * scale));
                context.font = `${14 * scale}px mono`;
                context.fillStyle = '#a3a3a3';
                context.fillText(`[G] Mode / [Q] Melee / [4] Special`, margin, weaponTextY - (5 * scale));

                context.font = `bold ${18 * scale}px mono`;
                let ammoText = '';
                if (player.isReloading) {
                    context.fillStyle = '#d4d4d4'; ammoText = 'RELOADING...';
                } else {
                    context.fillStyle = (currentWeapon.magSize !== -1 && currentWeapon.ammoInMag === 0 && level.name !== 'TRAINING GROUND' && !isMultiplayer) ? '#999999' : 'white';
                    if (level.name === 'TRAINING GROUND' || isMultiplayer) {
                        ammoText = (currentWeapon.magSize === -1) ? '∞' : `${currentWeapon.ammoInMag} / ∞`;
                    } else {
                        ammoText = (currentWeapon.magSize === -1) ? '∞' : `${currentWeapon.ammoInMag} / ${currentWeapon.reserveAmmo}`;
                    }
                }
                context.fillText(ammoText, margin, weaponTextY + 15 * scale);
            }

            const currentThrowableType = player.throwableTypes[player.currentThrowableIndex];
            const throwableCount = player.throwables[currentThrowableType] ?? 0;
            context.font = `bold ${18 * scale}px mono`;
            context.fillStyle = 'white';
            context.textAlign = 'right';
            if (currentThrowableType) {
                context.fillText(`${currentThrowableType.toUpperCase()}`, canvas.width - margin, weaponTextY - (20 * scale));
                if (level.name === 'TRAINING GROUND') {
                    context.fillText(`∞`, canvas.width - margin, weaponTextY);
                } else {
                    context.fillText(`${throwableCount}`, canvas.width - margin, weaponTextY);
                }
                context.font = `${14 * scale}px mono`;
                context.fillStyle = '#a3a3a3';
                if (isAimingThrowableRef.current) {
                    context.fillText(`Release to throw`, canvas.width - margin, weaponTextY + (20 * scale));
                } else {
                    context.fillText(`[T] Switch / [F] Hold`, canvas.width - margin, weaponTextY + (20 * scale));
                }
            }
            if (touchState.joystick.id === null) {
                const hintTextPos = { x: player.x, y: player.y - player.radius - (20 * scale) };
                // Display only one context hint at a time, with priority.
                if (takedownHintEnemyRef.current) { // Priority 1: Takedown
                    const enemy = takedownHintEnemyRef.current;
                    if (pointInPoly(enemy.x, enemy.y, viewPoly)) {
                        // Convert world pos to screen pos for hint
                        const enemyScreenPos = {
                            x: (enemy.x - player.x) * Math.cos(-(playerDirection + Math.PI / 2)) - (enemy.y - player.y) * Math.sin(-(playerDirection + Math.PI / 2)) + cx,
                            y: (enemy.x - player.x) * Math.sin(-(playerDirection + Math.PI / 2)) + (enemy.y - player.y) * Math.cos(-(playerDirection + Math.PI / 2)) + cy,
                        }
                        context.font = `bold ${14 * scale}px mono`;
                        context.fillStyle = 'white';
                        context.textAlign = 'center';
                        context.shadowColor = 'black';
                        context.shadowBlur = 5 * scale;
                        context.fillText('[E] TAKEDOWN', enemyScreenPos.x, enemyScreenPos.y - enemy.radius * 2);
                        context.shadowBlur = 0;
                    }
                } else if (interactionHintDoorIdRef.current !== null) {
                    const door = doorsRef.current.find(d => d.id === interactionHintDoorIdRef.current);
                    if (door) {
                        const midX = door.hinge.x + (door.length / 2) * Math.cos(door.currentAngle);
                        const midY = door.hinge.y + (door.length / 2) * Math.sin(door.currentAngle);
                        if (pointInPoly(midX, midY, viewPoly)) {
                            context.font = `bold ${14 * scale}px mono`;
                            context.fillStyle = 'white';
                            context.textAlign = 'center';
                            context.shadowColor = 'black';
                            context.shadowBlur = 5 * scale;
                            context.fillText('[E] INTERACT', midX, midY - 20 * scale);
                            context.shadowBlur = 0;
                        }
                    }
                } else if (lockedDoorHintIdRef.current) {
                    const door = doorsRef.current.find(d => d.id === lockedDoorHintIdRef.current);
                    if (door) {
                        const midX = door.hinge.x + (door.length / 2) * Math.cos(door.currentAngle);
                        const midY = door.hinge.y + (door.length / 2) * Math.sin(door.currentAngle);
                        if (pointInPoly(midX, midY, viewPoly)) {
                            context.font = `bold ${14 * scale}px mono`;
                            context.fillStyle = 'red';
                            context.textAlign = 'center';
                            context.shadowColor = 'black';
                            context.shadowBlur = 5 * scale;
                            context.fillText('LOCKED', midX, midY - 20 * scale);
                            context.shadowBlur = 0;
                        }
                    }
                }
            }

            // Game Over / Mission Complete Panel (redesigned)
            if (isEnded) {
                const endDelay = END_SCREEN_MIN_DELAY; // ms
                if (now - (missionEndTimeRef.current ?? 0) > endDelay) {
                    // DEBUG: log end-screen values to help debug missing score
                    try { console.log('[EndScreen] runScore=', runScoreRef.current, ' totalScore=', totalScore, ' initialEnemies=', initialEnemyCountRef.current, ' level.isTrainingGround=', level.isTrainingGround); } catch { }
                    // Dim background
                    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    // Compute stats
                    const aliveEnemies = enemiesRef.current.filter(e => !e.isDummy && e.health > 0).length;
                    const totalEnemies = initialEnemyCountRef.current || 0;
                    const kills = Math.max(0, totalEnemies - aliveEnemies);

                    // Panel dimensions
                    const panelW = Math.min(900, canvas.width * 0.8);
                    const panelH = Math.min(360 * scale, canvas.height * 0.6);
                    const px = cx - panelW / 2;
                    const py = cy - panelH / 2;
                    const radius = 12 * scale;

                    // Draw panel background (rounded)
                    context.beginPath();
                    context.moveTo(px + radius, py);
                    context.lineTo(px + panelW - radius, py);
                    context.quadraticCurveTo(px + panelW, py, px + panelW, py + radius);
                    context.lineTo(px + panelW, py + panelH - radius);
                    context.quadraticCurveTo(px + panelW, py + panelH, px + panelW - radius, py + panelH);
                    context.lineTo(px + radius, py + panelH);
                    context.quadraticCurveTo(px, py + panelH, px, py + panelH - radius);
                    context.lineTo(px, py + radius);
                    context.quadraticCurveTo(px, py, px + radius, py);
                    context.closePath();
                    context.fillStyle = 'rgba(6, 10, 16, 0.95)';
                    context.fill();
                    context.lineWidth = 2;
                    context.strokeStyle = 'rgba(255,255,255,0.06)';
                    context.stroke();

                    // Title
                    context.textAlign = 'center';
                    context.shadowColor = 'black';
                    context.shadowBlur = 8 * scale;
                    context.font = `bold ${36 * scale}px mono`;
                    if (isMissionCompleteRef.current) {
                        context.fillStyle = '#10b981';
                        context.fillText('MISSION COMPLETE', cx, py + 52 * scale);
                    } else {
                        context.fillStyle = '#ef4444';
                        context.fillText('MISSION FAILED', cx, py + 52 * scale);
                    }
                    context.shadowBlur = 0;

                    // Left column: stats
                    const leftX = px + panelW * 0.25;
                    const rightX = px + panelW * 0.75;
                    let rowY = py + 100 * scale;
                    const rowGap = 34 * scale;

                    context.textAlign = 'left';
                    context.font = `bold ${18 * scale}px mono`;
                    context.fillStyle = '#cbd5e1';
                    context.fillText('Mission Time:', leftX, rowY);
                    context.font = `${18 * scale}px mono`;
                    context.fillStyle = 'white';
                    context.fillText(`${missionTimeRef.current.toFixed(2)}s`, leftX + 160 * scale, rowY);

                    rowY += rowGap;
                    context.font = `bold ${18 * scale}px mono`;
                    context.fillStyle = '#cbd5e1';
                    context.fillText('Kills:', leftX, rowY);
                    context.font = `${18 * scale}px mono`;
                    context.fillStyle = 'white';
                    context.fillText(`${kills} / ${totalEnemies}`, leftX + 160 * scale, rowY);

                    // Right column: scores
                    rowY = py + 100 * scale;
                    context.textAlign = 'left';
                    context.font = `bold ${18 * scale}px mono`;
                    context.fillStyle = '#cbd5e1';
                    context.fillText('Run Score:', rightX - 80 * scale, rowY);
                    context.font = `bold ${22 * scale}px mono`;
                    context.fillStyle = '#34d399';
                    context.fillText(`${runScoreRef.current}`, rightX + 40 * scale, rowY);

                    rowY += rowGap;
                    context.font = `bold ${16 * scale}px mono`;
                    context.fillStyle = '#94a3b8';
                    const projectedTotal = (typeof totalScore === 'number' ? totalScore : 0) + (level.isTrainingGround ? 0 : runScoreRef.current);
                    context.fillText('Projected Total:', rightX - 80 * scale, rowY);
                    context.font = `${16 * scale}px mono`;
                    context.fillStyle = 'white';
                    context.fillText(`${projectedTotal}`, rightX + 40 * scale, rowY);

                    rowY += rowGap;
                    context.font = `bold ${16 * scale}px mono`;
                    context.fillStyle = '#94a3b8';
                    const globalHigh = typeof highScore !== 'undefined' ? highScore : 0;
                    context.fillText('High Score:', rightX - 80 * scale, rowY);
                    context.font = `${16 * scale}px mono`;
                    context.fillStyle = (runScore > globalHigh) ? '#f59e0b' : 'white';
                    context.fillText(`${globalHigh}`, rightX + 40 * scale, rowY);

                    // Footer: instruction
                    context.textAlign = 'center';
                    context.font = `${18 * scale}px mono`;
                    context.fillStyle = '#94a3b8';
                    context.fillText('Tap or press Space to continue', cx, py + panelH - 32 * scale);
                }
            }

            const buttonRadius = 25 * scale;
            pauseButtonCircleRef.current = { x: canvas.width - buttonRadius - margin, y: buttonRadius + margin, r: buttonRadius };


            // --- Draw touch controls on top of everything ---
            if (hasUsedTouchRef.current && !isEnded) {
                context.save();

                // Draw Pause Button
                const pauseCircle = pauseButtonCircleRef.current;
                context.globalAlpha = 0.5;
                context.fillStyle = 'rgba(31, 41, 55, 0.5)';
                context.strokeStyle = 'rgba(75, 85, 99, 0.5)';
                context.lineWidth = 2 * scale;
                context.beginPath();
                context.arc(pauseCircle.x, pauseCircle.y, pauseCircle.r, 0, Math.PI * 2);
                context.fill();
                context.stroke();

                context.fillStyle = '#5eead4';
                const barWidth = 4 * scale;
                const barHeight = 16 * scale;
                const barGap = 4 * scale;
                context.fillRect(pauseCircle.x - barGap / 2 - barWidth, pauseCircle.y - barHeight / 2, barWidth, barHeight);
                context.fillRect(pauseCircle.x + barGap / 2, pauseCircle.y - barHeight / 2, barWidth, barHeight);

                context.globalAlpha = customControls.opacity;

                for (const key in touchButtonRectsRef.current) {
                    const { x, y, r } = touchButtonRectsRef.current[key];
                    const isActive = (touchStateRef.current as any)[key].id !== null;
                    context.beginPath();
                    context.arc(x, y, r, 0, Math.PI * 2);
                    context.fillStyle = isActive ? `rgba(255, 255, 255, 0.4)` : `rgba(255, 255, 255, 0.2)`;
                    context.fill();

                    // --- Draw more intuitive icons ---
                    context.strokeStyle = `rgba(255, 255, 255, ${isActive ? 1.0 : 0.8})`;
                    context.fillStyle = `rgba(255, 255, 255, ${isActive ? 1.0 : 0.8})`;
                    context.lineWidth = Math.max(2, r * 0.08);
                    context.lineCap = 'round';
                    context.lineJoin = 'round';

                    switch (key) {
                        case 'fire':
                        case 'fixedFire': { // Crosshair icon
                            const gap = r * 0.15;
                            const len = r * 0.5;
                            context.beginPath();
                            context.moveTo(x, y - gap); context.lineTo(x, y - len);
                            context.moveTo(x, y + gap); context.lineTo(x, y + len);
                            context.moveTo(x - gap, y); context.lineTo(x - len, y);
                            context.moveTo(x + gap, y); context.lineTo(x + len, y);
                            context.stroke();
                            break;
                        }
                        case 'reload': { // Reload icon with magazine
                            // Circular arrow
                            context.beginPath();
                            context.arc(x, y, r * 0.45, Math.PI * 0.25, Math.PI * 1.75);
                            context.stroke();
                            // Arrowhead
                            context.save();
                            context.translate(x + r * 0.45 * Math.cos(Math.PI * 1.75), y + r * 0.45 * Math.sin(Math.PI * 1.75));
                            context.rotate(Math.PI * 1.75 + Math.PI / 2);
                            context.beginPath();
                            context.moveTo(0, 0);
                            context.lineTo(-r * 0.15, r * 0.15);
                            context.lineTo(r * 0.15, r * 0.15);
                            context.closePath();
                            context.fill();
                            context.restore();
                            // Magazine shape in center
                            context.strokeRect(x - r * 0.15, y - r * 0.25, r * 0.3, r * 0.5);
                            context.strokeRect(x - r * 0.2, y - r * 0.3, r * 0.4, r * 0.1);
                            break;
                        }
                        case 'heal': { // Medical cross
                            context.fillRect(x - r * 0.1, y - r * 0.4, r * 0.2, r * 0.8);
                            context.fillRect(x - r * 0.4, y - r * 0.1, r * 0.8, r * 0.2);
                            break;
                        }
                        case 'special': { // Star icon
                            const spikes = 5;
                            const outerRadius = r * 0.6;
                            const innerRadius = r * 0.25;
                            let angle = Math.PI / 2;
                            const angleStep = Math.PI / spikes;

                            context.beginPath();
                            for (let i = 0; i < spikes * 2; i++) {
                                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                                context.lineTo(x + radius * Math.sin(angle), y - radius * Math.cos(angle));
                                angle += angleStep;
                            }
                            context.closePath();
                            context.fill();
                            break;
                        }
                        case 'interact': { // Cog icon
                            const spikes = 6;
                            const outerRadius = r * 0.55;
                            const innerRadius = r * 0.35;
                            const holeRadius = r * 0.2;
                            let angle = 0;
                            const slice = (Math.PI * 2) / (spikes * 2);

                            context.beginPath();
                            for (let i = 0; i < spikes * 2; i++) {
                                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                                context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
                                angle += slice;
                            }
                            context.closePath();
                            context.fill();

                            context.globalCompositeOperation = 'destination-out';
                            context.beginPath();
                            context.arc(x, y, holeRadius, 0, Math.PI * 2);
                            context.fill();
                            context.globalCompositeOperation = 'source-over';
                            break;
                        }
                        case 'switchWeapon': { // Two rects with arrows
                            context.strokeRect(x - r * 0.4, y - r * 0.4, r * 0.8, r * 0.25);
                            context.strokeRect(x - r * 0.4, y + r * 0.15, r * 0.8, r * 0.25);
                            context.beginPath();
                            context.moveTo(x + r * 0.2, y - r * 0.05); context.lineTo(x + r * 0.2, y + r * 0.05); context.lineTo(x + r * 0.3, y);
                            context.moveTo(x - r * 0.2, y + r * 0.05); context.lineTo(x - r * 0.2, y - r * 0.05); context.lineTo(x - r * 0.3, y);
                            context.fill();
                            break;
                        }
                        case 'melee': { // Knife icon
                            context.beginPath();
                            context.moveTo(x - r * 0.1, y + r * 0.5);
                            context.lineTo(x + r * 0.1, y + r * 0.3);
                            context.lineTo(x, y + r * 0.2);
                            context.closePath();
                            context.fill();
                            context.beginPath();
                            context.moveTo(x, y + r * 0.2);
                            context.quadraticCurveTo(x - r * 0.5, y - r * 0.1, x + r * 0.1, y - r * 0.5);
                            context.quadraticCurveTo(x + r * 0.4, y, x, y + r * 0.2);
                            context.closePath();
                            context.fill();
                            break;
                        }
                        case 'throwableSelect': { // Grenade Icon
                            context.beginPath();
                            context.arc(x, y + r * 0.1, r * 0.4, 0, Math.PI * 2);
                            context.fill();
                            context.fillRect(x - r * 0.15, y - r * 0.5, r * 0.3, r * 0.2);
                            context.beginPath();
                            context.moveTo(x + r * 0.1, y - r * 0.3);
                            context.lineTo(x + r * 0.1, y + r * 0.1);
                            context.stroke();
                            context.beginPath();
                            context.arc(x - r * 0.2, y - r * 0.4, r * 0.1, 0, Math.PI * 2);
                            context.stroke();
                            break;
                        }
                        case 'switchThrowable': { // Cycle icon
                            // Top arc with arrow
                            context.beginPath();
                            context.arc(x, y, r * 0.4, Math.PI, Math.PI * 2);
                            context.stroke();
                            context.beginPath();
                            context.moveTo(x + r * 0.4, y);
                            context.lineTo(x + r * 0.4 - r * 0.2, y - r * 0.1);
                            context.lineTo(x + r * 0.4 - r * 0.2, y + r * 0.1);
                            context.closePath();
                            context.fill();

                            // Bottom arc with arrow
                            context.beginPath();
                            context.arc(x, y, r * 0.4, 0, Math.PI);
                            context.stroke();
                            context.beginPath();
                            context.moveTo(x - r * 0.4, y);
                            context.lineTo(x - r * 0.4 + r * 0.2, y - r * 0.1);
                            context.lineTo(x - r * 0.4 + r * 0.2, y + r * 0.1);
                            context.closePath();
                            context.fill();
                            break;
                        }
                        case 'fireModeSwitch': { // Icon showing fire modes
                            const bulletR = r * 0.08;
                            context.beginPath(); context.arc(x, y - r * 0.3, bulletR, 0, Math.PI * 2); context.fill();
                            const midY = y;
                            context.beginPath(); context.arc(x - r * 0.2, midY, bulletR, 0, Math.PI * 2); context.fill();
                            context.beginPath(); context.arc(x, midY, bulletR, 0, Math.PI * 2); context.fill();
                            context.beginPath(); context.arc(x + r * 0.2, midY, bulletR, 0, Math.PI * 2); context.fill();
                            context.fillRect(x - r * 0.3, y + r * 0.25, r * 0.6, r * 0.15);
                            break;
                        }
                    }
                }
                // Draw joystick handle
                const joystick = touchStateRef.current.joystick;
                if (joystick.id !== null) {
                    const { x, y, r } = touchButtonRectsRef.current.joystick;
                    const handleX = x + joystick.dx * r * 0.5;
                    const handleY = y + joystick.dy * r * 0.5;
                    context.beginPath();
                    context.arc(handleX, handleY, r * 0.4, 0, Math.PI * 2);
                    context.fillStyle = `rgba(255, 255, 255, ${customControls.opacity * 1.5})`;
                    context.fill();
                }
                context.restore();
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        const resizeHandler = () => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                scaleRef.current = canvas.height / BASE_LOGICAL_HEIGHT;
                resetGame();
            }
        };

        const handleResize = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
            resizeHandler();
        };

        resizeHandler();
        gameLoop();

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            // Clear end auto-close timer if component unmounts
            if (endAutoCloseTimerRef.current) { clearTimeout(endAutoCloseTimerRef.current); endAutoCloseTimerRef.current = null; }
        };
    }, [level, difficulty, loadout, customControls, aimSensitivity, agentSkinColor, isMultiplayer]);

    useEffect(() => {
        if (!networkClient || !isMultiplayer) return;

        const handleConnect = (payload: { id: string }) => console.log('Connected to mock server with ID:', payload.id);
        const handlePlayerJoined = (payload: PlayerState) => {
            // Ignore our own player as a "remote" entry to avoid echo-caused duplicates
            try { if (networkClient && payload.id === networkClient.ownId) return; } catch (e) { }
            remotePlayersMapRef.current.set(payload.id, { ...payload, targetX: payload.x, targetY: payload.y, lastUpdateTime: performance.now(), isShooting: false });
        };
        const handlePlayerLeft = (payload: { id: string }) => {
            try { if (networkClient && payload.id === networkClient.ownId) return; } catch (e) { }
            remotePlayersMapRef.current.delete(payload.id);
        };
        const handlePlayerUpdate = (payload: PlayerState & { isShooting: boolean }) => {
            try { if (networkClient && payload.id === networkClient.ownId) return; } catch (e) { }
            const p = remotePlayersMapRef.current.get(payload.id);
            if (p) {
                p.targetX = payload.x; p.targetY = payload.y; p.direction = payload.direction; p.health = payload.health; p.isShooting = payload.isShooting; p.lastUpdateTime = performance.now();
            } else {
                handlePlayerJoined(payload);
            }
        };
        const handleFireWeapon = (payload: FireEventPayload) => {
            // Ignore fire events that originated from ourselves (they may be echoed back by the server)
            try { if (networkClient && payload.ownerId === networkClient.ownId) return; } catch (e) { }
            const p = remotePlayersMapRef.current.get(payload.ownerId);
            const weaponDef = WEAPONS[payload.weaponName];
            if (p && weaponDef) {
                // FIX: Create a proper Weapon instance for the remote player to pass to createFireEffects
                const scale = scaleRef.current;
                const cameraScale = cameraScaleRef.current;
                const remoteWeapon: Weapon = {
                    ...weaponDef,
                    bulletSpeed: weaponDef.bulletSpeed * scale / cameraScale,
                    bulletRadius: weaponDef.bulletRadius * scale / cameraScale,
                    shake: (ux: number, uy: number) => {
                        const shakeFunc = weaponShakeFunctions[weaponDef.name];
                        if (shakeFunc) {
                            shakeFunc(shakerRef.current, scale, ux, uy);
                        }
                    },
                    currentFireMode: weaponDef.defaultFireMode,
                    ammoInMag: weaponDef.magSize,
                    reserveAmmo: weaponDef.reserveAmmo,
                };
                const dynamicSegments: Segment[] = [...wallSegmentsRef.current];
                doorsRef.current.forEach(d => dynamicSegments.push({ a: d.hinge, b: { x: d.hinge.x + d.length * Math.cos(d.currentAngle), y: d.hinge.y + d.length * Math.sin(d.currentAngle) } }));
                createFireEffects(p.x, p.y, playerRef.current.radius, payload.baseAngle, remoteWeapon, 'enemy', dynamicSegments);
            }
        };
        const handleDropWeapon = (payload: { id?: string; playerId: string; weaponName: string; x: number; y: number }) => {
            try {
                // Use provided id when available so clients share the same drop id
                const id = payload.id || `drop_net_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                // Avoid inserting duplicate drop ids
                const exists = weaponDropsRef.current.find(d => d.id === id);
                if (!exists) {
                    const drop: WeaponDrop = { id, weaponName: payload.weaponName, x: payload.x, y: payload.y };
                    weaponDropsRef.current.push(drop);
                }
            } catch (e) { }
        };
        const handlePickupWeapon = (payload: { playerId: string; weaponName: string; id?: string }) => {
            try {
                // If a drop id is provided, remove that drop so all clients stay in sync (first-come-first-serve)
                if (payload.id) {
                    const idx = weaponDropsRef.current.findIndex(d => d.id === payload.id);
                    if (idx >= 0) {
                        weaponDropsRef.current.splice(idx, 1);
                    }
                }
                console.log('[Network] pickup-weapon', payload);
            } catch (e) { }
        };
        const handleStartRound = (payload: { roundId: string }) => {
            // Only open shop on THE_FACTORY
            if (level.name === 'THE FACTORY') {
                // Convert current runScore to money for the round (already done in addScore), show shop
                openShopForRound();
            }
        };
        const handleBuyWeapon = (payload: { playerId: string; weaponName: string; cost: number; attachments?: any }) => {
            // Could display notifications; if payload.playerId === ownId we already processed purchase locally
            console.log('[Network] buy-weapon', payload);
            try {
                const { playerId, weaponName, attachments } = payload;
                if (playerId !== (networkClient && networkClient.ownId)) {
                    // Find remote player and apply purchased weapon instance
                    const rp = remotePlayersMapRef.current.get(playerId);
                    const created = createWeaponWithAttachments(weaponName, attachments || {});
                    if (rp) {
                        rp['weapons'] = rp['weapons'] || [];
                        rp['weapons'].push(created || { name: weaponName });
                    }
                    // show small on-screen message
                    setPurchaseMessage(`${playerId} bought ${weaponName}`);
                    setTimeout(() => setPurchaseMessage(null), 2000);
                }
            } catch (e) { console.error(e); }
        };

        networkClient.on('connect', handleConnect as any);
        networkClient.on('player-joined', handlePlayerJoined as any);
        networkClient.on('player-left', handlePlayerLeft as any);
        networkClient.on('player-update', handlePlayerUpdate as any);
        networkClient.on('fire-weapon', handleFireWeapon as any);
        networkClient.on('drop-weapon', handleDropWeapon as any);
        networkClient.on('pickup-weapon', handlePickupWeapon as any);
        networkClient.on('start-round', handleStartRound as any);
        networkClient.on('buy-weapon', handleBuyWeapon as any);
        const handlePlayerHit = (payload: { targetId: string; damage: number; attackerId: string; impact?: { x: number; y: number }; sourceDir?: { x: number; y: number } }) => {
            try {
                if (!networkClient) return;
                const own = networkClient.ownId;
                console.debug('[Net] recv player-hit', { payload, own });
                if (!own) return;
                if (payload.targetId === own) {
                    // Apply damage locally
                    applyDamageToPlayer(payload.damage, payload.sourceDir || { x: 0, y: 0 }, payload.impact || { x: playerRef.current.x, y: playerRef.current.y });
                } else {
                    // Not for us; ignore (the remote client's UI will update its player state)
                }
            } catch (e) { }
        };
        networkClient.on('player-hit', handlePlayerHit as any);

        // Connect to server
        networkClient.connect();

        // Send initial player state after connection
        const sendInitialState = () => {
            if (networkClient.connected) {
                const player = playerRef.current;
                (networkClient as any).send('player-update', {
                    id: networkClient.ownId,
                    x: player.x,
                    y: player.y,
                    direction: playerDirectionRef.current,
                    health: player.health,
                    skinColor: agentSkinColor,
                    isShooting: false
                });
            }
        };

        // Send initial state when connected
        if (networkClient.connected) {
            sendInitialState();
        } else {
            networkClient.on('connect', sendInitialState as any);
        }

        const intervalId = setInterval(() => {
            if (networkClient.connected) {
                const player = playerRef.current;
                const isShooting = isShootingRef.current || touchStateRef.current.fire.id !== null || touchStateRef.current.fixedFire.id !== null;
                (networkClient as any).send('player-update', { id: networkClient.ownId, x: player.x, y: player.y, direction: playerDirectionRef.current, health: player.health, skinColor: agentSkinColor, isShooting });
            }
        }, 100);

        return () => {
            networkClient.off('connect', handleConnect as any);
            networkClient.off('player-joined', handlePlayerJoined as any);
            networkClient.off('player-left', handlePlayerLeft as any);
            networkClient.off('player-update', handlePlayerUpdate as any);
            networkClient.off('fire-weapon', handleFireWeapon as any);
            networkClient.off('drop-weapon', handleDropWeapon as any);
            networkClient.off('pickup-weapon', handlePickupWeapon as any);
            networkClient.off('start-round', handleStartRound as any);
            networkClient.off('buy-weapon', handleBuyWeapon as any);
            networkClient.off('player-hit', handlePlayerHit as any);
            clearInterval(intervalId);
        };
    }, [networkClient, isMultiplayer, agentSkinColor]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only allow skipping the end screen with Space key after the minimal show delay; otherwise ignore
            if (isGameOverRef.current || isMissionCompleteRef.current) {
                if (e.code === 'Space' || e.key === ' ') {
                    // Only trigger onMissionEnd if end screen has been visible long enough
                    if (missionEndTimeRef.current && performance.now() - missionEndTimeRef.current > END_SCREEN_MIN_DELAY) {
                        // Clear auto-close timer if any
                        if (endAutoCloseTimerRef.current) { clearTimeout(endAutoCloseTimerRef.current); endAutoCloseTimerRef.current = null; }
                        onMissionEnd();
                    }
                }
                return;
            }
            if (e.key.toLowerCase() === 'p') { setIsPaused(p => !p); setShowInGameSettings(false); return; }
            if (isPausedRef.current) return;
            keysPressedRef.current.add(e.key.toLowerCase());
            const player = playerRef.current;
            switch (e.key.toLowerCase()) {
                case 'r': if (!player.isReloading && player.weapons[player.currentWeaponIndex].ammoInMag < player.weapons[player.currentWeaponIndex].magSize) { player.isReloading = true; player.reloadTimer = player.weapons[player.currentWeaponIndex].reloadTime; } break;
                case 'e':
                    const now = performance.now();
                    if (takedownHintEnemyRef.current) {
                        const enemy = takedownHintEnemyRef.current;
                        const healthBefore = enemy.health;
                        enemy.health = 0;
                        if (healthBefore > 0) {
                            takedownEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 60 * scaleRef.current, lifetime: 0.4, maxLifetime: 0.4 });
                            soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 150 * scaleRef.current / cameraScaleRef.current, lifetime: 0.25, maxLifetime: 0.25, type: 'slash' });
                        }
                    } else if (interactionHintDoorIdRef.current !== null) {
                        if (now - lastEKeyPressTimeRef.current < 300 && lastInteractedDoorIdRef.current === interactionHintDoorIdRef.current) {
                            const door = doorsRef.current.find(d => d.id === interactionHintDoorIdRef.current);
                            if (door) door.targetAngle = Math.abs(door.currentAngle - door.closedAngle) < 0.1 ? (door.closedAngle + door.maxOpenAngle * door.swingDirection) : door.closedAngle;
                        } else {
                            startDoorInteraction();
                        }
                        lastEKeyPressTimeRef.current = now;
                        lastInteractedDoorIdRef.current = interactionHintDoorIdRef.current;
                    }
                    // Manual pickup: check nearby weapon drops
                    try {
                        const px = player.x, py = player.y;
                        const drops = weaponDropsRef.current;
                        let pickedIndex = -1;
                        for (let i = 0; i < drops.length; i++) {
                            const d = drops[i];
                            const dist = Math.hypot(d.x - px, d.y - py);
                            if (dist < 40) { pickedIndex = i; break; }
                        }
                        if (pickedIndex >= 0) {
                            const drop = drops[pickedIndex];
                            // Determine the proper slot for this weapon based on its category
                            const def = WEAPONS[drop.weaponName];
                            let targetSlotIndex = player.currentWeaponIndex;
                            if (def) {
                                switch (def.category) {
                                    case 'primary': targetSlotIndex = 0; break;
                                    case 'secondary': targetSlotIndex = 1; break;
                                    case 'melee': targetSlotIndex = 2; break;
                                    case 'special': targetSlotIndex = 3; break;
                                    default: break;
                                }
                            }
                            // First-come-first-serve: remove the drop locally and broadcast pickup with id
                            try {
                                // Remove local drop immediately
                                drops.splice(pickedIndex, 1);
                                try { weaponDropsRef.current = drops; } catch { }
                                // Create a weapon instance applying any selected attachments
                                let newInstance: Weapon | null = null;
                                try {
                                    newInstance = createWeaponWithAttachments(drop.weaponName, selectedAttachmentsRef.current[drop.weaponName] || {});
                                } catch (e) {
                                    // fallback: make a simple copy
                                    const d = WEAPONS[drop.weaponName];
                                    if (d) {
                                        const temp: any = { ...d };
                                        temp.ammoInMag = d.magSize;
                                        temp.reserveAmmo = d.reserveAmmo;
                                        temp.allowedFireModes = [...d.allowedFireModes];
                                        temp.currentFireMode = d.defaultFireMode;
                                        temp.shake = (ux: number, uy: number) => { };
                                        newInstance = temp as Weapon;
                                    }
                                }
                                if (newInstance) {
                                    player.weapons[targetSlotIndex] = newInstance;
                                }
                                // Broadcast pickup with id for cross-client removal
                                try { networkClient && (networkClient as any).send('pickup-weapon', { playerId: networkClient.ownId, weaponName: drop.weaponName, id: drop.id }); } catch { }
                            } catch (e) { }
                        }
                    } catch (e) { }
                    break;
                case 'b':
                    // Open shop (local test) only on factory
                    if (level.name === 'THE FACTORY') {
                        openShopForRound();
                    }
                    break;
                case '1': if (!player.isReloading) { previousWeaponIndexRef.current = player.currentWeaponIndex; player.currentWeaponIndex = 0; } break;
                case '2': if (!player.isReloading) { previousWeaponIndexRef.current = player.currentWeaponIndex; player.currentWeaponIndex = 1; } break;
                case '3': if (!player.isReloading) { previousWeaponIndexRef.current = player.currentWeaponIndex; player.currentWeaponIndex = 2; } break;
                case '4': if (!player.isReloading) { previousWeaponIndexRef.current = player.currentWeaponIndex; player.currentWeaponIndex = 3; } break;
                case 'f':
                    if (isAimingThrowableRef.current) break; // Prevent re-triggering while holding key
                    // Only allow starting cook if player actually has that throwable (or in TRAINING GROUND)
                    const type = player.throwableTypes[player.currentThrowableIndex];
                    if (type && ((player.throwables[type] ?? 0) > 0 || level.name === 'TRAINING GROUND')) {
                        isAimingThrowableRef.current = true;
                        cookingThrowableRef.current = { type, timer: THROWABLES[type].fuse, maxTimer: THROWABLES[type].fuse };
                    }
                    break;
                case 'r':
                    // Start charging Kunai on R key down as alternative to right mouse
                    if (!isChargingKunaiRef.current) {
                        isChargingKunaiRef.current = true;
                        kunaiChargeStartRef.current = performance.now() / 1000;
                    }
                    break;
                case 'q':
                    if (player.isReloading) break;
                    try {
                        const curIdx = player.currentWeaponIndex;
                        const curWeapon = player.weapons[curIdx];
                        // sentinel empty marker
                        const isEmpty = curWeapon && (curWeapon.name === '__EMPTY__' || !curWeapon.name);
                        if (isEmpty) {
                            // fallback to previous behavior: switch to melee or previous
                            if (curIdx === 2) { player.currentWeaponIndex = previousWeaponIndexRef.current; }
                            else { previousWeaponIndexRef.current = curIdx; player.currentWeaponIndex = 2; }
                        } else {
                            // Drop current weapon: spawn drop at player position and mark slot empty
                            const dropName = curWeapon.name;
                            const drop: WeaponDrop = { id: `drop_${Date.now()}_${Math.floor(Math.random() * 10000)}`, weaponName: dropName, x: player.x, y: player.y };
                            weaponDropsRef.current.push(drop);
                            try { networkClient && (networkClient as any).send('drop-weapon', { id: drop.id, playerId: networkClient.ownId, weaponName: dropName, x: drop.x, y: drop.y }); } catch { }
                            // Replace slot with sentinel empty weapon
                            try { player.weapons[curIdx] = { name: '__EMPTY__' } as unknown as Weapon; } catch { }
                        }
                    } catch (e) { }
                    break;
                case 'g': switchFireMode(); break;
                case 't': switchThrowable(); break;
                case 'h': startHealing(); break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            // When in end screen, ignore keyup events (only Space keydown is handled to skip)
            if (isGameOverRef.current || isMissionCompleteRef.current) return;
            keysPressedRef.current.delete(e.key.toLowerCase());
            if (e.key.toLowerCase() === 'e') stopDoorInteraction();
            if (e.key.toLowerCase() === 'f') {
                if (isAimingThrowableRef.current && cookingThrowableRef.current) {
                    // 键盘F键也使用鼠标距离计算力度
                    const player = playerRef.current;
                    const mouse = mousePosRef.current;
                    const dx = mouse.x - player.x;
                    const dy = mouse.y - player.y;
                    const dist = Math.hypot(dx, dy);
                    const scale = scaleRef.current;
                    const launchPower = Math.min(dist / (20 * scale), 15 * scale);
                    throwThrowable(launchPower);
                }
                isAimingThrowableRef.current = false;
                cookingThrowableRef.current = null;
            }
            if (e.key.toLowerCase() === 'r') {
                // Release charged Kunai when R released
                if (isChargingKunaiRef.current) {
                    const nowTime = performance.now() / 1000;
                    const chargeTime = Math.max(0, Math.min(CHARGE_MAX_TIME, nowTime - kunaiChargeStartRef.current));
                    let targetDistanceM = KUNAI_NORMAL_DISTANCE_M;
                    if (chargeTime <= CHARGE_MAP[0].t) targetDistanceM = CHARGE_MAP[0].d;
                    else if (chargeTime >= CHARGE_MAP[2].t) targetDistanceM = CHARGE_MAP[2].d;
                    else {
                        const t0 = CHARGE_MAP[0].t, d0 = CHARGE_MAP[0].d;
                        const t2 = CHARGE_MAP[2].t, d2 = CHARGE_MAP[2].d;
                        const frac = (chargeTime - t0) / (t2 - t0);
                        targetDistanceM = d0 + frac * (d2 - d0);
                    }

                    // Fire Kunai (reuse mouse release logic)
                    const player = playerRef.current;
                    const ang = playerDirectionRef.current;
                    const ux = Math.cos(ang), uy = Math.sin(ang);
                    const px = player.x + ux * (player.radius + 2 * scaleRef.current);
                    const py = player.y + uy * (player.radius + 2 * scaleRef.current);
                    const distancePx = targetDistanceM * METERS_TO_PIXELS;
                    const speedPxPerSec = KUNAI_NORMAL_SPEED_MPS * METERS_TO_PIXELS;

                    bulletsRef.current.push({
                        x: px,
                        y: py,
                        dx: ux,
                        dy: uy,
                        radius: 3 * scaleRef.current,
                        damage: 0,
                        owner: 'player',
                        weaponName: 'Explosive Kunai',
                        isKunai: true,
                        originX: px,
                        originY: py,
                        maxTravelDistance: distancePx,
                        speed: speedPxPerSec,
                        homingTarget: null,
                        hasHomed: false,
                        hasReachedMax: false,
                        isCharged: true,
                    });
                }
                isChargingKunaiRef.current = false;
            }
        };
        const handleMouseDown = (e: MouseEvent) => { if (e.button === 0) isShootingRef.current = true; };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) isShootingRef.current = false;
            // Right button release -> handle Kunai charged throw release
            if (e.button === 2 && isChargingKunaiRef.current) {
                const nowTime = performance.now() / 1000;
                const chargeTime = Math.max(0, Math.min(CHARGE_MAX_TIME, nowTime - kunaiChargeStartRef.current));
                // Map chargeTime to distance (meters) via piecewise interpolation
                let targetDistanceM = KUNAI_NORMAL_DISTANCE_M;
                if (chargeTime <= CHARGE_MAP[0].t) targetDistanceM = CHARGE_MAP[0].d;
                else if (chargeTime >= CHARGE_MAP[2].t) targetDistanceM = CHARGE_MAP[2].d;
                else {
                    // Linear between (0.3,5) and (2.0,20)
                    const t0 = CHARGE_MAP[0].t, d0 = CHARGE_MAP[0].d;
                    const t2 = CHARGE_MAP[2].t, d2 = CHARGE_MAP[2].d;
                    const frac = (chargeTime - t0) / (t2 - t0);
                    targetDistanceM = d0 + frac * (d2 - d0);
                }

                // Create a Kunai bullet for charged throw
                const player = playerRef.current;
                const ang = playerDirectionRef.current;
                const ux = Math.cos(ang), uy = Math.sin(ang);
                const px = player.x + ux * (player.radius + 2 * scaleRef.current);
                const py = player.y + uy * (player.radius + 2 * scaleRef.current);
                const distancePx = targetDistanceM * METERS_TO_PIXELS;
                const speedPxPerSec = KUNAI_NORMAL_SPEED_MPS * METERS_TO_PIXELS;

                bulletsRef.current.push({
                    x: px,
                    y: py,
                    dx: ux,
                    dy: uy,
                    radius: 3 * scaleRef.current,
                    damage: 0,
                    owner: 'player',
                    weaponName: 'Explosive Kunai',
                    isKunai: true,
                    originX: px,
                    originY: py,
                    maxTravelDistance: distancePx,
                    speed: speedPxPerSec,
                    homingTarget: null,
                    hasHomed: false,
                    hasReachedMax: false,
                    isCharged: true,
                });

                isChargingKunaiRef.current = false;
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            mouseScreenPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [onMissionEnd, startDoorInteraction, stopDoorInteraction]);

    const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const isEnded = isGameOverRef.current || isMissionCompleteRef.current;
        if (isEnded) {
            if (missionEndTimeRef.current && performance.now() - missionEndTimeRef.current > END_SCREEN_MIN_DELAY) {
                onMissionEnd();
            }
            return;
        }
        hasUsedTouchRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touchState = touchStateRef.current;
        const changedTouches = Array.from(e.changedTouches);

        const findTouchTarget = (touch: React.Touch | Touch) => {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            for (const key in touchButtonRectsRef.current) {
                const button = touchButtonRectsRef.current[key];
                const distSq = (x - button.x) ** 2 + (y - button.y) ** 2;
                if (distSq < button.r ** 2) return { key, x, y };
            }
            return { key: 'aim', x, y };
        };

        const processTouchStart = (touch: React.Touch | Touch) => {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Check for new UI buttons first
            const pauseCircle = pauseButtonCircleRef.current;
            if (Math.hypot(x - pauseCircle.x, y - pauseCircle.y) < pauseCircle.r) {
                setIsPaused(true);
                setShowInGameSettings(false);
                return; // Stop processing this touch
            }

            const target = findTouchTarget(touch);
            const controlKey = target.key as keyof typeof touchState;

            if ((touchState as any)[controlKey]?.id !== null && controlKey !== 'aim') return;

            if (controlKey === 'aim') {
                if (touchState.aim.id === null) {
                    touchState.aim.id = touch.identifier;
                    touchState.aim.lastX = touch.clientX;
                    touchState.aim.lastY = touch.clientY;
                }
            } else {
                (touchState as any)[controlKey].id = touch.identifier;

                if (controlKey === 'joystick') {
                    touchState.joystick.startX = touch.clientX;
                    touchState.joystick.startY = touch.clientY;
                } else if (controlKey === 'fire') {
                    touchState.fire.lastX = touch.clientX;
                    touchState.fire.lastY = touch.clientY;
                } else if (controlKey === 'interact') {
                    if (!takedownHintEnemyRef.current && interactionHintDoorIdRef.current !== null) {
                        startDoorInteraction(); // Hold to interact with doors
                    }
                } else if (controlKey === 'throwableSelect') { // Repurposed as throw button
                    isAimingThrowableRef.current = true;
                    const type = playerRef.current.throwableTypes[playerRef.current.currentThrowableIndex];
                    if (type) {
                        cookingThrowableRef.current = { type, timer: THROWABLES[type].fuse, maxTimer: THROWABLES[type].fuse };
                        // 记录起点和当前位置
                        touchState.throwableSelect.startX = x;
                        touchState.throwableSelect.startY = y;
                        touchState.throwableSelect.currentX = x;
                        touchState.throwableSelect.currentY = y;
                    }
                }
            }
        };

        const processTouchMove = (touch: React.Touch | Touch) => {
            if (touch.identifier === touchState.joystick.id) {
                const joystickRect = touchButtonRectsRef.current.joystick;
                const dx = touch.clientX - touchState.joystick.startX;
                const dy = touch.clientY - touchState.joystick.startY;
                const dist = Math.hypot(dx, dy);
                const maxDist = joystickRect.r * 0.75;
                const clampedDist = Math.min(dist, maxDist);
                touchState.joystick.dx = (dist > 0) ? (dx / dist) * (clampedDist / maxDist) : 0;
                touchState.joystick.dy = (dist > 0) ? (dy / dist) * (clampedDist / maxDist) : 0;
            } else if (touch.identifier === touchState.aim.id || touch.identifier === touchState.fire.id) {
                const lastX = touch.identifier === touchState.aim.id ? touchState.aim.lastX : touchState.fire.lastX;
                const deltaX = touch.clientX - lastX;
                const sensitivity = BASE_AIM_SENSITIVITY * aimSensitivity;
                playerDirectionRef.current += deltaX * sensitivity;
                if (touch.identifier === touchState.aim.id) {
                    touchState.aim.lastX = touch.clientX;
                } else {
                    touchState.fire.lastX = touch.clientX;
                }
            } else if (touch.identifier === touchState.throwableSelect.id) {
                // 更新投掷物滑动的当前位置
                const canvas = canvasRef.current;
                let rect = { left: 0, top: 0 };
                if (canvas) rect = canvas.getBoundingClientRect();
                touchState.throwableSelect.currentX = touch.clientX - rect.left;
                touchState.throwableSelect.currentY = touch.clientY - rect.top;
                // 调试：输出触摸点
                console.log('[throwable touchMove]', {
                    id: touch.identifier,
                    startX: touchState.throwableSelect.startX,
                    startY: touchState.throwableSelect.startY,
                    currentX: touchState.throwableSelect.currentX,
                    currentY: touchState.throwableSelect.currentY
                });
            }
        };

        const processTouchEnd = (touch: React.Touch | Touch) => {
            const keys = Object.keys(touchState) as (keyof typeof touchState)[];
            for (const controlKey of keys) {
                if ((touchState as any)[controlKey].id === touch.identifier) {
                    (touchState as any)[controlKey].id = null;

                    if (controlKey === 'joystick') {
                        touchState.joystick.dx = 0;
                        touchState.joystick.dy = 0;
                    } else if (controlKey === 'interact') {
                        if (takedownHintEnemyRef.current) {
                            const enemy = takedownHintEnemyRef.current;
                            const healthBefore = enemy.health;
                            enemy.health = 0;
                            if (healthBefore > 0) {
                                takedownEffectsRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 60 * scaleRef.current, lifetime: 0.4, maxLifetime: 0.4 });
                                soundWavesRef.current.push({ x: enemy.x, y: enemy.y, radius: 0, maxRadius: 150 * scaleRef.current / cameraScaleRef.current, lifetime: 0.25, maxLifetime: 0.25, type: 'slash' });
                            }
                        } else {
                            stopDoorInteraction();
                        }
                    } else if (controlKey === 'reload') {
                        const player = playerRef.current;
                        if (!player.isReloading && player.weapons[player.currentWeaponIndex].ammoInMag < player.weapons[player.currentWeaponIndex].magSize) {
                            player.isReloading = true;
                            player.reloadTimer = player.weapons[player.currentWeaponIndex].reloadTime;
                        }
                    } else if (controlKey === 'switchWeapon') {
                        const player = playerRef.current;
                        if (!player.isReloading) {
                            previousWeaponIndexRef.current = player.currentWeaponIndex;
                            player.currentWeaponIndex = (player.currentWeaponIndex + 1) % 2; // Cycle primary/secondary
                        }
                    } else if (controlKey === 'melee') {
                        const player = playerRef.current;
                        if (player.isReloading) break;
                        if (player.currentWeaponIndex === 2) {
                            player.currentWeaponIndex = previousWeaponIndexRef.current;
                        } else {
                            previousWeaponIndexRef.current = player.currentWeaponIndex;
                            player.currentWeaponIndex = 2;
                        }
                    } else if (controlKey === 'throwableSelect') { // This is the throw button
                        if (isAimingThrowableRef.current && cookingThrowableRef.current) {
                            // --- 滑动距离计算投掷力度 ---
                            const canvas = canvasRef.current;
                            let rect = { left: 0, top: 0 };
                            if (canvas) rect = canvas.getBoundingClientRect();
                            const startX = touchState.throwableSelect.startX;
                            const startY = touchState.throwableSelect.startY;
                            const endX = touch.clientX - rect.left;
                            const endY = touch.clientY - rect.top;
                            const dist = Math.hypot(endX - startX, endY - startY);
                            // 映射手势距离到力度，更敏感的映射：20px=最小力度，100px=最大力度
                            const scale = scaleRef.current;
                            const minPower = 3 * scale;  // 降低最小力度
                            const maxPower = 18 * scale; // 提高最大力度
                            const launchPower = Math.max(minPower, Math.min(maxPower, minPower + (dist / 5) * scale));
                            // --- debug输出 ---
                            console.log('[THROW TOUCH]', { startX, startY, endX, endY, dist, launchPower });
                            throwThrowable(launchPower);
                        }
                        isAimingThrowableRef.current = false;
                        cookingThrowableRef.current = null;
                    } else if (controlKey === 'switchThrowable') {
                        switchThrowable();
                    } else if (controlKey === 'fireModeSwitch') {
                        switchFireMode();
                    } else if (controlKey === 'heal') {
                        startHealing();
                    } else if (controlKey === 'special') {
                        const player = playerRef.current;
                        if (player.isReloading) break;
                        // Switch to special weapon if not already equipped, otherwise switch back
                        if (player.currentWeaponIndex === 3) {
                            player.currentWeaponIndex = previousWeaponIndexRef.current;
                        } else {
                            previousWeaponIndexRef.current = player.currentWeaponIndex;
                            player.currentWeaponIndex = 3;
                        }
                    }

                    break;
                }
            }
        };

        changedTouches.forEach(touch => {
            if (e.type === 'touchstart') {
                processTouchStart(touch);
            } else if (e.type === 'touchmove') {
                processTouchMove(touch);
            } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                processTouchEnd(touch);
            }
        });

    }, [aimSensitivity, onMissionEnd, startDoorInteraction, stopDoorInteraction]);

    return (
        <div className="relative w-full h-full font-mono">
            {/* HUD: score display */}
            <div className="absolute top-4 left-4 z-40 bg-black/50 px-3 py-1 rounded-md border border-teal-500 text-teal-300 font-mono">
                <div className="text-sm">
                    {level.isTrainingGround ? 'Practice Score' : 'Score'}: <span className="font-bold">{runScore}</span>
                </div>
            </div>
            <canvas ref={canvasRef} onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={handleTouch} className="w-full h-full" />
            {isPortrait && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center p-4">
                    <p className="text-xl text-white">Please rotate your device to landscape mode for the best experience.</p>
                </div>
            )}
            {(isPaused || showInGameSettings) && !isCustomizingInGame && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-md shadow-lg shadow-teal-500/30 text-white">
                        <h2 className="text-3xl font-bold tracking-widest text-teal-300 mb-6 text-center">{showInGameSettings ? "SETTINGS" : "PAUSED"}</h2>

                        {showInGameSettings ? (
                            <>
                                <div className="flex flex-col gap-2 py-4">
                                    <label htmlFor="sensitivity-slider" className="flex items-center justify-between text-lg text-gray-300">
                                        <span>Aim Sensitivity</span>
                                        <span className="font-mono text-teal-300">{aimSensitivity.toFixed(2)}</span>
                                    </label>
                                    <input
                                        id="sensitivity-slider"
                                        type="range" min="0.5" max="2.0" step="0.05"
                                        value={aimSensitivity}
                                        onChange={(e) => onAimSensitivityChange(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setShowInGameSettings(false);
                                        setIsCustomizingInGame(true);
                                    }}
                                    className="mt-4 w-full px-6 py-3 bg-teal-600 text-black font-bold text-lg tracking-widest rounded-md border-2 border-teal-500 hover:bg-teal-500 transition-colors duration-200"
                                >
                                    CUSTOMIZE CONTROLS
                                </button>
                                <button
                                    onClick={() => setShowInGameSettings(false)}
                                    className="mt-4 w-full px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
                                >
                                    BACK
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => setIsPaused(false)}
                                    className="w-full px-6 py-3 bg-teal-600 text-black font-bold text-lg tracking-widest rounded-md border-2 border-teal-500 hover:bg-teal-500 transition-colors duration-200"
                                >
                                    RESUME
                                </button>
                                <button
                                    onClick={() => setShowInGameSettings(true)}
                                    className="w-full px-6 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
                                >
                                    SETTINGS
                                </button>
                                <button
                                    onClick={onMissionEnd}
                                    className="mt-8 w-full px-6 py-3 bg-red-800 text-white font-bold text-lg tracking-widest rounded-md border-2 border-red-600 hover:bg-red-700 hover:border-red-500 transition-colors duration-200"
                                >
                                    QUIT MISSION
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showShop && level.name === 'THE FACTORY' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-3xl shadow-lg text-white">
                        <h2 className="text-3xl font-bold text-teal-300 mb-4">ROUND SHOP</h2>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-300">Round Money: <span className="font-mono text-teal-300">{roundMoney}</span></p>
                            <p className="text-sm text-gray-300">Shop timer: <span className="font-mono text-teal-300">{shopTimer ?? 0}s</span></p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                            {Object.keys(WEAPONS).map((wName) => {
                                const def = WEAPONS[wName];
                                const cost = (def as any).cost || 0;
                                // Only show weapons that are not training-only and that map to a valid slot
                                return (
                                    <div key={wName} className="p-3 bg-gray-800 rounded-md border border-gray-700">
                                        <div className="font-bold text-lg">{def.name} <span className="text-sm text-gray-400 ml-2">({def.category})</span></div>
                                        <div className="text-sm text-gray-400">{def.description}</div>
                                        {/* Attachment selectors */}
                                        {def.attachmentSlots && Object.keys(def.attachmentSlots).length > 0 && (
                                            <div className="mt-2">
                                                {Object.keys(def.attachmentSlots).map(slotName => (
                                                    <div key={slotName} className="text-sm text-gray-300 mt-1">
                                                        <label className="mr-2">{slotName}:</label>
                                                        <select className="bg-gray-700 text-white p-1 rounded" value={(selectedAttachmentsRef.current[wName] && selectedAttachmentsRef.current[wName][slotName]) || ''} onChange={(e) => {
                                                            const cur = selectedAttachmentsRef.current[wName] || {};
                                                            const next = { ...cur, [slotName]: e.target.value };
                                                            selectedAttachmentsRef.current = { ...selectedAttachmentsRef.current, [wName]: next };
                                                            // force update UI by toggling a state
                                                            setRoundMoney(r => r);
                                                        }}>
                                                            <option value="">--</option>
                                                            {def.attachmentSlots[slotName].map((a: any) => <option key={a.name} value={a.name}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="text-teal-300 font-mono">{cost}</div>
                                            <button onClick={() => {
                                                const attachments = selectedAttachmentsRef.current[wName] || {};
                                                // Attempt purchase: check funds
                                                if (roundMoneyRef.current < cost) {
                                                    setPurchaseMessage('Not enough money');
                                                    setTimeout(() => setPurchaseMessage(null), 2000);
                                                    return;
                                                }
                                                // Apply purchase locally
                                                buyWeapon(wName);
                                                try { networkClient && (networkClient as any).send('buy-weapon', { playerId: networkClient.ownId, weaponName: wName, cost, attachments }); } catch { }
                                                setPurchaseMessage('Purchased ' + def.name);
                                                setTimeout(() => setPurchaseMessage(null), 2000);
                                            }} className="px-3 py-1 bg-teal-600 text-black rounded-md font-bold">BUY</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <div className="flex items-center gap-4">
                                {purchaseMessage && <div className="text-sm text-teal-300">{purchaseMessage}</div>}
                                <button onClick={() => { setShowShop(false); startRound(); }} className="px-6 py-3 bg-teal-600 text-black font-bold rounded-md">START ROUND</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isCustomizingInGame && (
                <ControlCustomizer
                    initialLayout={customControls}
                    defaultLayout={defaultControlsLayout}
                    onSave={(newLayout) => {
                        onCustomControlsChange(newLayout);
                        setIsCustomizingInGame(false);
                    }}
                    onClose={() => setIsCustomizingInGame(false)}
                />
            )}
        </div>
    );
};
