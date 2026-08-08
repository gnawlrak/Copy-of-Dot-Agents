import React, { useState } from 'react';
import { AuthSystem } from '../data/services/auth-system';
import { useLanguage } from '../LanguageContext';

interface AccountSettingsProps {
    currentUser: string;
    onLogout: () => void;
    onNameChange: (newName: string) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ currentUser, onLogout, onNameChange }) => {
    const { language } = useLanguage();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isChangingName, setIsChangingName] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        const result = AuthSystem.changePassword(currentUser, oldPassword, newPassword);
        if (result.success) {
            setMessage(language === 'zh' ? '密码修改成功' : 'Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setTimeout(() => { setIsChangingPassword(false); setMessage(''); }, 2000);
        } else {
            setIsError(true);
            setMessage(result.message || 'Error');
        }
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        
        if (currentUser === 'root') {
            setIsError(true);
            setMessage(language === 'zh' ? '管理员账户无法更改名称' : 'Cannot change admin username');
            return;
        }

        const result = AuthSystem.changeUsername(currentUser, newName, oldPassword);
        if (result.success) {
            setMessage(language === 'zh' ? '账户名修改成功' : 'Username changed successfully');
            setOldPassword('');
            setNewName('');
            setTimeout(() => { setIsChangingName(false); setMessage(''); onNameChange(newName); }, 1500);
        } else {
            setIsError(true);
            setMessage(result.message || 'Error');
        }
    };

    const doLogout = () => {
        AuthSystem.logout();
        onLogout();
    };

    return (
        <div className="flex flex-col gap-4 py-4 border-b border-line">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">{language === 'zh' ? '当前账户' : 'Current Account'}</span>
                    <span className="font-mono text-sm font-bold text-signal">{currentUser}</span>
                </div>
                <button 
                    onClick={doLogout}
                    className="px-4 py-2 bg-panel2 border border-line text-danger font-cond font-bold text-sm uppercase tracking-[0.15em] hover:border-danger transition-colors active:scale-[0.98]"
                >
                    {language === 'zh' ? '退出登录' : 'LOGOUT'}
                </button>
            </div>

            <div className="flex gap-2 mt-2">
                {!isChangingPassword && !isChangingName && (
                    <>
                        <button 
                            onClick={() => { setIsChangingPassword(true); setMessage(''); }}
                            className="flex-1 py-2 bg-panel2 border border-line text-bone font-cond font-bold text-sm uppercase tracking-[0.15em] hover:border-signal hover:text-signal transition-colors active:scale-[0.98]"
                        >
                            {language === 'zh' ? '修改密码' : 'Change Password'}
                        </button>
                        {currentUser !== 'root' && (
                            <button 
                                onClick={() => { setIsChangingName(true); setMessage(''); }}
                                className="flex-1 py-2 bg-panel2 border border-line text-bone font-cond font-bold text-sm uppercase tracking-[0.15em] hover:border-signal hover:text-signal transition-colors active:scale-[0.98]"
                            >
                                {language === 'zh' ? '修改用户名' : 'Change Username'}
                            </button>
                        )}
                    </>
                )}
            </div>

            {isChangingName && (
                <form onSubmit={handleNameSubmit} className="flex flex-col gap-3 mt-2 bg-ink p-4 border border-line">
                    <input 
                        type="text"
                        placeholder={language === 'zh' ? '新用户名' : 'New Username'}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-ink border border-line px-3 py-2 text-bone focus:outline-none focus:border-signal text-sm font-mono"
                        required
                    />
                    <input 
                        type="password"
                        placeholder={language === 'zh' ? '当前密码' : 'Current Password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="bg-ink border border-line px-3 py-2 text-bone focus:outline-none focus:border-signal text-sm font-mono"
                        required
                    />
                    {message && (
                        <div className={`text-xs font-bold font-mono ${isError ? 'text-danger' : 'text-signal'}`}>
                            {message}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-signal text-ink font-cond font-bold uppercase tracking-[0.15em] py-2 text-sm hover:bg-teal-400 transition-colors active:scale-[0.98]">
                            {language === 'zh' ? '确认' : 'Confirm'}
                        </button>
                        <button type="button" onClick={() => { setIsChangingName(false); setMessage(''); }} className="flex-1 bg-panel2 border border-line text-bone font-cond font-bold uppercase tracking-[0.15em] py-2 text-sm hover:border-signal hover:text-signal transition-colors active:scale-[0.98]">
                            {language === 'zh' ? '取消' : 'Cancel'}
                        </button>
                    </div>
                </form>
            )}

            {isChangingPassword && (
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 mt-2 bg-ink p-4 border border-line">
                    <input 
                        type="password"
                        placeholder={language === 'zh' ? '旧密码' : 'Old Password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="bg-ink border border-line px-3 py-2 text-bone focus:outline-none focus:border-signal text-sm font-mono"
                        required
                    />
                    <input 
                        type="password"
                        placeholder={language === 'zh' ? '新密码' : 'New Password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-ink border border-line px-3 py-2 text-bone focus:outline-none focus:border-signal text-sm font-mono"
                        required
                    />
                    {message && (
                        <div className={`text-xs font-bold font-mono ${isError ? 'text-danger' : 'text-signal'}`}>
                            {message}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-signal text-ink font-cond font-bold uppercase tracking-[0.15em] py-2 text-sm hover:bg-teal-400 transition-colors active:scale-[0.98]">
                            {language === 'zh' ? '确认' : 'Confirm'}
                        </button>
                        <button type="button" onClick={() => setIsChangingPassword(false)} className="flex-1 bg-panel2 border border-line text-bone font-cond font-bold uppercase tracking-[0.15em] py-2 text-sm hover:border-signal hover:text-signal transition-colors active:scale-[0.98]">
                            {language === 'zh' ? '取消' : 'Cancel'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
