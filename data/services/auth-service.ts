import { GameData } from './save-system';

const API_URL = 'http://localhost:3001/api';

export interface AuthResponse {
    token: string;
    saveData: GameData | null;
    message?: string;
}

export const AuthService = {
    async register(username: string, password: string, initialData: GameData | null): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, initialData }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async saveRemote(token: string, saveData: GameData): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ saveData }),
            });

            if (!response.ok) {
                throw new Error('Failed to save to server');
            }
        } catch (error) {
            console.error('Remote save error:', error);
            throw error;
        }
    },

    async loadRemote(token: string): Promise<GameData | null> {
        try {
            const response = await fetch(`${API_URL}/load`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load from server');
            }

            const data = await response.json();
            return data.saveData;
        } catch (error) {
            console.error('Remote load error:', error);
            return null;
        }
    }
};
