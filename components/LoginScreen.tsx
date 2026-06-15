import React, { useState } from 'react';
import { AuthSystem } from '../data/services/auth-system';
import { useLanguage } from '../LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { t, language } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      const result = AuthSystem.register(username, password);
      if (result.success) {
        onLoginSuccess(username);
      } else {
        setError(result.message || 'Error occurred');
      }
    } else {
      const result = AuthSystem.login(username, password);
      if (result.success) {
        onLoginSuccess(username);
      } else {
        setError(result.message || 'Error occurred');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-200 font-mono">
      <div className="max-w-md w-full bg-neutral-900 border border-teal-800 p-8 rounded-lg shadow-2xl shadow-teal-900/20">
        <h1 className="text-3xl tracking-widest font-bold text-teal-400 mb-2 text-center">
          TACTICAL SQUAD
        </h1>
        <h2 className="text-xl text-neutral-400 mb-8 text-center uppercase tracking-wide">
          {isRegistering ? (language === 'zh' ? '用户注册' : 'USER REGISTRATION') : (language === 'zh' ? '系统登录' : 'SYSTEM LOGIN')}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-400">{language === 'zh' ? '用户名' : 'USERNAME'}</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-neutral-200 transition-colors"
              required
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-400">{language === 'zh' ? '密码' : 'PASSWORD'}</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 px-3 py-2 rounded focus:outline-none focus:border-teal-500 text-neutral-200 transition-colors"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm font-bold bg-red-950/50 p-2 rounded border border-red-800">[{language === 'zh' ? '错误' : 'ERROR'}] {error}</div>}

          <button 
            type="submit" 
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 mt-4 rounded transition-all active:scale-95 tracking-widest uppercase"
          >
            {isRegistering ? (language === 'zh' ? '创建账户' : 'CREATE ACCOUNT') : (language === 'zh' ? '登 录' : 'LOG IN')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500 cursor-pointer hover:text-teal-400 transition-colors" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering 
            ? (language === 'zh' ? '已有账户？点击登录' : 'ALREADY HAVE AN ACCOUNT? LOG IN') 
            : (language === 'zh' ? '无账户？点击注册新用户' : 'NO ACCOUNT? REGISTER NEW USER')}
        </div>
      </div>
    </div>
  );
};
