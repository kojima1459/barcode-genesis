"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSkillIds = exports.getSkillById = exports.getRandomSkill = exports.getRandomSkills = exports.SKILLS = void 0;
const crypto_1 = require("crypto");
exports.SKILLS = [
    // Attack Skills
    {
        id: "power_smash",
        name: "Power Smash",
        description: "A powerful physical attack.",
        type: "attack",
        power: 1.5,
        accuracy: 0.9,
        triggerRate: 0.2
    },
    {
        id: "double_strike",
        name: "Double Strike",
        description: "Attacks twice in a row.",
        type: "attack",
        power: 0.8,
        accuracy: 0.85,
        triggerRate: 0.15
    },
    {
        id: "laser_beam",
        name: "Laser Beam",
        description: "A precise energy attack.",
        type: "attack",
        power: 1.3,
        accuracy: 1.0,
        triggerRate: 0.2
    },
    // Defense Skills
    {
        id: "iron_wall",
        name: "Iron Wall",
        description: "Reduces damage taken significantly.",
        type: "defense",
        power: 0.5,
        accuracy: 1.0,
        triggerRate: 0.15
    },
    {
        id: "evasion",
        name: "Evasion",
        description: "Dodges the enemy attack.",
        type: "defense",
        power: 0,
        accuracy: 0.5,
        triggerRate: 0.1
    },
    // Heal Skills
    {
        id: "repair",
        name: "Repair",
        description: "Restores HP.",
        type: "heal",
        power: 0.3,
        accuracy: 1.0,
        triggerRate: 0.1
    },
    // Buff/Debuff
    {
        id: "charge",
        name: "Charge",
        description: "Increases next attack power.",
        type: "buff",
        power: 1.5,
        accuracy: 1.0,
        triggerRate: 0.15
    },
    {
        id: "jamming",
        name: "Jamming",
        description: "Lowers enemy accuracy.",
        type: "debuff",
        power: 0.7,
        accuracy: 0.9,
        triggerRate: 0.15
    }
];
const getRandomSkills = (count, seed) => {
    const skills = [];
    const availableSkills = [...exports.SKILLS];
    // 決定論的なランダム選択
    let currentSeed = seed;
    const random = () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
        if (availableSkills.length === 0)
            break;
        const index = Math.floor(random() * availableSkills.length);
        skills.push(availableSkills[index]);
        availableSkills.splice(index, 1);
    }
    return skills;
};
exports.getRandomSkills = getRandomSkills;
// ランダムに1つのスキルを取得する（シードなし、純粋なランダム）
const getRandomSkill = () => {
    const index = (0, crypto_1.randomInt)(0, exports.SKILLS.length);
    return exports.SKILLS[index];
};
exports.getRandomSkill = getRandomSkill;
const getSkillById = (skillId) => {
    return exports.SKILLS.find((skill) => skill.id === skillId);
};
exports.getSkillById = getSkillById;
const normalizeSkillIds = (skills) => {
    if (!Array.isArray(skills))
        return [];
    const ids = new Set();
    for (const skill of skills) {
        if (typeof skill === "string") {
            ids.add(skill);
            continue;
        }
        if (skill && typeof skill === "object" && "id" in skill) {
            const id = skill.id;
            if (typeof id === "string")
                ids.add(id);
        }
    }
    return Array.from(ids);
};
exports.normalizeSkillIds = normalizeSkillIds;
//# sourceMappingURL=skills.js.map