import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const PORT = 3000;

  // In-memory multiplayer session tables organized by room ID
  interface ServerRoom {
    id: string;
    name: string;
    mode: 'tdm' | 'ffa' | '1v1';
    levelName: string;
    players: Map<string, any>;
    weaponDrops: Map<string, any>;
  }

  const rooms = new Map<string, ServerRoom>();

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connection: ${socket.id}`);

    socket.on('join-game', (payload: any) => {
      const { roomId, roomName, mode, levelName, id } = payload;
      const finalRoomId = roomId || 'default-room';
      
      console.log(`[Socket] Player ${id} joined room ${finalRoomId} (${mode}, ${levelName})`);
      
      (socket as any).roomId = finalRoomId;
      (socket as any).playerId = id;

      socket.join(finalRoomId);

      let room = rooms.get(finalRoomId);
      if (!room) {
        room = {
          id: finalRoomId,
          name: roomName || `Room ${finalRoomId}`,
          mode: mode || 'tdm',
          levelName: levelName || 'THE FACTORY',
          players: new Map(),
          weaponDrops: new Map()
        };
        rooms.set(finalRoomId, room);
      }

      // Save state
      room.players.set(id, payload);

      // Catch the new player up on existing players in match
      room.players.forEach((otherPlayer, otherId) => {
        if (otherId !== id) {
          socket.emit('player-joined', otherPlayer);
        }
      });

      // Catch new player up on current weapons on the floor
      room.weaponDrops.forEach((drop) => {
        socket.emit('drop-weapon', drop);
      });

      // Announce the new operator join to other operators in room
      socket.to(finalRoomId).emit('player-joined', payload);

      // Disseminate structural room update
      const roomState = {
        id: room.id,
        name: room.name,
        mode: room.mode,
        levelName: room.levelName,
        players: Object.fromEntries(room.players)
      };
      io.to(finalRoomId).emit('room-updated', roomState);
    });

    socket.on('player-update', (playerState: any) => {
      if (!playerState || !playerState.id) return;
      const roomId = (socket as any).roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const existing = room.players.get(playerState.id) || {};
      const updated = { ...existing, ...playerState };
      room.players.set(playerState.id, updated);

      // Disseminate to everyone else in this room
      socket.to(roomId).emit('player-update', updated);
    });

    socket.on('fire-weapon', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit('fire-weapon', payload);
      }
    });

    socket.on('player-hit', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        console.log(`[Socket] Registered hit registration in room ${roomId} on: ${payload.targetId}`, payload);
        socket.to(roomId).emit('player-hit', payload);
      }
    });

    socket.on('drop-weapon', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        const room = rooms.get(roomId);
        if (room && payload.id) {
          room.weaponDrops.set(payload.id, payload);
        }
        socket.to(roomId).emit('drop-weapon', payload);
      }
    });

    socket.on('pickup-weapon', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        const room = rooms.get(roomId);
        if (room && payload.id) {
          room.weaponDrops.delete(payload.id);
        }
        socket.to(roomId).emit('pickup-weapon', payload);
      }
    });

    socket.on('player-action', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit('player-action', payload);
      }
    });

    socket.on('disconnect', () => {
      const roomId = (socket as any).roomId;
      const playerId = (socket as any).playerId;
      console.log(`[Socket] Client disconnected: ${socket.id}, playerId: ${playerId}, roomId: ${roomId}`);
      if (roomId && playerId) {
        const room = rooms.get(roomId);
        if (room) {
          room.players.delete(playerId);
          socket.to(roomId).emit('player-left', { id: playerId, playerId: playerId });

          if (room.players.size === 0) {
            console.log(`[Socket] Room ${roomId} is empty. Deleting.`);
            rooms.delete(roomId);
          } else {
            const roomState = {
              id: room.id,
              name: room.name,
              mode: room.mode,
              levelName: room.levelName,
              players: Object.fromEntries(room.players)
            };
            io.to(roomId).emit('room-updated', roomState);
          }
        }
      }
    });
  });

  // REST API endpoint to list active rooms
  app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      mode: r.mode,
      levelName: r.levelName,
      playersCount: r.players.size
    }));
    res.json({ rooms: list });
  });

  // Health probe API endpoint
  app.get('/api/health', (req, res) => {
    let totalPlayers = 0;
    rooms.forEach(r => {
      totalPlayers += r.players.size;
    });
    res.json({ status: 'ok', playersConnected: totalPlayers });
  });

  // Setup Express static files & SPA Fallback matching production vs sandbox
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Real-time tactical server listening on transport port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Critical startup execution trace halted:', err);
});
