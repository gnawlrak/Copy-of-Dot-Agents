import React, { useState, useMemo } from 'react';
import { WEAPONS, Attachment } from '../data/weapons';

interface WeaponModificationMenuProps {
    weaponName: string;
    currentAttachments: { [slot: string]: string };
    onAttachmentsChange: (newAttachments: { [slot: string]: string }) => void;
    onBack?: () => void;
}

// Tier/Rarity mapping based on array index
const TIER_INFO = [
    { name: 'COMMON', color: 'border-gray-500', textColor: 'text-gray-300', tagColor: 'bg-gray-700', ringColor: 'ring-gray-500' },
    { name: 'UNCOMMON', color: 'border-green-600', textColor: 'text-green-400', tagColor: 'bg-green-900', ringColor: 'ring-green-600' },
    { name: 'RARE', color: 'border-blue-600', textColor: 'text-blue-400', tagColor: 'bg-blue-900', ringColor: 'ring-blue-600' },
    { name: 'EPIC', color: 'border-purple-600', textColor: 'text-purple-400', tagColor: 'bg-purple-900', ringColor: 'ring-purple-600' },
    { name: 'LEGENDARY', color: 'border-orange-500', textColor: 'text-orange-400', tagColor: 'bg-orange-800', ringColor: 'ring-orange-500' },
];

const getTierInfo = (attachmentList: Attachment[], attachmentName: string) => {
    const index = attachmentList.findIndex(a => a.name === attachmentName);
    if (index === -1) return TIER_INFO[0];
    return TIER_INFO[index] || TIER_INFO[0];
}

const StatBar: React.FC<{ label: string; baseValue: number; modifiedValue: number; previewValue?: number; lowerIsBetter?: boolean; format?: (v: number) => string }> = ({ label, baseValue, modifiedValue, previewValue, lowerIsBetter = false, format }) => {
    if (baseValue === 0 && modifiedValue === 0 && (previewValue === undefined || previewValue === 0)) return null;

    const hasPreview = typeof previewValue === 'number' && previewValue !== modifiedValue;
    const displayValue = hasPreview ? previewValue : modifiedValue;

    const formatFn = format || ((v) => v.toFixed(2));
    const delta = displayValue - baseValue;
    const previewDelta = hasPreview ? previewValue! - modifiedValue : 0;

    let valueColor = 'text-white';
    let previewChangeColor = 'text-gray-400';
    if (delta !== 0) {
        const isImproved = lowerIsBetter ? delta < 0 : delta > 0;
        valueColor = isImproved ? 'text-green-400' : 'text-red-400';
    }
     if (hasPreview && previewDelta !== 0) {
        const isImproved = lowerIsBetter ? previewDelta < 0 : previewDelta > 0;
        previewChangeColor = isImproved ? 'text-green-400' : 'text-red-400';
    }

    const maxDisplayValue = Math.max(baseValue * 1.5, baseValue * 0.5, displayValue * 1.2);
    const basePercent = (baseValue / maxDisplayValue) * 100;
    const displayPercent = (displayValue / maxDisplayValue) * 100;

    return (
        <div>
            <div className="flex justify-between items-baseline text-gray-400 mb-1">
                <span className="font-bold tracking-widest uppercase text-sm">{label}</span>
                <div className={`font-mono text-lg flex items-center gap-2 transition-colors duration-200 ${valueColor}`}>
                    <span>{formatFn(displayValue)}</span>
                    {hasPreview && <span className={`transition-colors duration-200 text-sm ${previewChangeColor}`}>({(previewDelta >= 0 ? '+' : '')}{formatFn(previewDelta)})</span>}
                </div>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full relative">
                <div className="absolute h-full bg-gray-600" style={{ left: `${basePercent}%`, width: '2px', top: '-4px', bottom: '-4px' }} title={`Base: ${formatFn(baseValue)}`}/>
                <div className={`${valueColor.replace('text', 'bg').replace('-400', '-500')} h-full rounded-full transition-all duration-300`} style={{ width: `${displayPercent}%` }} />
            </div>
        </div>
    );
};


const WeaponModificationMenu: React.FC<WeaponModificationMenuProps> = ({ weaponName, currentAttachments, onAttachmentsChange, onBack }) => {
    const weaponDef = WEAPONS[weaponName];
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
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
            fireRate: weaponDef.fireRate,
            reloadTime: weaponDef.reloadTime,
            bulletRadius: weaponDef.bulletRadius,
            pellets: weaponDef.pellets,
        };

        Object.values(attachments).forEach(attachmentName => {
            if (!weaponDef.attachmentSlots) return;
            for (const slotName in weaponDef.attachmentSlots) {
                const attachment = weaponDef.attachmentSlots[slotName].find(a => a.name === attachmentName);
                if (attachment) {
                    const mod = attachment.modifiers;
                    if (mod.fireRate) stats.fireRate *= mod.fireRate;
                    if (mod.reloadTime) stats.reloadTime *= mod.reloadTime;
                    if (mod.bulletRadius) stats.bulletRadius += mod.bulletRadius;
                    if (mod.pellets) stats.pellets += mod.pellets;
                    break;
                }
            }
        });
        return stats;
    };

    const modifiedStats = useMemo(() => getStats(currentAttachments), [weaponDef, currentAttachments]);
    
    const previewStats = useMemo(() => {
        if (!selectedSlot) return null;
        const previewAttachments = {...currentAttachments};
        if (hoveredAttachment) {
            previewAttachments[selectedSlot] = hoveredAttachment.name;
        } else {
            delete previewAttachments[selectedSlot];
        }
        return getStats(previewAttachments);
    }, [hoveredAttachment, selectedSlot, currentAttachments, weaponDef]);

    const attachmentSlots = weaponDef.attachmentSlots ? Object.keys(weaponDef.attachmentSlots) : [];

    // Weapon visual profiles: vary length and slot positions by gun type
    interface WeaponProfile {
        visualWidth: string;
        slotPositions: { top: string; left?: string; right?: string }[];
    }

    const WEAPON_PROFILES: Record<string, WeaponProfile> = {
        // Long rifles
        'MK18 CQBR': {
            visualWidth: '90%',
            slotPositions: [
                { top: '22%', left: '18%' },
                { top: '42%', left: '8%' },
                { top: '62%', left: '18%' },
                { top: '22%', right: '18%' },
                { top: '42%', right: '8%' },
            ]
        },
        'HK416C': {
            visualWidth: '88%',
            slotPositions: [
                { top: '22%', left: '18%' },
                { top: '42%', left: '8%' },
                { top: '62%', left: '18%' },
                { top: '22%', right: '18%' },
                { top: '42%', right: '8%' },
            ]
        },
        'Assault Rifle': {
            visualWidth: '90%',
            slotPositions: [
                { top: '22%', left: '18%' },
                { top: '42%', left: '8%' },
                { top: '62%', left: '18%' },
                { top: '22%', right: '18%' },
                { top: '42%', right: '8%' },
            ]
        },
        // SMGs / compact
        'SIG MPX': {
            visualWidth: '72%',
            slotPositions: [
                { top: '24%', left: '16%' },
                { top: '44%', left: '6%' },
                { top: '64%', left: '16%' },
                { top: '24%', right: '16%' },
                { top: '44%', right: '6%' },
            ]
        },
        'H&K MP7A1': {
            visualWidth: '70%',
            slotPositions: [
                { top: '24%', left: '16%' },
                { top: '44%', left: '6%' },
                { top: '64%', left: '16%' },
                { top: '24%', right: '16%' },
                { top: '44%', right: '6%' },
            ]
        },
        'MP5SD': {
            visualWidth: '74%',
            slotPositions: [
                { top: '24%', left: '16%' },
                { top: '44%', left: '6%' },
                { top: '64%', left: '16%' },
                { top: '24%', right: '16%' },
                { top: '44%', right: '6%' },
            ]
        },
        'P90': {
            visualWidth: '68%',
            slotPositions: [
                { top: '24%', left: '15%' },
                { top: '44%', left: '5%' },
                { top: '64%', left: '15%' },
                { top: '24%', right: '15%' },
                { top: '44%', right: '5%' },
            ]
        },
        'SMG': {
            visualWidth: '70%',
            slotPositions: [
                { top: '24%', left: '16%' },
                { top: '44%', left: '6%' },
                { top: '64%', left: '16%' },
                { top: '24%', right: '16%' },
                { top: '44%', right: '6%' },
            ]
        },
        // Shotguns
        'Benelli M4': {
            visualWidth: '80%',
            slotPositions: [
                { top: '24%', left: '17%' },
                { top: '44%', left: '7%' },
                { top: '64%', left: '17%' },
                { top: '24%', right: '17%' },
                { top: '44%', right: '7%' },
            ]
        },
        'Shotgun': {
            visualWidth: '78%',
            slotPositions: [
                { top: '24%', left: '17%' },
                { top: '44%', left: '7%' },
                { top: '64%', left: '17%' },
                { top: '24%', right: '17%' },
                { top: '44%', right: '7%' },
            ]
        },
        // Pistols
        'Glock 19': {
            visualWidth: '45%',
            slotPositions: [
                { top: '26%', left: '12%' },
                { top: '46%', left: '2%' },
                { top: '66%', left: '12%' },
                { top: '26%', right: '12%' },
                { top: '46%', right: '2%' },
            ]
        },
        'Glock 18C': {
            visualWidth: '45%',
            slotPositions: [
                { top: '26%', left: '12%' },
                { top: '46%', left: '2%' },
                { top: '66%', left: '12%' },
                { top: '26%', right: '12%' },
                { top: '46%', right: '2%' },
            ]
        },
        'Pistol': {
            visualWidth: '42%',
            slotPositions: [
                { top: '26%', left: '10%' },
                { top: '46%', left: '0%' },
                { top: '66%', left: '10%' },
                { top: '26%', right: '10%' },
                { top: '46%', right: '0%' },
            ]
        },
        'Heavy Pistol': {
            visualWidth: '48%',
            slotPositions: [
                { top: '26%', left: '12%' },
                { top: '46%', left: '2%' },
                { top: '66%', left: '12%' },
                { top: '26%', right: '12%' },
                { top: '46%', right: '2%' },
            ]
        },
    };

    const profile = WEAPON_PROFILES[weaponName] || {
        visualWidth: '70%',
        slotPositions: [
            { top: '25%', left: '15%' },
            { top: '45%', left: '5%' },
            { top: '65%', left: '15%' },
            { top: '25%', right: '15%' },
            { top: '45%', right: '5%' },
        ]
    };

    // Safe fallback if weapon has fewer slots than positions
    const slotPositions = profile.slotPositions.slice(0, attachmentSlots.length);
    while (slotPositions.length < attachmentSlots.length) {
        slotPositions.push({ top: '50%', left: '5%' });
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 h-full flex flex-col font-mono overflow-hidden">
            <style>{`
                @keyframes slide-in-right { from { transform: translateX(50%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
             <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-2 text-center">{weaponName.toUpperCase()}</h1>
             <p className="text-gray-400 text-center mb-6">Configure your weapon attachments.</p>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
                {/* Left Column: Stats */}
                <div className="md:col-span-1 bg-gray-900 border-2 border-gray-800 p-6 rounded-md flex flex-col animate-fade-in">
                    <h2 className="text-2xl font-bold text-teal-400 tracking-wider mb-6 text-center uppercase">Weapon Stats</h2>
                    <div className="flex-grow flex flex-col justify-center gap-y-6">
                        <StatBar label="Fire Rate" baseValue={weaponDef.fireRate} modifiedValue={modifiedStats.fireRate} previewValue={previewStats?.fireRate} lowerIsBetter format={v => `${(1/v).toFixed(1)}/s`} />
                        <StatBar label="Reload Speed" baseValue={weaponDef.reloadTime} modifiedValue={modifiedStats.reloadTime} previewValue={previewStats?.reloadTime} lowerIsBetter format={v => `${v.toFixed(1)}s`} />
                        <StatBar label={weaponDef.type === 'hitscan' ? "Impact" : "Bullet Size"} baseValue={weaponDef.bulletRadius} modifiedValue={modifiedStats.bulletRadius} previewValue={previewStats?.bulletRadius} format={v => v.toFixed(1)} />
                        {weaponDef.pellets > 1 && <StatBar label="Pellet Count" baseValue={weaponDef.pellets} modifiedValue={modifiedStats.pellets} previewValue={previewStats?.pellets} format={v => v.toFixed(0)} />}
                    </div>
                </div>
                
                {/* Center & Right Column: Gunsmith & Attachments */}
                <div className="md:col-span-2 bg-gray-900 border-2 border-gray-800 rounded-md flex min-h-0 relative overflow-hidden p-6 animate-fade-in" style={{animationDelay: '100ms'}}>
                     <div className="w-full h-full relative flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out" style={{ width: selectedSlot ? '50%' : '100%' }}>
                        {/* Abstract Weapon Visual */}
                        <div className="absolute h-16 bg-gray-800 rounded-lg top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center p-4 transition-all duration-300" style={{ width: profile.visualWidth }}>
                           <div className="w-24 h-full bg-gray-700 rounded-md flex-shrink-0"></div>
                           <div className="flex-grow h-1/2 bg-gray-700 mx-4 rounded-sm min-w-[40px]"></div>
                           <div className="w-8 h-full bg-gray-700 rounded-lg flex-shrink-0"></div>
                        </div>

                        {/* Slot Nodes */}
                        {attachmentSlots.map((slotName, index) => {
                            const isSelected = selectedSlot === slotName;
                            const isEquipped = !!currentAttachments[slotName];
                            const equippedTier = isEquipped ? getTierInfo(weaponDef.attachmentSlots![slotName], currentAttachments[slotName]) : TIER_INFO[0];

                            return (
                                <div key={slotName} className="absolute transition-all duration-300" style={slotPositions[index]}>
                                    <button 
                                        onClick={() => setSelectedSlot(prev => prev === slotName ? null : slotName)}
                                        className={`w-32 text-left p-2 rounded-md border-2 transition-all duration-200 backdrop-blur-sm ${isSelected ? 'bg-teal-500/30 border-teal-400 scale-110' : `${isEquipped ? equippedTier.color : 'border-gray-600'} bg-gray-900/70 hover:border-teal-500 hover:scale-105`}`}
                                    >
                                        <p className="font-bold uppercase tracking-widest text-sm text-gray-300">{slotName}</p>
                                        <p className={`text-xs truncate ${isEquipped ? equippedTier.textColor : 'text-gray-500'}`}>{currentAttachments[slotName] || 'None'}</p>
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                     {/* Attachment Selection Panel */}
                     {selectedSlot && (
                        <div className="w-1/2 h-full flex-shrink-0 pl-6 flex flex-col animate-slide-in-right">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold tracking-widest text-teal-300 uppercase">{selectedSlot}</h2>
                                <button onClick={() => setSelectedSlot(null)} className="text-4xl text-gray-500 hover:text-white transition-colors">&times;</button>
                            </div>
                            <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                                {/* None Option */}
                                <button
                                    onClick={() => handleAttachmentSelect(selectedSlot, null)}
                                    onMouseEnter={() => setHoveredAttachment(null)}
                                    className={`w-full p-3 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 ${!currentAttachments[selectedSlot] ? 'border-teal-400 ring-2 ring-teal-400/50' : 'border-gray-700 hover:border-teal-500'}`}
                                >
                                    <h4 className="font-bold text-gray-300">None</h4>
                                    <p className="text-xs text-gray-500">Default configuration. Resets slot to base stats.</p>
                                </button>
                                {/* Attachment Options */}
                                {weaponDef.attachmentSlots![selectedSlot].map((attachment) => {
                                    const isSelected = currentAttachments[selectedSlot] === attachment.name;
                                    const fullTierList = weaponDef.attachmentSlots![selectedSlot];
                                    const tier = getTierInfo(fullTierList, attachment.name);
                                    return (
                                    <button
                                        key={attachment.name}
                                        onClick={() => handleAttachmentSelect(selectedSlot, attachment)}
                                        onMouseEnter={() => setHoveredAttachment(attachment)}
                                        onMouseLeave={() => setHoveredAttachment(null)}
                                        className={`w-full p-3 bg-gray-900 border-2 rounded-md text-left transition-colors duration-200 ${isSelected ? `${tier.color} ring-2 ${tier.ringColor}/50` : `border-gray-700 hover:${tier.color}`}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold ${tier.textColor}`}>{attachment.name}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-black rounded ${tier.tagColor} ${tier.textColor}`}>{tier.name}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{attachment.description}</p>
                                    </button>
                                )})}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {onBack && (
                <div className="mt-auto pt-6 text-center">
                    <button
                        onClick={onBack}
                        className="px-8 py-3 bg-gray-800 text-teal-300 font-bold text-lg tracking-widest rounded-md border-2 border-gray-600 hover:bg-gray-700 hover:border-teal-500 transition-colors duration-200"
                    >
                        BACK TO LOADOUT
                    </button>
                </div>
            )}
        </div>
    );
};

export default WeaponModificationMenu;
