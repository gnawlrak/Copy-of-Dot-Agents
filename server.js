import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// 中间件
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// 文件路径
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');
const SAVES_FILE = path.join(__dirname, 'data', 'saves.json');

// 确保数据文件存在
async function ensureDataFiles() {
  for (const file of [USERS_FILE, SESSIONS_FILE, SAVES_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, '{}');
    }
  }
}

// 用户相关 API
async function loadUsers() {
  const data = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function loadSessions() {
  const data = await fs.readFile(SESSIONS_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveSessions(sessions) {
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// 身份验证中间件
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  const sessions = await loadSessions();
  const session = sessions[token];
  if (!session) {
    return res.status(401).json({ error: '会话无效' });
  }

  req.user = session;
  next();
}

// 注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await loadUsers();

    if (users[username]) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');

    users[username] = { username, hash, salt };
    await saveUsers(users);

    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await loadUsers();
    const user = users[username];

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const hash = crypto.scryptSync(password, user.salt, 64).toString('hex');
    if (hash !== user.hash) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const sessions = await loadSessions();
    sessions[token] = { username };
    await saveSessions(sessions);

    res.json({ token });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username });
});

// 登出
app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const sessions = await loadSessions();
    delete sessions[token];
    await saveSessions(sessions);
    res.json({ message: '已登出' });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 房间相关 API
let rooms = [];

app.get('/rooms', (req, res) => {
  console.log('GET /rooms - 返回房间数量:', rooms.length);
  res.json(rooms);
});

app.post('/rooms', (req, res) => {
  const room = req.body;
  console.log('POST /rooms - 创建房间:', room.id);
  
  const existingRoom = rooms.find(r => r.id === room.id);
  if (existingRoom) {
    return res.status(400).json({ error: '房间已存在' });
  }
  
  rooms.push(room);
  res.status(201).json(room);
});

app.put('/rooms/:id', (req, res) => {
  const { id } = req.params;
  const updatedRoom = req.body;
  console.log('PUT /rooms/:id - 更新房间:', id);
  
  const index = rooms.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  rooms[index] = updatedRoom;
  res.json(updatedRoom);
});

app.delete('/rooms/:id', (req, res) => {
  const { id } = req.params;
  console.log('DELETE /rooms/:id - 删除房间:', id);
  
  const index = rooms.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  rooms.splice(index, 1);
  res.status(204).send();
});

// 存档相关 API
async function loadSaves() {
  const data = await fs.readFile(SAVES_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveSaves(saves) {
  await fs.writeFile(SAVES_FILE, JSON.stringify(saves, null, 2));
}

// 获取用户存档
app.get('/api/save', authMiddleware, async (req, res) => {
  try {
    const saves = await loadSaves();
    const userSave = saves[req.user.username] || null;
    res.json(userSave);
  } catch (error) {
    console.error('获取存档错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 保存用户存档
app.post('/api/save', authMiddleware, async (req, res) => {
  try {
    const saves = await loadSaves();
    saves[req.user.username] = req.body;
    await saveSaves(saves);
    res.json({ message: '保存成功' });
  } catch (error) {
    console.error('保存存档错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 启动服务器
async function start() {
  await ensureDataFiles();
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

start().catch(console.error);