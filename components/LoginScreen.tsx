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
    <div className="flex flex-col items-center justify-center min-h-screen bg-tacgrid text-bone font-mono px-4">
      <div className="max-w-md w-full bg-panel border border-line shadow-2xl shadow-black/60 menu-in">
        <div className="hazard h-1.5 w-full" aria-hidden="true" />
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl tracking-wide text-signal">
              {t('appName')}
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-dim">
              {isRegistering
                ? (language === 'zh' ? '// 新干员档案登记' : '// NEW OPERATOR REGISTRATION')
                : (language === 'zh' ? '// 战术终端身份验证' : '// TACTICAL TERMINAL ACCESS')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.2em] text-dim">
                {language === 'zh' ? '用户名' : 'Callsign / Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-ink border border-line px-3 py-2.5 text-bone focus:outline-none focus:border-signal transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.2em] text-dim">
                {language === 'zh' ? '密码' : 'Passcode / Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-ink border border-line px-3 py-2.5 text-bone focus:outline-none focus:border-signal transition-colors"
                required
              />
            </div>

            {error && (
              <div className="text-danger text-sm font-bold bg-danger/10 px-3 py-2 border-l-2 border-danger">
                [{language === 'zh' ? '错误' : 'ERROR'}] {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-signal hover:bg-teal-400 text-ink font-cond font-bold text-lg py-3 mt-2 tracking-[0.2em] uppercase transition-all active:scale-[0.98]"
            >
              {isRegistering ? (language === 'zh' ? '创建账户' : 'CREATE ACCOUNT') : (language === 'zh' ? '登 录' : 'LOG IN')}
            </button>
          </form>

          <div
            className="mt-6 text-center text-[11px] uppercase tracking-[0.15em] text-dim cursor-pointer hover:text-signal transition-colors"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering
              ? (language === 'zh' ? '已有账户？点击登录' : 'ALREADY HAVE AN ACCOUNT? LOG IN')
              : (language === 'zh' ? '无账户？点击注册新用户' : 'NO ACCOUNT? REGISTER NEW USER')}
          </div>
        </div>
      </div>
    </div>
  );
};
