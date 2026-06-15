
import { PlayerLoadout, CustomControls } from '../../types';
import { LevelDefinition } from '../../levels/level-definitions';
import { OperatorClassID } from '../operators';
import { encodeData, decodeData } from './encryption';

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

const getStorageKey = (username: string) => `dot_agents_save_data_${username}`;

/**
 * A provider for saving and loading game data.
 */
class SaveProvider {
  /**
   * Loads the entire game data object from persistence for a specific user.
   */
  async loadGameData(username: string): Promise<GameData | null> {
    try {
      const dataStr = localStorage.getItem(getStorageKey(username));
      if (dataStr) {
        // Try to decode (backwards compatible with unencrypted JSON from before)
        let parsedStr = dataStr;
        try {
            parsedStr = decodeData(dataStr);
        } catch (e) {} // Fallback to raw string if old format

        const data = JSON.parse(parsedStr) as GameData;
        return data;
      }
    } catch (error) {
      console.error("Failed to load game data:", error);
    }
    return null;
  }

  /**
   * Saves the entire game data object to persistence for a user.
   */
  async saveGameData(username: string, data: GameData): Promise<void> {
    try {
      const dataJson = JSON.stringify(data);
      const encoded = encodeData(dataJson);
      localStorage.setItem(getStorageKey(username), encoded);
    } catch (error) {
      console.error("Failed to save game data:", error);
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
