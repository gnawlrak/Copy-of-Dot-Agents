
import React, { useState, useMemo } from 'react';
import { PlayerLoadout } from '../types';
import { WEAPONS, THROWABLES, WEAPON_TYPES } from '../data/weapons';
import { ThrowableType, AGENT_SKINS } from '../data/definitions';
import { Wrench, Plus, Minus, Shield, Crosshair, Award, Zap, ChevronRight, Sparkles, User, Check } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface LoadoutMenuProps {
    currentLoadout: PlayerLoadout;
    onLoadoutChange: (newLoadout: PlayerLoadout) => void;
    currentSkinName: string;
    onSkinChange: (newSkinName: string) => void;
    onModifyWeapon: (weaponType: 'primary' | 'secondary' | 'special') => void;
}

type SelectionPanelType = 'primary' | 'secondary' | 'melee' | 'special' | null;

const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ currentLoadout, onLoadoutChange, currentSkinName, onSkinChange, onModifyWeapon }) => {
    const { language, t } = useLanguage();
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
            primary: { label: language === 'en' ? 'Primary Weapon' : '主战武器', icon: <Crosshair className="h-4 w-4 text-teal-400" /> },
            secondary: { label: language === 'en' ? 'Sidearm' : '副战武器', icon: <Shield className="h-4 w-4 text-sky-400" /> },
            melee: { label: language === 'en' ? 'Melee' : '近战防身武器', icon: <Sparkles className="h-4 w-4 text-purple-400" /> },
            special: { label: language === 'en' ? 'Tactical Weapon' : '特殊战术武器', icon: <Zap className="h-4 w-4 text-amber-500 animate-pulse" /> },
        }[category];

        const weaponTrans = getWeaponTranslation(weapon.name, weapon.description);

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
                            <h4 className="text-xl font-bold text-teal-400 tracking-wider group-hover:text-teal-300 transition-colors">{weaponTrans.name}</h4>
                            <p className="text-gray-400 text-sm mt-1">{weaponTrans.desc}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-teal-400 transition-colors" />
                    </button>
                    {hasAttachments && (
                         <button 
                            onClick={() => onModifyWeapon(category)}
                            className="w-full px-6 py-2.5 bg-gray-800 text-teal-300 font-bold text-sm tracking-widest rounded-md border-2 border-gray-700 hover:bg-gray-750 hover:border-teal-500 hover:text-teal-200 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                         >
                             <Wrench className="h-4 w-4" />
                             {t('customize')}
                         </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSelectionPanel = () => {
        if (!selectionPanel) return null;

        const weaponList = WEAPON_TYPES[selectionPanel];
        const panelTitle = {
            primary: language === 'en' ? 'PRIMARY' : '主武器',
            secondary: language === 'en' ? 'SIDEARM' : '副战手枪',
            melee: language === 'en' ? 'MELEE' : '特殊近战',
            special: language === 'en' ? 'TACTICAL' : '特殊战术',
        }[selectionPanel] || selectionPanel;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-end z-50">
                <div className="w-full max-w-md h-full bg-gray-900 border-l-2 border-teal-500 p-6 flex flex-col animate-slide-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold tracking-widest text-teal-300 uppercase">{panelTitle} {t('weapons')}</h2>
                        <button onClick={() => setSelectionPanel(null)} className="text-3xl text-gray-500 hover:text-white">&times;</button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4 font-mono">
                        {weaponList.map(weaponName => {
                            const weapon = WEAPONS[weaponName];
                            if (!weapon) {
                                return null;
                            }
                            const isSelected = currentLoadout[selectionPanel] === weapon.name;
                            const trans = getWeaponTranslation(weapon.name, weapon.description);
                            return (
                                <button
                                    key={weapon.name}
                                    onClick={() => handleWeaponSelect(selectionPanel, weapon.name)}
                                    className={`w-full p-4 bg-gray-800 border-2 rounded-md text-left transition-colors duration-200 cursor-pointer ${isSelected ? 'border-teal-400 ring-2 ring-teal-400' : 'border-gray-700 hover:border-teal-500'}`}
                                >
                                    <h4 className="text-xl font-bold text-teal-400">{trans.name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">{trans.desc}</p>
                                    <div className="mt-3 text-xs text-gray-300 grid grid-cols-2 gap-x-4 gap-y-1">
                                        {weapon.category !== 'melee' ? (
                                            <>
                                                <span>{language === 'en' ? 'TYPE: ' : '构造/弹药: '}{weapon.type === 'hitscan' ? (language === 'en' ? 'Hitscan' : '即时测距') : (language === 'en' ? 'Projectile' : '实体弹丸')}</span>
                                                <span>{language === 'en' ? 'FIRE RATE: ' : '射击间隔: '}{weapon.fireRate}s</span>
                                                <span>{language === 'en' ? 'MAGAZINE: ' : '弹匣容量: '}{weapon.magSize === -1 ? '∞' : weapon.magSize}</span>
                                                <span>{language === 'en' ? 'AMMO: ' : '携弹总数: '}{weapon.magSize === -1 ? '∞' : `${weapon.magSize}/${weapon.reserveAmmo}`}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{language === 'en' ? 'DAMAGE: ' : '单发伤害: '}{weapon.damage}</span>
                                                <span>{language === 'en' ? 'SPEED: ' : '挥击速度: '}{weapon.fireRate}s</span>
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

    const getWeaponTranslation = (name: string, defaultDesc: string) => {
        if (language === 'en') {
            return { name, desc: defaultDesc };
        }
        return {
            'MK18 CQBR': {
                name: 'MK18 CQBR 紧凑型突击步枪',
                desc: '专为近身距离作战(CQB)设计的紧凑型卡宾枪。拥有极佳的机动性与优秀的开火速率。'
            },
            'HK416C': {
                name: 'HK416C 超紧凑步枪',
                desc: '拥有更短握把与极高可靠性的短管战术步枪，停止作用极佳、动能摧枯拉朽。'
            },
            'SIG MPX': {
                name: 'SIG MPX 战术冲锋枪',
                desc: '利用闭锁式活塞短行程的新一代冲锋枪。在半自动与连发模式下拥有激光级极高精度。'
            },
            'H&K MP7A1': {
                name: 'H&K MP7A1 个人防护武器',
                desc: '便携性绝佳。射速极快，发射特质高初速亚口径钢芯穿甲弹，压制轻便护甲。'
            },
            'MP5SD': {
                name: 'MP5SD 经典微声冲锋枪',
                desc: '内置一体式消音器的战术冲锋枪。开火噪音和后坐力极低，是静音潜入的黄金装备。'
            },
            'P90': {
                name: 'P90 实战战术微冲',
                desc: '采用无托结构的单兵突入武器，弹匣容量大，射速惊人。在狭窄封闭的环境中极具统治力。'
            },
            'Assault Rifle': {
                name: 'M4A1 标准型突击步枪',
                desc: '一款表现全面且均衡的标准突击步枪，能在绝大部分战斗场景下提供稳定受控的火力。'
            },
            'SMG': {
                name: '战术微型冲锋枪',
                desc: '高射速超紧凑的特战冲锋枪，其极高的机动性使其在接近距离交火时极为致命。'
            },
            'Benelli M4': {
                name: 'Benelli M4 战斗霰弹枪',
                desc: '享有绝对盛誉的半自动战斗霰弹枪，能在电光火石之间爆发出成片重创级弹丸。'
            },
            'Rocket Launcher': {
                name: 'RPG-7 重型战术火箭发射筒',
                desc: '发射极高爆破力的破弹火箭。便携度低，但命中点将制造毁灭性的巨大爆炸伤害。'
            },
            'Explosive Kunai': {
                name: '爆心燃烧苦无',
                desc: '特制的投掷式爆炸钢制苦无。可在投出后延时自毁引爆，向范围外倾泻高能炽热碎片。'
            },
            'Karambit': {
                name: '鹰爪防卫爪刀',
                desc: '双向弧形近战反刃爪刀，专为极高移速与灵动敏捷的隐蔽防身战突挥斩而设计。'
            },
            'Combat Knife': {
                name: '特战防身直刀',
                desc: '特种侦察兵标配战术防身直铲钢刀。刀身配重完美，专用于悄无声息的潜伏淘汰。'
            },
            'Riot Shield': {
                name: 'Balistic 防弹战术防盾',
                desc: '牺牲移速换取全方位正面物理弹道抵挡。可使用盾牌重击前方目标使其瞬间昏迷。'
            },
            'Glock 19': {
                name: 'Glock 19 紧凑战术手枪',
                desc: '极度紧凑可靠的 9mm 标志型手枪。弹匣容量高、重量极轻、供弹系统在任何环境下坚如盘石。'
            },
            'Pistol': {
                name: '军规标准手枪',
                desc: '标准特配副手防御手枪。结构极其稳固，能在突发关头提供优秀的备用自保战力。'
            },
            'Heavy Pistol': {
                name: 'Desert Eagle 大口径手枪',
                desc: '大口径马格南高动能手枪。射速不快，但由于子弹动能巨大而能产生绝对制止瘫痪特技。'
            },
            'Shotgun': {
                name: '破门截短型防卫霰弹枪',
                desc: '近身战术下的清房神器。弹丸扩散范围和对门扉等障碍物的物理破坏效能极为惊人。'
            }
        }[name] || { name, desc: defaultDesc };
    };

    const getThrowableTranslation = (type: string) => {
        return {
            'grenade': {
                name: language === 'en' ? 'HE Grenade' : '破片手榴弹 (M67)',
                desc: language === 'en' ? 'High-explosive fragmentation grenade.' : '高爆破弹，瞬间强效杀伤，清理死角。'
            },
            'flashbang': {
                name: language === 'en' ? 'Flashbang' : '战术闪光弹 (M84)',
                desc: language === 'en' ? 'Disorients and blinds targets.' : '强白光与巨响致使对手暂时失明、失聪。'
            },
            'smoke': {
                name: language === 'en' ? 'Smoke Grenade' : '战术烟幕弹 (M18)',
                desc: language === 'en' ? 'Blocks thermal and physical line of sight.' : '迅速铺开大范围灰色烟雾，遮蔽视线。'
            },
            'molotov': {
                name: language === 'en' ? 'Molotov Coctail' : '特制燃烧瓶 (Molotov)',
                desc: language === 'en' ? 'Area denial with spreading flames.' : '在地面短时留下一片烈火阻止通过。'
            }
        }[type] || { name: type, desc: '' };
    };

    return (
        <div className="w-full max-w-screen-xl text-center p-4 flex flex-col mx-auto">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-widest text-teal-300 mb-8">{t('loadoutTitle')}</h1>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Left Column: Throwables & Melee */}
                <div className="space-y-8 text-left">
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-teal-400" />
                                <h3 className="text-sm font-bold text-gray-500 tracking-widest uppercase">{t('throwables')}</h3>
                            </div>
                            <span className="text-xs font-bold bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded border border-teal-500/20">{throwableTotal} / 5</span>
                        </div>
                        <div className="w-full mt-2 p-4 bg-gray-900 border-2 border-gray-800 rounded-md space-y-4 shadow-sm">
                            {Object.values(THROWABLES).map(item => {
                                const localT = getThrowableTranslation(item.type);
                                return (
                                    <div key={item.type} className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-lg font-bold text-teal-400">{localT.name}</h4>
                                            <p className="text-xs text-gray-500">{localT.desc}</p>
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
                                );
                            })}
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
                            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">{language === 'en' ? 'TACTICAL CAMO' : '特工战术迷彩'}</h3>
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
