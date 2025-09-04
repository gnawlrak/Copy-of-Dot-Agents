
import React, { useState, useMemo } from 'react';
import { WEAPONS, Attachment, FireMode } from '../data/weapons';

interface WeaponModificationMenuProps {
    weaponName: string;
    currentAttachments: { [slot: string]: string };
    onAttachmentsChange: (newAttachments: { [slot: string]: string }) => void;
}

// Tier/Rarity mapping based on array index
const TIER_INFO = [
    { name: 'COMMON', color: 'border-gray-500', textColor: 'text-gray-300', tagColor: 'bg-gray-700' },
    { name: 'UNCOMMON', color: 'border-green-600', textColor: 'text-green-400', tagColor: 'bg-green-900' },
    { name: 'RARE', color: 'border-blue-600', textColor: 'text-blue-400', tagColor: 'bg-blue-900' },
    { name: 'EPIC', color: 'border-purple-600', textColor: 'text-purple-400', tagColor: 'bg-purple-900' },
    { name: 'LEGENDARY', color: 'border-orange-500', textColor: 'text-orange-400', tagColor: 'bg-orange-800' },
];

const getTierInfo = (index: number) => TIER_INFO[index] || TIER_INFO[0];


const StatBar: React.FC<{ label: string; baseValue: number; modifiedValue: number; previewValue?: number; lowerIsBetter?: boolean; format?: (v: number) => string }> = ({ label, baseValue, modifiedValue, previewValue, lowerIsBetter = false, format }) => {
    if (baseValue === 0 && modifiedValue === 0 && (previewValue === undefined || previewValue === 0)) return null;

    const hasPreview = typeof previewValue === 'number' && previewValue !== modifiedValue;
    const displayValue = hasPreview ? previewValue : modifiedValue;

    const formatFn = format || ((v) => v.toFixed(2));
    const delta = displayValue - baseValue;

    let valueColor = 'text-white';
    if (delta !== 0) {
        const isImproved = lowerIsBetter ? delta < 0 : delta > 0;
        valueColor = isImproved ? 'text-green-400' : 'text-red-400';
    }

    const maxDisplayValue = Math.max(baseValue * 1.5, baseValue + Math.abs(delta) * 1.2);
    const basePercent = (baseValue / maxDisplayValue) * 100;
    const displayPercent = (displayValue / maxDisplayValue) * 100;

    return (
        <div>
            <div className="flex justify-between items-baseline text-gray-400 mb-1">
                <span className="font-bold tracking-widest uppercase text-sm">{label}</span>
                <div className="font-mono text-lg flex items-center gap-2">
                    <span className={valueColor}>{formatFn(displayValue)}</span>
                    {hasPreview && <span className="text-gray-500 text-sm">(was {formatFn(modifiedValue)})</span>}
                </div>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full relative">
                <div className="absolute h-full bg-gray-600" style={{ left: `${basePercent}%`, width: '2px', top: '-4px', bottom: '-4px' }} title={`Base: ${formatFn(baseValue)}`}/>
                <div className={`${valueColor.replace('text', 'bg').replace('-400', '-500')} h-full rounded-full transition-all duration-300`} style={{ width: `${displayPercent}%` }} />
            </div>
        </div>
    );
};

const WeaponModificationMenu: React.FC<WeaponModificationMenuProps> = ({ weaponName, currentAttachments, onAttachmentsChange }) => {
    const weaponDef = WEAPONS[weaponName];
    const [selectedSlot, setSelectedSlot] = useState<string | null>(weaponDef.attachmentSlots ? Object.keys(weaponDef.attachmentSlots)[0] : null);
    const [hoveredAttachment, setHoveredAttachment] = useState<Attachment | null>(null);

    const handleAttachmentSelect = (slotName: string, attachment: Attachment | null) => {
        const newAttachments = { ...currentAttachments };
        if (attachment) {
            newAttachments[slotName] = attachment.name;
        } else {
            delete newAttachments[slotName];
        }
        onAttachmentsChange(newAttachments);
    };

    const getStats = (attachments: { [slot:string]: string }) => {
        const stats = {
            damage: weaponDef.damage,
            fireRate: weaponDef.fireRate,
            reloadTime: weaponDef.reloadTime,
            bulletRadius: weaponDef.bulletRadius,
            pellets: weaponDef.pellets,
            spread: weaponDef.spread,
            allowedFireModes: [...weaponDef.allowedFireModes],
        };

        Object.values(attachments).forEach(attachmentName => {
            if (!weaponDef.attachmentSlots) return;
            for (const slotName in weaponDef.attachmentSlots) {
                const attachment = weaponDef.attachmentSlots[slotName].find(a => a.name === attachmentName);
                if (attachment) {
                    const mod = attachment.modifiers;
                    if (mod.damage) stats.damage *= mod.damage;
                    if (mod.fireRate) stats.fireRate *= mod.fireRate;
                    if (mod.reloadTime) stats.reloadTime *= mod.reloadTime;
                    if (mod.bulletRadius) stats.bulletRadius += mod.bulletRadius;
                    if (mod.pellets) stats.pellets += mod.pellets;
                    if (mod.spread) stats.spread *= mod.spread;
                    if (mod.addFireModes) {
                        mod.addFireModes.forEach(mode => {
                            if (!stats.allowedFireModes.includes(mode)) {
                                stats.allowedFireModes.push(mode);
                            }
                        });
                    }
                    break; 
                }
            }
        });
        return stats;
    };
    
    const modifiedStats = useMemo(() => getStats(currentAttachments), [weaponDef, currentAttachments]);
    
    const previewStats = useMemo(() => {
        if (!hoveredAttachment || !selectedSlot) return modifiedStats; // Show current stats if not hovering
        
        const previewAttachments = {...currentAttachments};
        previewAttachments[selectedSlot] = hoveredAttachment.name;
        
        return getStats(previewAttachments);
    }, [hoveredAttachment, selectedSlot, currentAttachments, weaponDef, modifiedStats]);
    
    // Fallback to modifiedStats if previewStats is null (e.g. hovering 'None')
    const displayStats = previewStats || modifiedStats;

    const attachmentSlots = weaponDef.attachmentSlots ? Object.keys(weaponDef.attachmentSlots) : [];

    return (
        <div className="w-full max-w-7xl mx-auto p-4 h-full flex flex-col">
             <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-2 text-center">{weaponName.toUpperCase()}</h1>
             <p className="text-gray-400 text-center mb-8">Configure your weapon attachments.</p>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
                {/* Left Column: Slots */}
                <div className="lg:col-span-1 bg-gray-900 border-2 border-gray-800 p-4 rounded-md flex flex-col gap-3">
                     <h2 className="text-xl font-bold text-teal-400 tracking-wider mb-2 text-center uppercase">Slots</h2>
                    {attachmentSlots.map(slotName => (
                        <button key={slotName} onClick={() => setSelectedSlot(slotName)}
                            className={`p-3 rounded-md border-2 text-left transition-all duration-200 ${selectedSlot === slotName ? 'bg-teal-900 border-teal-500 scale-105 shadow-lg' : 'bg-gray-800 border-gray-700 hover:border-teal-600 hover:bg-gray-700'}`}>
                            <p className="font-bold uppercase tracking-widest text-sm">{slotName}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">{currentAttachments[slotName] || 'None'}</p>
                        </button>
                    ))}
                </div>
                
                {/* Center Column: Attachments */}
                 <div className="lg:col-span-2 bg-gray-900 border-2 border-gray-800 p-4 rounded-md flex flex-col min-h-0">
                    {selectedSlot && (
                        <>
                        <h2 className="text-xl font-bold text-teal-400 tracking-wider mb-4 text-center uppercase">{selectedSlot} Options</h2>
                        <div className="space-y-3 overflow-y-auto flex-grow pr-2">
                            {/* None Option */}
                            <button
                                onClick={() => handleAttachmentSelect(selectedSlot, null)}
                                onMouseEnter={() => setHoveredAttachment(null)}
                                className={`w-full p-3 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 ${!currentAttachments[selectedSlot] ? 'border-teal-400' : 'border-gray-700 hover:border-teal-500'}`}
                            >
                                <h4 className="font-bold text-gray-300">None</h4>
                                <p className="text-xs text-gray-500">Default configuration.</p>
                            </button>
                            {/* Attachment Options */}
                            {weaponDef.attachmentSlots![selectedSlot].map((attachment, index) => {
                                const tier = getTierInfo(index);
                                const isSelected = currentAttachments[selectedSlot] === attachment.name;
                                return (
                                <button
                                    key={attachment.name}
                                    onClick={() => handleAttachmentSelect(selectedSlot, attachment)}
                                    onMouseEnter={() => setHoveredAttachment(attachment)}
                                    onMouseLeave={() => setHoveredAttachment(null)}
                                    className={`w-full p-3 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 ${isSelected ? tier.color : `border-gray-700 hover:${tier.color}`}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold ${tier.textColor}`}>{attachment.name}</h4>
                                        <span className={`px-2 py-0.5 text-xs font-black rounded-full ${tier.tagColor} ${tier.textColor}`}>{tier.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{attachment.description}</p>
                                </button>
                            )})}
                        </div>
                        </>
                    )}
                </div>

                {/* Right Column: Stats */}
                <div className="lg:col-span-2 bg-gray-900 border-2 border-gray-800 p-4 rounded-md flex flex-col">
                    <h2 className="text-2xl font-bold text-teal-400 tracking-wider mb-4 text-center uppercase">Weapon Stats</h2>
                    <div className="flex-grow flex flex-col justify-center gap-y-5">
                        <StatBar label="Damage" baseValue={weaponDef.damage} modifiedValue={modifiedStats.damage} previewValue={previewStats?.damage} format={v => v.toFixed(0)} />
                        <StatBar label="Fire Rate" baseValue={weaponDef.fireRate} modifiedValue={modifiedStats.fireRate} previewValue={previewStats?.fireRate} lowerIsBetter format={v => `${(1/v).toFixed(1)}/s`} />
                        <StatBar label="Reload Speed" baseValue={weaponDef.reloadTime} modifiedValue={modifiedStats.reloadTime} previewValue={previewStats?.reloadTime} lowerIsBetter format={v => `${v.toFixed(1)}s`} />
                        <StatBar label="Accuracy" baseValue={weaponDef.spread} modifiedValue={modifiedStats.spread} previewValue={previewStats?.spread} lowerIsBetter format={v => (100 - v * 100).toFixed(0)} />
                        <StatBar label={weaponDef.type === 'hitscan' ? "Impact" : "Bullet Size"} baseValue={weaponDef.bulletRadius} modifiedValue={modifiedStats.bulletRadius} previewValue={previewStats?.bulletRadius} format={v => v.toFixed(1)} />
                        {weaponDef.pellets > 1 && <StatBar label="Pellet Count" baseValue={weaponDef.pellets} modifiedValue={modifiedStats.pellets} previewValue={previewStats?.pellets} format={v => v.toFixed(0)} />}

                        <div>
                            <div className="flex justify-between items-baseline text-gray-400 mb-1">
                                <span className="font-bold tracking-widest uppercase text-sm">Fire Modes</span>
                            </div>
                            <div className="flex gap-2 font-mono text-lg">
                                {['semi', 'burst', 'auto'].map((mode) => {
                                    const isAvailable = displayStats.allowedFireModes.includes(mode as FireMode);
                                    const wasAvailable = modifiedStats.allowedFireModes.includes(mode as FireMode);
                                    let color = 'text-gray-600';
                                    if (isAvailable) {
                                        color = wasAvailable ? 'text-white' : 'text-green-400';
                                    } else if (wasAvailable) {
                                        color = 'text-red-400';
                                    }
                                    return <span key={mode} className={`px-3 py-1 bg-gray-800 rounded-md ${color} transition-colors`}>{mode.toUpperCase()}</span>
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeaponModificationMenu;
