import { encodeData, decodeData } from './encryption';

export interface UserAccount {
  username: string;
  passwordHash: string; // "Encrypted" password for simple local validation
}

const USERS_STORAGE_KEY = 'dot_agents_users_db';
const SESSION_STORAGE_KEY = 'dot_agents_current_session';

class AuthProvider {
  /**
   * Loads the users database
   */
  private loadUsersDb(): Record<string, UserAccount> {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const decoded = decodeData(raw);
        return JSON.parse(decoded);
      }
    } catch (e) {
      console.warn("Failed to load users DB", e);
    }
    return {};
  }

  /**
   * Saves the users database
   */
  private saveUsersDb(db: Record<string, UserAccount>) {
    try {
      const str = JSON.stringify(db);
      const encoded = encodeData(str);
      localStorage.setItem(USERS_STORAGE_KEY, encoded);
    } catch (e) {
      console.error("Failed to save users DB", e);
    }
  }

  /**
   * Simple hash for passwords, for demonstration
   */
  private hashPassword(password: string): string {
    return encodeData("PW_" + password);
  }

  /**
   * Initializes the DB with the root user if it doesn't exist
   */
  init() {
    const db = this.loadUsersDb();
    if (!db['root']) {
      db['root'] = {
        username: 'root',
        passwordHash: this.hashPassword('1234')
      };
      this.saveUsersDb(db);
    }
  }

  /**
   * Registers a new user
   */
  register(username: string, password: string): { success: boolean, message?: string } {
    if (!username || username.trim() === '') return { success: false, message: "Username cannot be empty" };
    if (!password) return { success: false, message: "Password cannot be empty" };

    const db = this.loadUsersDb();
    if (db[username]) {
      return { success: false, message: "Username already exists" };
    }

    db[username] = {
      username,
      passwordHash: this.hashPassword(password)
    };
    this.saveUsersDb(db);
    
    // Auto login
    this.login(username, password);

    return { success: true };
  }

  /**
   * Logs in a user
   */
  login(username: string, password: string): { success: boolean, message?: string } {
    const db = this.loadUsersDb();
    const user = db[username];
    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.passwordHash !== this.hashPassword(password)) {
      return { success: false, message: "Incorrect password" };
    }

    // Set session
    localStorage.setItem(SESSION_STORAGE_KEY, encodeData(username));
    return { success: true };
  }

  /**
   * Gets current logged in username
   */
  getCurrentUser(): string | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
         return decodeData(raw);
      }
    } catch (e) {}
    return null;
  }

  /**
   * Logs out current user
   */
  logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Change password for current user
   */
  changePassword(username: string, oldPass: string, newPass: string): { success: boolean, message?: string } {
     const db = this.loadUsersDb();
     const user = db[username];
     if (!user || user.passwordHash !== this.hashPassword(oldPass)) {
         return { success: false, message: "Incorrect old password" };
     }
     user.passwordHash = this.hashPassword(newPass);
     this.saveUsersDb(db);
     return { success: true };
  }
  /**
   * Change username
   */
  changeUsername(oldName: string, newName: string, password: string): { success: boolean, message?: string } {
      if (!newName || newName.trim() === '') return { success: false, message: "New username cannot be empty" };
      if (oldName === 'root') return { success: false, message: "Cannot change root username" };

      const db = this.loadUsersDb();
      if (db[newName]) return { success: false, message: "Username already exists" };

      const user = db[oldName];
      if (!user || user.passwordHash !== this.hashPassword(password)) {
          return { success: false, message: "Incorrect password" };
      }

      // Update DB
      db[newName] = { ...user, username: newName };
      delete db[oldName];
      this.saveUsersDb(db);

      // Update session
      localStorage.setItem(SESSION_STORAGE_KEY, encodeData(newName));

      // Migrate Save Data
      try {
         const oldKey = `dot_agents_save_data_${oldName}`;
         const newKey = `dot_agents_save_data_${newName}`;
         const oldData = localStorage.getItem(oldKey);
         if (oldData) {
             localStorage.setItem(newKey, oldData);
             localStorage.removeItem(oldKey);
         }
      } catch (e) {
         console.warn("Failed to migrate save data", e);
      }

      return { success: true };
  }
}

export const AuthSystem = new AuthProvider();
