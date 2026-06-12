
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

/**
 * A provider for saving and loading game data.
 * This is an abstraction layer that currently uses localStorage but can be
 * swapped with a cloud-based implementation in the future.
 */
class SaveProvider {
  /**
   * Loads the entire game data object from persistence.
   * @returns A promise that resolves with the GameData object, or null if not found.
   */
  async loadGameData(): Promise<GameData | null> {
    try {
      const dataJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (dataJson) {
        const data = JSON.parse(dataJson) as GameData;
        // Future migration logic based on data.version can be added here.
        return data;
      }
    } catch (error) {
      console.error("Failed to load game data:", error);
    }
    return null;
  }

  /**
   * Saves the entire game data object to persistence.
   * @param data The complete game data object to save.
   * @returns A promise that resolves when the save is complete.
   */
  async saveGameData(data: GameData): Promise<void> {
    try {
      const dataJson = JSON.stringify(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, dataJson);
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
