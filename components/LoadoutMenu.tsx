import React, { useState, useMemo } from 'react';
import { PlayerLoadout } from '../App';
import { WEAPONS, THROWABLES, WEAPON_TYPES } from '../data/weapons';
import { ThrowableType, AGENT_SKINS } from '../data/definitions';

interface LoadoutMenuProps {
    currentLoadout: PlayerLoadout;
    onLoadoutChange: (newLoadout: PlayerLoadout) => void;
    onBack: () => void;
    currentSkinName: string;
    onSkinChange: (newSkinName: string) => void;
    onModifyWeapon: (weaponType: 'primary' | 'secondary') => void;
}

type SelectionPanelType = 'primary' | 'secondary' | null;

const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ currentLoadout, onLoadoutChange, onBack, currentSkinName, onSkinChange, onModifyWeapon }) => {
    const [selectionPanel, setSelectionPanel] = useState<SelectionPanelType>(null);

    const throwableTotal = useMemo(() => {
        return Object.values(currentLoadout.throwables).reduce((sum, count) => sum + (count || 0), 0);
    }, [currentLoadout.throwables]);

    const currentSkin = useMemo(() => {
        return AGENT_SKINS.find(s => s.name === currentSkinName) || AGENT_SKINS[0];
    }, [currentSkinName]);

    const handleSkinChange = (direction: 'next' | 'prev') => {
        const currentIndex = AGENT_SKINS.findIndex(s => s.name === currentSkinName);
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % AGENT_SKINS.length;
        } else {
            nextIndex = (currentIndex - 1 + AGENT_SKINS.length) % AGENT_SKINS.length;
        }
        onSkinChange(AGENT_SKINS[nextIndex].name);
    };

    const handleWeaponSelect = (category: 'primary' | 'secondary', weaponName: string) => {
        // When selecting a new weapon, clear its attachments
        const attachmentField = category === 'primary' ? 'primaryAttachments' : 'secondaryAttachments';
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


    const renderWeaponSlot = (category: 'primary' | 'secondary') => {
        const weaponName = currentLoadout[category];
        const weapon = WEAPONS[weaponName];
        const hasAttachments = weapon.attachmentSlots && Object.keys(weapon.attachmentSlots).length > 0;
        
        return (
            <div className="w-full">
                <h3 className="text-lg text-gray-400 tracking-widest uppercase">{category}</h3>
                <div className="mt-2 p-4 bg-gray-900 border-2 border-gray-700 rounded-md text-left flex flex-col gap-4">
                    <button
                        onClick={() => setSelectionPanel(category)}
                        className="w-full text-left hover:bg-gray-800 -m-2 p-2 rounded-md"
                    >
                        <h4 className="text-2xl font-bold text-teal-400 tracking-wider">{weapon.name}</h4>
                        <p className="text-gray-400 mt-1">{weapon.description}</p>
                    </button>
                    {hasAttachments && (
                         <button 
                            onClick={() => onModifyWeapon(category)}
                            className="w-full px-6 py-2 bg-gray-800 text-teal-300 font-bold text-base tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
                         >
                             MODIFY
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
            <div className="absolute inset-0 bg-black bg-opacity-75 flex justify-end z-50">
                <div className="w-full max-w-md h-full bg-gray-900 border-l-2 border-teal-500 p-6 flex flex-col animate-slide-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold tracking-widest text-teal-300 uppercase">{selectionPanel} WEAPONS</h2>
                        <button onClick={() => setSelectionPanel(null)} className="text-3xl text-gray-500 hover:text-white">&times;</button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {weaponList.map(weaponName => {
                            const weapon = WEAPONS[weaponName];
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
                                        <span>TYPE: {weapon.type}</span>
                                        <span>FIRE RATE: {weapon.fireRate}s</span>
                                        <span>MAGAZINE: {weapon.magSize === -1 ? '∞' : weapon.magSize}</span>
                                        <span>AMMO: {weapon.magSize === -1 ? '∞' : `${weapon.magSize}/${weapon.reserveAmmo}`}</span>
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
        <div className="w-full max-w-6xl text-center p-4 h-full flex flex-col">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8">OPERATOR LOADOUT</h1>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Left Column: Melee & Throwables */}
                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg text-gray-400 tracking-widest uppercase">Melee</h3>
                        <div className="w-full mt-2 p-4 bg-gray-900 border-2 border-gray-700 rounded-md text-left">
                            <h4 className="text-2xl font-bold text-teal-400 tracking-wider">Combat Knife</h4>
                            <p className="text-gray-400 mt-1">Standard issue high-frequency blade. Fast and silent.</p>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg text-gray-400 tracking-widest uppercase flex justify-between items-baseline">
                          <span>THROWABLES</span>
                          <span className="text-base text-teal-300">{throwableTotal} / 5</span>
                        </h3>
                        <div className="w-full mt-2 p-4 bg-gray-900 border-2 border-gray-700 rounded-md space-y-4">
                            {Object.values(THROWABLES).map(item => (
                                <div key={item.type} className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xl font-bold text-teal-400">{item.name}</h4>
                                        <p className="text-sm text-gray-500">{item.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                          onClick={() => handleThrowableChange(item.type, -1)} 
                                          disabled={(currentLoadout.throwables[item.type] || 0) === 0}
                                          className="w-10 h-10 rounded-full bg-gray-700 text-lg font-bold disabled:opacity-50 hover:bg-gray-600">-</button>
                                        <span className="text-2xl w-8 text-center">{currentLoadout.throwables[item.type] || 0}</span>
                                        <button 
                                          onClick={() => handleThrowableChange(item.type, 1)} 
                                          disabled={throwableTotal >= 5}
                                          className="w-10 h-10 rounded-full bg-gray-700 text-lg font-bold disabled:opacity-50 hover:bg-gray-600">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center Column: Visual display */}
                <div className="flex flex-col items-center justify-center h-full pt-8 md:pt-0">
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleSkinChange('prev')} className="p-2 text-4xl text-gray-600 rounded-full hover:bg-gray-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 w-14 h-14 flex items-center justify-center" aria-label="Previous skin">&lt;</button>
                        
                        <div className="w-48 h-96 relative flex items-center justify-center" aria-live="polite">
                            {/* Agent Body */}
                            <div style={{ 
                                backgroundColor: currentSkin.color, 
                                boxShadow: `0 0 25px ${currentSkin.color}, 0 0 10px ${currentSkin.color}` 
                            }} className="w-24 h-24 rounded-full transition-colors duration-300"></div>
                            
                            {/* Agent Arms/Weapon - simple representation */}
                            <div className="absolute w-3 h-24 bg-gray-600 rounded-full" style={{ transform: 'translateX(10px) translateY(-15px) rotate(15deg)' }}></div>
                            <div className="absolute w-3 h-24 bg-gray-600 rounded-full" style={{ transform: 'translateX(-10px) translateY(-15px) rotate(-15deg)' }}></div>
                            <div className="absolute w-32 h-4 bg-gray-700 rounded-sm" style={{ transform: 'translateY(25px)' }}></div>
                        </div>

                        <button onClick={() => handleSkinChange('next')} className="p-2 text-4xl text-gray-600 rounded-full hover:bg-gray-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 w-14 h-14 flex items-center justify-center" aria-label="Next skin">&gt;</button>
                    </div>
                    <p className="mt-4 text-xl text-teal-300 tracking-wider h-7">{currentSkin.name}</p>
                </div>

                {/* Right Column: Weapons */}
                <div className="space-y-8">
                    {renderWeaponSlot('primary')}
                    {renderWeaponSlot('secondary')}
                </div>
            </div>

            <div className="mt-auto pt-8">
                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
                >
                    BACK TO MENU
                </button>
            </div>
            {renderSelectionPanel()}
        </div>
    );
};

export default LoadoutMenu;