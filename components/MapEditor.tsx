import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LevelDefinition, LevelWall, LevelDoor, LevelEnemy, saveCustomLevel } from '../levels/level-definitions';
import { useDebounce } from '../hooks/useDebounce';

// Define types for editor state
type EditorTool = 'wall' | 'door' | 'enemy' | 'player' | 'erase' | 'extract';
type Point = { x: number; y: number };

interface MapEditorProps {
    levelToEdit: LevelDefinition | null;
    onBack: () => void;
}

const LOGICAL_GRID_SIZE = 20;
const BASE_LOGICAL_WIDTH = 1280;

const createNewLevel = (): LevelDefinition => ({
    uuid: `custom_${Date.now()}`,
    name: 'CUSTOM LEVEL',
    description: 'A new mission designed by the operator.',
    playerStart: { x: 0.5, y: 0.8 },
    walls: [],
    doors: [],
    enemies: [],
});


const MapEditor: React.FC<MapEditorProps> = ({ levelToEdit, onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scaleRef = useRef(1);
    const [level, setLevel] = useState<LevelDefinition>(() => levelToEdit || createNewLevel());
    const isInitializedRef = useRef(false);
    
    const [tool, setTool] = useState<EditorTool>('wall');
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    
    const nextDoorId = useRef(1);

    const debouncedLevel = useDebounce(level, 500);

    useEffect(() => {
        if (debouncedLevel && isInitializedRef.current) {
            saveCustomLevel(debouncedLevel);
        }
    }, [debouncedLevel]);
    
    useEffect(() => {
        setLevel(levelToEdit || createNewLevel());
        isInitializedRef.current = false;
    }, [levelToEdit]);


    const snapToGrid = (value: number) => {
        const gridSize = LOGICAL_GRID_SIZE * scaleRef.current;
        return Math.round(value / gridSize) * gridSize;
    }

    const draw = useCallback((ctx: CanvasRenderingContext2D) => {
        const canvas = ctx.canvas;
        if (!level) return;

        const scale = scaleRef.current;
        const gridSize = LOGICAL_GRID_SIZE * scale;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        ctx.fillStyle = '#14b8a6';
        level.walls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });

        level.doors.forEach(door => {
            ctx.save();
            ctx.translate(door.hinge.x, door.hinge.y);
            ctx.rotate(door.closedAngle);
            ctx.fillStyle = '#2dd4bf';
            const doorThickness = 10 * scale;
            ctx.fillRect(0, -doorThickness / 2, door.length, doorThickness);
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw swing arc
            const openAngle = door.closedAngle + door.maxOpenAngle * door.swingDirection;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            if (door.swingDirection === 1) {
                ctx.arc(door.hinge.x, door.hinge.y, door.length, door.closedAngle, openAngle);
            } else {
                ctx.arc(door.hinge.x, door.hinge.y, door.length, openAngle, door.closedAngle);
            }
            ctx.stroke();
        });

        level.enemies.forEach(enemy => {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, 12 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + Math.cos(enemy.direction) * 20 * scale, enemy.y + Math.sin(enemy.direction) * 20 * scale);
            ctx.stroke();
        });
        
        if (level.extractionZone) {
            const zone = level.extractionZone;
            ctx.fillStyle = 'rgba(22, 163, 74, 0.5)';
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2 * scale;
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        }

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(level.playerStart.x, level.playerStart.y, 10 * scale, 0, Math.PI * 2);
        ctx.fill();

        if (isDragging && dragStart) {
            if (tool === 'wall') {
                const snappedDragStartX = snapToGrid(dragStart.x);
                const snappedDragStartY = snapToGrid(dragStart.y);
                const x = Math.min(snappedDragStartX, snapToGrid(mousePos.x));
                const y = Math.min(snappedDragStartY, snapToGrid(mousePos.y));
                const width = Math.abs(snapToGrid(mousePos.x) - snappedDragStartX);
                const height = Math.abs(snapToGrid(mousePos.y) - snappedDragStartY);
                ctx.fillStyle = 'rgba(20, 184, 166, 0.5)';
                ctx.fillRect(x, y, width, height);
            } else if (tool === 'door') {
                const snappedStart = { x: snapToGrid(dragStart.x), y: snapToGrid(dragStart.y) };
                const snappedEnd = { x: snapToGrid(mousePos.x), y: snapToGrid(mousePos.y) };
                ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
                ctx.lineWidth = 10 * scale;
                ctx.beginPath();
                ctx.moveTo(snappedStart.x, snappedStart.y);
                ctx.lineTo(snappedEnd.x, snappedEnd.y);
                ctx.stroke();
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(snappedStart.x, snappedStart.y, 5 * scale, 0, Math.PI * 2);
                ctx.fill();

                // Draw preview swing arc
                const dx = snappedEnd.x - snappedStart.x;
                const dy = snappedEnd.y - snappedStart.y;
                const length = Math.hypot(dx, dy);
                if (length > 0) {
                    const closedAngle = Math.atan2(dy, dx);
                    const mouseVecX = mousePos.x - snappedStart.x;
                    const mouseVecY = mousePos.y - snappedStart.y;
                    const crossProduct = dx * mouseVecY - dy * mouseVecX;
                    const swingDirection = (Math.sign(crossProduct) || 1) as 1 | -1;
                    const openAngle = closedAngle + (Math.PI / 2 * 0.9) * swingDirection;

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 2 * scale;
                    ctx.beginPath();
                    if (swingDirection === 1) {
                        ctx.arc(snappedStart.x, snappedStart.y, length, closedAngle, openAngle);
                    } else {
                        ctx.arc(snappedStart.x, snappedStart.y, length, openAngle, closedAngle);
                    }
                    ctx.stroke();
                }
            } else if (tool === 'extract') {
                const snappedDragStartX = snapToGrid(dragStart.x);
                const snappedDragStartY = snapToGrid(dragStart.y);
                const x = Math.min(snappedDragStartX, snapToGrid(mousePos.x));
                const y = Math.min(snappedDragStartY, snapToGrid(mousePos.y));
                const width = Math.abs(snapToGrid(mousePos.x) - snappedDragStartX);
                const height = Math.abs(snapToGrid(mousePos.y) - snappedDragStartY);
                ctx.fillStyle = 'rgba(22, 163, 74, 0.5)';
                ctx.fillRect(x, y, width, height);
            }
        }
    }, [level, isDragging, dragStart, mousePos, tool]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        let animationFrameId: number;

        const resizeHandler = () => {
             const parent = canvas.parentElement;
             if (!parent) return;

             const oldWidth = canvas.width;
             const oldHeight = canvas.height;
             const newWidth = parent.clientWidth;
             const newHeight = parent.clientHeight;
             if (newWidth === oldWidth && newHeight === oldHeight) return;

             canvas.width = newWidth;
             canvas.height = newHeight;
             scaleRef.current = newWidth / BASE_LOGICAL_WIDTH;
             
             setLevel(currentLevel => {
                if (!currentLevel) return createNewLevel();

                 if (!isInitializedRef.current && newWidth > 0) {
                     const newLevel = JSON.parse(JSON.stringify(currentLevel));
                     newLevel.playerStart = { x: newLevel.playerStart.x * newWidth, y: newLevel.playerStart.y * newHeight };
                     newLevel.walls = newLevel.walls.map(w => ({...w, x: w.x * newWidth, y: w.y * newHeight, width: w.width * newWidth, height: w.height * newHeight}));
                     newLevel.doors = newLevel.doors.map(d => ({...d, length: d.length * newHeight, hinge: { x: d.hinge.x * newWidth, y: d.hinge.y * newHeight }}));
                     newLevel.enemies = newLevel.enemies.map(e => ({...e, x: e.x * newWidth, y: e.y * newHeight}));
                     if (newLevel.extractionZone) {
                        const ez = newLevel.extractionZone;
                        newLevel.extractionZone = {x: ez.x * newWidth, y: ez.y * newHeight, width: ez.width * newWidth, height: ez.height * newHeight};
                     }
                     nextDoorId.current = (newLevel.doors.reduce((maxId, door) => Math.max(door.id, maxId), 0) + 1);
                     isInitializedRef.current = true;
                     return newLevel;
                 } else if (isInitializedRef.current && oldWidth > 0) {
                     const scaleX = newWidth / oldWidth;
                     const scaleY = newHeight / oldHeight;
                     const newLevel = { ...currentLevel };
                     newLevel.playerStart = { x: newLevel.playerStart.x * scaleX, y: newLevel.playerStart.y * scaleY };
                     newLevel.walls = newLevel.walls.map(w => ({ ...w, x: w.x * scaleX, y: w.y * scaleY, width: w.width * scaleX, height: w.height * scaleY }));
                     newLevel.doors = newLevel.doors.map(d => ({ ...d, length: d.length * scaleY, hinge: { x: d.hinge.x * scaleX, y: d.hinge.y * scaleY }}));
                     newLevel.enemies = newLevel.enemies.map(e => ({ ...e, x: e.x * scaleX, y: e.y * scaleY }));
                     if (newLevel.extractionZone) {
                        const ez = newLevel.extractionZone;
                        newLevel.extractionZone = {x: ez.x * scaleX, y: ez.y * scaleY, width: ez.width * scaleX, height: ez.height * scaleY};
                     }
                     return newLevel;
                 }
                 return currentLevel;
             });
        };

        const renderLoop = () => {
            const ctx = canvas.getContext('2d');
            if(ctx) draw(ctx);
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        resizeHandler();
        renderLoop();

        window.addEventListener('resize', resizeHandler);
        
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeHandler);
        }
    }, [draw]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!level) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scale = scaleRef.current;

        switch (tool) {
            case 'wall':
            case 'door':
            case 'enemy':
            case 'extract':
                setIsDragging(true);
                setDragStart({ x, y });
                break;
            case 'player':
                setLevel(prev => ({ ...prev!, playerStart: { x, y } }));
                break;
            case 'erase': {
                if (level.extractionZone) {
                    const zone = level.extractionZone;
                    if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) {
                        setLevel(prev => {
                            const newLevel = { ...prev! };
                            delete newLevel.extractionZone;
                            return newLevel;
                        });
                        return;
                    }
                }
                const doorIndex = level.doors.findIndex(d => Math.hypot(x - d.hinge.x, y - d.hinge.y) < 15 * scale);
                if (doorIndex > -1) { setLevel(prev => ({ ...prev!, doors: prev!.doors.filter((_, i) => i !== doorIndex) })); return; }
                
                const enemyIndex = level.enemies.findIndex(e => Math.hypot(x - e.x, y - e.y) < (e.radius || 12 * scale));
                if (enemyIndex > -1) { setLevel(prev => ({ ...prev!, enemies: prev!.enemies.filter((_, i) => i !== enemyIndex) })); return; }
                
                const wallIndex = level.walls.findIndex(w => x >= w.x && x <= w.x + w.width && y >= w.y && y <= w.y + w.height);
                if (wallIndex > -1) { setLevel(prev => ({ ...prev!, walls: prev!.walls.filter((_, i) => i !== wallIndex) })); return; }
                break;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = () => {
        if (!isDragging || !dragStart || !level) return;

        const scale = scaleRef.current;
        const gridSize = LOGICAL_GRID_SIZE * scale;

        if (tool === 'wall') {
            const snappedDragStartX = snapToGrid(dragStart.x);
            const snappedDragStartY = snapToGrid(dragStart.y);
            const gridX = snapToGrid(mousePos.x);
            const gridY = snapToGrid(mousePos.y);

            const width = Math.abs(gridX - snappedDragStartX);
            const height = Math.abs(gridY - snappedDragStartY);
            if (width > 0 || height > 0) {
                const newWall: LevelWall = {
                    x: Math.min(snappedDragStartX, gridX),
                    y: Math.min(snappedDragStartY, gridY),
                    width: width === 0 ? gridSize : width,
                    height: height === 0 ? gridSize : height,
                };
                setLevel(prev => ({ ...prev!, walls: [...prev!.walls, newWall] }));
            }
        } else if (tool === 'enemy') {
            const angle = Math.atan2(mousePos.y - dragStart.y, mousePos.x - dragStart.x);
            const newEnemy: LevelEnemy = { x: dragStart.x, y: dragStart.y, direction: angle, radius: 12 * scale };
            setLevel(prev => ({...prev!, enemies: [...prev!.enemies, newEnemy]}));
        } else if (tool === 'door') {
            const snappedHinge = { x: snapToGrid(dragStart.x), y: snapToGrid(dragStart.y) };
            const snappedEndPoint = { x: snapToGrid(mousePos.x), y: snapToGrid(mousePos.y) };

            const dx = snappedEndPoint.x - snappedHinge.x;
            const dy = snappedEndPoint.y - snappedHinge.y;

            const length = Math.hypot(dx, dy);

            if (length >= gridSize) { 
                const closedAngle = Math.atan2(dy, dx);
                
                const mouseVecX = mousePos.x - snappedHinge.x;
                const mouseVecY = mousePos.y - snappedHinge.y;
                const crossProduct = dx * mouseVecY - dy * mouseVecX;
                const swingDirection = (Math.sign(crossProduct) || 1) as 1 | -1;

                const newDoor: LevelDoor = {
                    id: nextDoorId.current++,
                    hinge: snappedHinge,
                    length: length, // Store absolute length during editing
                    closedAngle: closedAngle,
                    maxOpenAngle: Math.PI / 2 * 0.9,
                    swingDirection: swingDirection,
                };
                setLevel(prev => ({ ...prev!, doors: [...prev!.doors, newDoor] }));
            }
        } else if (tool === 'extract') {
            const snappedDragStartX = snapToGrid(dragStart.x);
            const snappedDragStartY = snapToGrid(dragStart.y);
            const gridX = snapToGrid(mousePos.x);
            const gridY = snapToGrid(mousePos.y);

            const width = Math.abs(gridX - snappedDragStartX);
            const height = Math.abs(gridY - snappedDragStartY);
            if (width > 0 && height > 0) {
                const newZone: LevelWall = {
                    x: Math.min(snappedDragStartX, gridX),
                    y: Math.min(snappedDragStartY, gridY),
                    width: width,
                    height: height,
                };
                setLevel(prev => ({ ...prev!, extractionZone: newZone }));
            }
        }

        setIsDragging(false);
        setDragStart(null);
    };
    
    const handleBackClick = () => {
        const canvas = canvasRef.current;
        if (!canvas || !level) {
            onBack();
            return;
        }

        const levelToSave: LevelDefinition = {
            ...level,
            playerStart: { x: level.playerStart.x / canvas.width, y: level.playerStart.y / canvas.height },
            walls: level.walls.map(w => ({ x: w.x / canvas.width, y: w.y / canvas.height, width: w.width / canvas.width, height: w.height / canvas.height })),
            doors: level.doors.map(d => ({ ...d, length: d.length / canvas.height, hinge: { x: d.hinge.x / canvas.width, y: d.hinge.y / canvas.height }})),
            enemies: level.enemies.map(e => ({ x: e.x / canvas.width, y: e.y / canvas.height, direction: e.direction })),
            extractionZone: level.extractionZone ? {
                x: level.extractionZone.x / canvas.width,
                y: level.extractionZone.y / canvas.height,
                width: level.extractionZone.width / canvas.width,
                height: level.extractionZone.height / canvas.height,
            } : undefined,
        };
        saveCustomLevel(levelToSave);
        onBack();
    }


    const toolButtonClasses = (t: EditorTool) => `px-4 py-2 rounded-md transition-colors ${tool === t ? 'bg-teal-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`;

    return (
        <div className="w-full h-full flex flex-col lg:flex-row gap-4">
            <div className="flex-grow h-[60%] lg:h-full w-full lg:w-auto bg-black border-2 border-teal-500 shadow-lg shadow-teal-500/30 rounded-md">
                <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="w-full h-full rounded-md" />
            </div>
            <div className="w-full lg:w-96 bg-gray-900 p-4 rounded-md border-2 border-gray-700 flex flex-col gap-4">
                <h1 className="text-2xl font-bold text-teal-300">MAP EDITOR</h1>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setTool('wall')} className={toolButtonClasses('wall')}>Wall</button>
                    <button onClick={() => setTool('door')} className={toolButtonClasses('door')}>Door</button>
                    <button onClick={() => setTool('enemy')} className={toolButtonClasses('enemy')}>Enemy</button>
                    <button onClick={() => setTool('player')} className={toolButtonClasses('player')}>Player</button>
                    <button onClick={() => setTool('extract')} className={`${toolButtonClasses('extract')} bg-green-800 hover:bg-green-700 ${tool === 'extract' ? 'ring-2 ring-green-400' : ''}`}>Extract</button>
                    <button onClick={() => setTool('erase')} className={`${toolButtonClasses('erase')} bg-red-800 hover:bg-red-700 ${tool === 'erase' ? 'ring-2 ring-red-400' : ''}`}>Erase</button>
                </div>
                <hr className="border-gray-700"/>
                {level && <>
                    <div>
                        <label className="block text-gray-400">Mission Name</label>
                        <input type="text" value={level.name} onChange={e => setLevel(l => ({ ...l!, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="block text-gray-400">Mission Description</label>
                        <textarea value={level.description} onChange={e => setLevel(l => ({ ...l!, description: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white h-24" />
                    </div>
                </>}
                <div className="flex-grow"></div>
                <p className="text-sm text-gray-500 text-center">All changes are saved automatically.</p>
                <button onClick={handleBackClick} className="w-full py-3 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors mt-auto font-bold text-lg">BACK TO LEVEL SELECT</button>
            </div>
        </div>
    );
};

export default MapEditor;

// Custom hook for debouncing
// Note: In a real project, this might be in its own file (e.g., hooks/useDebounce.ts)
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
  
    return debouncedValue;
  };