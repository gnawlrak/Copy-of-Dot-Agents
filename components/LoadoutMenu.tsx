
import React, { useState, useMemo } from 'react';
import { PlayerLoadout } from '../types';
import { WEAPONS, THROWABLES, WEAPON_TYPES } from '../data/weapons';
import { ThrowableType, AGENT_SKINS } from '../data/definitions';
import { Wrench, Plus, Minus, Shield, Crosshair, Award, Zap, ChevronRight, Sparkles, User, Check } from 'lucide-react';

interface LoadoutMenuProps {
    currentLoadout: PlayerLoadout;
    onLoadoutChange: (newLoadout: PlayerLoadout) => void;
    currentSkinName: string;
    onSkinChange: (newSkinName: string) => void;
    onModifyWeapon: (weaponType: 'primary' | 'secondary' | 'special') => void;
}

type SelectionPanelType = 'primary' | 'secondary' | 'melee' | 'special' | null;

const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ currentLoadout, onLoadoutChange, currentSkinName, onSkinChange, onModifyWeapon }) => {
    const [selectionPanel, setSelectionPanel] = useState<SelectionPanelType>(null);

    const throwableTotal = useMemo(() => {
        return Object.values(currentLoadout.throwables).reduce((sum: number, count: any) => sum + ((count as number) || 0), 0);
    }, [currentLoadout.throwables]);

    const skin = AGENT_SKINS.find(s => s.name === currentSkinName);
    const skinColor = skin ? skin.color : '#FFFFFF';

    const handleWeaponSelect = (category: 'primary' | 'secondary' | 'melee' | 'special', weaponName: string) => {
        // When selecting a new weapon, clear its attachments if it's not a melee weapon
        if (category === 'melee') {
             onLoadoutChange({
                ...currentLoadout,
                [category]: weaponName,
            });
            setSelectionPanel(null);
            return;
        }

        let attachmentField: 'primaryAttachments' | 'secondaryAttachments' | 'specialAttachments' = 'primaryAttachments';
        if (category === 'secondary') attachmentField = 'secondaryAttachments';
        if (category === 'special') attachmentField = 'specialAttachments';

        onLoadoutChange({
            ...currentLoadout,
            [category]: weaponName,
            [attachmentField]: {},
        });
        setSelectionPanel(null);
    };
    
    const handleThrowableChange = (type: ThrowableType, delta: number) => {
        const currentCount = currentLoadout.throwables[type] || 0;
        const newCount = currentCount + delta;

        if (newCount < 0) return;
        if (delta > 0 && throwableTotal >= 5) return;

        const newThrowables = { ...currentLoadout.throwables, [type]: newCount };
        onLoadoutChange({ ...currentLoadout, throwables: newThrowables });
    };


    const renderWeaponSlot = (category: 'primary' | 'secondary' | 'melee' | 'special') => {
        const weaponName = currentLoadout[category];
        const weapon = WEAPONS[weaponName];
        if (!weapon) return null; // Safety check
        const hasAttachments = category !== 'melee' && weapon.attachmentSlots && Object.keys(weapon.attachmentSlots).length > 0;
        
        const categoryConfig = {
            primary: { label: 'Primary Weapon', icon: <Crosshair className="h-4 w-4 text-teal-400" /> },
            secondary: { label: 'Sidearm', icon: <Shield className="h-4 w-4 text-sky-400" /> },
            melee: { label: 'Melee', icon: <Sparkles className="h-4 w-4 text-purple-400" /> },
            special: { label: 'Tactical Weapon', icon: <Zap className="h-4 w-4 text-amber-500 animate-pulse" /> },
        }[category];

        return (
            <div className="w-full text-left">
                <div className="flex items-center gap-2 mb-1">
                    {categoryConfig.icon}
                    <h3 className="text-sm font-bold text-gray-500 tracking-widest uppercase">{categoryConfig.label}</h3>
                </div>
                <div className="p-4 bg-gray-900 border-2 border-gray-800 rounded-md text-left flex flex-col gap-4 shadow-sm relative group overflow-hidden hover:border-gray-700 transition-colors">
                    <button
                        onClick={() => setSelectionPanel(category)}
                        className="w-full text-left hover:bg-gray-800/40 -m-2 p-2 rounded-md transition-colors flex items-center justify-between cursor-pointer"
                    >
                        <div>
                            <h4 className="text-xl font-bold text-teal-400 tracking-wider group-hover:text-teal-300 transition-colors">{weapon.name}</h4>
                            <p className="text-gray-400 text-sm mt-1">{weapon.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-teal-400 transition-colors" />
                    </button>
                    {hasAttachments && (
                         <button 
                            onClick={() => onModifyWeapon(category)}
                            className="w-full px-6 py-2.5 bg-gray-800 text-teal-300 font-bold text-sm tracking-widest rounded-md border-2 border-gray-700 hover:bg-gray-750 hover:border-teal-500 hover:text-teal-200 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                         >
                             <Wrench className="h-4 w-4" />
                             MODIFY ATTACHMENTS
                         </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSelectionPanel = () => {
        if (!selectionPanel) return null;

        const weaponList = WEAPON_TYPES[selectionPanel];

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-end z-50">
                <div className="w-full max-w-md h-full bg-gray-900 border-l-2 border-teal-500 p-6 flex flex-col animate-slide-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold tracking-widest text-teal-300 uppercase">{selectionPanel} WEAPONS</h2>
                        <button onClick={() => setSelectionPanel(null)} className="text-3xl text-gray-500 hover:text-white">&times;</button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {weaponList.map(weaponName => {
                            const weapon = WEAPONS[weaponName];
                            // FIX: Add a type guard to ensure weapon exists and is typed correctly.
                            if (!weapon) {
                                return null;
                            }
                            const isSelected = currentLoadout[selectionPanel] === weapon.name;
                            return (
                                <button
                                    key={weapon.name}
                                    onClick={() => handleWeaponSelect(selectionPanel, weapon.name)}
                                    className={`w-full p-4 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 ${isSelected ? 'border-teal-400 ring-2 ring-teal-400' : 'border-gray-700 hover:border-teal-500'}`}
                                >
                                    <h4 className="text-xl font-bold text-teal-400">{weapon.name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">{weapon.description}</p>
                                    <div className="mt-3 text-xs text-gray-300 grid grid-cols-2 gap-x-4 gap-y-1">
                                        {weapon.category !== 'melee' ? (
                                            <>
                                                <span>TYPE: {weapon.type}</span>
                                                <span>FIRE RATE: {weapon.fireRate}s</span>
                                                <span>MAGAZINE: {weapon.magSize === -1 ? '∞' : weapon.magSize}</span>
                                                <span>AMMO: {weapon.magSize === -1 ? '∞' : `${weapon.magSize}/${weapon.reserveAmmo}`}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>DAMAGE: {weapon.damage}</span>
                                                <span>SPEED: {weapon.fireRate}s</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <style>{`
                    @keyframes slide-in {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
                `}</style>
            </div>
        );
    };
    

    return (
        <div className="w-full max-w-screen-xl text-center p-4 min-h-full flex flex-col my-auto">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8">OPERATOR LOADOUT</h1>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Left Column: Throwables & Melee */}
                <div className="space-y-8 text-left">
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-teal-400" />
                                <h3 className="text-sm font-bold text-gray-500 tracking-widest uppercase">THROWABLES</h3>
                            </div>
                            <span className="text-xs font-bold bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded border border-teal-500/20">{throwableTotal} / 5</span>
                        </div>
                        <div className="w-full mt-2 p-4 bg-gray-900 border-2 border-gray-800 rounded-md space-y-4 shadow-sm">
                            {Object.values(THROWABLES).map(item => (
                                <div key={item.type} className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-lg font-bold text-teal-400">{item.name}</h4>
                                        <p className="text-xs text-gray-500">{item.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                          onClick={() => handleThrowableChange(item.type, -1)} 
                                          disabled={(currentLoadout.throwables[item.type] || 0) === 0}
                                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 border border-gray-700 text-gray-400 font-bold disabled:opacity-40 disabled:hover:bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="text-lg font-mono font-bold w-6 text-center text-white">{currentLoadout.throwables[item.type] || 0}</span>
                                        <button 
                                          onClick={() => handleThrowableChange(item.type, 1)} 
                                          disabled={throwableTotal >= 5}
                                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 border border-gray-700 text-gray-400 font-bold disabled:opacity-40 disabled:hover:bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {renderWeaponSlot('melee')}
                </div>

                {/* Center Column: Visual display & Skin Selector */}
                <div className="flex flex-col items-center justify-center h-full pt-8 md:pt-0 gap-6">
                    <div className="flex items-center justify-center relative">
                        <div className="w-48 h-[280px] relative flex items-center justify-center animate-pulse" aria-live="polite" style={{ animationDuration: '4s' }}>
                            {/* Glow platform standard */}
                            <div className="absolute bottom-4 w-32 h-6 bg-teal-500/10 rounded-full blur-md"></div>
                            
                            {/* Agent Body with Skin Color */}
                            <div style={{ 
                                backgroundColor: skinColor, 
                                boxShadow: `0 0 35px ${skinColor}77, 0 0 15px ${skinColor}` 
                            }} className="w-20 h-20 rounded-full transition-all duration-300 border-4 border-gray-950 flex shadow-inner"></div>
                            
                            {/* Agent Arms/Weapon - simple representation */}
                            <div className="absolute w-3 h-20 bg-gray-600/80 rounded-full" style={{ transform: 'translateX(12px) translateY(-12px) rotate(15deg)' }}></div>
                            <div className="absolute w-3 h-20 bg-gray-600/80 rounded-full" style={{ transform: 'translateX(-12px) translateY(-12px) rotate(-15deg)' }}></div>
                            <div className="absolute w-28 h-4 bg-gray-750 rounded-sm border border-gray-600" style={{ transform: 'translateY(15px)' }}></div>
                        </div>
                    </div>

                    {/* Operator Camo Selector */}
                    <div className="w-full max-w-xs bg-gray-900 border-2 border-gray-800 p-4 rounded-md text-left shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4 text-teal-400" />
                            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">TACTICAL CAMO</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {AGENT_SKINS.map(s => {
                                const isCurrent = s.name === currentSkinName;
                                return (
                                    <button
                                        key={s.name}
                                        onClick={() => onSkinChange(s.name)}
                                        style={{ backgroundColor: s.color }}
                                        title={s.name}
                                        className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-200 flex items-center justify-center relative hover:scale-105 ${isCurrent ? 'border-teal-400 scale-110 ring-2 ring-teal-400/30' : 'border-gray-800 hover:border-gray-600'}`}
                                    >
                                        {isCurrent && (
                                            <Check className={`h-4 w-4 ${s.color === '#FFFFFF' ? 'text-black' : 'text-white'} drop-shadow`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-center text-[10px] text-teal-400/80 mt-2.5 uppercase tracking-wider font-bold">{currentSkinName}</p>
                    </div>
                </div>

                {/* Right Column: Weapons */}
                <div className="space-y-8">
                    {renderWeaponSlot('primary')}
                    {renderWeaponSlot('secondary')}
                    {renderWeaponSlot('special')}
                </div>
            </div>

            {renderSelectionPanel()}
        </div>
    );
};

export default LoadoutMenu;
