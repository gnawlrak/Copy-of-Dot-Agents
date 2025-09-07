



import React, { useState, useRef, TouchEvent } from 'react';
import type { CustomControls } from '../types';

interface ControlCustomizerProps {
    initialLayout: CustomControls;
    defaultLayout: CustomControls;
    onSave: (layout: CustomControls) => void;
    onClose: () => void;
}

const CONTROL_NAMES: { [key: string]: string } = {
    joystick: 'Movement Joystick',
    fire: 'Fire / Aim (Draggable)',
    fixedFire: 'Secondary Fire',
    reload: 'Reload',
    interact: 'Interact / Takedown',
    switchWeapon: 'Switch Weapon',
    melee: 'Melee / Weapon Mode',
    throwableSelect: 'Throw Grenade',
    fireModeSwitch: 'Switch Fire Mode',
    heal: 'Use Medkit',
    skill: 'Operator Skill',
    ultimate: 'Operator Ultimate',
};

const ControlCustomizer: React.FC<ControlCustomizerProps> = ({ initialLayout, defaultLayout, onSave, onClose }) => {
    const [layout, setLayout] = useState<CustomControls>(initialLayout);
    const [draggingControl, setDraggingControl] = useState<{ id: string, touchId: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>, id: string) => {
        if (draggingControl) return; // Only drag one at a time
        e.stopPropagation();
        const touch = e.changedTouches[0];
        setDraggingControl({ id, touchId: touch.identifier });
    };

    const handleContainerTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!draggingControl || !containerRef.current) return;
        e.preventDefault();
        
        let touch;
        for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === draggingControl.touchId) {
                touch = t;
                break;
            }
        }
        if (!touch) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        
        const control = layout.layout[draggingControl.id];
        const baseRadius = (containerRect.height * 0.06) * layout.baseScale;
        const radius = baseRadius * control.scale;
        
        const newX = touch.clientX - containerRect.left;
        const newY = touch.clientY - containerRect.top;

        const newRelativeX = Math.max(0, Math.min(1, newX / containerRect.width));
        const newRelativeY = Math.max(0, Math.min(1, newY / containerRect.height));
        
        setLayout(prev => ({
            ...prev,
            layout: {
                ...prev.layout,
                [draggingControl.id]: {
                    ...prev.layout[draggingControl.id],
                    x: newRelativeX,
                    y: newRelativeY,
                }
            }
        }));
    };

    const handleContainerTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (!draggingControl) return;
         for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === draggingControl.touchId) {
                setDraggingControl(null);
                break;
            }
        }
    };

    const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void}> = 
    ({ label, value, min, max, step, onChange }) => (
        <div className="flex flex-col">
            <label className="text-gray-300 text-sm">{label}: <span className="font-mono text-teal-300">{value.toFixed(2)}</span></label>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );

    return (
        <div className="absolute inset-0 bg-black bg-opacity-90 z-[100] flex flex-col p-4 text-white font-mono"
             onTouchMove={handleContainerTouchMove}
             onTouchEnd={handleContainerTouchEnd}
             onTouchCancel={handleContainerTouchEnd}
        >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-gray-700">
                <h1 className="text-2xl font-bold text-teal-300 tracking-widest">CUSTOMIZE CONTROLS</h1>
                <div className="flex gap-2">
                    <button onClick={() => onSave(layout)} className="px-4 py-2 bg-teal-500 text-black font-bold rounded hover:bg-teal-400">SAVE & CLOSE</button>
                    <button onClick={() => setLayout(defaultLayout)} className="px-4 py-2 bg-gray-700 font-bold rounded hover:bg-gray-600">RESET</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-800 font-bold rounded hover:bg-gray-700">CANCEL</button>
                </div>
            </div>
            
            {/* Main content area */}
            <div ref={containerRef} className="flex-grow my-4 border-2 border-dashed border-gray-600 relative overflow-hidden">
                {Object.entries(layout.layout).map(([id, control]) => {
                    const baseRadius = (containerRef.current ? containerRef.current.clientHeight * 0.06 : 40) * layout.baseScale;
                    const radius = baseRadius * control.scale;
                    
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${control.x * 100}%`,
                        top: `${control.y * 100}%`,
                        width: `${radius * 2}px`,
                        height: `${radius * 2}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: draggingControl?.id === id ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                        border: `2px solid ${draggingControl?.id === id ? '#2dd4bf' : 'rgba(255, 255, 255, 0.4)'}`,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'grab',
                        opacity: layout.opacity,
                        touchAction: 'none'
                    };

                    return (
                        <div key={id} style={style} onTouchStart={(e) => handleTouchStart(e, id)}>
                            <div className="text-center text-xs pointer-events-none">
                                <p className="font-bold">{id.toUpperCase()}</p>
                            </div>
                        </div>
                    );
                })}
                 <div className="absolute top-2 left-2 p-2 bg-black/50 rounded-md pointer-events-none text-gray-300">
                    {draggingControl ? `Editing: ${CONTROL_NAMES[draggingControl.id] || draggingControl.id}` : 'Drag a button to move it.'}
                </div>
            </div>

            {/* Footer with sliders */}
            <div className="flex justify-center items-center gap-8 p-4 border-t-2 border-gray-700">
                <div className="w-full max-w-xs">
                     <Slider label="Overall Size" value={layout.baseScale} min={0.5} max={1.5} step={0.05} onChange={(v) => setLayout(p => ({...p, baseScale: v}))} />
                </div>
                <div className="w-full max-w-xs">
                    <Slider label="Opacity" value={layout.opacity} min={0.1} max={1.0} step={0.05} onChange={(v) => setLayout(p => ({...p, opacity: v}))} />
                </div>
            </div>
        </div>
    );
};

export default ControlCustomizer;