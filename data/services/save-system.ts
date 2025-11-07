
import { PlayerLoadout, CustomControls } from '../../types';
import { LevelDefinition } from '../../levels/level-definitions';
import { OperatorClassID } from '../operators';

// A single, versioned interface for all game data.
export interface GameData {
  version: number;
  operatorClassId: OperatorClassID;
  aimSensitivity: number;
  agentSkin: string;
  playerLoadout: PlayerLoadout;
  customControls: CustomControls;
  customLevels: LevelDefinition[];
  // Persistent scoring
  totalScore?: number; // lifetime accumulated score
  highScore?: number; // best single-run score
}

const LOCAL_STORAGE_KEY = 'dot_agents_save_data';

// Server-only save/load: always use same-origin API and include credentials so
// HttpOnly session cookie (sid) is sent with requests. This removes local-only
// storage as the source of truth.

/**
 * A provider for saving and loading game data.
 * This is an abstraction layer that currently uses localStorage but can be
 * swapped with a cloud-based implementation in the future.
 */
class SaveProvider {
  /**
   * 从本地存储加载游戏数据
   */
  private loadLocalGameData(): GameData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameData;
    } catch (error) {
      console.error('Failed to load local game data:', error);
      return null;
    }
  }

  /**
   * Loads the entire game data object from persistence.
   * @returns A promise that resolves with the GameData object, or null if not found.
   */
  async loadGameData(): Promise<GameData | null> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return this.loadLocalGameData();
      }

      const res = await fetch('/api/save', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        console.error('Failed to load server save, status=', res.status);
        return this.loadLocalGameData();
      }

      const data = await res.json();
      if (data) {
        // 保存到本地作为备份
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load game data from server:', error);
      return null;
    }
  }

  /**
   * Saves the entire game data object to persistence.
   * @param data The complete game data object to save.
   * @returns A promise that resolves when the save is complete.
   */
  async saveGameData(data: GameData): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      
      // 总是保存到本地作为备份
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      
      // 如果有 token，也保存到服务器
      if (token) {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        if (!res.ok) {
          console.error('Failed to save game data to server, status=', res.status);
        }
      }
    } catch (error) {
      console.error('Failed to save game data to server:', error);
    }
  }

  /**
   * Clears all old individual save data from localStorage as part of a one-time migration.
   */
  async clearOldData(): Promise<void> {
    try {
      localStorage.removeItem('dot_agents_operator_class_id');
      localStorage.removeItem('dot_agents_aim_sensitivity');
      localStorage.removeItem('dot_agents_agent_skin');
      localStorage.removeItem('dot_agents_player_loadout');
      localStorage.removeItem('dot_agents_custom_controls');
      localStorage.removeItem('dot_agents_custom_levels');
      console.log("Old localStorage data cleared.");
    } catch (error) {
      console.error("Failed to clear old game data:", error);
    }
  }
}

// Singleton instance of the save provider.
export const SaveSystem = new SaveProvider();
