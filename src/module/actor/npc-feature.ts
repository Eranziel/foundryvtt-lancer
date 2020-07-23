import { LancerNPCFeatureData, RangeData, NPCDamageData } from "../interfaces";
import { NPCFeatureType } from "../enums";

declare interface LancerNPCReactionData extends LancerNPCFeatureData {
  trigger: string;
  feature_type: NPCFeatureType.Reaction;
}

declare interface LancerNPCSystemData extends LancerNPCFeatureData {
  feature_type: NPCFeatureType.System;
}

declare interface LancerNPCTechData extends LancerNPCFeatureData {
  tech_type: string;
  accuracy?: number[];
  attack_bonus?: number[];
  feature_type: NPCFeatureType.Tech;
}

// -------- NPC WEAPONS -------------------------------------

declare interface LancerNPCWeaponData extends LancerNPCFeatureData {
  weapon_type: string;
  attack_bonus: number[];
  accuracy: number[];
  range: RangeData[];
  damage: NPCDamageData[];
  on_hit: string;
  feature_type: NPCFeatureType.Weapon;
}


