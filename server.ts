import express from 'express';
import path from 'path';
import fs from 'fs';
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
  interface ServerPlayer {
    id: string;
    name?: string;
    skinColor?: string;
    x: number;
    y: number;
    direction: number;
    health: number;
    isShooting: boolean;
    currentWeaponIndex: number;
    shieldName?: string;
    shieldDurability?: number;
    shieldMaxDurability?: number;
    kills: number;        // match kills
    deaths: number;       // match deaths
    totalKills: number;   // persistent kills
    totalDeaths: number;  // persistent deaths
  }

  interface ServerRoom {
    id: string;
    name: string;
    mode: 'tdm' | 'ffa' | '1v1';
    levelName: string;
    maxPlayers: number;
    players: Map<string, ServerPlayer>;
    weaponDrops: Map<string, any>;
  }

  interface PersistentPlayerStats {
    kills: number;
    deaths: number;
    name?: string;
    lastSeen: string;
  }

  interface PersistentStats {
    players: Record<string, PersistentPlayerStats>;
  }

  const getDefaultMaxPlayers = (mode: 'tdm' | 'ffa' | '1v1') => {
    switch (mode) {
      case '1v1': return 2;
      case 'tdm': return 8;
      case 'ffa': return 8;
      default: return 8;
    }
  };

  const rooms = new Map<string, ServerRoom>();

  // Persistent stats storage
  const STATS_FILE = path.join(process.cwd(), '.server-stats.json');
  let persistentStats: PersistentStats = { players: {} };

  const loadPersistentStats = () => {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const raw = fs.readFileSync(STATS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.players === 'object') {
          persistentStats = parsed;
        }
      }
    } catch (err) {
      console.error('[Server] Failed to load persistent stats:', err);
    }
  };

  const savePersistentStats = () => {
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify(persistentStats, null, 2));
    } catch (err) {
      console.error('[Server] Failed to save persistent stats:', err);
    }
  };

  const getOrCreatePlayerStats = (playerId: string): PersistentPlayerStats => {
    if (!persistentStats.players[playerId]) {
      persistentStats.players[playerId] = { kills: 0, deaths: 0, lastSeen: new Date().toISOString() };
    }
    return persistentStats.players[playerId];
  };

  const recordKill = (attackerId?: string) => {
    if (!attackerId || attackerId === 'unknown' || attackerId === 'explosion') return;
    const stats = getOrCreatePlayerStats(attackerId);
    stats.kills += 1;
    stats.lastSeen = new Date().toISOString();
  };

  const recordDeath = (victimId?: string) => {
    if (!victimId || victimId === 'unknown') return;
    const stats = getOrCreatePlayerStats(victimId);
    stats.deaths += 1;
    stats.lastSeen = new Date().toISOString();
  };

  const computeLeaderboards = () => {
    const players = Object.entries(persistentStats.players).map(([id, s]) => ({
      id,
      kills: s.kills,
      deaths: s.deaths,
      name: s.name || id.substring(0, 8).toUpperCase(),
      kd: s.deaths === 0 ? s.kills : s.kills / s.deaths
    }));
    const killLeaderboard = [...players].sort((a, b) => b.kills - a.kills).slice(0, 20);
    const kdLeaderboard = [...players].sort((a, b) => b.kd - a.kd).slice(0, 20);
    return { killLeaderboard, kdLeaderboard };
  };

  const buildScoreUpdate = (room: ServerRoom) => {
    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      kills: p.kills,
      deaths: p.deaths
    }));
    const totalKills = players.reduce((sum, p) => sum + p.kills, 0);
    return { players, totalKills, mode: room.mode };
  };

  const broadcastScoreUpdate = (room: ServerRoom) => {
    const update = buildScoreUpdate(room);
    io.to(room.id).emit('score-update', update);
  };

  loadPersistentStats();

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connection: ${socket.id}`);

    socket.on('join-game', (payload: any) => {
      const { roomId, roomName, mode, levelName, id, maxPlayers } = payload;
      const finalRoomId = roomId || 'default-room';

      let room = rooms.get(finalRoomId);
      if (room && room.players.size >= room.maxPlayers) {
        console.log(`[Socket] Room ${finalRoomId} is full (${room.players.size}/${room.maxPlayers}). Rejecting player ${id}.`);
        socket.emit('room-full', { roomId: finalRoomId, maxPlayers: room.maxPlayers });
        return;
      }

      console.log(`[Socket] Player ${id} joined room ${finalRoomId} (${mode}, ${levelName})`);

      (socket as any).roomId = finalRoomId;
      (socket as any).playerId = id;

      socket.join(finalRoomId);

      if (!room) {
        const resolvedMode: 'tdm' | 'ffa' | '1v1' = mode || 'tdm';
        const resolvedMax =
          typeof maxPlayers === 'number' && maxPlayers >= 2 && maxPlayers <= 16
            ? maxPlayers
            : getDefaultMaxPlayers(resolvedMode);
        room = {
          id: finalRoomId,
          name: roomName || `Room ${finalRoomId}`,
          mode: resolvedMode,
          levelName: levelName || 'THE FACTORY',
          maxPlayers: resolvedMax,
          players: new Map(),
          weaponDrops: new Map()
        };
        rooms.set(finalRoomId, room);
      }

      // Merge persistent stats into player state
      const existingStats = getOrCreatePlayerStats(id);
      const playerState: ServerPlayer = {
        ...payload,
        id,
        kills: 0,
        deaths: 0,
        totalKills: existingStats.kills,
        totalDeaths: existingStats.deaths
      };
      room.players.set(id, playerState);

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
      socket.to(finalRoomId).emit('player-joined', playerState);

      // Send current scoreboard to the new player
      socket.emit('score-update', buildScoreUpdate(room));

      // Disseminate structural room update
      const roomState = {
        id: room.id,
        name: room.name,
        mode: room.mode,
        levelName: room.levelName,
        maxPlayers: room.maxPlayers,
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
      const updated: ServerPlayer = { ...(existing as ServerPlayer), ...playerState };
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

    socket.on('player-killed', (payload: any) => {
      const roomId = (socket as any).roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const { victimId, attackerId } = payload || {};
      if (!victimId) return;

      const victim = room.players.get(victimId);
      if (!victim) return;

      victim.deaths += 1;
      victim.totalDeaths += 1;
      recordDeath(victimId);

      if (attackerId && attackerId !== victimId && attackerId !== 'unknown' && attackerId !== 'explosion') {
        const attacker = room.players.get(attackerId);
        if (attacker) {
          attacker.kills += 1;
          attacker.totalKills += 1;
          recordKill(attackerId);
        }
      }

      savePersistentStats();
      broadcastScoreUpdate(room);

      // Broadcast kill feed event
      io.to(roomId).emit('kill-feed', {
        victimId,
        attackerId: attackerId || 'unknown',
        timestamp: Date.now()
      });
    });

    socket.on('request-leaderboard', () => {
      const leaderboards = computeLeaderboards();
      socket.emit('leaderboard-update', leaderboards);
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
              maxPlayers: room.maxPlayers,
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
      playersCount: r.players.size,
      maxPlayers: r.maxPlayers
    }));
    res.json({ rooms: list });
  });

  // REST API endpoint for global leaderboards
  app.get('/api/leaderboards', (req, res) => {
    const { killLeaderboard, kdLeaderboard } = computeLeaderboards();
    res.json({ killLeaderboard, kdLeaderboard });
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
