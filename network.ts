// Dot Agents 联机网络模块 — 完整功能实现

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  direction: number;
  health: number;
  skinColor?: string;
  team?: 'red' | 'blue';
  role?: 'assault' | 'support' | 'recon' | 'medic';
  loadout?: PlayerLoadout;
  score?: number;
  kills?: number;
  deaths?: number;
  ping?: number;
  isReady?: boolean;
}

export interface RemotePlayer extends PlayerState {
  targetX: number;
  targetY: number;
  lastUpdateTime: number;
  isShooting?: boolean;
  predictedState?: PlayerState;
  interpolationFactor: number;
}

export interface FireEventPayload {
  ownerId: string;
  weaponName: string;
  baseAngle: number;
  position?: { x: number; y: number };
  timestamp: number;
  sequence: number;
}

// 游戏模式定义
export enum GameMode {
  TEAM_DEATHMATCH = 'team_deathmatch',
  BOMB_DEFUSE = 'bomb_defuse',
  CAPTURE_THE_FLAG = 'capture_the_flag',
  COOP_RAID = 'coop_raid',
  HOSTAGE_RESCUE = 'hostage_rescue',
  HIGH_VALUE_TARGET = 'high_value_target'
}

// 房间状态定义
export enum RoomStatus {
  WAITING = 'waiting',
  READY = 'ready',
  IN_GAME = 'in_game',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

// 房间类型定义
export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  FRIENDS_ONLY = 'friends',
  COMPETITIVE = 'competitive',
  CUSTOM = 'custom'
}

// 房间设置接口
export interface RoomSettings {
  gameMode: GameMode;
  map: string;
  timeLimit: number;
  scoreLimit: number;
  friendlyFire: boolean;
  maxPlayers: number;
  teamSize: number;
  autoBalance: boolean;
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  customRules?: string[];
}

// 完整房间接口
export interface Room {
  id: string;
  name: string;
  ownerId: string;
  players: { [id: string]: PlayerState };
  started?: boolean;
  startPositions?: { x: number; y: number }[];
  createdAt: number;
  status: RoomStatus;
  type: RoomType;
  settings: RoomSettings;
  currentPlayers: number;
  region: string;
  ping: number;
  password?: string;
  tags: string[];
  statistics: RoomStatistics;
}

// 房间统计接口
interface RoomStatistics {
  gamesPlayed: number;
  averageDuration: number;
  playerSatisfaction: number;
  successRate: number;
}

// 匹配系统接口
export interface MatchmakingPlayer {
  playerId: string;
  skillRating: SkillRating;
  region: string;
  ping: number;
  preferences: MatchmakingPreferences;
  waitingTime: number;
}

// 技能评级接口
export interface SkillRating {
  mmr: number;
  uncertainty: number;
  volatility: number;
  gamesPlayed: number;
  winRate: number;
  kda: number;
  lastPlayed: number;
}

// 匹配偏好接口
export interface MatchmakingPreferences {
  gameModes: GameMode[];
  regions: string[];
  maxPing: number;
  teamPreference: 'solo' | 'duo' | 'team';
  language: string;
  skillRange: { min?: number; max?: number };
}

// 网络事件接口
export interface NetworkEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  data: any;
  timestamp: number;
  reliability: 'guaranteed' | 'best_effort' | 'unreliable';
}

// 玩家装备接口
export interface PlayerLoadout {
  primaryWeapon: string;
  secondaryWeapon: string;
  equipment: string[];
  perks: string[];
  skin: string;
}

// 存储键常量
const ROOMS_KEY = 'dot_agents_mock_rooms_v2';
const PLAYER_UPDATE_KEY = 'dot_agents_player_update_v2';
const PLAYER_JOIN_KEY = 'dot_agents_player_join_v2';
const CURRENT_ROOM_KEY = 'dot_agents_current_room_v2';
const MATCHMAKING_QUEUE_KEY = 'dot_agents_matchmaking_queue_v1';
const PLAYER_STATS_KEY = 'dot_agents_player_stats_v1';
const SERVER_LIST_KEY = 'dot_agents_server_list_v1';

type EventHandler = (payload: any) => void;

// 导出所有必要的类型和函数
export {
  PlayerState,
  Room,
  RoomSettings,
  roomManager,
  readRooms,
  writeRooms,
  onRoomsUpdate,
  clearAllRooms,
  setClearRoomsOnInit
};

// 工具函数
function now() { return Date.now(); }

// 房间数据共享机制 - 使用真正的中央存储
let sharedRooms: Room[] = [];
let roomUpdateCallbacks: ((rooms: Room[]) => void)[] = [];

// 创建全局房间管理器
class RoomManager {
  private static instance: RoomManager;
  private rooms: Room[] = [];
  private listeners: ((rooms: Room[]) => void)[] = [];
  private roomListeners: ((room: Room) => void)[] = [];
  private clearOnInit: boolean = false;
  
  static getInstance(clearOnInit: boolean = false): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager(clearOnInit);
    }
    return RoomManager.instance;
  }
  
  constructor(clearOnInit: boolean = false) {
    // 首先检查localStorage中是否有设置
    try {
      const storedSetting = localStorage.getItem('CLEAR_ROOMS_ON_INIT');
      if (storedSetting !== null) {
        this.clearOnInit = storedSetting === 'true';
        // 使用后清除设置，避免每次初始化都清空
        localStorage.removeItem('CLEAR_ROOMS_ON_INIT');
      } else {
        this.clearOnInit = clearOnInit;
      }
    } catch (e) {
      this.clearOnInit = clearOnInit;
    }
    
    this.loadRooms();
    this.setupCrossTabSync();
  }
  
  // 加载房间数据
  private loadRooms() {
    try {
      const raw = localStorage.getItem(ROOMS_KEY);
      this.rooms = raw ? JSON.parse(raw) : [];
      
      // 如果设置了初始化时清空房间，则清空所有房间
      if (this.clearOnInit && this.rooms.length > 0) {
        console.log('初始化时清空所有房间');
        this.rooms = [];
        this.saveRooms(); // 立即保存空房间列表
      }
      
      sharedRooms = this.rooms;
    } catch {
      this.rooms = [];
      sharedRooms = [];
    }
  }
  
  // 保存房间数据
  private saveRooms() {
    try {
      // 先获取旧值
      const oldValue = localStorage.getItem(ROOMS_KEY);
      // 保存新值到localStorage
      localStorage.setItem(ROOMS_KEY, JSON.stringify(this.rooms));
      
      // 更新共享内存和通知当前页面的监听器
      sharedRooms = this.rooms;
      this.notifyListeners();
      
      // 使用BroadcastChannel作为更可靠的跨标签页通信方式
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel('dot_agents_rooms');
          channel.postMessage({
            type: 'rooms_updated',
            rooms: this.rooms,
            timestamp: Date.now()
          });
          channel.close();
        } catch (e) {
          console.error('BroadcastChannel error:', e);
        }
      }
    } catch (e) {
      console.error('Error saving rooms:', e);
    }
  }
  
  // 设置跨标签页同步
  private setupCrossTabSync() {
    // 主要使用BroadcastChannel进行跨标签页通信
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('dot_agents_rooms');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'rooms_updated') {
            try {
              const oldRooms = [...this.rooms];
              this.rooms = event.data.rooms || [];
              sharedRooms = this.rooms;
              this.notifyListeners();
              
              // 检查是否有房间更新，并通知房间监听器
              this.notifyRoomListeners(oldRooms, this.rooms);
            } catch (e) {
              console.error('Error parsing rooms from BroadcastChannel:', e);
            }
          }
        };
        
        // 当页面关闭时清理channel
        window.addEventListener('beforeunload', () => {
          try {
            channel.close();
          } catch {}
        });
      } catch (e) {
        console.error('BroadcastChannel setup error:', e);
        // 降级到storage事件作为备用方案
        this.setupStorageSync();
      }
    } else {
      // 降级到storage事件作为备用方案
      this.setupStorageSync();
    }
  }
  
  // 备用的storage事件同步机制
  private setupStorageSync() {
    window.addEventListener('storage', (event) => {
      if (event.key === ROOMS_KEY && event.newValue) {
        try {
          const oldRooms = [...this.rooms];
          this.rooms = JSON.parse(event.newValue);
          sharedRooms = this.rooms;
          this.notifyListeners();
          
          // 检查是否有房间更新，并通知房间监听器
          this.notifyRoomListeners(oldRooms, this.rooms);
        } catch (e) {
          console.error('Error parsing rooms from storage event:', e);
        }
      }
    });
  }
  
  // 比较房间列表并通知房间监听器
  private notifyRoomListeners(oldRooms: Room[], newRooms: Room[]) {
    // 创建旧房间ID到房间的映射
    const oldRoomMap = new Map(oldRooms.map(room => [room.id, room]));
    
    // 检查每个新房间是否有更新
    newRooms.forEach(newRoom => {
      const oldRoom = oldRoomMap.get(newRoom.id);
      
      // 如果房间不存在或者是新房间，通知监听器
      if (!oldRoom || JSON.stringify(oldRoom) !== JSON.stringify(newRoom)) {
        this.roomListeners.forEach(listener => {
          try {
            listener(newRoom);
          } catch (e) {
            console.error('Error notifying room listener:', e);
          }
        });
      }
    });
  }
  
  // 通知监听器
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.rooms));
    roomUpdateCallbacks.forEach(callback => callback(this.rooms));
  }
  
  // 添加房间
  addRoom(room: Room) {
    // 检查房间是否已存在
    const existingIndex = this.rooms.findIndex(r => r.id === room.id);
    if (existingIndex >= 0) {
      this.rooms[existingIndex] = room;
    } else {
      this.rooms.push(room);
    }
    this.saveRooms();
    
    // 通知房间更新监听器
    this.roomListeners.forEach(listener => {
      try {
        listener(room);
      } catch (e) {
        console.error('Error notifying room listener:', e);
      }
    });
  }
  
  // 删除房间
  removeRoom(roomId: string) {
    this.rooms = this.rooms.filter(room => room.id !== roomId);
    this.saveRooms();
  }
  
  // 删除所有房间
  clearAllRooms() {
    this.rooms = [];
    this.saveRooms();
  }
  
  // 获取所有房间
  getAllRooms(): Room[] {
    return [...this.rooms];
  }
  
  // 根据ID获取房间
  getRoomById(roomId: string): Room | undefined {
    return this.rooms.find(room => room.id === roomId);
  }
  
  // 添加监听器
  addListener(listener: (rooms: Room[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // 添加房间更新监听器
  addRoomListener(listener: (room: Room) => void) {
    this.roomListeners.push(listener);
    return () => {
      this.roomListeners = this.roomListeners.filter(l => l !== listener);
    };
  }
}

// 全局房间管理器实例
const roomManager = RoomManager.getInstance();

function readRooms(): Room[] { 
  return roomManager.getAllRooms();
}

function writeRooms(r: Room[]) { 
  // 使用房间管理器来管理房间数据
  const currentRooms = roomManager.getAllRooms();
  
  // 更新所有房间
  r.forEach(room => {
    roomManager.addRoom(room);
  });
  
  // 删除不存在的房间
  const roomIds = r.map(room => room.id);
  currentRooms.forEach(room => {
    if (!roomIds.includes(room.id)) {
      roomManager.removeRoom(room.id);
    }
  });
}

// 清空所有房间
function clearAllRooms() {
  roomManager.clearAllRooms();
}

// 设置初始化时清空所有房间
function setClearRoomsOnInit(clearOnInit: boolean) {
  // 注意：这个函数必须在RoomManager实例化之前调用
  console.log(`设置初始化时清空所有房间: ${clearOnInit}`);
  
  // 将设置保存到localStorage，以便在RoomManager实例化时使用
  try {
    localStorage.setItem('CLEAR_ROOMS_ON_INIT', clearOnInit.toString());
  } catch (e) {
    console.error('无法保存清空房间设置:', e);
  }
}

// 注册房间更新回调
function onRoomsUpdate(callback: (rooms: Room[]) => void) {
  return roomManager.addListener(callback);
}

// 注册特定房间更新回调
function onRoomUpdate(callback: (room: Room) => void) {
  return roomManager.addRoomListener(callback);
}

// 匹配队列管理
class MatchmakingQueue {
  private queue: Map<GameMode, MatchmakingPlayer[]> = new Map();
  
  enqueue(player: MatchmakingPlayer, gameMode: GameMode) {
    if (!this.queue.has(gameMode)) {
      this.queue.set(gameMode, []);
    }
    this.queue.get(gameMode)!.push(player);
    this.saveQueue();
  }
  
  dequeue(playerId: string, gameMode: GameMode): boolean {
    const queue = this.queue.get(gameMode);
    if (!queue) return false;
    
    const index = queue.findIndex(p => p.playerId === playerId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }
  
  findMatches(gameMode: GameMode, teamSize: number): MatchmakingPlayer[][] {
    const queue = this.queue.get(gameMode) || [];
    const matches: MatchmakingPlayer[][] = [];
    
    while (queue.length >= teamSize) {
      const match = queue.splice(0, teamSize);
      matches.push(match);
    }
    
    this.saveQueue();
    return matches;
  }
  
  getQueueStatus(gameMode: GameMode) {
    const queue = this.queue.get(gameMode) || [];
    return {
      playerCount: queue.length,
      averageWaitTime: this.calculateAverageWaitTime(queue),
      estimatedWait: this.estimateWaitTime(queue.length, teamSizeForMode(gameMode))
    };
  }
  
  private calculateAverageWaitTime(queue: MatchmakingPlayer[]): number {
    if (queue.length === 0) return 0;
    const totalWait = queue.reduce((sum, player) => sum + player.waitingTime, 0);
    return totalWait / queue.length;
  }
  
  private estimateWaitTime(queueSize: number, teamSize: number): number {
    // 简单的等待时间估算算法
    const baseWait = 30; // 基础等待时间(秒)
    const scalingFactor = 2; // 规模因子
    return baseWait + (queueSize / teamSize) * scalingFactor;
  }
  
  private saveQueue() {
    try {
      const queueData = Object.fromEntries(this.queue);
      localStorage.setItem(MATCHMAKING_QUEUE_KEY, JSON.stringify(queueData));
    } catch {}
  }
  
  loadQueue() {
    try {
      const raw = localStorage.getItem(MATCHMAKING_QUEUE_KEY);
      if (raw) {
        const queueData = JSON.parse(raw);
        this.queue = new Map(Object.entries(queueData).map(([key, value]) => {
          // 尝试将字符串转换为 GameMode 类型
          const gameMode = Object.values(GameMode).find(mode => mode === key) as GameMode | undefined;
          if (gameMode) {
            return [gameMode, value as MatchmakingPlayer[]];
          }
          return [null, []];
        }).filter(([key]) => key !== null) as [GameMode, MatchmakingPlayer[]][]);
      }
    } catch {}
  }
}

// 游戏模式对应的队伍大小
function teamSizeForMode(gameMode: GameMode): number {
  switch (gameMode) {
    case GameMode.TEAM_DEATHMATCH:
    case GameMode.BOMB_DEFUSE:
      return 5; // 5v5
    case GameMode.CAPTURE_THE_FLAG:
      return 6; // 6v6
    case GameMode.COOP_RAID:
    case GameMode.HOSTAGE_RESCUE:
    case GameMode.HIGH_VALUE_TARGET:
      return 4; // 4人合作
    default:
      return 5;
  }
}

// 技能计算器
class SkillCalculator {
  calculateMMR(playerStats: any): SkillRating {
    // 简化的MMR计算算法
    const baseMMR = 1000;
    const winBonus = playerStats.wins * 25;
    const kdaBonus = Math.max(0, (playerStats.kda - 1) * 50);
    const gamesBonus = Math.min(playerStats.gamesPlayed * 2, 200);
    
    return {
      mmr: baseMMR + winBonus + kdaBonus + gamesBonus,
      uncertainty: Math.max(50, 200 - playerStats.gamesPlayed * 5),
      volatility: 100,
      gamesPlayed: playerStats.gamesPlayed,
      winRate: playerStats.winRate,
      kda: playerStats.kda,
      lastPlayed: playerStats.lastPlayed
    };
  }
  
  calculateMatchQuality(players: MatchmakingPlayer[]): number {
    if (players.length === 0) return 0;
    
    const avgMMR = players.reduce((sum, p) => sum + p.skillRating.mmr, 0) / players.length;
    const mmrSpread = Math.max(...players.map(p => p.skillRating.mmr)) - 
                     Math.min(...players.map(p => p.skillRating.mmr));
    
    // 匹配质量计算(0-100)
    const baseQuality = 100;
    const mmrPenalty = Math.min(50, mmrSpread / 10);
    const pingPenalty = this.calculatePingPenalty(players);
    
    return Math.max(0, baseQuality - mmrPenalty - pingPenalty);
  }
  
  private calculatePingPenalty(players: MatchmakingPlayer[]): number {
    const avgPing = players.reduce((sum, p) => sum + p.ping, 0) / players.length;
    return Math.min(30, avgPing / 10);
  }
}

export class MockNetworkClient {
  private handlers: Map<string, EventHandler[]> = new Map();
  public connected = false;
  public ownId = `player_${Math.random().toString(36).slice(2,9)}`;
  private ws: WebSocket | null = null;
  
  // 新增组件
  private matchmakingQueue: MatchmakingQueue;
  private skillCalculator: SkillCalculator;
  private currentRoomId: string | null = null;
  private matchmakingTicket: string | null = null;
  private lastPingTime: number = 0;
  private sequenceNumber: number = 0;
  private pendingEvents: Map<string, any> = new Map();
  private predictionBuffer: any[] = [];
  private reconciliationQueue: any[] = [];
  
  // 网络同步相关属性
  private packetStats: { sent: number; received: number };
  private latencyHistory: number[];
  private playerHistory: Map<string, Array<{timestamp: number; state: any}>>;
  private lastSentState: Map<string, any>;
  private syncInterval: number;
  private compressionLevel: 'normal' | 'high';

  constructor() {
    this.onStorage = this.onStorage.bind(this);
    window.addEventListener('storage', this.onStorage);
    
    // 初始化组件
    this.matchmakingQueue = new MatchmakingQueue();
    this.skillCalculator = new SkillCalculator();
    this.matchmakingQueue.loadQueue();
    
    // 启动匹配处理循环
    this.startMatchmakingLoop();
    
    // 初始化网络监控系统
    this.initNetworkMonitoring();
    
    // 监听房间数据更新
    onRoomsUpdate((rooms) => {
      this.emit('room-list', rooms);
    });
    
    // 监听特定房间的更新
    onRoomUpdate((room) => {
      this.emit('room-updated', room);
    });
  }
  
  // 匹配处理循环
  private startMatchmakingLoop() {
    setInterval(() => {
      this.processMatchmaking();
    }, 5000); // 每5秒处理一次匹配
  }
  
  private processMatchmaking() {
    // 处理所有游戏模式的匹配
    Object.values(GameMode).forEach(gameMode => {
      const teamSize = teamSizeForMode(gameMode as GameMode);
      const matches = this.matchmakingQueue.findMatches(gameMode as GameMode, teamSize);
      
      matches.forEach(matchPlayers => {
        this.createMatchRoom(matchPlayers, gameMode as GameMode);
      });
    });
  }
  
  private createMatchRoom(players: MatchmakingPlayer[], gameMode: GameMode) {
    const roomId = `match_${Math.random().toString(36).slice(2,9)}`;
    const room: Room = {
      id: roomId,
      name: `${gameMode} Match`,
      ownerId: players[0].playerId,
      players: {},
      createdAt: now(),
      status: RoomStatus.WAITING,
      type: RoomType.PUBLIC,
      settings: this.getDefaultSettings(gameMode),
      currentPlayers: players.length,
      region: this.determineBestRegion(players),
      ping: this.calculateAveragePing(players),
      tags: [gameMode, 'matchmaking'],
      statistics: {
        gamesPlayed: 0,
        averageDuration: 0,
        playerSatisfaction: 0,
        successRate: 0
      }
    };
    
    // 添加玩家到房间
    players.forEach((player, index) => {
      room.players[player.playerId] = {
        id: player.playerId,
        x: 0,
        y: 0,
        direction: 0,
        health: 100,
        team: index % 2 === 0 ? 'red' : 'blue',
        role: this.assignRole(index),
        score: 0,
        kills: 0,
        deaths: 0,
        ping: player.ping,
        isReady: false
      };
    });
    
    // 保存房间
    const rooms = readRooms();
    rooms.push(room);
    writeRooms(rooms);
    
    // 通知玩家匹配成功
    players.forEach(player => {
      this.emit('match-found', {
        roomId: roomId,
        gameMode: gameMode,
        players: players.map(p => p.playerId),
        estimatedStartTime: now() + 30000 // 30秒后开始
      });
    });
  }
  
  private getDefaultSettings(gameMode: GameMode): RoomSettings {
    const baseSettings = {
      gameMode: gameMode,
      map: 'default',
      timeLimit: 600, // 10分钟
      scoreLimit: 100,
      friendlyFire: false,
      maxPlayers: teamSizeForMode(gameMode) * 2,
      teamSize: teamSizeForMode(gameMode),
      autoBalance: true,
      difficulty: 'normal' as const,
      customRules: []
    };
    
    // 根据游戏模式调整设置
    switch (gameMode) {
      case GameMode.BOMB_DEFUSE:
        return { ...baseSettings, timeLimit: 180, scoreLimit: 8 };
      case GameMode.CAPTURE_THE_FLAG:
        return { ...baseSettings, timeLimit: 900, scoreLimit: 3 };
      case GameMode.COOP_RAID:
        return { ...baseSettings, timeLimit: 1200, scoreLimit: 0, friendlyFire: true };
      default:
        return baseSettings;
    }
  }
  
  private determineBestRegion(players: MatchmakingPlayer[]): string {
    // 简单的区域选择算法
    const regionCounts = players.reduce((counts, player) => {
      counts[player.region] = (counts[player.region] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.keys(regionCounts).reduce((best, region) => 
      regionCounts[region] > (regionCounts[best] || 0) ? region : best, 'default');
  }
  
  private calculateAveragePing(players: MatchmakingPlayer[]): number {
    if (players.length === 0) return 0;
    return players.reduce((sum, player) => sum + player.ping, 0) / players.length;
  }
  
  private assignRole(index: number): 'assault' | 'support' | 'recon' | 'medic' {
    const roles: ('assault' | 'support' | 'recon' | 'medic')[] = ['assault', 'support', 'recon', 'medic'];
    return roles[index % roles.length];
  }

  setOwnId(id: string) {
    if (id) this.ownId = id;
  }

  on(event: string, cb: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(cb);
    console.log(`[Network] Registered handler for event '${event}'. Total handlers for this event: ${this.handlers.get(event)!.length}`);
  }

  off(event: string, cb: EventHandler) {
    const handlers = this.handlers.get(event) || [];
    const filteredHandlers = handlers.filter(x => x !== cb);
    this.handlers.set(event, filteredHandlers);
    console.log(`[Network] Removed handler for event '${event}'. Remaining handlers: ${filteredHandlers.length}`);
  }

  private emit(event: string, payload: any) {
    const handlers = this.handlers.get(event) || [];
    console.log(`[Network] Emitting event '${event}' to ${handlers.length} handlers with payload:`, payload);
    handlers.forEach(h => { 
      try { 
        h(payload); 
      } catch (e) { 
        console.error(`[Network] Error in event handler for '${event}':`, e);
      } 
    });
  }

  connect(initial?: { x: number; y: number; skinColor?: string }) {
    if (this.connected) return;
    this.connected = true;
    this.emit('connect', { id: this.ownId });
    try {
      localStorage.setItem(PLAYER_JOIN_KEY, JSON.stringify({ id: this.ownId, x: initial?.x || 0, y: initial?.y || 0, skinColor: initial?.skinColor || '#fff', t: now() }));
    } catch (e) {}
    const wsUrl = localStorage.getItem('dot_agents_ws_url');
    if (wsUrl) this.initWebSocket(wsUrl);
  }

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    this.emit('disconnect', {});
    try {
      localStorage.setItem(PLAYER_JOIN_KEY, JSON.stringify({ left: this.ownId, t: now() }));
    } catch (e) {}
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }

  send(event: string, payload: any) {
    console.log(`[Network] send called with event: '${event}', payload:`, payload);
    if (!this.connected) {
      console.log('[Network] Not connected, ignoring send');
      return;
    }
    const wsUrl = localStorage.getItem('dot_agents_ws_url');
    if (wsUrl && !this.ws) this.initWebSocket(wsUrl);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ e: event, p: payload })); } catch (e) {}
    }

    // 处理新增的网络事件
    switch (event) {
      case 'create-room':
        console.log('[Network] Handling create-room event');
        return this.createRoom(payload);
      case 'list-rooms':
        console.log('[Network] Handling list-rooms event');
        return this.emit('room-list', readRooms());
      case 'join-room':
        console.log('[Network] Handling join-room event');
        return this.joinRoom(payload);
      case 'leave-room':
        console.log('[Network] Handling leave-room event');
        return this.leaveRoom(payload);
      case 'clear-all-rooms':
        console.log('[Network] Handling clear-all-rooms event');
        return this.clearAllRooms(payload);
      case 'start-round':
        console.log('[Network] Handling start-round event');
        return this.startRound(payload);
      case 'end-round':
        console.log('[Network] Handling end-round event');
        return this.endRound(payload);
      case 'player-update':
        console.log('[Network] Handling player-update event');
        return this.handlePlayerUpdate(payload);
      case 'player-hit':
        console.log('[Network] Handling player-hit event');
        return this.playerHit(payload);
      case 'join-matchmaking':
        console.log('[Network] Handling join-matchmaking event');
        return this.joinMatchmaking(payload);
      case 'cancel-matchmaking':
        console.log('[Network] Handling cancel-matchmaking event');
        return this.cancelMatchmaking(payload);
      case 'ready-check':
        console.log('[Network] Handling ready-check event');
        return this.handleReadyCheck(payload);
      case 'team-management':
        console.log('[Network] Handling team-management event');
        return this.handleTeamManagement(payload);
      case 'network-ping':
        console.log('[Network] Handling network-ping event');
        return this.handlePing(payload);
      case 'reliable-event':
        console.log('[Network] Handling reliable-event event');
        return this.sendReliableEvent(payload);
      case 'ack-event':
        console.log('[Network] Handling ack-event event');
        return this.handleAckEvent(payload);
      default:
        console.log(`[Network] Handling unknown event: '${event}'`);
        this.emit(event, payload);
        return;
    }
  }
  
  // 新增匹配系统方法
  private joinMatchmaking(payload: { gameMode: GameMode; preferences?: MatchmakingPreferences }) {
    const playerStats = this.getPlayerStats(this.ownId);
    const skillRating = this.skillCalculator.calculateMMR(playerStats);
    
    const matchmakingPlayer: MatchmakingPlayer = {
      playerId: this.ownId,
      skillRating: skillRating,
      region: this.getPlayerRegion(),
      ping: this.getPlayerPing(),
      preferences: payload.preferences || this.getDefaultPreferences(),
      waitingTime: 0
    };
    
    this.matchmakingQueue.enqueue(matchmakingPlayer, payload.gameMode);
    this.matchmakingTicket = `ticket_${Math.random().toString(36).slice(2,9)}`;
    
    this.emit('matchmaking-joined', {
      ticketId: this.matchmakingTicket,
      gameMode: payload.gameMode,
      estimatedWait: this.matchmakingQueue.getQueueStatus(payload.gameMode).estimatedWait
    });
  }
  
  private cancelMatchmaking(payload: { ticketId: string }) {
    if (this.matchmakingTicket === payload.ticketId) {
      // 从所有游戏模式的队列中移除
      Object.values(GameMode).forEach(gameMode => {
        this.matchmakingQueue.dequeue(this.ownId, gameMode as GameMode);
      });
      this.matchmakingTicket = null;
      this.emit('matchmaking-cancelled', { ticketId: payload.ticketId });
    }
  }
  
  private handleReadyCheck(payload: { roomId: string; isReady: boolean }) {
    const rooms = readRooms();
    const room = rooms.find(r => r.id === payload.roomId);
    if (room && room.players[this.ownId]) {
      room.players[this.ownId].isReady = payload.isReady;
      writeRooms(rooms);
      
      // 使用RoomManager保存房间，确保通过BroadcastChannel同步
      roomManager.addRoom(room);
      
      // 检查是否所有玩家都准备就绪
      const allReady = Object.values(room.players).every(player => player.isReady);
      if (allReady && room.status === RoomStatus.WAITING) {
        room.status = RoomStatus.READY;
        writeRooms(rooms);
        
        // 使用RoomManager保存房间，确保通过BroadcastChannel同步
        roomManager.addRoom(room);
        
        this.emit('all-players-ready', { roomId: room.id });
        
        // 10秒后自动开始游戏
        setTimeout(() => {
          this.startRound({ roomId: room.id });
        }, 10000);
      }
      
      this.emit('room-updated', room);
    }
  }
  
  private handleTeamManagement(payload: { 
    action: 'switch' | 'invite' | 'kick' | 'promote'; 
    roomId: string; 
    targetPlayerId?: string; 
    team?: 'red' | 'blue';
  }) {
    const rooms = readRooms();
    const room = rooms.find(r => r.id === payload.roomId);
    if (!room || room.ownerId !== this.ownId) return;
    
    switch (payload.action) {
      case 'switch':
        if (payload.targetPlayerId && payload.team) {
          room.players[payload.targetPlayerId].team = payload.team;
        }
        break;
      case 'kick':
        if (payload.targetPlayerId && payload.targetPlayerId !== this.ownId) {
          delete room.players[payload.targetPlayerId];
          room.currentPlayers = Object.keys(room.players).length;
          this.emit('player-kicked', { roomId: room.id, playerId: payload.targetPlayerId });
        }
        break;
      case 'promote':
        if (payload.targetPlayerId) {
          room.ownerId = payload.targetPlayerId;
        }
        break;
    }
    
    writeRooms(rooms);
    
    // 使用RoomManager保存房间，确保通过BroadcastChannel同步
    roomManager.addRoom(room);
    
    this.emit('room-updated', room);
  }
  
  // 网络同步相关方法
  private handlePlayerUpdate(payload: any) {
    // 添加时间戳和序列号
    const enhancedPayload = {
      ...payload,
      timestamp: now(),
      sequence: this.sequenceNumber++,
      source: this.ownId
    };
    
    try { localStorage.setItem(PLAYER_UPDATE_KEY, JSON.stringify(enhancedPayload)); } catch (e) {}
    this.emit('player-update', enhancedPayload);
  }
  
  private handlePing(payload: { targetPlayerId?: string }) {
    const pingResponse = {
      type: 'pong',
      source: this.ownId,
      target: payload.targetPlayerId,
      timestamp: now(),
      originalTimestamp: (payload as { timestamp: number }).timestamp
    };
    
    this.emit('network-pong', pingResponse);
    
    // 计算延迟
    if ('timestamp' in payload && payload.timestamp) {
      const latency = now() - Number(payload.timestamp);
      this.emit('latency-update', { playerId: this.ownId, latency });
    }
  }
  
  private sendReliableEvent(payload: NetworkEvent) {
    const eventId = `event_${Math.random().toString(36).slice(2,9)}`;
    const reliableEvent = {
      ...payload,
      id: eventId,
      timestamp: now()
    };
    
    // 添加到待确认事件列表
    this.pendingEvents.set(eventId, {
      event: reliableEvent,
      sentTime: now(),
      retryCount: 0,
      resolve: () => {},
      reject: () => {}
    });
    
    // 发送事件
    this.emit('reliable-event', reliableEvent);
    
    // 设置重传定时器
    setTimeout(() => {
      this.retryReliableEvent(eventId);
    }, 1000);
  }
  
  private handleAckEvent(payload: { eventId: string; source: string }) {
    const pendingEvent = this.pendingEvents.get(payload.eventId);
    if (pendingEvent) {
      pendingEvent.resolve();
      this.pendingEvents.delete(payload.eventId);
    }
  }
  
  private retryReliableEvent(eventId: string) {
    const pendingEvent = this.pendingEvents.get(eventId);
    if (pendingEvent && pendingEvent.retryCount < 3) {
      pendingEvent.retryCount++;
      this.emit('reliable-event', pendingEvent.event);
      
      // 继续重试
      setTimeout(() => {
        this.retryReliableEvent(eventId);
      }, 1000);
    } else if (pendingEvent) {
      pendingEvent.reject(new Error('Event delivery failed after retries'));
      this.pendingEvents.delete(eventId);
    }
  }
  
  // 预测与补偿系统
  private applyPrediction(playerId: string, predictedState: any, serverState: any): any {
    const latency = this.getPlayerLatency(playerId);
    const predictionError = this.calculatePredictionError(predictedState, serverState);
    
    // 应用平滑插值补偿
    if (predictionError > 0.1) {
      return this.interpolateStates(predictedState, serverState, 0.3);
    }
    
    return serverState;
  }
  
  private calculatePredictionError(predicted: any, actual: any): number {
    // 计算位置误差
    let error = 0;
    if (predicted.position && actual.position) {
      const dx = predicted.position.x - actual.position.x;
      const dy = predicted.position.y - actual.position.y;
      error = Math.sqrt(dx * dx + dy * dy);
    }
    return error;
  }
  
  private interpolateStates(from: any, to: any, factor: number): any {
    const interpolated = { ...from };
    
    if (from.position && to.position) {
      interpolated.position = {
        x: from.position.x + (to.position.x - from.position.x) * factor,
        y: from.position.y + (to.position.y - from.position.y) * factor
      };
    }
    
    if (from.velocity && to.velocity) {
      interpolated.velocity = {
        x: from.velocity.x + (to.velocity.x - from.velocity.x) * factor,
        y: from.velocity.y + (to.velocity.y - from.velocity.y) * factor
      };
    }
    
    return interpolated;
  }
  
  // 延迟补偿系统
  private rewindTimeForHitDetection(playerId: string, timestamp: number): any {
    const latency = this.getPlayerLatency(playerId);
    const rewindTime = timestamp - latency;
    
    // 查找历史状态
    const history = this.playerHistory.get(playerId);
    if (history) {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].timestamp <= rewindTime) {
          return history[i].state;
        }
      }
    }
    
    return null;
  }
  
  private storePlayerState(playerId: string, state: any) {
    const history = this.playerHistory.get(playerId) || [];
    history.push({
      timestamp: now(),
      state: { ...state }
    });
    
    // 保持最近100个状态
    if (history.length > 100) {
      history.shift();
    }
    
    this.playerHistory.set(playerId, history);
  }
  
  // 状态同步机制
  private compressState(state: any): any {
    const compressed = {};
    
    // 只发送变化的部分
    Object.keys(state).forEach(key => {
      if (this.hasStateChanged(key, state[key])) {
        compressed[key] = state[key];
      }
    });
    
    return compressed;
  }
  
  private hasStateChanged(key: string, value: any): boolean {
    const lastState = this.lastSentState.get(key);
    if (!lastState) return true;
    
    // 简单比较，实际应该使用更精确的比较
    return JSON.stringify(value) !== JSON.stringify(lastState);
  }
  
  // 网络质量监控
  private monitorNetworkQuality() {
    const stats = {
      packetLoss: this.calculatePacketLoss(),
      jitter: this.calculateJitter(),
      bandwidth: this.estimateBandwidth(),
      connectionStability: this.assessConnectionStability()
    };
    
    this.emit('network-quality', stats);
    
    // 根据网络质量调整同步策略
    this.adjustSyncStrategy(stats);
  }
  
  private calculatePacketLoss(): number {
    const totalSent = this.packetStats.sent;
    const totalReceived = this.packetStats.received;
    
    if (totalSent === 0) return 0;
    
    return Math.max(0, (totalSent - totalReceived) / totalSent);
  }
  
  private calculateJitter(): number {
    if (this.latencyHistory.length < 2) return 0;
    
    let jitter = 0;
    for (let i = 1; i < this.latencyHistory.length; i++) {
      jitter += Math.abs(this.latencyHistory[i] - this.latencyHistory[i - 1]);
    }
    
    return jitter / (this.latencyHistory.length - 1);
  }
  
  private estimateBandwidth(): number {
    // 简化版带宽估计
    return 1000; // kbps
  }
  
  private assessConnectionStability(): number {
    // 基于丢包率和抖动评估连接稳定性
    const packetLoss = this.calculatePacketLoss();
    const jitter = this.calculateJitter();
    
    let stability = 1.0;
    stability -= packetLoss * 0.5;
    stability -= Math.min(jitter / 50, 0.3);
    
    return Math.max(0, stability);
  }
  
  private adjustSyncStrategy(stats: any) {
    // 根据网络质量调整同步频率和压缩策略
    if (stats.packetLoss > 0.1 || stats.connectionStability < 0.7) {
      this.syncInterval = 200; // 降低同步频率
      this.compressionLevel = 'high';
    } else {
      this.syncInterval = 100;
      this.compressionLevel = 'normal';
    }
  }
  
  // 辅助方法
  private getPlayerStats(playerId: string): any {
    try {
      const raw = localStorage.getItem(PLAYER_STATS_KEY);
      const stats = raw ? JSON.parse(raw) : {};
      return stats[playerId] || { wins: 0, gamesPlayed: 0, kda: 1.0, winRate: 0.5, lastPlayed: 0 };
    } catch {
      return { wins: 0, gamesPlayed: 0, kda: 1.0, winRate: 0.5, lastPlayed: 0 };
    }
  }
  
  private getPlayerRegion(): string {
    // 简化版区域检测
    return 'asia';
  }
  
  private getPlayerPing(): number {
    // 模拟ping值
    return Math.floor(Math.random() * 100) + 20;
  }
  
  private getPlayerLatency(playerId: string): number {
    // 获取玩家延迟
    return this.getPlayerPing();
  }
  
  private getDefaultPreferences(): MatchmakingPreferences {
    return {
      gameModes: Object.values(GameMode),
      regions: ['asia', 'europe', 'americas'],
      maxPing: 150,
      teamPreference: 'solo',
      language: 'en',
      skillRange: { min: 800, max: 1200 }
    };
  }
  
  // 初始化网络监控
  private initNetworkMonitoring() {
    // 每5秒监控一次网络质量
    setInterval(() => {
      this.monitorNetworkQuality();
    }, 5000);
    
    // 初始化统计信息
    this.packetStats = { sent: 0, received: 0 };
    this.latencyHistory = [];
    this.playerHistory = new Map();
    this.lastSentState = new Map();
    this.pendingEvents = new Map();
    this.sequenceNumber = 0;
    this.syncInterval = 100;
    this.compressionLevel = 'normal';
  }

  private createRoom(payload: { 
    name?: string; 
    ownerId?: string;
    gameMode?: GameMode;
    maxPlayers?: number;
    roomType?: RoomType;
    password?: string;
    map?: string;
    timeLimit?: number;
    scoreLimit?: number;
    friendlyFire?: boolean;
  }) {
    const rooms = readRooms();
    const id = `room_${Math.random().toString(36).slice(2,9)}`;
    
    // 创建完整的房间设置
    const settings: RoomSettings = {
      gameMode: payload.gameMode || GameMode.TEAM_DEATHMATCH,
      map: payload.map || 'default',
      timeLimit: payload.timeLimit || 600,
      scoreLimit: payload.scoreLimit || 100,
      friendlyFire: payload.friendlyFire || false,
      maxPlayers: payload.maxPlayers || 8,
      teamSize: Math.floor((payload.maxPlayers || 8) / 2),
      autoBalance: true,
      difficulty: 'normal',
      customRules: []
    };
    
    const room: Room = {
      id,
      name: payload?.name || `Room ${id}`,
      ownerId: payload?.ownerId || this.ownId,
      players: {},
      createdAt: now(),
      started: false,
      status: RoomStatus.WAITING,
      type: payload.roomType || RoomType.PUBLIC,
      settings: settings,
      currentPlayers: 1, // 创建者自动加入
      region: 'asia',
      ping: this.getPlayerPing(),
      password: payload.password,
      tags: [settings.gameMode, 'custom'],
      statistics: {
        gamesPlayed: 0,
        averageDuration: 0,
        playerSatisfaction: 0,
        successRate: 0
      }
    };
    
    // 创建者自动加入房间
    room.players[this.ownId] = {
      id: this.ownId,
      x: 0,
      y: 0,
      direction: 0,
      health: 100,
      team: 'red',
      role: 'assault',
      score: 0,
      kills: 0,
      deaths: 0,
      ping: this.getPlayerPing(),
      isReady: false
    };
    
    rooms.push(room);
    writeRooms(rooms);
    this.emit('room-created', room);
    this.emit('room-list', rooms);
    
    // 自动加入创建的房间
    this.joinRoom({ roomId: room.id });
  }

  private joinRoom(payload: { roomId: string; player?: PlayerState }) {
    console.log('[Network] Attempting to join room with ID:', payload.roomId);
    
    // 直接使用RoomManager获取房间，确保使用最新的房间数据
    let room = roomManager.getRoomById(payload.roomId);
    console.log('[Network] Room found in manager:', !!room);
    
    // 如果没有找到，尝试模糊匹配（可能ID有空格或其他问题）
    if (!room) {
      console.log('[Network] Exact match not found, trying fuzzy match');
      const allRooms = roomManager.getAllRooms();
      room = allRooms.find(r => r.id.trim() === payload.roomId.trim());
      console.log('[Network] Fuzzy match result:', !!room);
    }
    
    // 如果仍然没有找到，记录所有房间ID进行调试
    if (!room) {
      const allRooms = roomManager.getAllRooms();
      console.log('[Network] Room not found. Available room IDs:', allRooms.map(r => r.id));
      this.emit('join-failed', { 
        reason: 'not-found', 
        roomId: payload.roomId,
        availableRooms: allRooms.map(r => r.id)
      });
      return;
    }
    
    console.log('[Network] Room found:', room);
    // 获取当前房间中红队和蓝队的玩家数量
    const redTeamCount = Object.values(room.players).filter(player => player.team === 'red').length;
    const blueTeamCount = Object.values(room.players).filter(player => player.team === 'blue').length;
    
    // 随机分配队伍，尽量保持两队人数平衡
    let assignedTeam: 'red' | 'blue';
    if (redTeamCount === blueTeamCount) {
      // 如果两队人数相等，随机分配
      assignedTeam = Math.random() < 0.5 ? 'red' : 'blue';
    } else {
      // 如果人数不等，分配到人数较少的队伍
      assignedTeam = redTeamCount < blueTeamCount ? 'red' : 'blue';
    }
    
    const pl: PlayerState = payload.player || { 
      id: this.ownId, 
      x: 0, 
      y: 0, 
      direction: 0, 
      health: 100, 
      skinColor: '#fff',
      team: assignedTeam, // 根据队伍平衡情况分配
      role: 'assault' // 默认角色
    };
    
    // 更新房间数据
    room.players[pl.id] = pl;
    room.currentPlayers = Object.keys(room.players).length;
    
    // 使用RoomManager保存房间，确保通过BroadcastChannel同步
    roomManager.addRoom(room);
    
    try { localStorage.setItem(CURRENT_ROOM_KEY, JSON.stringify({ roomId: room.id, playerId: pl.id })); } catch (e) {}
    console.log('[Network] Player', pl.id, 'joined room', room.id);
    this.emit('room-joined', { roomId: room.id, player: pl });
    this.emit('room-updated', room);
    if (room.started) {
      setTimeout(() => this.emit('start-round', { roundId: `round_${room.id}`, startPositions: room.startPositions || [] }), 50);
    }
  }

  private leaveRoom(payload: { roomId: string; playerId: string }) {
    const rooms = readRooms();
    const room = rooms.find(r => r.id === payload.roomId);
    if (!room) return;
    delete room.players[payload.playerId];
    // 更新房间当前玩家数量
    room.currentPlayers = Object.keys(room.players).length;
    
    if (room.currentPlayers === 0) {
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) rooms.splice(idx, 1);
    }
    writeRooms(rooms);
    
    // 使用RoomManager保存房间，确保通过BroadcastChannel同步
    if (room.currentPlayers > 0) {
      roomManager.addRoom(room);
    }
    
    this.emit('room-left', { roomId: payload.roomId, playerId: payload.playerId });
    this.emit('room-list', rooms);
    this.emit('room-updated', room); // 发送房间更新事件，确保所有客户端同步
  }
  
  private clearAllRooms(payload: { playerId?: string }) {
    // 添加更严格的权限检查
    // 只有当请求来自当前客户端自身时才允许清空房间
    // 这样可以防止一个客户端清空其他客户端创建的房间
    if (payload.playerId && payload.playerId !== this.ownId) {
      console.warn(`[Network] Permission denied: Player ${payload.playerId} attempted to clear all rooms`);
      this.emit('clear-rooms-failed', { reason: 'permission-denied', message: '您只能清空自己创建的房间' });
      return;
    }
    
    // 获取当前所有房间
    const allRooms = readRooms();
    
    // 只清空当前玩家创建的房间
    const roomsToKeep = allRooms.filter(room => {
      // 如果房间有创建者信息且不是当前玩家，则保留
      if (room.ownerId && room.ownerId !== this.ownId) {
        return true;
      }
      // 如果房间有玩家且当前玩家不在房间中，则保留
      if (room.players && Object.keys(room.players).length > 0 && !room.players[this.ownId]) {
        return true;
      }
      // 否则清空该房间
      return false;
    });
    
    // 保留不应该被清空的房间
    writeRooms(roomsToKeep);
    
    // 通过RoomManager更新房间列表，确保跨标签页同步
    roomManager.loadRooms();
    
    // 发送清空成功事件
    this.emit('all-rooms-cleared', { 
      timestamp: now(), 
      clearedCount: allRooms.length - roomsToKeep.length,
      remainingCount: roomsToKeep.length
    });
    this.emit('room-list', roomsToKeep); // 发送更新后的房间列表
    
    // 如果当前玩家在某个房间中，也要离开
    try {
      const currentRoomData = localStorage.getItem(CURRENT_ROOM_KEY);
      if (currentRoomData) {
        const currentRoom = JSON.parse(currentRoomData);
        // 检查当前房间是否被清空
        const isCurrentRoomCleared = !roomsToKeep.find(r => r.id === currentRoom.roomId);
        if (isCurrentRoomCleared) {
          localStorage.removeItem(CURRENT_ROOM_KEY);
          this.emit('room-left', { roomId: 'all', playerId: this.ownId });
        }
      }
    } catch (e) {}
  }

  private startRound(payload: { roomId: string; startPositions?: { x: number; y: number }[] }) {
    console.log('[Network] startRound called with payload:', payload);
    const rooms = readRooms();
    const room = rooms.find(r => r.id === payload.roomId);
    if (!room) {
      console.error('[Network] Room not found:', payload.roomId);
      return;
    }
    console.log('[Network] Found room, marking as started:', room.id);
    room.started = true;
    room.startPositions = payload.startPositions || this.generateStartPositions(Object.keys(room.players).length);
    writeRooms(rooms);
    
    // 使用RoomManager保存房间，确保通过BroadcastChannel同步
    roomManager.addRoom(room);
    
    const startRoundData = { roundId: `round_${room.id}`, startPositions: room.startPositions };
    console.log('[Network] Emitting start-round event:', startRoundData);
    console.log('[Network] Current handlers for start-round event:', this.handlers.get('start-round')?.length || 0);
    
    // 确保事件被正确发送
    try {
      this.emit('start-round', startRoundData);
      console.log('[Network] start-round event emitted successfully');
    } catch (error) {
      console.error('[Network] Error emitting start-round event:', error);
    }
    
    console.log('[Network] Emitting room-updated event');
    this.emit('room-updated', room);
  }

  private endRound(payload: { roomId: string }) {
    const rooms = readRooms();
    const room = rooms.find(r => r.id === payload.roomId);
    if (!room) return;
    room.started = false;
    writeRooms(rooms);
    this.emit('end-round', { roomId: room.id });
    this.emit('room-updated', room);
    this.emit('room-list', rooms);
  }

  private generateStartPositions(count: number) {
    const positions: { x: number; y: number }[] = [];
    const cx = 400, cy = 300, radius = 80;
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2;
      positions.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    return positions;
  }

  private playerHit(payload: { targetId: string; damage: number; attackerId: string; impact?: any; sourceDir?: any }) {
    try {
      const rooms = readRooms();
      let targetRoom: Room | null = null;
      let targetPlayer: PlayerState | null = null;
      for (const r of rooms) {
        if (r.players && r.players[payload.targetId]) {
          targetRoom = r;
          targetPlayer = r.players[payload.targetId];
          break;
        }
      }
      if (targetRoom && targetPlayer) {
        targetPlayer.health -= payload.damage;
        if (targetPlayer.health < 0) targetPlayer.health = 0;
        writeRooms(rooms);
        this.emit('player-hit', payload);
        this.emit('player-update', { ...targetPlayer, isShooting: false });
        if (targetPlayer.health <= 0) this.emit('player-dead', { id: targetPlayer.id, roomId: targetRoom.id });
      } else {
        this.emit('player-hit', payload);
      }
    } catch (e) {
      console.error('[MockNetwork] handlePlayerHit error', e);
      this.emit('player-hit', payload);
    }
  }

  private onStorage(ev: StorageEvent) {
    try {
      if (!ev.key) return;
      if (ev.key === PLAYER_UPDATE_KEY && ev.newValue) {
        const payload = JSON.parse(ev.newValue);
        this.emit('player-update', payload);
      } else if (ev.key === PLAYER_JOIN_KEY && ev.newValue) {
        const payload = JSON.parse(ev.newValue);
        if (payload.left) this.emit('player-left', { id: payload.left });
        else this.emit('player-joined', payload);
      } else if (ev.key === ROOMS_KEY) {
        this.emit('room-list', readRooms());
      }
    } catch (e) {}
  }



  private initWebSocket(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => { /* no-op */ };
      this.ws.onmessage = (m) => {
        try {
          const msg = JSON.parse((m as MessageEvent).data as string);
          if (msg && msg.e) this.emit(msg.e, msg.p);
        } catch (e) {}
      };
      this.ws.onclose = () => { this.ws = null; };
    } catch (e) {
      this.ws = null;
    }
  }

  clearRoomsStorage() {
    try {
      localStorage.removeItem(ROOMS_KEY);
      this.emit('room-list', []);
    } catch (e) {}
  }

  dispose() {
    window.removeEventListener('storage', this.onStorage);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    this.ws = null;
    this.handlers.clear();
  }
}

// 导出房间更新监听函数
export { onRoomUpdate };

