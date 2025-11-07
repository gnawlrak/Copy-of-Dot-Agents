import React, { useState, useEffect } from 'react';
import './Login.css';

// With server-set HttpOnly cookie sessions we can use relative paths and include credentials
function apiFetch(pathname: string, opts: RequestInit = {}) {
  // 基础配置：包含凭证、允许跨域、JSON
  const defaultOpts: RequestInit = {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    mode: 'cors'
  };
  // 合并配置，headers 需要特殊处理以避免覆盖
  const mergedOpts = {
    ...defaultOpts,
    ...opts,
    headers: { ...defaultOpts.headers, ...opts.headers }
  };
  return fetch(pathname, mergedOpts);
}

export default function Login() {
	const [mode, setMode] = useState<'login' | 'register'>('login');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);
		const [serverDown, setServerDown] = useState(false);

		// 检测后端连通性：只要 /api/me 能够回应（不论401或200），就认为服务器在线
  async function checkServer(timeoutMs = 3000) {
    setServerDown(false);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => {
        controller.abort();
        setServerDown(true);
        console.error('服务器检查超时');
      }, timeoutMs);

      const res = await apiFetch('/api/me', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(id);

      // 即使是 401（未登录）也说明服务器在线
      if (res.status === 401 || res.ok) {
        setServerDown(false);
        return true;
      }

      // 其他状态码可能表示服务器配置问题
      console.error('服务器返回非预期状态:', res.status);
      const text = await res.text();
      console.error('响应内容:', text);
      setServerDown(true);
      return false;

    } catch (e) {
      console.error('服务器检查失败:', e);
      setServerDown(true);
      return false;
    }
  }		useEffect(() => {
			// 首次挂载时检测服务器
			checkServer();
			// 监听浏览器在线/离线事件，优先使用 navigator.onLine
			function onOnline() { checkServer(); }
			function onOffline() { setServerDown(true); }
			window.addEventListener('online', onOnline);
			window.addEventListener('offline', onOffline);
			return () => {
				window.removeEventListener('online', onOnline);
				window.removeEventListener('offline', onOffline);
			};
		}, []);

	async function doRegister() {
		setMessage(null);
		try {
							const res = await apiFetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setMessage(data.error || '注册失败');
				return;
			}
			setMessage('注册成功，请登录');
			setMode('login');
		} catch (e) {
				setMessage('网络错误');
				setServerDown(true);
		}
	}

	async function doLogin() {
		setMessage(null);
		try {
							const res = await apiFetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setMessage(data.error || '登录失败');
				return;
			}
							// server sets HttpOnly cookie for session; no token stored in localStorage
			setMessage('登录成功');
			setTimeout(() => window.location.reload(), 350);
		} catch (e) {
				setMessage('网络错误');
				setServerDown(true);
		}
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (mode === 'login') doLogin(); else doRegister();
	}

	return (
			<div className="login-wrap">
				{serverDown && (
					<div className="login-banner" role="alert" aria-live="assertive">
						<div className="banner-text">无法连接到服务器 — 请检查网络或点击重试。</div>
						<div className="banner-actions">
							<button className="btn ghost small" onClick={() => checkServer()}>重试</button>
						</div>
					</div>
				)}
			<div className="login-card">
				<div className="login-header">
					<h2>{mode === 'login' ? '欢迎回来' : '创建账户'}</h2>
					<p className="login-sub">{mode === 'login' ? '使用用户名和密码登录' : '注册一个新账户'}</p>
				</div>

				<form className="login-form" onSubmit={onSubmit}>
					<label className="lbl">用户名</label>
					<input
						className="input"
						value={username}
						onChange={e => setUsername(e.target.value)}
						placeholder="输入用户名"
						required
					/>

					<label className="lbl">密码</label>
					<div className="password-row">
						<input
							className="input"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="输入密码"
							required
						/>
						<button type="button" className="toggle-btn" onClick={() => setShowPassword(s => !s)} aria-label="切换密码显示">
							{showPassword ? '隐藏' : '显示'}
						</button>
					</div>

					<div className="actions">
						<button className="btn primary" type="submit">{mode === 'login' ? '登录' : '注册'}</button>
						<button
							type="button"
							className="btn ghost"
							onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setMessage(null); }}
						>
							{mode === 'login' ? '创建账户' : '已有账号'}
						</button>
					</div>
				</form>

				{message && <div className={`msg ${message.includes('成功') ? 'ok' : 'err'}`}>{message}</div>}
				<div className="login-foot">Dot Agents — 本地演示身份验证（非生产）</div>
			</div>
		</div>
	);
}
