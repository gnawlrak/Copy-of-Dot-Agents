import React, { useState, useMemo, useEffect } from 'react';
import { WEAPONS, Attachment, FireMode } from '../data/weapons';
import { Sliders, Eye, Activity, ChevronRight, Info, Layers, Settings, Crosshair, Zap, Gauge } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface WeaponModificationMenuProps {
    weaponName: string;
    currentAttachments: { [slot: string]: string };
    onAttachmentsChange: (newAttachments: { [slot: string]: string }) => void;
}

const SLOT_NAME_ZH: { [key: string]: string } = {
    'Muzzle': '枪口',
    'Optic': '瞄准镜',
    'Grip': '下挂握把',
    'Trigger': '扳机组件',
    'Magazine': '供弹具',
    'Ammunition': '战术弹芯',
    'Stock': '枪托选择',
    'Action': '自动机部件',
    'Tube': '供弹管',
    'Barrel': '枪管组件'
};
const translateSlotName = (name: string) => SLOT_NAME_ZH[name] || name;

const ATTACHMENT_TRANSLATIONS: { [key: string]: { name: string; desc: string } } = {
    // Muzzle / Barrel
    '消音器': { name: 'Suppressor', desc: 'Reduces firing noise; great for stealth.' },
    '枪口补偿器': { name: 'Compensator', desc: 'Significantly improves recoil control and shot spread.' },
    '枪口制退器': { name: 'Muzzle Brake', desc: 'Redirects gases to mitigate muzzle rise and improve accuracy.' },
    '轻型消音器': { name: 'Light Suppressor', desc: 'Slightly reduces damage for maximum acoustic stealth.' },
    '钛合金消音器': { name: 'Titanium Suppressor', desc: 'High-performance muzzle attachment for silent operations.' },
    '重型消音器': { name: 'Heavy Suppressor', desc: 'Significantly muffles sound, but weight slightly reduces fire rate.' },
    '重型制退器': { name: 'Heavy Muzzle Brake', desc: 'Suppresses heavy recoil of larger calibers, enhancing precision.' },
    '喉缩': { name: 'Choke', desc: 'Tightens shotgun pellet spread, extending effective range.' },

    // Optics
    '红点瞄准镜': { name: 'Red Dot Sight', desc: 'Improves target acquisition speed.' },
    '全息瞄准镜': { name: 'Holographic Sight', desc: 'Provides a wider, clearer optical field of view.' },

    // Grips / Sights / Stocks
    '无枪托': { name: 'No Stock', desc: 'Removes stock for lightning-fast reload, with a high precision penalty.' },
    '战术枪托': { name: 'Tactical Stock', desc: 'Stabilizes the weapon for increased accuracy.' },

    // Actions / Triggers
    '三连发限位器': { name: 'Burst Fire Limiter', desc: 'Adds 3-round burst mode to improve ammunition control.' },
    '轻量化扳机': { name: 'Lightweight Trigger', desc: 'Increases fire rate but slightly decreases overall stability.' },
    '二连发扳机组': { name: 'Binary Trigger Group', desc: 'Enables high-efficiency 2-round burst capability.' },
    '竞赛级扳机': { name: 'Match-Grade Trigger', desc: 'Ultra-light trigger pull that significantly increases fire rate.' },
    '非法改装扳机': { name: 'Full-Auto Conversion', desc: 'Illegally converts the handgun to full-automatic fires.' },
    '重型双动扳机': { name: 'Heavy Double-Action', desc: 'Delivers a heavier, highly stable trigger pull for accuracy.' },
    '改装扳机组': { name: 'Custom Trigger Group', desc: 'Replaces trigger mechanism and unlocks 2-round burst capability.' },
    '半自动改装': { name: 'Semi-Auto Mod', desc: 'Converts shotgun pump action to semi-automatic for rapid rate of fire.' },

    // Magazines / Tubes
    '快速弹匣': { name: 'Fast Mag', desc: 'Reduces weapon reload time.' },
    '加长弹匣': { name: 'Extended Mag', desc: 'Increases ammunition capacity at the expense of slight reload time.' },
    '扩容弹匣': { name: 'Expanded Magazine', desc: 'Expands capacity significantly with a reload time penalty.' },
    '双联弹匣': { name: 'Dual Magazine', desc: 'Dual-coupled magazines that drastically speed up reloading.' },
    '大容量弹鼓': { name: 'High-Capacity Drum', desc: 'Grants massive ammo reserves, but severely slows reload speed.' },
    '延长弹仓': { name: 'Extended Tube', desc: 'Increases shotgun tube capacity with slower reload.' },
    '快速装弹器': { name: 'Speed Loader', desc: 'Dramatically speeds up shotgun reloading.' },
    '快拔弹匣': { name: 'Quick-Draw Mag', desc: 'Standard tactical modification that speeds up reloading.' },
    '配重弹匣': { name: 'Weighted Magazine', desc: 'Heavy base plate provides stability, enhancing precision.' },

    // Barrels
    '加长枪管': { name: 'Extended Barrel', desc: 'Increases projectile impact size but slightly slows fire rate.' },
    '开孔散热枪管': { name: 'Ported barrel', desc: 'Exposes ports to dissipate heat, increasing fire rate.' },
    '配重枪管': { name: 'Weighted Barrel', desc: 'Adds muzzle weight to decrease vertical jump, improving accuracy.' },

    // Ammunition
    '穿甲弹': { name: 'Armor-Piercing Rounds', desc: 'Increases kinetic damage but slightly reduces fire cycle.' },
    '亚音速弹': { name: 'Subsonic Rounds', desc: 'Muffles bullet flight sounds with a small damage reduction.' },
    '高速弹': { name: 'High-Velocity Rounds', desc: 'Increases velocity and reduces recoil spread.' },
    '空尖弹': { name: 'Hollow-Point Rounds', desc: 'Increases stopping power/impact size, but slightly slows reload.' },
    '高压+P弹': { name: 'Overpressure +P', desc: 'Increases weapon power and cycling rate with high recoil.' },
    '独头弹': { name: 'Slug Shot', desc: 'Swaps birdshot with a single, highly precise, high-damage heavy slug.' },
    '箭形弹': { name: 'Flechette Shells', desc: 'Tightens flight paths with a slight damage reduction.' },
    '马格南鹿弹': { name: 'Magnum Buckshot', desc: 'Unparalleled close-quarters damage at the cost of high recoil.' },
    '龙息弹': { name: 'Dragon’s Breath', desc: 'Fires incendiary pellets that ignite targets and lock down areas.' },
    '马格南弹': { name: 'Magnum Rounds', desc: 'Enlarges impact size but heavy recoil slows overall firing speed.' },
    '半穿甲弹': { name: 'Semi-Armor-Piercing', desc: 'Enlarges bullet impact size and slightly speeds up reloading.' }
};

const translateAttachment = (name: string, description: string, language: 'en' | 'zh') => {
    if (language === 'zh') {
        return { name, desc: description };
    }
    const matched = ATTACHMENT_TRANSLATIONS[name];
    if (matched) {
        return matched;
    }
    return { name, desc: description };
};

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
    const { language, t } = useLanguage();
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
    const schematic = schematics[weaponName] || 
                      (weaponName === 'MK18 CQBR' ? schematics['Assault Rifle'] :
                       (weaponName === 'MP5SD' || weaponName === 'P90' ? schematics['SMG'] :
                        (weaponName === 'Benelli M4' ? schematics['Shotgun'] :
                         (weaponName === 'Glock 19' ? schematics['Pistol'] : schematics['Assault Rifle']))));
    const partIdToHighlight = selectedSlot ? schematic.slotPartMap[selectedSlot] : null;

    return (
        <div className="w-full min-h-full max-w-screen-2xl mx-auto p-6 md:p-8 flex flex-col">
             <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-2 text-center">{weaponName.toUpperCase()}</h1>
             <p className="text-gray-400 text-center mb-8">{language === 'en' ? 'GUNSMITH: Customize modules to optimize weapon tactical parameters.' : '配件定制：调整物理组件以极致压榨战术指标'}</p>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-0">
                {/* Left Column: Slot List */}
                <div className="lg:col-span-1 bg-gray-950/50 border border-gray-800 p-4 rounded-xl flex flex-col gap-3 overflow-y-auto">
                    <div className="p-2 border-b border-gray-800 mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-teal-500" />
                        <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase">{language === 'en' ? 'ATTACHMENT SLOTS' : '配置槽位'}</h2>
                    </div>
                    {attachmentSlots.map(slotName => {
                        const isSelected = selectedSlot === slotName;
                        const rawEquipped = currentAttachments[slotName];
                        const equippedAttachment = rawEquipped 
                            ? translateAttachment(rawEquipped, '', language).name 
                            : (language === 'en' ? 'None' : '无配件');
                        return (
                            <button
                                key={slotName}
                                onClick={() => setSelectedSlot(slotName)}
                                className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${isSelected ? 'bg-teal-500/10 border-l-4 border-teal-400 text-teal-100' : 'bg-gray-900 border-l-4 border-transparent hover:bg-gray-800 text-gray-400'}`}
                            >
                                <h3 className={`font-bold text-sm tracking-wider uppercase ${isSelected ? 'text-teal-300' : 'text-gray-300'}`}>{language === 'en' ? slotName : translateSlotName(slotName)}</h3>
                                <p className={`text-xs mt-1 truncate ${isSelected ? 'text-teal-400' : 'text-gray-500'}`}>{equippedAttachment}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Center Column: Exploded View */}
                <div className="lg:col-span-3 bg-gray-950/50 border border-gray-800 rounded-xl flex flex-col p-6 relative min-h-[300px]">
                    <div className="flex items-center gap-2 mb-6">
                        <Crosshair className="h-4 w-4 text-teal-500" />
                        <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase">{language === 'en' ? 'SCHEMATIC EXPLODED VIEW' : '结构透视视图'}</h2>
                    </div>
                    <div className="flex-grow flex items-center justify-center relative">
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
            </div>

                {/* Right Column: Attachments */}
                <div className="lg:col-span-1 bg-gray-950/50 border border-gray-800 p-4 rounded-xl flex flex-col">
                    <div className="p-2 mb-4 flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-teal-500" />
                        <h2 className="text-sm font-bold text-teal-300 tracking-wider uppercase">{selectedSlot ? (language === 'en' ? selectedSlot : translateSlotName(selectedSlot)) : (language === 'en' ? 'Select Slot' : '选择槽位')}</h2>
                    </div>
                    <div className="flex-grow space-y-4 overflow-y-auto">
                        {selectedSlot && weaponDef.attachmentSlots && (
                            <>
                                <button
                                    onClick={() => handleAttachmentSelect(selectedSlot, null)}
                                    onMouseEnter={() => setHoveredAttachment(null)}
                                    onMouseLeave={() => setHoveredAttachment(null)}
                                    className={`w-full p-4 bg-gray-900 border rounded-lg text-left transition-all duration-200 ${!currentAttachments[selectedSlot] ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-gray-800 hover:border-gray-600'}`}
                                >
                                    <h4 className="font-bold text-gray-300">{language === 'en' ? 'None' : '无配件'}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{language === 'en' ? 'Restore factory default configuration.' : '恢复至默认出厂配置。'}</p>
                                </button>
                                {weaponDef.attachmentSlots[selectedSlot]?.map((attachment, index) => {
                                    const tier = getTierInfo(index);
                                    const isSelected = currentAttachments[selectedSlot] === attachment.name;
                                    const trans = translateAttachment(attachment.name, attachment.description, language);
                                    return (
                                        <button
                                            key={attachment.name}
                                            onClick={() => handleAttachmentSelect(selectedSlot, attachment)}
                                            onMouseEnter={() => setHoveredAttachment(attachment)}
                                            onMouseLeave={() => setHoveredAttachment(null)}
                                            className={`w-full p-4 bg-gray-900 border rounded-lg text-left transition-all duration-200 ${isSelected ? `${tier.color} ring-1 ${tier.color}/30` : `border-gray-800 hover:border-gray-600`}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={`font-bold ${tier.textColor}`}>{trans.name}</h4>
                                                <span className={`px-2 py-0.5 text-[10px] font-black rounded-sm ${tier.tagColor} ${tier.textColor}`}>{tier.name}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed">{trans.desc}</p>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Stats */}
            <div className="w-full mt-8 bg-gray-950/50 border border-gray-800 p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                    <Gauge className="h-5 w-5 text-teal-500" />
                    <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">{language === 'en' ? 'TACTICAL PERFORMANCE ANALYSIS' : '战术性能全维分析'}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                    <StatBar label={language === 'en' ? 'DAMAGE' : '击中致伤力'} baseValue={weaponDef.damage} modifiedValue={modifiedStats.damage} previewValue={previewStats?.damage} format={v => v.toFixed(0)} />
                    <StatBar label={language === 'en' ? 'FIRE RATE' : '循环攒射速'} baseValue={weaponDef.fireRate} modifiedValue={modifiedStats.fireRate} previewValue={previewStats?.fireRate} lowerIsBetter format={v => `${(1/v).toFixed(1)}/s`} />
                    <StatBar label={language === 'en' ? 'RELOAD TIME' : '战术换弹时'} baseValue={weaponDef.reloadTime} modifiedValue={modifiedStats.reloadTime} previewValue={previewStats?.reloadTime} lowerIsBetter format={v => `${v.toFixed(1)}s`} />
                    <StatBar label={language === 'en' ? 'SPREAD' : '弹道精密度'} baseValue={weaponDef.spread} modifiedValue={modifiedStats.spread} previewValue={previewStats?.spread} lowerIsBetter format={v => (100 - v * 100).toFixed(0)} />
                    {weaponDef.pellets > 1 && <StatBar label={language === 'en' ? 'PELLETS' : '单发弹丸数'} baseValue={weaponDef.pellets} modifiedValue={modifiedStats.pellets} previewValue={previewStats?.pellets} format={v => v.toFixed(0)} />}
                    <div>
                        <div className="flex justify-between items-baseline text-gray-400 mb-2">
                            <span className="font-bold tracking-widest uppercase text-xs">{language === 'en' ? 'FIRE MODES' : '击发选择'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 font-mono text-lg">
                            {['semi', 'burst', 'auto'].map((mode) => {
                                const isAvailable = displayStats.allowedFireModes.includes(mode as FireMode);
                                const wasAvailable = modifiedStats.allowedFireModes.includes(mode as FireMode);
                                let color = 'text-gray-700';
                                if (isAvailable) {
                                    color = wasAvailable ? 'text-gray-300' : 'text-teal-400';
                                } else if (wasAvailable) {
                                    color = 'text-red-900';
                                }
                                return <span key={mode} className={`px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-sm ${color} transition-colors`}>{mode.toUpperCase()}</span>
                             })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeaponModificationMenu;