
// Represents the state of a player to be sent over the network
export interface PlayerState {
    id: string;
    x: number;
    y: number;
    direction: number;
    health: number;
    skinColor: string;
}

// Represents a remote player in the game world
export interface RemotePlayer extends PlayerState {
    targetX: number;
    targetY: number;
    lastUpdateTime: number;
    isShooting: boolean; // Received from network to show muzzle flash
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
    | { type: 'player-update'; payload: PlayerState & { isShooting: boolean } }
    | { type: 'player-joined'; payload: PlayerState }
    | { type: 'player-left'; payload: { id: string } }
    | { type: 'fire-weapon'; payload: FireEventPayload };

export type NetworkEventType = NetworkEvent['type'];

type EventHandler = (payload: any) => void;

// A mock network client to simulate multiplayer connectivity.
export class MockNetworkClient {
    private handlers: Map<string, EventHandler[]> = new Map();
    // FIX: Changed 'connected' from private to public to allow access from GameCanvas.
    public connected = false;
    private mockPlayerId = 'mock_player_1';
    private mockPlayerState: PlayerState & {isShooting: boolean} = {
        id: this.mockPlayerId,
        x: 0,
        y: 0,
        direction: 0,
        health: 100,
        skinColor: '#60a5fa', // blue
        isShooting: false,
    };
    private mockPlayerInterval: number | null = null;
    public ownId = `player_${Math.random().toString(36).substring(7)}`;

    connect(playerStartState: { x: number, y: number, skinColor: string }) {
        if (this.connected) return;
        console.log(`[Network] Connecting with ID: ${this.ownId}...`);
        setTimeout(() => {
            this.connected = true;
            this.emit('connect', { id: this.ownId });
            console.log('[Network] Connected.');
            
            // A mock player joins the game
            this.mockPlayerState.x = playerStartState.x + 100;
            this.mockPlayerState.y = playerStartState.y;
            this.emit('player-joined', this.mockPlayerState);

            // Simulate the mock player moving in a circle
            const center = { x: this.mockPlayerState.x, y: this.mockPlayerState.y };
            let angle = 0;
            this.mockPlayerInterval = window.setInterval(() => {
                if (!this.connected) return;
                angle += 0.05;
                this.mockPlayerState.x = center.x + Math.cos(angle) * 50;
                this.mockPlayerState.y = center.y + Math.sin(angle) * 50;
                this.mockPlayerState.direction = angle + Math.PI / 2;
                
                this.mockPlayerState.isShooting = Math.random() < 0.05;

                this.emit('player-update', this.mockPlayerState);
                if (this.mockPlayerState.isShooting) {
                     this.emit('fire-weapon', {
                        ownerId: this.mockPlayerId,
                        weaponName: 'Pistol',
                        baseAngle: this.mockPlayerState.direction,
                    });
                }
            }, 100);

        }, 500);
    }

    disconnect() {
        if (!this.connected) return;
        this.connected = false;
        if (this.mockPlayerInterval) {
            clearInterval(this.mockPlayerInterval);
            this.mockPlayerInterval = null;
        }
        this.emit('player-left', { id: this.mockPlayerId });
        this.emit('disconnect', {});
        this.handlers.clear();
        console.log('[Network] Disconnected.');
    }

    on<T extends NetworkEventType>(eventType: T, callback: (payload: Extract<NetworkEvent, { type: T }>['payload']) => void) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(callback);
    }

    off<T extends NetworkEventType>(eventType: T, callback: (payload: Extract<NetworkEvent, { type: T }>['payload']) => void) {
        const eventHandlers = this.handlers.get(eventType);
        if (eventHandlers) {
            this.handlers.set(eventType, eventHandlers.filter(h => h !== callback));
        }
    }

    send<T extends NetworkEventType>(eventType: T, payload: Extract<NetworkEvent, { type: T }>['payload']) {
        if (!this.connected) {
            // console.warn('[Network] Cannot send event, not connected.');
            return;
        }
    }
    
    private emit(eventType: string, payload: any) {
        const eventHandlers = this.handlers.get(eventType as NetworkEventType);
        if (eventHandlers) {
            eventHandlers.forEach(handler => handler(payload));
        }
    }
}
