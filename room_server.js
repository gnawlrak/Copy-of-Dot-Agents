const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// 启用CORS
app.use(cors());
app.use(express.json());

// 内存中的房间数据
let rooms = [];

// 获取所有房间
app.get('/rooms', (req, res) => {
  console.log('GET /rooms - 返回房间数量:', rooms.length);
  res.json(rooms);
});

// 创建房间
app.post('/rooms', (req, res) => {
  const room = req.body;
  console.log('POST /rooms - 创建房间:', room.id);
  
  // 检查房间是否已存在
  const existingRoom = rooms.find(r => r.id === room.id);
  if (existingRoom) {
    return res.status(400).json({ error: '房间已存在' });
  }
  
  rooms.push(room);
  res.json({ success: true, room });
});

// 加入房间
app.post('/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const player = req.body;
  
  console.log('POST /rooms/' + roomId + '/join - 玩家加入:', player.id);
  
  const room = rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  room.players[player.id] = player;
  room.currentPlayers = Object.keys(room.players).length;
  
  res.json({ success: true, room });
});

// 离开房间
app.post('/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;
  
  console.log('POST /rooms/' + roomId + '/leave - 玩家离开:', playerId);
  
  const room = rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  delete room.players[playerId];
  room.currentPlayers = Object.keys(room.players).length;
  
  // 如果房间为空，删除房间
  if (room.currentPlayers === 0) {
    rooms = rooms.filter(r => r.id !== roomId);
  }
  
  res.json({ success: true, room });
});

// 删除房间
app.delete('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log('DELETE /rooms/' + roomId + ' - 删除房间');
  
  rooms = rooms.filter(r => r.id !== roomId);
  res.json({ success: true });
});

// 清空所有房间（用于调试）
app.delete('/rooms', (req, res) => {
  console.log('DELETE /rooms - 清空所有房间');
  rooms = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`房间管理服务器运行在 http://localhost:${PORT}`);
  console.log('房间API端点:');
  console.log('  GET    /rooms           - 获取所有房间');
  console.log('  POST   /rooms           - 创建房间');
  console.log('  POST   /rooms/:id/join  - 加入房间');
  console.log('  POST   /rooms/:id/leave - 离开房间');
  console.log('  DELETE /rooms/:id       - 删除房间');
  console.log('  DELETE /rooms           - 清空所有房间');
});