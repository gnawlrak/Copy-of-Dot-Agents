
import { ThrowableType } from "./definitions";

// 接口定义保持不变
export interface AttachmentModifier {
    fireRate?: number; // multiplier
    reloadTime?: number; // multiplier
    bulletRadius?: number; // additive (becomes "Impact" for hitscan)
    pellets?: number; // additive
    spread?: number; // multiplier
    magSize?: number; // multiplier
    soundRadius?: number; // multiplier
    muzzleFlash?: number; // multiplier
    addFireModes?: ('burst' | 'auto')[];
    damage?: number; // multiplier
    specialEffect?: string;
}

export interface Attachment {
    name: string;
    description: string;
    modifiers: AttachmentModifier;
}

export type FireMode = 'semi' | 'burst' | 'auto';

export interface WeaponDefinition {
    name:string;
    description: string;
    category: 'primary' | 'secondary' | 'melee' | 'special';
    type: 'projectile' | 'hitscan';
    damage: number;
    fireRate: number;
    bulletSpeed: number;
    bulletRadius: number;
    pellets: number;
    spread: number;
    pelletSpread?: number;
    allowedFireModes: FireMode[];
    defaultFireMode: FireMode;
    magSize: number;
    ammoInMag: number;
    reserveAmmo: number;
    reloadTime: number;
    soundRadius: number;
    durability?: number;
    attachmentSlots?: {[slotName: string]: Attachment[];};
    equipTime?: number;
    unequipTime?: number;
    weaponClass?: 'charge';
}

// ===================================================================
// ==================== 全新的武器配件系统定义 =====================
// ===================================================================

export const WEAPONS: { [key: string]: WeaponDefinition } = {
    // --- 主武器 ---
    'MK18 CQBR': {
        name: 'MK18 CQBR',
        description: 'A compact assault rifle designed for Close Quarters Battle. High mobility and rate of fire.',
        category: 'primary',
        type: 'hitscan',
        damage: 38,
        fireRate: 0.1,
        bulletSpeed: 0,
        bulletRadius: 2.6,
        pellets: 1,
        spread: 0.045,
        allowedFireModes: ['semi', 'auto'],
        defaultFireMode: 'auto',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 120,
        reloadTime: 2.1,
        soundRadius: 500,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '降低射击噪音，非常适合潜行。', modifiers: { soundRadius: 0.4, spread: 0.9 } },
                { name: '枪口补偿器', description: '显著改善后坐力，提升射击精度。', modifiers: { spread: 0.8 } },
            ],
            'Optic': [
                { name: '红点瞄准镜', description: '提升目标捕获速度。', modifiers: { } },
                { name: '全息瞄准镜', description: '提供更加开阔清晰的瞄准视野。', modifiers: { } },
            ]
        }
    },
    'HK416C': {
        name: 'HK416C',
        description: 'An ultra-compact tactical carbine. Exceptional reliability, high muzzle velocity, and heavy kinetic fire.',
        category: 'primary',
        type: 'hitscan',
        damage: 42,
        fireRate: 0.085,
        bulletSpeed: 0,
        bulletRadius: 2.8,
        pellets: 1,
        spread: 0.04,
        allowedFireModes: ['semi', 'auto'],
        defaultFireMode: 'auto',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 120,
        reloadTime: 1.95,
        soundRadius: 540,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '降低射击噪音，适合静音破房突入。', modifiers: { soundRadius: 0.35, spread: 0.95 } },
                { name: '枪口制退器', description: '降低枪口上跳，提供极佳的连射控制。', modifiers: { spread: 0.75 } },
            ],
            'Optic': [
                { name: '全息瞄准镜', description: '大视野极佳近战光学镜。', modifiers: { } },
                { name: '红点瞄准镜', description: '经典红点直觉瞄具。', modifiers: { } },
            ]
        }
    },
    'SIG MPX': {
        name: 'SIG MPX',
        description: 'Next-generation submachine gun utilizing a closed-bolt gas piston system. Semiauto cycle is laser accurate.',
        category: 'primary',
        type: 'hitscan',
        damage: 28,
        fireRate: 0.071,
        bulletSpeed: 0,
        bulletRadius: 2.2,
        pellets: 1,
        spread: 0.028,
        allowedFireModes: ['semi', 'auto'],
        defaultFireMode: 'auto',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 150,
        reloadTime: 1.7,
        soundRadius: 420,
        attachmentSlots: {
            'Muzzle': [
                { name: '轻型消音器', description: '牺牲极微量伤害换取绝对声波屏蔽。', modifiers: { soundRadius: 0.4, damage: 0.95 } },
            ],
            'Optic': [
                { name: '红点瞄准镜', description: '基础红点瞄准，微缩死焦。', modifiers: { } },
            ]
        }
    },
    'H&K MP7A1': {
        name: 'H&K MP7A1',
        description: 'Personal Defense Weapon designed to penetrate heavy armor using high-velocity sub-caliber armor-piercing rounds.',
        category: 'primary',
        type: 'hitscan',
        damage: 26,
        fireRate: 0.06,
        bulletSpeed: 0,
        bulletRadius: 2.1,
        pellets: 1,
        spread: 0.045,
        allowedFireModes: ['semi', 'auto'],
        defaultFireMode: 'auto',
        magSize: 40,
        ammoInMag: 40,
        reserveAmmo: 160,
        reloadTime: 2.15,
        soundRadius: 440,
        attachmentSlots: {
            'Muzzle': [
                { name: '钛合金消音器', description: '定制潜行枪口配件，射击更悄无声息。', modifiers: { soundRadius: 0.38, spread: 0.9 } },
            ],
            'Optic': [
                { name: '红点瞄准镜', description: '微光自适应红点瞄镜。', modifiers: { } },
            ]
        }
    },
    'MP5SD': {
        name: 'MP5SD',
        description: 'Integrally suppressed submachine gun. Extremely quiet with low recoil.',
        category: 'primary',
        type: 'hitscan',
        damage: 28,
        fireRate: 0.09,
        bulletSpeed: 0,
        bulletRadius: 2.3,
        pellets: 1,
        spread: 0.035,
        allowedFireModes: ['semi', 'burst', 'auto'],
        defaultFireMode: 'auto',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 120,
        reloadTime: 2.3,
        soundRadius: 200,
        attachmentSlots: {
            'Optic': [
                { name: '红点瞄准镜', description: '基础红点瞄准镜，便于瞄准。', modifiers: { } }
            ]
        }
    },
    'P90': {
        name: 'P90',
        description: 'Bullpup PDW with high capacity and fire rate. Excels in cramped spaces.',
        category: 'primary',
        type: 'hitscan',
        damage: 24,
        fireRate: 0.066,
        bulletSpeed: 0,
        bulletRadius: 2.2,
        pellets: 1,
        spread: 0.06,
        allowedFireModes: ['semi', 'auto'],
        defaultFireMode: 'auto',
        magSize: 50,
        ammoInMag: 50,
        reserveAmmo: 150,
        reloadTime: 2.8,
        soundRadius: 400,
    },
    'Assault Rifle': {
        name: 'Assault Rifle',
        description: 'A well-rounded rifle suitable for most combat scenarios. Controllable in full-auto.',
        category: 'primary',
        type: 'hitscan',
        damage: 40,
        fireRate: 0.12,
        bulletSpeed: 0, // Not used for hitscan
        bulletRadius: 2.8,
        pellets: 1,
        spread: 0.03,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 90,
        reloadTime: 2.2,
        soundRadius: 550,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '降低开火噪音，但会牺牲部分射速。', modifiers: { soundRadius: 0.3, fireRate: 1.1 } },
                { name: '枪口制退器', description: '显著提升精度。', modifiers: { spread: 0.75 } },
                { name: '补偿器', description: '改善后坐力控制，小幅提升射速。', modifiers: { fireRate: 0.95 } },
            ],
            'Grip': [
                { name: '垂直前握把', description: '大幅提升腰射和移动射击时的精度。', modifiers: { spread: 0.7 } },
                { name: '突击握把', description: '人体工程学设计，加快了换弹速度。', modifiers: { reloadTime: 0.85 } },
            ],
            'Trigger': [
                { name: '三连发扳机组', description: '将步枪改为三连发模式，提供可控的点射火力。', modifiers: { addFireModes: ['burst'] } },
                { name: '全自动扳机组', description: '解锁全自动射击能力，用于火力压制。', modifiers: { addFireModes: ['auto'] } },
                { name: '军规扳机组', description: '一套精密的军用级扳机组件，同时解锁了可控的三连发点射与持续的全自动火力模式。', modifiers: { addFireModes: ['burst', 'auto'] } },
            ],
            'Magazine': [
                { name: '快速弹匣', description: '加快换弹速度。', modifiers: { reloadTime: 0.8 } },
                { name: '扩容弹匣', description: '增加弹匣容量，但换弹更慢。', modifiers: { magSize: 1.33, reloadTime: 1.1 } },
            ],
            'Ammunition': [
                { name: '穿甲弹', description: '牺牲射速换来更高的单发伤害。', modifiers: { damage: 1.15, fireRate: 1.1 } },
                { name: '亚音速弹', description: '大幅降低开火噪音，但威力稍有减弱。', modifiers: { damage: 0.9, soundRadius: 0.5 } },
                { name: '高速弹', description: '提升弹道平直度，显著增加射击精度。', modifiers: { spread: 0.8 } },
            ],
        }
    },
    'SMG': {
        name: 'SMG',
        description: 'A compact weapon with a high rate of fire, deadly in close quarters.',
        category: 'primary',
        type: 'hitscan',
        damage: 30,
        fireRate: 0.08,
        bulletSpeed: 0,
        bulletRadius: 2.5,
        pellets: 1,
        spread: 0.08,
        allowedFireModes: ['auto'],
        defaultFireMode: 'auto',
        magSize: 30,
        ammoInMag: 30,
        reserveAmmo: 120,
        reloadTime: 1.9,
        soundRadius: 450,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '压制枪声，保持隐蔽。', modifiers: { soundRadius: 0.4 } },
                { name: '枪口补偿器', description: '提升射速，代价是精度略微下降。', modifiers: { fireRate: 0.9, spread: 1.1 } },
            ],
            'Trigger': [
                { name: '三连发限位器', description: '为武器增加三连发模式，提高弹药效率。', modifiers: { addFireModes: ['burst'] } },
            ],
            'Stock': [
                { name: '无枪托', description: '移除枪托以获得极快的换弹速度，但精度大幅下降。', modifiers: { reloadTime: 0.7, spread: 1.4 } },
                { name: '战术枪托', description: '提升武器稳定性，带来更高的精度。', modifiers: { spread: 0.8 } },
            ],
            'Magazine': [
                { name: '双联弹匣', description: '大幅加快换弹速度。', modifiers: { reloadTime: 0.75 } },
                { name: '大容量弹鼓', description: '显著增加弹药量，但严重影响换弹速度。', modifiers: { magSize: 1.66, reloadTime: 1.25 } },
            ],
            'Ammunition': [
                { name: '空尖弹', description: '增加伤害，但会牺牲一些精度。', modifiers: { damage: 1.2, spread: 1.15 } },
                { name: '高压+P弹', description: '全面提升射速和威力，但后坐力巨大。', modifiers: { damage: 1.1, fireRate: 0.9, spread: 1.25 } },
                { name: '亚音速弹', description: '专为消音器设计，大幅降低枪声，威力减弱。', modifiers: { damage: 0.85, soundRadius: 0.6 } },
            ]
        }
    },
    'Benelli M4': {
        name: 'Benelli M4',
        description: 'Semi-automatic combat shotgun. Delivers rapid, devastating buckshot in close quarters.',
        category: 'primary',
        type: 'projectile',
        damage: 22,
        fireRate: 0.4,
        bulletSpeed: 1700,
        bulletRadius: 2.5,
        pellets: 8,
        spread: 0.15,
        pelletSpread: Math.PI / 20,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 7,
        ammoInMag: 7,
        reserveAmmo: 35,
        reloadTime: 2.2,
        soundRadius: 650,
    },
    'Shotgun': {
        name: 'Shotgun',
        description: 'Devastating at close range. Wide spread.',
        category: 'secondary',
        type: 'projectile',
        damage: 20, // Per pellet
        fireRate: 0.83,
        bulletSpeed: 1600,
        bulletRadius: 2.5,
        pellets: 8,
        spread: 0.18,
        pelletSpread: Math.PI / 18,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 6,
        ammoInMag: 6,
        reserveAmmo: 24,
        reloadTime: 2.5, // Per shell, needs logic change
        soundRadius: 600,
        attachmentSlots: {
            'Muzzle': [
                { name: '喉缩', description: '收紧弹丸的扩散，让射程更远。', modifiers: { spread: 0.7 } },
                { name: '消音器', description: '降低巨额的枪声，但扩散会变大。', modifiers: { soundRadius: 0.4, spread: 1.2 } },
            ],
            'Action': [
                { name: '半自动改装', description: '将泵动式改为半自动，大幅提升射速。', modifiers: { fireRate: 0.6 } },
            ],
            'Tube': [
                { name: '延长弹仓', description: '增加弹仓容量，但换弹更慢。', modifiers: { magSize: 1.33, reloadTime: 1.2 } },
                { name: '快速装弹器', description: '加快换弹速度。', modifiers: { reloadTime: 0.8 } },
            ],
            'Ammunition': [
                { name: '独头弹', description: '将霰弹替换为一发高精度、高伤害的独头弹。', modifiers: { pellets: -7, damage: 6.0, spread: 0.1 } },
                { name: '箭形弹', description: '收束弹道，但单发毁伤能力略微下降。', modifiers: { damage: 0.9, spread: 0.65 } },
                { name: '马格南鹿弹', description: '威力巨大的鹿弹，近距离杀伤力无与伦比，但后坐力也相应增加。', modifiers: { damage: 1.25, fireRate: 1.2 } },
                { name: '龙息弹', description: '发射燃烧的弹丸，造成持续伤害并点燃小范围区域。', modifiers: { damage: 0.5, pellets: -2, specialEffect: 'burn' } },
            ],
        },
    },
    // --- 副武器 ---
    'Glock 19': {
        name: 'Glock 19',
        description: 'Compact 9mm pistol. High capacity, light and extremely reliable.',
        category: 'secondary',
        type: 'projectile',
        damage: 45,
        fireRate: 0.16,
        bulletSpeed: 1300,
        bulletRadius: 2.5,
        pellets: 1,
        spread: 0.035,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 15,
        ammoInMag: 15,
        reserveAmmo: 60,
        reloadTime: 1.3,
        soundRadius: 350,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '降低机动战术下的开火噪音。', modifiers: { soundRadius: 0.3 } },
            ],
            'Magazine': [
                { name: '加长弹匣', description: '大幅扩充弹匣容弹量，但略微增加换弹时间。', modifiers: { magSize: 1.33, reloadTime: 1.1 } },
            ]
        }
    },
    'Pistol': {
        name: 'Pistol',
        description: 'Standard issue sidearm. Reliable and versatile.',
        category: 'secondary',
        type: 'projectile',
        damage: 51,
        fireRate: 0.2, // Buffed slightly
        bulletSpeed: 1420,
        bulletRadius: 3,
        pellets: 1,
        spread: 0.04,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 12,
        ammoInMag: 12,
        reserveAmmo: 48,
        reloadTime: 1.5,
        soundRadius: 400,
        attachmentSlots: {
            'Muzzle': [
                { name: '消音器', description: '降低枪声和枪口火焰，但会减弱子弹冲击力。', modifiers: { soundRadius: 0.25, muzzleFlash: 0.1, bulletRadius: -0.3 } },
                { name: '枪口制退器', description: '通过引导气体来抑制后坐力，提升精度。', modifiers: { spread: 0.8 } },
            ],
            'Trigger': [
                { name: '轻量化扳机', description: '提升射速，但影响稳定性，精度略微下降。', modifiers: { fireRate: 0.85, spread: 1.2 } },
                { name: '二连发扳机组', description: '允许进行两连发射击。', modifiers: { addFireModes: ['burst'] } },
                { name: '竞赛级扳机', description: '极轻的扳机扣力，显著提升射速。', modifiers: { fireRate: 0.75 } },
                { name: '非法改装扳机', description: '将手枪改造为全自动武器，代价是精度和换弹速度。', modifiers: { addFireModes: ['auto'], spread: 1.5, reloadTime: 1.1 } },
            ],
            'Magazine': [
                { name: '快拔弹匣', description: '标准改装，显著提升换弹速度。', modifiers: { reloadTime: 0.75 } },
                { name: '加长弹匣', description: '牺牲换弹速度以换取更多载弹量。', modifiers: { reloadTime: 1.15, magSize: 1.5 } }, // Note: magSize mods need code support
                { name: '配重弹匣', description: '弹匣底部的配重块让你能更稳定地射击，精度提升。', modifiers: { spread: 0.8 } },
            ],
            'Ammunition': [
                { name: '空尖弹', description: '扩张弹头增加了弹丸尺寸，但更长的弹药略微减慢了换弹。', modifiers: { bulletRadius: 0.8, reloadTime: 1.05 } },
                { name: '高压+P弹', description: '更高的膛压提升了武器射速。', modifiers: { fireRate: 0.9 } },
                { name: '亚音速弹', description: '降低枪声范围，但弹丸尺寸和射速都略有下降。', modifiers: { bulletRadius: -0.2, fireRate: 1.05, soundRadius: 0.7 } },
            ],
        }
    },
    'Heavy Pistol': {
        name: 'Heavy Pistol',
        description: 'High-caliber sidearm. Slower fire rate, but packs a punch.',
        category: 'secondary',
        type: 'projectile',
        damage: 76,
        fireRate: 0.35,
        bulletSpeed: 1600,
        bulletRadius: 3.5,
        pellets: 1,
        spread: 0.05,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 8,
        ammoInMag: 8,
        reserveAmmo: 32,
        reloadTime: 1.8,
        soundRadius: 500,
        attachmentSlots: {
            'Muzzle': [
                 { name: '重型消音器', description: '大幅降低枪声，但额外重量影响了射速。', modifiers: { soundRadius: 0.25, muzzleFlash: 0.1, fireRate: 1.1 } },
                 { name: '重型制退器', description: '有效抑制大口径后坐力，提升精度。', modifiers: { spread: 0.7 } },
            ],
            'Barrel': [
                { name: '加长枪管', description: '弹丸尺寸增大，代价是射速稍慢。', modifiers: { bulletRadius: 1.2, fireRate: 1.15 } },
                { name: '开孔散热枪管', description: '有效散热以提升射速。', modifiers: { fireRate: 0.85 } },
                { name: '配重枪管', description: '增加枪口重量，抑制上跳，提升精度。', modifiers: { spread: 0.75 } },
            ],
            'Trigger': [
                 { name: '重型双动扳机', description: '更稳定的击发，提升了精度，但射速变慢。', modifiers: { spread: 0.8, fireRate: 1.1 } },
                 { name: '改装扳机组', description: '解锁二连发射击模式。', modifiers: { addFireModes: ['burst'] } },
            ],
            'Ammunition': [
                { name: '马格南弹', description: '显著增大弹丸尺寸，但巨大的后坐力减慢了射速。', modifiers: { bulletRadius: 1.0, fireRate: 1.1 } },
                { name: '半穿甲弹', description: '在增大弹丸尺寸的同时，也稍微加快了换弹速度。', modifiers: { bulletRadius: 0.8, reloadTime: 0.95 } },
            ],
        },
    },
    // --- Melee Weapons ---
    'Karambit': {
        name: 'Karambit',
        description: 'Curved CQB blade designed for extreme speed and consecutive slashes.',
        category: 'melee',
        type: 'hitscan',
        damage: 120,
        fireRate: 0.4,
        bulletSpeed: 0,
        bulletRadius: 0,
        pellets: 1,
        spread: 0,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: -1,
        ammoInMag: -1,
        reserveAmmo: -1,
        reloadTime: 0,
        soundRadius: 30,
    },
    'Combat Knife': {
        name: 'Combat Knife',
        description: 'Standard issue combat knife. Fast and deadly for silent takedowns.',
        category: 'melee',
        type: 'hitscan', // For simplicity, though it's not really hitscan
        damage: 150, // High damage for melee
        fireRate: 0.67, // Corresponds to slash cooldown in GameCanvas
        bulletSpeed: 0,
        bulletRadius: 0,
        pellets: 1,
        spread: 0,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: -1, // Infinite
        ammoInMag: -1,
        reserveAmmo: -1,
        reloadTime: 0,
        soundRadius: 50,
    },
    'Riot Shield': {
        name: 'Riot Shield',
        description: 'A ballistic shield that provides full frontal protection at the cost of mobility. Can be used to bash enemies.',
        category: 'melee',
        type: 'hitscan',
        damage: 50,
        fireRate: 2.0,
        bulletSpeed: 0,
        bulletRadius: 0,
        pellets: 1,
        spread: 0,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: -1,
        ammoInMag: -1,
        reserveAmmo: -1,
        reloadTime: 0,
        soundRadius: 60,
        durability: 900,
    },
    // --- Special Weapons ---
    'Rocket Launcher': {
        name: 'Rocket Launcher',
        description: 'Fires a high-explosive rocket. Long equip time and a narrow, zoomed field of view when active.',
        category: 'special',
        type: 'projectile',
        damage: 300, // Explosion damage
        fireRate: 0.5,
        bulletSpeed: 1800,
        bulletRadius: 8,
        pellets: 1,
        spread: 0,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 1,
        ammoInMag: 1,
        reserveAmmo: 3,
        reloadTime: 3.5,
        soundRadius: 900,
        equipTime: 1.2,
        unequipTime: 0.8,
    },
    'Explosive Kunai': {
        name: 'Explosive Kunai',
        description: 'A throwable blade that can be charged for higher velocity. Detonates after a delay, releasing a cloud of damaging shrapnel.',
        category: 'special',
        type: 'projectile',
        weaponClass: 'charge',
        damage: 120, // Direct hit damage
        fireRate: 1.0,
        bulletSpeed: 2000, // Max speed
        bulletRadius: 4,
        pellets: 1,
        spread: 0,
        allowedFireModes: ['semi'],
        defaultFireMode: 'semi',
        magSize: 3,
        ammoInMag: 3,
        reserveAmmo: 0,
        reloadTime: 4.0, // Reloads all 3
        soundRadius: 80,
    },
};

export const THROWABLES: { [key in ThrowableType]: { type: ThrowableType; name: string; description: string; fuse: number; } } = {
    grenade: {
        type: 'grenade',
        name: 'Frag Grenade',
        description: 'Standard fragmentation grenade. Clears rooms effectively.',
        fuse: 4.0,
    },
    flashbang: {
        type: 'flashbang',
        name: 'Flashbang',
        description: 'Disorients targets with a bright flash and loud noise.',
        fuse: 2.0,
    },
    smoke: {
        type: 'smoke',
        name: 'Smoke Grenade',
        description: 'Creates a dense cloud of smoke to block vision.',
        fuse: 3.0,
    },
    molotov: {
        type: 'molotov',
        name: 'Molotov',
        description: 'Creates a pool of fire that denies an area and burns targets.',
        fuse: 2.5,
    },
};

export const WEAPON_TYPES: { primary: string[], secondary: string[], melee: string[], special: string[] } = {
    primary: [],
    secondary: [],
    melee: [],
    special: [],
};

Object.keys(WEAPONS).forEach(weaponName => {
    const weapon = WEAPONS[weaponName];
    if (weapon.category === 'primary') {
        WEAPON_TYPES.primary.push(weaponName);
    } else if (weapon.category === 'secondary') {
        WEAPON_TYPES.secondary.push(weaponName);
    } else if (weapon.category === 'melee') {
        WEAPON_TYPES.melee.push(weaponName);
    } else if (weapon.category === 'special') {
        WEAPON_TYPES.special.push(weaponName);
    }
});
