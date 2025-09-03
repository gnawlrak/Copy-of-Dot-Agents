import { FireMode } from "./weapons";

export type ThrowableType = 'grenade' | 'flashbang';

export interface Throwable {
  id: number;
  type: ThrowableType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number; // seconds
  radius: number;
  hasBounced?: boolean;
}

export interface Weapon {
  name: string;
  description: string;
  category: 'primary' | 'secondary';
  type: 'projectile' | 'hitscan';
  damage: number;
  fireRate: number; // seconds between shots
  bulletSpeed: number; // for projectiles, pixels/sec
  bulletRadius: number; // for projectiles
  pellets: number; // number of projectiles per shot
  spread: number; // in radians
  pelletSpread?: number; // extra random cone for shotgun pellets
  magSize: number;
  ammoInMag: number;
  reserveAmmo: number;
  reloadTime: number; // seconds
  soundRadius: number;
  shake: (aimUx: number, aimUy: number) => void;
  muzzleFlashMultiplier?: number;
  // Custom properties added at runtime in GameCanvas
  allowedFireModes: FireMode[];
  currentFireMode: FireMode;
}

export interface AgentSkin {
    name: string;
    color: string;
}

export const AGENT_SKINS: AgentSkin[] = [
    { name: 'Standard Issue', color: '#FFFFFF' },
    { name: 'Forest Camo', color: '#4ade80' }, // tailwind green-500
    { name: 'Desert Ops', color: '#fb923c' }, // tailwind orange-400
    { name: 'Urban Shadow', color: '#60a5fa' }, // tailwind blue-400
    { name: 'Crimson Strike', color: '#f87171' }, // tailwind red-400
];
