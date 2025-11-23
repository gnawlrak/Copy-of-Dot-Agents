import { io, Socket } from 'socket.io-client';

// ====== 类型定义 ======

/**
 * 玩家状态 - 用于网络同步
 */
export interface PlayerState {
    id: string;
    x: number;
    y: number;
    health: number;
    direction: number;
    team: 'red' | 'blue';
    isReady: boolean;
    kills: number;
    deaths: number;
    score: number;
}

/**
 * 远程玩家 - 包含渲染所需的额外信息
 */
export interface RemotePlayer extends PlayerState {
    playerId: string;
    maxHealth: number;
    lastUpdate: number;
    username?: string;
}

/**
 * 开火事件负载
 */
export interface FireEventPayload {
    ownerId: string;
    x: number;
    y: number;
    aimUx: number;
    aimUy: number;
    weaponName: string;
    timestamp: number;
}

/**
 * 玩家受击事件
 */
export interface PlayerHitPayload {
    targetId: string;
    damage: number;
    attackerId: string;
    impact: { x: number; y: number };
    sourceDir: { x: number; y: number };
}

/**
 * 房间玩家信息
 */
export interface RoomPlayer {
    id: string;
    username: string;
    team: 'red' | 'blue';
    isReady: boolean;
    isHost: boolean;
}

/**
 * 房间信息
 */
export interface Room {
    id: string;
    name: string;
    hostId: string;
    maxPlayers: number;
    currentPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    mapName: string;
    players: { [playerId: string]: RoomPlayer };
    settings: {
        friendlyFire: boolean;
        roundTime: number;
        scoreLimit: number;
    };
}

/**
 * 网络事件映射
 */
export interface NetworkEventMap {
    // 连接事件
    connect: () => void;
    disconnect: () => void;

    // 房间事件
    'room-created': (room: Room) => void;
    'room-updated': (room: Room) => void;
    'room-joined': (room: Room) => void;
    'room-left': () => void;
    'room-list': (rooms: Room[]) => void;

    // 玩家事件
    'player-update': (state: PlayerState) => void;
    'player-joined': (player: RoomPlayer) => void;
    'player-left': (payload: { playerId: string }) => void;
    'player-hit': (payload: PlayerHitPayload) => void;

    // 游戏事件
    'fire-weapon': (payload: FireEventPayload) => void;
    'game-started': () => void;
    'game-ended': (results: any) => void;

    // 错误事件
    error: (error: { message: string }) => void;
}

// ====== NetworkClient 类 ======

/**
 * 网络客户端 - 封装 Socket.io 通信
 */
export class NetworkClient {
    private socket: Socket | null = null;
    private serverUrl: string;
    private _connected: boolean = false;
    private _ownId: string = '';
    private eventHandlers: Map<string, Function[]> = new Map();

    constructor(serverUrl: string = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
    }

    /**
     * 连接到服务器
     */
    connect(token?: string): void {
        if (this.socket?.connected) {
            console.warn('[NetworkClient] Already connected');
            return;
        }

        const options: any = {
            transports: ['websocket', 'polling'],
        };

        if (token) {
            options.auth = { token };
        }

        this.socket = io(this.serverUrl, options);

        // 基础事件监听
        this.socket.on('connect', () => {
            this._connected = true;
            this._ownId = this.socket?.id || '';
            console.log('[NetworkClient] Connected, ID:', this._ownId);
            this.emit('connect');
        });

        this.socket.on('disconnect', () => {
            this._connected = false;
            console.log('[NetworkClient] Disconnected');
            this.emit('disconnect');
        });

        this.socket.on('error', (error: any) => {
            console.error('[NetworkClient] Error:', error);
            this.emit('error', { message: error.message || 'Unknown error' });
        });

        // 注册所有网络事件转发
        this.registerNetworkEvents();
    }

    /**
     * 注册网络事件转发
     */
    private registerNetworkEvents(): void {
        if (!this.socket) return;

        const events: (keyof NetworkEventMap)[] = [
            'room-created',
            'room-updated',
            'room-joined',
            'room-left',
            'room-list',
            'player-update',
            'player-joined',
            'player-left',
            'player-hit',
            'fire-weapon',
            'game-started',
            'game-ended',
        ];

        events.forEach((event) => {
            this.socket?.on(event as string, (data: any) => {
                this.emit(event, data);
            });
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this._connected = false;
            this._ownId = '';
        }
    }

    /**
     * 发送事件到服务器
     */
    send(event: string, data?: any): void {
        if (!this.socket?.connected) {
            console.warn('[NetworkClient] Not connected, cannot send:', event);
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * 监听事件
     */
    on<K extends keyof NetworkEventMap>(
        event: K,
        handler: NetworkEventMap[K]
    ): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler as Function);
    }

    /**
     * 移除事件监听
     */
    off<K extends keyof NetworkEventMap>(
        event: K,
        handler: NetworkEventMap[K]
    ): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler as Function);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * 触发本地事件
     */
    private emit(event: string, data?: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }
    }

    // ====== 房间管理 ======

    /**
     * 创建房间
     */
    createRoom(name: string, mapName: string, settings?: Partial<Room['settings']>): void {
        this.send('create-room', {
            name,
            mapName,
            settings: {
                friendlyFire: false,
                roundTime: 300,
                scoreLimit: 50,
                ...settings,
            },
        });
    }

    /**
     * 加入房间
     */
    joinRoom(roomId: string, team?: 'red' | 'blue'): void {
        this.send('join-room', { roomId, team });
    }

    /**
     * 离开房间
     */
    leaveRoom(): void {
        this.send('leave-room');
    }

    /**
     * 获取房间列表
     */
    getRoomList(): void {
        this.send('get-room-list');
    }

    /**
     * 切换准备状态
     */
    toggleReady(): void {
        this.send('toggle-ready');
    }

    /**
     * 切换队伍
     */
    switchTeam(team: 'red' | 'blue'): void {
        this.send('switch-team', { team });
    }

    /**
     * 开始游戏 (仅房主)
     */
    startGame(): void {
        this.send('start-game');
    }

    // ====== Getters ======

    get connected(): boolean {
        return this._connected;
    }

    get ownId(): string {
        return this._ownId;
    }
}

/**
 * MockNetworkClient - 用于单机模式或测试
 */
export class MockNetworkClient extends NetworkClient {
    constructor() {
        super('');
    }

    connect(): void {
        console.log('[MockNetworkClient] Mock connection (no actual network)');
    }

    disconnect(): void {
        console.log('[MockNetworkClient] Mock disconnection');
    }

    send(): void {
        // Do nothing
    }
}

// 导出默认实例工厂
export const createNetworkClient = (serverUrl?: string): NetworkClient => {
    return new NetworkClient(serverUrl);
};
