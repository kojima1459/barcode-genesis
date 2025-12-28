import { randomInt } from "crypto";
import { Skill } from "./types";

export const SKILLS: Skill[] = [
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
    power: 0.8, // 0.8 * 2 = 1.6
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
    power: 0.5, // Damage reduction multiplier
    accuracy: 1.0,
    triggerRate: 0.15
  },
  {
    id: "evasion",
    name: "Evasion",
    description: "Dodges the enemy attack.",
    type: "defense",
    power: 0, // No damage taken
    accuracy: 0.5,
    triggerRate: 0.1
  },

  // Heal Skills
  {
    id: "repair",
    name: "Repair",
    description: "Restores HP.",
    type: "heal",
    power: 0.3, // Heals 30% of max HP
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

export const getRandomSkills = (count: number, seed: number): Skill[] => {
  const skills: Skill[] = [];
  const availableSkills = [...SKILLS];
  
  // 決定論的なランダム選択
  let currentSeed = seed;
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    if (availableSkills.length === 0) break;
    const index = Math.floor(random() * availableSkills.length);
    skills.push(availableSkills[index]);
    availableSkills.splice(index, 1);
  }

  return skills;
};

// ランダムに1つのスキルを取得する（シードなし、純粋なランダム）
export const getRandomSkill = (): Skill => {
  const index = randomInt(0, SKILLS.length);
  return SKILLS[index];
};

export const getSkillById = (skillId: string): Skill | undefined => {
  return SKILLS.find((skill) => skill.id === skillId);
};

export const normalizeSkillIds = (skills: unknown): string[] => {
  if (!Array.isArray(skills)) return [];
  const ids = new Set<string>();
  for (const skill of skills) {
    if (typeof skill === "string") {
      ids.add(skill);
      continue;
    }
    if (skill && typeof skill === "object" && "id" in skill) {
      const id = (skill as { id?: unknown }).id;
      if (typeof id === "string") ids.add(id);
    }
  }
  return Array.from(ids);
};
