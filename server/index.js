const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = 3001;
const SECRET_KEY = 'dot-agents-secret-key-change-this-in-prod';
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large save data

// Helper to read users
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return {};
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading users file:", e);
        return {};
    }
};

// Helper to write users
const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Register
app.post('/api/register', (req, res) => {
    const { username, password, initialData } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    const users = readUsers();
    if (users[username]) {
        return res.status(409).json({ message: 'User already exists' });
    }

    // In a real app, hash the password!
    users[username] = {
        password: password, // Plaintext for prototype only
        saveData: initialData || null
    };
    writeUsers(users);

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, saveData: users[username].saveData });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users[username];

    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, saveData: user.saveData });
});

// Save Game Data
app.post('/api/save', authenticateToken, (req, res) => {
    const { saveData } = req.body;
    const username = req.user.username;

    const users = readUsers();
    if (users[username]) {
        users[username].saveData = saveData;
        writeUsers(users);
        res.json({ message: 'Saved successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Load Game Data
app.get('/api/load', authenticateToken, (req, res) => {
    const username = req.user.username;
    const users = readUsers();

    if (users[username]) {
        res.json({ saveData: users[username].saveData });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// ========== MULTIPLAYER LOGIC ==========

// Room storage
const rooms = new Map();
const playerRooms = new Map(); // Map player socket ID to room ID

// Helper to generate room ID
const generateRoomId = () => {
    return 'room_' + Math.random().toString(36).substr(2, 9);
};

// Helper to broadcast room update
const broadcastRoomUpdate = (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
        io.to(roomId).emit('room-updated', room);
    }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('[Multiplayer] Player connected:', socket.id);

    // Create room
    socket.on('create-room', (data) => {
        const { name, mapName, settings } = data;
        const roomId = generateRoomId();

        const room = {
            id: roomId,
            name: name || 'Unnamed Room',
            hostId: socket.id,
            maxPlayers: 8,
            currentPlayers: 1,
            status: 'waiting',
            mapName: mapName || 'default',
            players: {
                [socket.id]: {
                    id: socket.id,
                    username: socket.id.substr(0, 8),
                    team: 'red',
                    isReady: false,
                    isHost: true
                }
            },
            settings: {
                friendlyFire: false,
                roundTime: 300,
                scoreLimit: 50,
                ...settings
            }
        };

        rooms.set(roomId, room);
        playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        socket.emit('room-created', room);
        socket.emit('room-joined', room);
        console.log(`[Multiplayer] Room created: ${roomId} by ${socket.id}`);
    });

    // Join room
    socket.on('join-room', (data) => {
        const { roomId, team } = data;
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.currentPlayers >= room.maxPlayers) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        if (room.status !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }

        // Add player to room
        room.players[socket.id] = {
            id: socket.id,
            username: socket.id.substr(0, 8),
            team: team || 'red',
            isReady: false,
            isHost: false
        };
        room.currentPlayers++;

        playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        // Notify player
        socket.emit('room-joined', room);

        // Notify others
        socket.to(roomId).emit('player-joined', room.players[socket.id]);
        broadcastRoomUpdate(roomId);

        console.log(`[Multiplayer] ${socket.id} joined room: ${roomId}`);
    });

    // Leave room
    socket.on('leave-room', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        // Remove player
        delete room.players[socket.id];
        room.currentPlayers--;

        // If room is empty, delete it
        if (room.currentPlayers === 0) {
            rooms.delete(roomId);
            console.log(`[Multiplayer] Room ${roomId} deleted (empty)`);
        } else {
            // If host left, assign new host
            if (room.hostId === socket.id) {
                const newHostId = Object.keys(room.players)[0];
                room.hostId = newHostId;
                room.players[newHostId].isHost = true;
            }

            // Notify others
            io.to(roomId).emit('player-left', { playerId: socket.id });
            broadcastRoomUpdate(roomId);
        }

        socket.leave(roomId);
        playerRooms.delete(socket.id);
        socket.emit('room-left');

        console.log(`[Multiplayer] ${socket.id} left room: ${roomId}`);
    });

    // Get room list
    socket.on('get-room-list', () => {
        const roomList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            status: room.status,
            mapName: room.mapName
        }));
        socket.emit('room-list', roomList);
    });

    // Toggle ready
    socket.on('toggle-ready', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || !room.players[socket.id]) return;

        room.players[socket.id].isReady = !room.players[socket.id].isReady;
        broadcastRoomUpdate(roomId);
    });

    // Switch team
    socket.on('switch-team', (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || !room.players[socket.id]) return;

        room.players[socket.id].team = data.team;
        broadcastRoomUpdate(roomId);
    });

    // Start game (host only)
    socket.on('start-game', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || room.hostId !== socket.id) {
            socket.emit('error', { message: 'Only host can start game' });
            return;
        }

        // Check if all players are ready
        const allReady = Object.values(room.players).every(p => p.isReady || p.isHost);
        if (!allReady) {
            socket.emit('error', { message: 'Not all players are ready' });
            return;
        }

        room.status = 'playing';
        io.to(roomId).emit('game-started');
        broadcastRoomUpdate(roomId);

        console.log(`[Multiplayer] Game started in room: ${roomId}`);
    });

    // Player state update
    socket.on('player-update', (state) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        // Broadcast to other players in the room
        socket.to(roomId).emit('player-update', {
            source: socket.id,
            ...state
        });
    });

    // Player action (shooting, etc.)
    socket.on('player-action', (action) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('player-action', {
            source: socket.id,
            ...action
        });
    });

    // Player hit
    socket.on('player-hit', (payload) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        // Broadcast hit event to all players
        io.to(roomId).emit('player-hit', payload);
    });

    // Fire weapon
    socket.on('fire-weapon', (payload) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('fire-weapon', payload);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('[Multiplayer] Player disconnected:', socket.id);

        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        // Remove player
        delete room.players[socket.id];
        room.currentPlayers--;

        // If room is empty, delete it
        if (room.currentPlayers === 0) {
            rooms.delete(roomId);
            console.log(`[Multiplayer] Room ${roomId} deleted (empty)`);
        } else {
            // If host left, assign new host
            if (room.hostId === socket.id) {
                const newHostId = Object.keys(room.players)[0];
                room.hostId = newHostId;
                room.players[newHostId].isHost = true;
            }

            // Notify others
            io.to(roomId).emit('player-left', { playerId: socket.id });
            broadcastRoomUpdate(roomId);
        }

        playerRooms.delete(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO multiplayer enabled`);
});
