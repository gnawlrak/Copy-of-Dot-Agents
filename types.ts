import { ThrowableType } from './data/definitions';

export interface PlayerLoadout {
  primary: string;
  secondary: string;
  primaryAttachments: { [slot: string]: string };
  secondaryAttachments: { [slot: string]: string };
  throwables: { [key in ThrowableType]?: number };
}

export interface ControlLayout {
    x: number; // 0-1, relative to width
    y: number; // 0-1, relative to height
    scale: number; // multiplier for base radius
}
export interface CustomControls {
    baseScale: number; // Global scale for all buttons (e.g., 1.0)
    opacity: number; // 0-1
    layout: { [key: string]: ControlLayout };
}
