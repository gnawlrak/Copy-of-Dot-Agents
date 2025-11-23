import React, { useState } from 'react';
import { AuthService } from '../data/services/auth-service';
import { SaveSystem } from '../data/services/save-system';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            let response;
            if (isRegistering) {
                // On register, we want to link the current local save to the new account
                const currentData = await SaveSystem.loadGameData();
                response = await AuthService.register(username, password, currentData);
            } else {
                response = await AuthService.login(username, password);
            }

            // Set token in SaveSystem
            SaveSystem.setAuthToken(response.token);

            // If logging in (not registering), we might want to overwrite local with remote
            // If registering, we already sent local to remote, so they are in sync
            if (!isRegistering && response.saveData) {
                await SaveSystem.saveGameData(response.saveData, true); // Update local cache
            }

            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
            <div className="bg-gray-900 border-2 border-teal-500 rounded-lg p-8 w-full max-w-md shadow-lg shadow-teal-500/30">
                <h2 className="text-3xl font-bold tracking-widest text-teal-300 mb-6 text-center">
                    {isRegistering ? 'REGISTER AGENT' : 'AGENT LOGIN'}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-teal-300 mb-1 font-mono">CODENAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-teal-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-teal-300 mb-1 font-mono">PASSPHRASE</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-teal-500 focus:outline-none"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm font-mono text-center bg-red-900/20 p-2 rounded border border-red-500/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full px-6 py-3 bg-teal-600 text-black font-bold text-lg tracking-widest rounded-md border-2 border-teal-500 hover:bg-teal-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'PROCESSING...' : (isRegistering ? 'INITIALIZE LINK' : 'AUTHENTICATE')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                        }}
                        className="text-gray-400 hover:text-teal-300 text-sm underline decoration-dotted underline-offset-4"
                    >
                        {isRegistering ? 'ALREADY AN AGENT? LOGIN' : 'NEW RECRUIT? REGISTER'}
                    </button>
                </div>

                {isRegistering && (
                    <div className="mt-4 text-xs text-gray-500 text-center border-t border-gray-800 pt-4">
                        <p>WARNING: Registration will link your current local progress to this new account.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
