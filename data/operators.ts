
export interface OperatorSkill {
    name: string;
    description: string;
    cooldown: number;
}

export interface OperatorPassive {
    name: string;
    description: string;
}

export type OperatorClassID = 'A-Red' | 'B-Blue' | 'C-Green';

export interface Operator {
    classId: OperatorClassID;
    className: string;
    color: string;
    passive: OperatorPassive;
    skill: OperatorSkill;
    ultimate: OperatorSkill;
}

export const OPERATORS: { [key in OperatorClassID]: Operator } = {
    'A-Red': {
        classId: 'A-Red',
        className: 'Assault',
        color: '#f87171', // red-400
        passive: { name: 'Fast Hands', description: '20% faster reload speed.' },
        skill: { name: 'Stim Pack', description: 'Temporarily gain 25% movement speed for 5 seconds.', cooldown: 20 },
        ultimate: { name: 'Adrenaline Rush', description: 'For 10 seconds, your weapons have no recoil and infinite ammo.', cooldown: 120 },
    },
    'B-Blue': {
        classId: 'B-Blue',
        className: 'Breacher',
        color: '#60a5fa', // blue-400
        passive: { name: 'Blast Shield', description: 'Reduces incoming explosive damage by 30%.' },
        skill: { name: 'Sensor Grenade', description: 'Throw a grenade that reveals enemies in a radius for a short time.', cooldown: 30 },
        ultimate: { name: 'Door Charge', description: 'Instantly breach and destroy any single door, stunning nearby enemies.', cooldown: 90 },
    },
    'C-Green': {
        classId: 'C-Green',
        className: 'Scout',
        color: '#4ade80', // green-500
        passive: { name: 'Light Foot', description: 'Your movement generates 50% less sound.' },
        skill: { name: 'Cloaking Field', description: 'Become nearly invisible for 3 seconds while standing still.', cooldown: 25 },
        ultimate: { name: 'Heartbeat Sensor', description: 'For 15 seconds, see enemy outlines through walls in a limited range.', cooldown: 150 },
    },
};

export const OPERATOR_LIST: Operator[] = Object.values(OPERATORS);
