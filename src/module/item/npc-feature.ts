import { LancerNPCFeatureData, RangeData, NPCDamageData } from "../interfaces";
import { NpcFeatureType } from "machine-mind";

export const NPCFeatureIcons = {
  Other: "npc_feature.svg",
  Reaction: "reaction.svg",
  System: "system.svg",
  Trait: "trait.svg",
  Weapon: "weapon.svg",
  Tech: "tech_quick.svg",
};

export interface LancerNPCReactionData extends LancerNPCFeatureData {
  trigger: string;
  feature_type: NpcFeatureType.Reaction;
}

export interface LancerNPCSystemData extends LancerNPCFeatureData {
  feature_type: NpcFeatureType.System;
}

export interface LancerNPCTechData extends LancerNPCFeatureData {
  tech_type: string;
  accuracy?: number[];
  attack_bonus?: number[];
  feature_type: NpcFeatureType.Tech;
}

// -------- NPC WEAPONS -------------------------------------

export interface LancerNPCWeaponData extends LancerNPCFeatureData {
  weapon_type: string;
  attack_bonus: number[];
  accuracy: number[];
  range: RangeData[];
  damage: NPCDamageData[];
  on_hit: string;
  feature_type: NpcFeatureType.Weapon;
}
