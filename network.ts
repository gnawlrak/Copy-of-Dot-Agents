import { io, Socket } from 'socket.io-client';

// Represents the state of a player to be sent over the network
export interface PlayerState {
    id: string;
    x: number;
    y: number;
    direction: number;
    health: number;
    skinColor: string;
    team?: string;
    isReady?: boolean;
    kills?: number;
    deaths?: number;
    score?: number;
    isShooting?: boolean;
    currentWeaponIndex?: number;
    shieldName?: string;
    shieldDurability?: number;
    shieldMaxDurability?: number;
}

// Represents a remote player in the game world
export interface RemotePlayer extends PlayerState {
    targetX: number;
    targetY: number;
    lastUpdateTime: number;
    isShooting: boolean; // Received from network to show muzzle flash
    playerId?: string; // Alias of id used for drawing username tags compat
    lastUpdate?: number; // Used for status window filtering compat
    maxHealth?: number;
}

// Represents a weapon fire event
export interface FireEventPayload {
    ownerId: string;
    weaponName: string;
    baseAngle: number;
}

// General network event structure
export type NetworkEvent =
    | { type: 'connect'; payload: { id: string } }
    | { type: 'disconnect'; payload: {} }
    | { type: 'room-full'; payload: { roomId: string; maxPlayers: number } }
    | { type: 'player-update'; payload: PlayerState & { isShooting: boolean } }
    | { type: 'player-joined'; payload: PlayerState }
    | { type: 'player-left'; payload: { id?: string; playerId?: string } }
    | { type: 'fire-weapon'; payload: FireEventPayload }
    | { type: 'drop-weapon'; payload: { id?: string; playerId: string; weaponName: string; x: number; y: number } }
    | { type: 'pickup-weapon'; payload: { playerId: string; weaponName: string; id?: string } }
    | { type: 'start-round'; payload: { roundId: string } }
    | { type: 'buy-weapon'; payload: { playerId: string; weaponName: string; cost: number; attachments?: any } }
    | { type: 'player-hit'; payload: { targetId: string; damage: number; attackerId: string; impact?: { x: number; y: number }; sourceDir?: { x: number; y: number } } }
    | { type: 'room-updated'; payload: any }
    | { type: 'player-action'; payload: { action: string; payload: any; playerId: string; timestamp: number } };

export type NetworkEventType = NetworkEvent['type'];

type EventHandler = (payload: any) => void;

// A network client that handles real Socket.IO connectivity.
export class MockNetworkClient {
    private socket: Socket | null = null;
    private handlers: Map<string, EventHandler[]> = new Map();
    public connected = false;
    public ownId = `player_${Math.random().toString(36).substring(7)}`;

    // Room parameters configuration
    public roomId: string = 'default-room';
    public roomName: string = 'Default Room';
    public mode: 'tdm' | 'ffa' | '1v1' = 'tdm';
    public levelName: string = 'THE FACTORY';
    public maxPlayers: number = 8;

    setRoomInfo(roomId: string, roomName: string, mode: 'tdm' | 'ffa' | '1v1', levelName: string, maxPlayers?: number) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.mode = mode;
        this.levelName = levelName;
        this.maxPlayers = maxPlayers ?? this.getDefaultMaxPlayers(mode);
    }

    private getDefaultMaxPlayers(mode: 'tdm' | 'ffa' | '1v1') {
        switch (mode) {
            case '1v1': return 2;
            case 'tdm': return 8;
            case 'ffa': return 8;
            default: return 8;
        }
    }

    connect(playerStartState?: { x: number; y: number; skinColor: string }) {
        if (this.socket) return;
        
        console.log(`[Network] Connecting to room ${this.roomId} with ID: ${this.ownId}...`);
        
        // Connect to the same origin (Express + Vite server)
        this.socket = io(window.location.origin, {
            autoConnect: true,
            reconnection: true,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('[Network] Real WebSocket Connected.');
            this.connected = true;
            this.emit('connect', { id: this.ownId });
            
            // Join the multiplayer room on the server
            this.socket?.emit('join-game', {
                roomId: this.roomId,
                roomName: this.roomName,
                mode: this.mode,
                levelName: this.levelName,
                maxPlayers: this.maxPlayers,
                id: this.ownId,
                x: playerStartState?.x || 400,
                y: playerStartState?.y || 400,
                skinColor: playerStartState?.skinColor || '#60a5fa',
                direction: 0,
                health: 100
            });
        });

        this.socket.on('disconnect', () => {
            console.log('[Network] Real WebSocket Disconnected.');
            this.connected = false;
            this.emit('disconnect', {});
        });

        // Setup server event listeners and forward them to internal event handlers
        const serverEvents: NetworkEventType[] = [
            'player-joined',
            'player-left',
            'player-update',
            'fire-weapon',
            'drop-weapon',
            'pickup-weapon',
            'start-round',
            'buy-weapon',
            'player-hit',
            'room-updated',
            'player-action',
            'room-full'
        ];

        serverEvents.forEach(evt => {
            this.socket?.on(evt, (payload: any) => {
                this.emit(evt, payload);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.handlers.clear();
        console.log('[Network] Disconnected.');
    }

    on<T extends NetworkEventType>(eventType: T, callback: (payload: any) => void) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(callback);
    }

    off<T extends NetworkEventType>(eventType: T, callback: (payload: any) => void) {
        const eventHandlers = this.handlers.get(eventType);
        if (eventHandlers) {
            this.handlers.set(eventType, eventHandlers.filter(h => h !== callback));
        }
    }

    send<T extends NetworkEventType>(eventType: T, payload: any) {
        if (!this.socket || !this.connected) {
            return;
        }
        this.socket.emit(eventType, payload);
    }
    
    private emit(eventType: string, payload: any) {
        const eventHandlers = this.handlers.get(eventType as NetworkEventType);
        if (eventHandlers) {
            eventHandlers.forEach(handler => handler(payload));
        }
    }
}
