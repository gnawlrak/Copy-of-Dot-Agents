import { ThrowableType } from "./definitions";

// 接口定义保持不变
export interface AttachmentModifier {
    fireRate?: number; // multiplier
    reloadTime?: number; // multiplier
    bulletRadius?: number; // additive (becomes "Impact" for hitscan)
    pellets?: number; // additive
    
    // 保留原始定义以兼容旧数据或未来扩展，但新设计中不使用
    magSize?: number; // multiplier
    spread?: number; // multiplier
    soundRadius?: number; // multiplier
}

export interface Attachment {
    name: string;
    description: string;
    modifiers: AttachmentModifier;
}

export interface WeaponDefinition {
    name:string;
    description: string;
    category: 'primary' | 'secondary';
    type: 'projectile' | 'hitscan';
    fireRate: number;
    bulletSpeed: number;
    bulletRadius: number;
    pellets: number;
    spread: number;
    pelletSpread?: number;
    automatic: boolean;
    magSize: number;
    ammoInMag: number;
    reserveAmmo: number;
    reloadTime: number;
    soundRadius: number;
    attachmentSlots?: {[slotName: string]: Attachment[];};
}

// ===================================================================
// ==================== 全新的武器配件系统定义 =====================
// ===================================================================

export const WEAPONS: { [key: string]: WeaponDefinition } = {
    'Pistol': {
        name: 'Pistol',
        description: 'Standard issue sidearm. Reliable and versatile.',
        category: 'secondary',
        type: 'projectile',
        fireRate: 0.25,
        bulletSpeed: 1420,
        bulletRadius: 3,
        pellets: 1,
        spread: 0.04,
        automatic: false,
        magSize: 12,
        ammoInMag: 12,
        reserveAmmo: 48,
        reloadTime: 1.5,
        soundRadius: 400,
        attachmentSlots: {
            'Slide': [
                // T1 - Common
                { name: '破损的轻型套筒', description: '射速稍快，但结构问题导致换弹异常缓慢。', modifiers: { fireRate: 0.9, reloadTime: 1.3 } },
                // T2 - Uncommon
                { name: '开孔套筒', description: '提升射速，换弹速度有轻微代价。', modifiers: { fireRate: 0.85, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '竞赛级套筒', description: '极大地提升了射速，几乎没有负面影响。', modifiers: { fireRate: 0.75 } },
                // T4 - Epic
                { name: '通风型重型套筒', description: '在提升射速的同时，增加了套筒重量，让发射的弹丸更大。', modifiers: { fireRate: 0.8, bulletRadius: 0.4 } },
                // T5 - Legendary
                { name: '“蜂鸣”超轻套筒', description: '将射击循环速度推向极限，同时优化了操作手感，加快换弹。', modifiers: { fireRate: 0.6, reloadTime: 0.9 } },
            ],
            'Magazine': [
                // T1 - Common
                { name: '劣质快拔弹匣', description: '能让你更快换弹，但糟糕的供弹坡道降低了射速。', modifiers: { reloadTime: 0.85, fireRate: 1.15 } },
                // T2 - Uncommon
                { name: '快拔弹匣', description: '标准改装，显著提升换弹速度，射速稍慢。', modifiers: { reloadTime: 0.75, fireRate: 1.05 } },
                // T3 - Rare
                { name: '配重弹匣', description: '弹匣底部的配重块让你能更稳定地射击更大的弹丸，但略微影响换弹速度。', modifiers: { bulletRadius: 0.6, reloadTime: 1.1 } },
                // T4 - Epic
                { name: '人体工学弹匣', description: '优化了拔插手感，提升换弹速度和射速。', modifiers: { reloadTime: 0.7, fireRate: 0.95 } },
                // T5 - Legendary
                { name: '“闪电之手”磁力弹匣', description: '弹匣自动吸附到位，换弹速度快得惊人。', modifiers: { reloadTime: 0.5 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '铅头裸弹', description: '更大的弹丸尺寸，但不稳定的火药影响了射速。', modifiers: { bulletRadius: 0.6, fireRate: 1.1 } },
                // T2 - Uncommon
                { name: '空尖弹', description: '扩张弹头增加了弹丸尺寸，但更长的弹药略微减慢了换弹。', modifiers: { bulletRadius: 0.8, reloadTime: 1.05 } },
                // T3 - Rare
                { name: '高压+P弹', description: '更高的膛压提升了武器射速。', modifiers: { fireRate: 0.9 } },
                // T4 - Epic
                { name: '次口径脱壳穿甲弹', description: '轻质弹芯带来更快的射速，优化的弹壳也让换弹更快。', modifiers: { fireRate: 0.9, reloadTime: 0.9 } },
                // T5 - Legendary
                { name: '“碎颅者”重型实心弹', description: '巨大的弹丸尺寸，拥有无与伦比的停止力。', modifiers: { bulletRadius: 2.0 } },
            ],
        }
    },
    'Heavy Pistol': {
        name: 'Heavy Pistol',
        description: 'High-caliber sidearm. Slower fire rate, but packs a punch.',
        category: 'secondary',
        type: 'projectile',
        fireRate: 0.4,
        bulletSpeed: 1600,
        bulletRadius: 3.5,
        pellets: 1,
        spread: 0.05,
        automatic: false,
        magSize: 8,
        ammoInMag: 8,
        reserveAmmo: 32,
        reloadTime: 1.8,
        soundRadius: 500,
        attachmentSlots: {
            'Barrel': [
                 // T1 - Common
                { name: '加长枪管(粗制)', description: '弹丸尺寸增大，但严重影响了武器平衡，射速极慢。', modifiers: { bulletRadius: 1.0, fireRate: 1.3 } },
                // T2 - Uncommon
                { name: '加长枪管', description: '弹丸尺寸增大，代价是射速稍慢。', modifiers: { bulletRadius: 1.2, fireRate: 1.15 } },
                // T3 - Rare
                { name: '开孔散热枪管', description: '有效散热以提升射速。', modifiers: { fireRate: 0.85 } },
                // T4 - Epic
                { name: '一体式消音枪管', description: '复杂的结构增大了弹丸尺寸并加快了射速。', modifiers: { bulletRadius: 0.8, fireRate: 0.9 } },
                // T5 - Legendary
                { name: '“判官”重型枪管', description: '将这把手枪变成一把真正的手炮，弹丸尺寸无与伦比。', modifiers: { bulletRadius: 2.5 } },
            ],
            'Frame': [
                // T1 - Common
                { name: '轻量化框架(不稳固)', description: '换弹速度提升，但不稳定的结构干扰了射击节奏。', modifiers: { reloadTime: 0.8, fireRate: 1.2 } },
                // T2 - Uncommon
                { name: '轻量化框架', description: '提升换弹速度，射速轻微降低。', modifiers: { reloadTime: 0.85, fireRate: 1.05 } },
                // T3 - Rare
                { name: '强化框架', description: '沉重的框架能让你更好地承受后座力，射速加快。', modifiers: { fireRate: 0.9 } },
                // T4 - Epic
                { name: '钛合金框架', description: '坚固且轻便，同时提升换弹速度和射速。', modifiers: { reloadTime: 0.85, fireRate: 0.95 } },
                // T5 - Legendary
                { name: '“不动”一体式框架', description: '极致的稳定平台，让你能更快地换弹并发射更大的弹丸。', modifiers: { reloadTime: 0.8, bulletRadius: 1.0 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '覆铜弹', description: '略微增加了弹丸尺寸，但减慢了换弹速度。', modifiers: { bulletRadius: 0.5, reloadTime: 1.15 } },
                // T2 - Uncommon
                { name: '马格南弹', description: '显著增大弹丸尺寸，但巨大的后坐力减慢了射速。', modifiers: { bulletRadius: 1.0, fireRate: 1.1 } },
                // T3 - Rare
                { name: '特制火药', description: '更快的燃烧速度提升了射速，且对换弹几乎没影响。', modifiers: { fireRate: 0.88 } },
                // T4 - Epic
                { name: '半穿甲弹', description: '在增大弹丸尺寸的同时，也稍微加快了换弹速度。', modifiers: { bulletRadius: 0.8, reloadTime: 0.95 } },
                // T5 - Legendary
                { name: '“毁灭之锤”贫铀弹', description: '只有这把枪的强化框架才能承受的弹药，弹丸尺寸达到极致。', modifiers: { bulletRadius: 2.8 } },
            ],
        },
    },
    'Shotgun': {
        name: 'Shotgun',
        description: 'Devastating at close range. Wide spread.',
        category: 'primary',
        type: 'projectile',
        fireRate: 0.83,
        bulletSpeed: 1600,
        bulletRadius: 2.5,
        pellets: 8,
        spread: 0.18,
        pelletSpread: Math.PI / 18,
        automatic: false,
        magSize: 6,
        ammoInMag: 6,
        reserveAmmo: 24,
        reloadTime: 2.5,
        soundRadius: 600,
        attachmentSlots: {
            'Choke': [
                // T1 - Common
                { name: '锈蚀的全喉缩', description: '强行收紧弹丸，增加了弹丸数量，但也因此更难操作，射速变慢。', modifiers: { pellets: 1, fireRate: 1.2 } },
                // T2 - Uncommon
                { name: '改良喉缩', description: '优化了弹丸分布，发射更多弹丸，射速略微降低。', modifiers: { pellets: 2, fireRate: 1.1 } },
                // T3 - Rare
                { name: '“集群”喉缩', description: '特殊内构设计，在不影响射速的情况下增加了弹丸数量。', modifiers: { pellets: 3 } },
                // T4 - Epic
                { name: '涡流喉缩', description: '气动涡流设计，不仅增加了弹丸数量，也加快了每次射击的循环。', modifiers: { pellets: 2, fireRate: 0.9 } },
                // T5 - Legendary
                { name: '“炼狱”播撒器', description: '将每一发霰弹化为一堵毁灭性的金属墙壁。', modifiers: { pellets: 5 } },
            ],
            'Bolt': [
                // T1 - Common
                { name: '抛光的枪机', description: '提升了射速，但让每次装填都变得不顺手。', modifiers: { fireRate: 0.85, reloadTime: 1.2 } },
                // T2 - Uncommon
                { name: '轻量化枪机', description: '显著提升射速，但装填时需要更小心，换弹稍慢。', modifiers: { fireRate: 0.75, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '镀铬枪机', description: '极为顺滑的枪机循环，极大提升了射速。', modifiers: { fireRate: 0.65 } },
                // T4 - Epic
                { name: '竞赛级枪机套组', description: '不仅提升了射速，也优化了供弹坡道，加快了换弹。', modifiers: { fireRate: 0.7, reloadTime: 0.9 } },
                // T5 - Legendary
                { name: '“鼓点”自动枪机', description: '将泵动式霰弹枪魔改为半自动，射速快得离谱。', modifiers: { fireRate: 0.4 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '劣质大号鹿弹', description: '每颗弹丸都更大，但装药量不稳定，降低了射速。', modifiers: { bulletRadius: 0.5, fireRate: 1.15 } },
                // T2 - Uncommon
                { name: '00号鹿弹', description: '更大的弹丸尺寸带来了更强的停止力，但后坐力也稍稍影响了射速。', modifiers: { bulletRadius: 0.8, fireRate: 1.05 } },
                // T3 - Rare
                { name: '独头弹', description: '将所有弹丸合为一颗巨大的弹头，极大增加冲击力，但会移除霰弹枪的散射特性。', modifiers: { bulletRadius: 4.0, pellets: -7 } }, // Base pellets 8 - 7 = 1
                // T4 - Epic
                { name: '龙息弹', description: '每颗弹丸都带有燃烧效果，弹丸尺寸巨大，同时射出更多弹丸。代价是巨大的后坐力，射速变慢。', modifiers: { bulletRadius: 1.0, pellets: 2, fireRate: 1.25 } },
                // T5 - Legendary
                { name: '“星尘”镖弹', description: '发射出大量高速飞行的微型镖弹，覆盖一片区域，弹丸数量和尺寸都得到提升。', modifiers: { pellets: 6, bulletRadius: -0.5 } },
            ]
        }
    },
    'SMG': {
        name: 'SMG',
        description: 'High fire rate, best for close to medium encounters.',
        category: 'primary',
        type: 'projectile',
        fireRate: 0.1,
        bulletSpeed: 1600,
        bulletRadius: 2.5,
        pellets: 1,
        spread: 0.08,
        automatic: true,
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 120,
        reloadTime: 2.0,
        soundRadius: 350,
        attachmentSlots: {
            'Barrel': [
                // T1 - Common
                { name: '短枪管', description: '提升射速，但糟糕的工艺让换弹更加费力。', modifiers: { fireRate: 0.9, reloadTime: 1.25 } },
                // T2 - Uncommon
                { name: '轻量化枪管', description: '显著提升射速，换弹速度轻微变慢。', modifiers: { fireRate: 0.85, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '膛线强化枪管', description: '发射的弹丸更大，但对射速有微小的影响。', modifiers: { bulletRadius: 0.8, fireRate: 1.05 } },
                // T4 - Epic
                { name: '集成式散热枪管', description: '在提升射速的同时，也让发射的弹丸尺寸更大。', modifiers: { fireRate: 0.9, bulletRadius: 0.5 } },
                // T5 - Legendary
                { name: '“蜂刺”超速枪管', description: '专为极限射速而生，将泼水射击发挥到极致。', modifiers: { fireRate: 0.7 } },
            ],
            'Magazine': [
                // T1 - Common
                { name: '简易快拔弹匣', description: '加快换弹，但供弹不稳定，射速下降。', modifiers: { reloadTime: 0.8, fireRate: 1.1 } },
                // T2 - Uncommon
                { name: '聚合物快拔弹匣', description: '轻便的材质加快了换弹速度，代价是射速略微降低。', modifiers: { reloadTime: 0.75, fireRate: 1.05 } },
                // T3 - Rare
                { name: '橡胶包裹弹匣', description: '极佳的握持手感，换弹速度飞快。', modifiers: { reloadTime: 0.65 } },
                // T4 - Epic
                { name: '超载弹匣', description: '通过提升膛压，加快了射速，增大了弹丸尺寸，但更换弹匣变得更困难。', modifiers: { fireRate: 0.9, bulletRadius: 0.3, reloadTime: 1.2 } },
                // T5 - Legendary
                { name: '“循环”供弹器', description: '革命性的设计，让你几乎感觉不到换弹的停顿。', modifiers: { reloadTime: 0.4 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '软尖弹', description: '更大的弹丸尺寸，但变形的弹头影响了供弹，射速变慢。', modifiers: { bulletRadius: 0.6, fireRate: 1.1 } },
                // T2 - Uncommon
                { name: '高膛压弹药', description: '提升射速，但装填这种弹药会更慢。', modifiers: { fireRate: 0.9, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '中空弹', description: '显著增加弹丸尺寸，几乎没有副作用。', modifiers: { bulletRadius: 1.0 } },
                // T4 - Epic
                { name: '电热化学弹', description: '大幅提升射速和弹丸尺寸。', modifiers: { fireRate: 0.8, bulletRadius: 0.5 } },
                // T5 - Legendary
                { name: '“撕裂者”锯齿弹头', description: '造成毁灭性创伤的大尺寸弹丸，同时特殊的设计还加快了射速。', modifiers: { bulletRadius: 1.2, fireRate: 0.9 } },
            ]
        }
    },
    'Assault Rifle': {
        name: 'Assault Rifle',
        description: 'A balanced weapon for all situations. Accurate and effective.',
        category: 'primary',
        type: 'hitscan',
        fireRate: 0.12,
        bulletSpeed: 0,
        bulletRadius: 1, // 'Impact' for hitscan
        pellets: 1,
        spread: 0.03,
        automatic: true,
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 90,
        reloadTime: 2.2,
        soundRadius: 500,
        attachmentSlots: {
            'Muzzle': [
                // T1 - Common
                { name: '简易补偿器', description: '稍微提高射速，但笨重的设计显著拖慢了换弹。', modifiers: { fireRate: 0.95, reloadTime: 1.25 } },
                // T2 - Uncommon
                { name: '标准补偿器', description: '有效抑制后座，射速提升，换弹速度稍慢。', modifiers: { fireRate: 0.9, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '战术补偿器', description: '精密的导气设计大幅提升射速，几乎不影响换弹。', modifiers: { fireRate: 0.85, reloadTime: 1.02 } },
                // T4 - Epic
                { name: '“急火”原型补偿器', description: '革命性的设计，同时提升了射速和子弹冲击力。', modifiers: { fireRate: 0.88, bulletRadius: 0.3 } },
                // T5 - Legendary
                { name: '“风暴之眼”谐振器', description: '将武器的射击频率推向极致，子弹出膛时甚至带有更大的能量。', modifiers: { fireRate: 0.75, bulletRadius: 0.2 } },
            ],
            'Magazine': [
                // T1 - Common
                { name: '生锈的快拔弹匣', description: '能让你更快地换弹，但糟糕的保养让子弹上膛时更容易卡壳，降低了射速。', modifiers: { reloadTime: 0.8, fireRate: 1.1 } },
                // T2 - Uncommon
                { name: '快拔弹匣', description: '标准的快速更换弹匣，换弹速度显著提升，但射速有轻微下降。', modifiers: { reloadTime: 0.7, fireRate: 1.05 } },
                // T3 - Rare
                { name: '并联弹匣', description: '将两个弹匣并联，换弹速度极快。', modifiers: { reloadTime: 0.6 } },
                // T4 - Epic
                { name: '轻量化快拔弹匣', description: '不仅换弹速度极快，更轻的材质也让武器射速略有提升。', modifiers: { reloadTime: 0.65, fireRate: 0.98 } },
                // T5 - Legendary
                { name: '“无限轮回”供弹系统', description: '划时代的自动供弹装置，换弹速度快如闪电。', modifiers: { reloadTime: 0.45 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '空尖弹 (民用)', description: '弹头扩张效果显著，增大了子弹冲击力，但较软的金属让射速变慢。', modifiers: { bulletRadius: 0.8, fireRate: 1.15 } },
                // T2 - Uncommon
                { name: '高压+P弹', description: '更高的膛压让射速更快，但更换这种弹匣更费力。', modifiers: { fireRate: 0.9, reloadTime: 1.15 } },
                // T3 - Rare
                { name: '钨芯穿甲弹', description: '高密度弹芯带来了巨大的冲击力。', modifiers: { bulletRadius: 1.0 } },
                // T4 - Epic
                { name: '液态金属核心弹', description: '出膛后变形，同时增加了子弹冲击力和射击速度，代价是换弹稍慢。', modifiers: { bulletRadius: 0.7, fireRate: 0.95, reloadTime: 1.1 } },
                // T5 - Legendary
                { name: '“奇点”爆炸弹头', description: '每一发子弹都蕴含着微型爆炸能量，冲击力无与伦比。', modifiers: { bulletRadius: 2.5 } },
            ]
        }
    },
    'Machine Gun': {
        name: 'Machine Gun',
        description: 'Large magazine capacity for sustained suppressive fire.',
        category: 'primary',
        type: 'hitscan',
        fireRate: 0.08,
        bulletSpeed: 0,
        bulletRadius: 1.2, // 'Impact' for hitscan
        pellets: 1,
        spread: 0.06,
        automatic: true,
        magSize: 100,
        ammoInMag: 100,
        reserveAmmo: 200,
        reloadTime: 4.0,
        soundRadius: 550,
        attachmentSlots: {
            'Barrel': [
                // T1 - Common
                { name: '重型枪管', description: '增加了子弹冲击力，但过重的枪管显著拖慢了射速。', modifiers: { bulletRadius: 0.5, fireRate: 1.25 } },
                // T2 - Uncommon
                { name: '散热枪管', description: '提升射速，但繁琐的结构让换弹变慢。', modifiers: { fireRate: 0.9, reloadTime: 1.1 } },
                // T3 - Rare
                { name: '精密长枪管', description: '显著提升子弹冲击力，对射速影响微乎其微。', modifiers: { bulletRadius: 1.0, fireRate: 1.02 } },
                // T4 - Epic
                { name: '电磁加速枪管', description: '同时提升子弹冲击力和射速。', modifiers: { bulletRadius: 0.8, fireRate: 0.9 } },
                // T5 - Legendary
                { name: '“加特林”旋转枪管', description: '需要短暂预热，但随后将带来毁灭性的射速。', modifiers: { fireRate: 0.6 } }, // UI上可以特殊处理预热
            ],
            'Body': [
                // T1 - Common
                { name: '轻量化机匣', description: '加快了换弹，但机匣共振问题降低了射速。', modifiers: { reloadTime: 0.8, fireRate: 1.15 } },
                // T2 - Uncommon
                { name: '快拆机匣盖', description: '加快换弹速度，代价是射速略微降低。', modifiers: { reloadTime: 0.75, fireRate: 1.05 } },
                // T3 - Rare
                { name: '稳定化机匣', description: '更稳定的结构提升了武器射速。', modifiers: { fireRate: 0.92 } },
                // T4 - Epic
                { name: '钛合金机匣', description: '大幅加快换弹速度，并略微提升射速。', modifiers: { reloadTime: 0.7, fireRate: 0.98 } },
                // T5 - Legendary
                { name: '“永续”自动装填机', description: '内置的机械结构让换弹时间缩短到几乎可以忽略不计。', modifiers: { reloadTime: 0.2 } },
            ],
            'Ammunition': [
                // T1 - Common
                { name: '大口径弹药', description: '增加子弹冲击力，但更大的弹链让换弹更慢。', modifiers: { bulletRadius: 0.6, reloadTime: 1.1 } },
                // T2 - Uncommon
                { name: '高速弹', description: '提升武器射速，但对子弹冲击力有负面影响。', modifiers: { fireRate: 0.9, bulletRadius: -0.2 } },
                // T3 - Rare
                { name: '钨芯穿甲弹', description: '大幅增加子弹冲击力，无负面效果。', modifiers: { bulletRadius: 1.2 } },
                // T4 - Epic
                { name: '可散式弹链', description: '提升了射速和换弹速度。', modifiers: { fireRate: 0.9, reloadTime: 0.85 } },
                // T5 - Legendary
                { name: '“大地粉碎者”重型弹', description: '极致的冲击力，每一发子弹都像一次小型炮击。', modifiers: { bulletRadius: 3.0 } },
            ],
        },
    },
};

// 这部分保持不变
export const WEAPON_TYPES = {
    primary: ['Assault Rifle', 'SMG', 'Shotgun', 'Machine Gun'],
    secondary: ['Pistol', 'Heavy Pistol'],
};

export interface ThrowableDefinition {
    type: ThrowableType;
    name: string;
    description: string;
}

export const THROWABLES: { [key in ThrowableType]: ThrowableDefinition } = {
    'grenade': {
        type: 'grenade',
        name: 'Frag Grenade',
        description: 'Lethal explosive with a wide blast radius.',
    },
    'flashbang': {
        type: 'flashbang',
        name: 'Flashbang',
        description: 'Non-lethal device that stuns and disorients targets.',
    },
};
