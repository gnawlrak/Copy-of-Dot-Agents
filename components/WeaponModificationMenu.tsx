import React, { useState, useMemo, useEffect } from 'react';
import { WEAPONS, Attachment, FireMode } from '../data/weapons';

interface WeaponModificationMenuProps {
    weaponName: string;
    currentAttachments: { [slot: string]: string };
    onAttachmentsChange: (newAttachments: { [slot: string]: string }) => void;
}

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
    if (baseValue === -1) return null;

    const formatFn = format || ((v) => v.toFixed(2));
    const hasPreview = typeof previewValue === 'number';

    const displayValue = hasPreview ? previewValue! : modifiedValue;
    
    // This delta compares the FINAL displayed value to the UNMODIFIED base value.
    const deltaFromBase = displayValue - baseValue;

    // Determine the color of the text. When previewing, the color shows the change from the CURRENTLY EQUIPPED state.
    // When not previewing, it shows the change from the BASE state.
    let valueColor = 'text-white';
    const comparisonDelta = hasPreview ? (previewValue! - modifiedValue) : (modifiedValue - baseValue);
    if (Math.abs(comparisonDelta) > 1e-6) {
        const isImproved = lowerIsBetter ? comparisonDelta < 0 : comparisonDelta > 0;
        valueColor = isImproved ? 'text-green-400' : 'text-red-400';
    }

    // Prepare the change text `(+X.X)` which always compares to base.
    let changeText = '';
    let changeTextColor = 'text-white';
    if (Math.abs(deltaFromBase) > 1e-6) {
        const isImproved = lowerIsBetter ? deltaFromBase < 0 : deltaFromBase > 0;
        changeTextColor = isImproved ? 'text-green-400' : 'text-red-400';
        const sign = deltaFromBase > 0 ? '+' : '';
        changeText = `(${sign}${formatFn(deltaFromBase)})`;
    }

    // Bar rendering logic
    const maxRange = Math.max(baseValue * 1.5, modifiedValue * 1.2, (previewValue || 0) * 1.2);
    const basePercent = (baseValue / maxRange) * 100;
    const modifiedPercent = (modifiedValue / maxRange) * 100;
    const previewPercent = hasPreview ? (previewValue! / maxRange) * 100 : modifiedPercent;

    return (
        <div>
            <div className="flex justify-between items-baseline text-gray-400 mb-1">
                <span className="font-bold tracking-widest uppercase text-sm">{label}</span>
                <div className="font-mono text-lg flex items-center gap-2">
                    <span className={`${valueColor} transition-colors`}>{formatFn(displayValue)}</span>
                    <span className={`${changeTextColor} transition-colors text-sm`}>{changeText}</span>
                </div>
            </div>
            <div className="w-full bg-gray-800/50 h-3 rounded-full relative overflow-hidden">
                {/* The gray bar represents the currently equipped value */}
                <div className="absolute h-full bg-gray-600/70" style={{ width: `${modifiedPercent}%` }} />
                {/* The colored bar on top represents the previewed value */}
                <div 
                    className={`absolute h-full ${valueColor.replace('text-', 'bg-').replace('-400', '-500')} transition-all duration-200`} 
                    style={{ width: `${previewPercent}%` }} 
                />
                {/* The white line indicates the base value */}
                <div className="absolute h-full bg-white/50" style={{ left: `${basePercent}%`, width: '2px', top: '-2px', bottom: '-2px' }} title={`Base: ${formatFn(baseValue)}`}/>
            </div>
        </div>
    );
};

const schematics: { [key: string]: {
    containerStyle: React.CSSProperties;
    slotPartMap: { [slotName: string]: string };
    parts: { id: string; style: React.CSSProperties }[];
} } = {
    'Assault Rifle': {
        containerStyle: { width: '90%', maxWidth: '600px', height: '150px' },
        slotPartMap: { 'Muzzle': 'barrel', 'Grip': 'handguard', 'Trigger': 'receiver', 'Magazine': 'mag', 'Ammunition': 'mag', 'Stock': 'stock' },
        parts: [
            { id: 'stock', style: { position: 'absolute', top: '38%', left: '0%', width: '25%', height: '25%', backgroundColor: '#4b5563', clipPath: 'polygon(0% 20%, 60% 0%, 100% 25%, 95% 100%, 20% 100%, 0 80%)', transform: 'translateX(-20px)' } },
            { id: 'receiver', style: { position: 'absolute', top: '30%', left: '22%', width: '25%', height: '35%', backgroundColor: '#6b7280', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' } },
            { id: 'handguard', style: { position: 'absolute', top: '30%', left: '47%', width: '20%', height: '35%', backgroundColor: '#4b5563', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10% 100%)' } },
            { id: 'handle', style: { position: 'absolute', top: '60%', left: '40%', width: '8%', height: '35%', backgroundColor: '#4b5563', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)', transform: 'translateY(15px)' } },
            { id: 'mag', style: { position: 'absolute', top: '65%', left: '55%', width: '10%', height: '30%', backgroundColor: '#4b5563', clipPath: 'polygon(5% 0, 95% 0, 85% 100%, 15% 100%)', transform: 'translateY(25px)' } },
            { id: 'barrel', style: { position: 'absolute', top: '42%', left: '67%', width: '33%', height: '10%', backgroundColor: '#6b7280', transform: 'translateX(20px)' } },
            { id: 'rail', style: { position: 'absolute', top: '22%', left: '25%', width: '40%', height: '8%', backgroundColor: '#4b5563', transform: 'translateY(-15px)' } },
        ]
    },
    'SMG': {
        containerStyle: { width: '80%', maxWidth: '450px', height: '140px' },
        slotPartMap: { 'Muzzle': 'barrel', 'Trigger': 'body', 'Stock': 'stock', 'Magazine': 'mag', 'Ammunition': 'mag' },
        parts: [
            { id: 'stock', style: { position: 'absolute', top: '40%', left: '0%', width: '15%', height: '20%', backgroundColor: '#4b5563', clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%, 50% 65%, 0% 65%, 0% 50%, 50% 50%)', transform: 'translateX(-20px)' } },
            { id: 'body', style: { position: 'absolute', top: '30%', left: '10%', width: '50%', height: '35%', backgroundColor: '#6b7280', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 40% 100%, 40% 130%, 20% 130%, 20% 100%, 0 100%)' } },
            { id: 'handle', style: { position: 'absolute', top: '60%', left: '30%', width: '10%', height: '40%', backgroundColor: '#4b5563', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)', transform: 'translateY(15px)' } },
            { id: 'mag', style: { position: 'absolute', top: '65%', left: '42%', width: '12%', height: '35%', backgroundColor: '#4b5563', clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)', transform: 'translateY(25px)' } },
            { id: 'barrel', style: { position: 'absolute', top: '42%', left: '60%', width: '40%', height: '10%', backgroundColor: '#6b7280', transform: 'translateX(20px)' } },
        ]
    },
    'Shotgun': {
        containerStyle: { width: '95%', maxWidth: '650px', height: '100px' },
        slotPartMap: { 'Muzzle': 'barrel', 'Action': 'body', 'Tube': 'tube', 'Ammunition': 'tube' },
        parts: [
            { id: 'stock', style: { position: 'absolute', top: '35%', left: '0%', width: '20%', height: '30%', backgroundColor: '#4b5563', clipPath: 'polygon(0 25%, 100% 0, 100% 100%, 0 75%)', transform: 'translateX(-20px)' } },
            { id: 'body', style: { position: 'absolute', top: '30%', left: '20%', width: '30%', height: '30%', backgroundColor: '#6b7280', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10% 100%, 0 80%)' } },
            { id: 'barrel', style: { position: 'absolute', top: '35%', left: '50%', width: '50%', height: '10%', backgroundColor: '#6b7280', transform: 'translateX(20px)' } },
            { id: 'tube', style: { position: 'absolute', top: '50%', left: '50%', width: '45%', height: '12%', backgroundColor: '#4b5563', transform: 'translateX(20px) translateY(5px)' } },
        ]
    },
    'Pistol': {
        containerStyle: { width: '60%', maxWidth: '300px', height: '150px' },
        slotPartMap: { 'Muzzle': 'slide', 'Trigger': 'body', 'Magazine': 'handle', 'Ammunition': 'handle' },
        parts: [
            { id: 'slide', style: { position: 'absolute', top: '10%', left: '0%', width: '80%', height: '25%', backgroundColor: '#6b7280', clipPath: 'polygon(0 15%, 10% 0, 100% 0, 100% 100%, 0 100%)', transform: 'translateY(-15px)' } },
            { id: 'body', style: { position: 'absolute', top: '35%', left: '10%', width: '60%', height: '20%', backgroundColor: '#4b5563', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%, 20% 150%, 0 150%)' } },
            { id: 'handle', style: { position: 'absolute', top: '55%', left: '15%', width: '25%', height: '45%', backgroundColor: '#4b5563', clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)', transform: 'translateY(15px)' } },
        ]
    },
    'Heavy Pistol': {
        containerStyle: { width: '70%', maxWidth: '350px', height: '150px' },
        slotPartMap: { 'Muzzle': 'slide', 'Barrel': 'slide', 'Trigger': 'body', 'Ammunition': 'handle' },
        parts: [
            { id: 'slide', style: { position: 'absolute', top: '10%', left: '0%', width: '95%', height: '25%', backgroundColor: '#6b7280', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 5% 100%, 0% 80%)', transform: 'translateY(-15px)' } },
            { id: 'body', style: { position: 'absolute', top: '35%', left: '10%', width: '70%', height: '25%', backgroundColor: '#4b5563', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%, 20% 150%, 0 150%)' } },
            { id: 'handle', style: { position: 'absolute', top: '60%', left: '15%', width: '30%', height: '40%', backgroundColor: '#4b5563', clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)', transform: 'translateY(15px)' } },
        ]
    },
};

const WeaponModificationMenu: React.FC<WeaponModificationMenuProps> = ({ weaponName, currentAttachments, onAttachmentsChange }) => {
    const weaponDef = WEAPONS[weaponName];
    const attachmentSlots = weaponDef.attachmentSlots ? Object.keys(weaponDef.attachmentSlots) : [];
    const [selectedSlot, setSelectedSlot] = useState<string | null>(attachmentSlots.length > 0 ? attachmentSlots[0] : null);
    const [hoveredAttachment, setHoveredAttachment] = useState<Attachment | null>(null);

    useEffect(() => {
        const newAttachmentSlots = weaponDef.attachmentSlots ? Object.keys(weaponDef.attachmentSlots) : [];
        setSelectedSlot(newAttachmentSlots.length > 0 ? newAttachmentSlots[0] : null);
    }, [weaponName]);

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
        if (!hoveredAttachment || !selectedSlot) return null;
        
        const previewAttachments = {...currentAttachments};
        if (hoveredAttachment) {
            previewAttachments[selectedSlot] = hoveredAttachment.name;
        } else {
            delete previewAttachments[selectedSlot];
        }
        
        return getStats(previewAttachments);
    }, [hoveredAttachment, selectedSlot, currentAttachments, weaponDef]);
    
    const displayStats = previewStats || modifiedStats;
    const schematic = schematics[weaponName] || schematics['Assault Rifle'];
    const partIdToHighlight = selectedSlot ? schematic.slotPartMap[selectedSlot] : null;

    return (
        <div className="w-full h-full max-w-screen-2xl mx-auto p-4 flex flex-col">
             <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-2 text-center">{weaponName.toUpperCase()}</h1>
             <p className="text-gray-400 text-center mb-6">选择一个槽位, 然后从右侧列表中选择配件进行安装</p>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
                {/* Left Column: Slot List */}
                <div className="lg:col-span-1 bg-gray-900 border-2 border-gray-800 p-2 rounded-md flex flex-col gap-2 overflow-y-auto">
                    {attachmentSlots.map(slotName => {
                        const isSelected = selectedSlot === slotName;
                        const equippedAttachment = currentAttachments[slotName] || '无配件';
                        return (
                            <button
                                key={slotName}
                                onClick={() => setSelectedSlot(slotName)}
                                className={`w-full p-3 rounded-md text-left transition-colors duration-200 ${isSelected ? 'bg-teal-500/20 border-l-4 border-teal-400' : 'bg-gray-800/50 hover:bg-gray-700/70'}`}
                            >
                                <h3 className="font-bold text-lg tracking-wider uppercase text-gray-300">{slotName}</h3>
                                <p className="text-sm text-teal-400 truncate">{equippedAttachment}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Center Column: Exploded View */}
                <div className="lg:col-span-3 bg-gray-900 border-2 border-gray-800 rounded-md flex items-center justify-center p-8 relative min-h-[300px]">
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="relative" style={schematic.containerStyle}>
                            {schematic.parts.map(part => {
                                const isHighlighted = part.id === partIdToHighlight;
                                const partStyle = {
                                    ...part.style,
                                    transition: 'all 0.3s ease-in-out',
                                    filter: isHighlighted ? 'drop-shadow(0 0 12px #2dd4bf) brightness(1.6)' : 'brightness(1)',
                                    transform: `${part.style.transform || ''} ${isHighlighted ? 'scale(1.05)' : 'scale(1)'}`,
                                };
                                const slotForThisPart = Object.keys(schematic.slotPartMap).find(slot => schematic.slotPartMap[slot] === part.id);
                                return (
                                    <button 
                                        key={part.id} 
                                        style={partStyle}
                                        onClick={() => slotForThisPart && setSelectedSlot(slotForThisPart)}
                                        className="absolute cursor-pointer"
                                        aria-label={`Select ${part.id}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Attachments */}
                <div className="lg:col-span-1 bg-gray-900 border-2 border-gray-800 p-2 rounded-md flex flex-col">
                    <div className="flex-shrink-0 p-2 border-b-2 border-gray-700">
                        <h2 className="text-xl font-bold text-teal-400 tracking-wider uppercase">{selectedSlot || '选择槽位'}</h2>
                    </div>
                    <div className="flex-grow space-y-3 overflow-y-auto p-2">
                        {selectedSlot && weaponDef.attachmentSlots && (
                            <>
                                <button
                                    onClick={() => handleAttachmentSelect(selectedSlot, null)}
                                    onMouseEnter={() => setHoveredAttachment(null)}
                                    onMouseLeave={() => setHoveredAttachment(null)}
                                    className={`w-full p-3 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 ${!currentAttachments[selectedSlot] ? 'border-teal-400 ring-2 ring-teal-400/50' : 'border-gray-700 hover:border-teal-500'}`}
                                >
                                    <h4 className="font-bold text-gray-300">无配件</h4>
                                    <p className="text-xs text-gray-500">默认出厂配置。</p>
                                </button>
                                {weaponDef.attachmentSlots[selectedSlot]?.map((attachment, index) => {
                                    const tier = getTierInfo(index);
                                    const isSelected = currentAttachments[selectedSlot] === attachment.name;
                                    return (
                                        <button
                                            key={attachment.name}
                                            onClick={() => handleAttachmentSelect(selectedSlot, attachment)}
                                            onMouseEnter={() => setHoveredAttachment(attachment)}
                                            onMouseLeave={() => setHoveredAttachment(null)}
                                            className={`w-full p-3 bg-gray-800/80 border-2 rounded-md text-left transition-all duration-200 ${isSelected ? `${tier.color} ring-2 ${tier.color}/50` : `border-gray-700 hover:${tier.color}`}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-bold ${tier.textColor}`}>{attachment.name}</h4>
                                                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${tier.tagColor} ${tier.textColor}`}>{tier.name}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{attachment.description}</p>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Stats */}
            <div className="w-full mt-6 bg-gray-900 border-2 border-gray-800 p-4 rounded-md">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4">
                    <StatBar label="Damage" baseValue={weaponDef.damage} modifiedValue={modifiedStats.damage} previewValue={previewStats?.damage} format={v => v.toFixed(0)} />
                    <StatBar label="Fire Rate" baseValue={weaponDef.fireRate} modifiedValue={modifiedStats.fireRate} previewValue={previewStats?.fireRate} lowerIsBetter format={v => `${(1/v).toFixed(1)}/s`} />
                    <StatBar label="Reload Speed" baseValue={weaponDef.reloadTime} modifiedValue={modifiedStats.reloadTime} previewValue={previewStats?.reloadTime} lowerIsBetter format={v => `${v.toFixed(1)}s`} />
                    <StatBar label="Accuracy" baseValue={weaponDef.spread} modifiedValue={modifiedStats.spread} previewValue={previewStats?.spread} lowerIsBetter format={v => (100 - v * 100).toFixed(0)} />
                    {weaponDef.pellets > 1 && <StatBar label="Pellet Count" baseValue={weaponDef.pellets} modifiedValue={modifiedStats.pellets} previewValue={previewStats?.pellets} format={v => v.toFixed(0)} />}
                    <div>
                        <div className="flex justify-between items-baseline text-gray-400 mb-1">
                            <span className="font-bold tracking-widest uppercase text-sm">Fire Modes</span>
                        </div>
                        <div className="flex flex-wrap gap-2 font-mono text-lg">
                            {['semi', 'burst', 'auto'].map((mode) => {
                                const isAvailable = displayStats.allowedFireModes.includes(mode as FireMode);
                                const wasAvailable = modifiedStats.allowedFireModes.includes(mode as FireMode);
                                let color = 'text-gray-600';
                                if (isAvailable) {
                                    color = wasAvailable ? 'text-white' : 'text-green-400';
                                } else if (wasAvailable) {
                                    color = 'text-red-400';
                                }
                                return <span key={mode} className={`px-3 py-1 bg-gray-800 rounded-md text-sm ${color} transition-colors`}>{mode.toUpperCase()}</span>
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeaponModificationMenu;