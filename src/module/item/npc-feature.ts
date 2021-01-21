import { RangeData, NPCDamageData, TagData } from "../interfaces";
import { NpcFeatureType, AnyRegNpcFeatureData, RegTagInstanceData } from "machine-mind";

export const NPCFeatureIcons = {
  Other: "npc_feature.svg",
  Reaction: "reaction.svg",
  System: "system.svg",
  Trait: "trait.svg",
  Weapon: "weapon.svg",
  Tech: "tech_quick.svg",
};

// TODO: This type doesn't really exist, I just put it here to make tsc shut up for a bit. Something akin to it must eventually be implemented
export interface TempNpcFeatureData {
  id: string;
  name: string;
  origin: {
    type: "Class" | "Template";
    name: string;
    base: boolean;
  };
  effect?: string;
  bonus?: object;
  override?: object;
  type: NpcFeatureType;
  tags: TagData[];
}

export interface LancerNPCReactionData extends TempNpcFeatureData {
  trigger: string;
  feature_type: NpcFeatureType.Reaction;
}

export interface LancerNPCSystemData extends TempNpcFeatureData {
  feature_type: NpcFeatureType.System;
}

export interface LancerNPCTraitData extends TempNpcFeatureData {
  feature_type: NpcFeatureType.Trait;
}

export interface LancerNPCTechData extends TempNpcFeatureData {
  tech_type: string;
  accuracy?: number[];
  attack_bonus?: number[];
  feature_type: NpcFeatureType.Tech;
}

// -------- NPC WEAPONS -------------------------------------

export interface LancerNPCWeaponData extends TempNpcFeatureData {
  weapon_type: string;
  attack_bonus: number[];
  accuracy: number[];
  range: RangeData[];
  damage: NPCDamageData[];
  on_hit: string;
  feature_type: NpcFeatureType.Weapon;
}
