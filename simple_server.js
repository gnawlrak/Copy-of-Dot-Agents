import http from 'http';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8081;

// MIME类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// helpers for simple JSON body parsing and user/session storage
async function readJSON(filePath, fallback = {}) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data || '{}');
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(filePath, obj) {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');

function hashPassword(password, salt) {
  // using scrypt for password hashing
  const derived = crypto.scryptSync(password, salt, 64);
  return derived.toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 设置 CORS 头部（允许跨域请求和 cookies）
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      const { username, password } = JSON.parse(body || '{}');
      if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'username and password required' }));
        return;
      }

      const users = await readJSON(USERS_FILE, {});
      if (users[username]) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'user exists' }));
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      users[username] = { salt, hash, createdAt: Date.now() };
      await writeJSON(USERS_FILE, users);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, username }));
    } catch (e) {
      console.error('register error', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server error' }));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      const { username, password } = JSON.parse(body || '{}');
      if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'username and password required' }));
        return;
      }

      const users = await readJSON(USERS_FILE, {});
      const user = users[username];
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid credentials' }));
        return;
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.hash) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid credentials' }));
        return;
      }

      const sessions = await readJSON(SESSIONS_FILE, {});
      const token = generateToken();
      // expire in 7 days
      sessions[token] = { username, createdAt: Date.now(), expiresAt: Date.now() + 7 * 24 * 3600 * 1000 };
      await writeJSON(SESSIONS_FILE, sessions);

      // set HttpOnly cookie so client doesn't need to store tokens in localStorage
      const maxAge = 7 * 24 * 3600; // seconds
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `sid=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
      });
      res.end(JSON.stringify({ ok: true, username }));
    } catch (e) {
      console.error('login error', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server error' }));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    try {
      // use cookie-based session
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies.sid;
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing session' }));
        return;
      }
      const sessions = await readJSON(SESSIONS_FILE, {});
      const sess = sessions[token];
      if (!sess || (sess.expiresAt && Date.now() > sess.expiresAt)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid token' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, username: sess.username }));
    } catch (e) {
      console.error('me error', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server error' }));
    }
    return;
  }

  // save endpoints: GET/POST /api/save (require Bearer token)
  if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/save') {
    try {
      // cookie-based session
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies.sid;
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing session' }));
        return;
      }
      const sessions = await readJSON(SESSIONS_FILE, {});
      const sess = sessions[token];
      if (!sess || (sess.expiresAt && Date.now() > sess.expiresAt)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid token' }));
        return;
      }

      const username = sess.username;
      const userSaveFile = path.join(__dirname, 'data', 'saves', `${username}.json`);

      if (req.method === 'GET') {
        // return saved data if exists
        try {
          const saved = await readJSON(userSaveFile, null);
          if (!saved) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, data: saved }));
        } catch (e) {
          console.error('save get error', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'server error' }));
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });
          const payload = JSON.parse(body || '{}');
          // write payload to user save
          await writeJSON(userSaveFile, payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          console.error('save post error', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'server error' }));
        }
        return;
      }
    } catch (e) {
      console.error('save endpoint error', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server error' }));
    }
    return;
  }

  // logout endpoint to allow client to invalidate token server-side
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    try {
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies.sid;
      if (!token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing session' }));
        return;
      }
      const sessions = await readJSON(SESSIONS_FILE, {});
      if (sessions[token]) {
        delete sessions[token];
        await writeJSON(SESSIONS_FILE, sessions);
      }
      // clear cookie
      res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      console.error('logout error', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server error' }));
    }
    return;
  }

  // unknown api route
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
}

const server = http.createServer(async (req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  try {
    if (req.url && req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }

    // 处理根路径
    let filePath = '.' + (req.url || '/');
    if (filePath === './') {
      filePath = './room_debug_tool.html';
    }

    // 解析文件路径
    filePath = path.join(__dirname, filePath);

    // 获取文件扩展名
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 检查文件是否存在
    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          // 文件未找到
          console.log(`File not found: ${filePath}`);
          res.writeHead(404);
          res.end('404 Not Found');
        } else {
          // 其他错误
          console.log(`Server error: ${error.code}`);
          res.writeHead(500);
          res.end('500 Internal Server Error');
        }
      } else {
        // 成功读取文件
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  } catch (e) {
    console.error('server error', e);
    res.writeHead(500);
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});