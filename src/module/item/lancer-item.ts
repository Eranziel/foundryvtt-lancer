import { DamageData, NPCDamageData, RangeData, TagData } from "../interfaces";
import { LANCER, LancerItemType, TypeIcon } from "../config";
import {
  DamageType,
  EntryType,
  NpcFeatureType,
  RangeType,
  SystemType,
  WeaponSize,
  WeaponType,
  Range,
  Damage,
  RegEntry,
  LiveEntryTypes,
} from "machine-mind";
import {
  npc_reaction_effect_preview,
  npc_system_effect_preview,
  npc_tech_effect_preview,
  npc_trait_effect_preview,
  npc_weapon_effect_preview,
} from "./effects";
import {
  LancerNPCReactionData,
  LancerNPCSystemData,
  LancerNPCTechData,
  LancerNPCTraitData,
  LancerNPCWeaponData,
} from "./npc-feature";
import { FoundryRegItemData } from "../mm-util/foundry-reg";

const lp = LANCER.log_prefix;

export function lancerItemInit(data: any) {
  console.log(`${lp} Initializing new ${data.type}`);

  // Select default image
  let img = TypeIcon(data.type as LancerItemType);

  // Try to be more specific with npc features
  if (data.type === EntryType.NPC_FEATURE && data.feature_type) {
    let trait_type = data.feature_type as NpcFeatureType;

    switch (trait_type) {
      default:
      case NpcFeatureType.Trait:
        img += "trait.svg";
    }
    trait_type;
    mergeObject(data, {
      // Default new NPC features to traits
      "data.feature_type": NpcFeatureType.Trait,
    });
  }

  mergeObject(data, {
    // Initialize image
    img: img,
  });
}

export class LancerItem<T extends LancerItemType> extends Item {
  data!: FoundryRegItemData<T>;

  // We can narrow the type significantly (make this T???)
  get type(): T {
    return super.type as T;
  }

  /** Force name down to item */
  prepareData() {
    super.prepareData();
    // Push down name
    this.data.data.name = this.data.name;
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;
  }

  // ============================================================
  //          SKILLS
  // ============================================================

  /**
   * Return a skill trigger's bonus to rolls
   */
  // get triggerBonus(): number {
  //   // Only works for skills.
  //   if (this.data.type !== EntryType.SKILL) return 0;
  //   return (this.data as LancerSkillItemData).data.rank * 2;
  // }

  // ============================================================
  //          WEAPONS
  // ============================================================

  /**
   * Return whether a weapon has the smart tag
   */
  get isLoading(): boolean {
    if (
      this.data.type === EntryType.PILOT_WEAPON ||
      this.data.type === EntryType.MECH_WEAPON ||
      this.data.type === EntryType.NPC_FEATURE
    ) {
      return this.searchTags("tg_loading", "LOADING");
    } else {
      return false;
    }
  }

  /**
   * Return whether a weapon has the smart tag
   */
  get isOrdnance(): boolean {
    if (
      this.data.type === EntryType.PILOT_WEAPON ||
      this.data.type === EntryType.MECH_WEAPON ||
      this.data.type === EntryType.NPC_FEATURE
    ) {
      return this.searchTags("tg_ordnance", "ORDNANCE");
    } else {
      return false;
    }
  }

  /**
   * Return a weapon's innate accuracy/difficulty based on its tags.
   */
  get accuracy(): number {
    if (this.data.type === EntryType.PILOT_WEAPON || this.data.type === EntryType.MECH_WEAPON) {
      let acc = 0;
      if (this.searchTags("tg_accurate", "ACCURATE")) acc += 1;
      if (this.searchTags("tg_inaccurate", "INACCURATE")) acc -= 1;
      return acc;
    } else {
      return 0;
    }
  }

  /**
   * Return whether a weapon has the smart tag
   */
  get isSmart(): boolean {
    if (
      this.data.type === EntryType.PILOT_WEAPON ||
      this.data.type === EntryType.MECH_WEAPON ||
      this.data.type === EntryType.NPC_FEATURE
    ) {
      return this.searchTags("tg_smart", "SMART");
    } else {
      return false;
    }
  }

  /**
   * Return whether a weapon has the overkill tag
   */
  get isOverkill(): boolean {
    if (
      this.data.type === EntryType.PILOT_WEAPON ||
      this.data.type === EntryType.MECH_WEAPON ||
      this.data.type === EntryType.NPC_FEATURE
    ) {
      return this.searchTags("tg_overkill", "OVERKILL");
    } else {
      return false;
    }
  }

  /**
   * Return whether a weapon has the smart tag
   */
  get isAp(): boolean {
    if (
      this.data.type === EntryType.PILOT_WEAPON ||
      this.data.type === EntryType.MECH_WEAPON ||
      this.data.type === EntryType.NPC_FEATURE
    ) {
      return this.searchTags("tg_ap", "ARMOR-PIERCING (AP)");
    } else {
      return false;
    }
  }

  /**
   * Return a weapon's innate accuracy/difficulty based on its tags.
   */
  get reliable(): number | string {
    if (this.data.type === EntryType.PILOT_WEAPON || this.data.type === EntryType.MECH_WEAPON) {
      let rel: number | string = 0;
      const data = this.data.data as any;
      if (!data.tags || !Array.isArray(data.tags)) return rel;
      data.tags.forEach((t: TagData) => {
        if (t.id.toLowerCase() === "tg_reliable" || t.name.toUpperCase() === "RELIABLE") {
          rel = t.val ? t.val : rel;
        }
      });
      return rel;
    } else {
      return 0;
    }
  }

  // ============================================================
  //          NPC FEATURES
  // ============================================================

  /*
  get base_feature_items(): Promise<FoundryRegItemData<EntryType.NPC_FEATURE>[]> {
    const itemData = this.data.data;
    if ("base_features" in itemData) {
      return get_pack_content(EntryType.NPC_FEATURE).then(async allFeatures => {
        return allFeatures.filter(feature => itemData.base_features.includes(feature.data.id));
      });
    } else {
      return Promise.resolve([]);
    }
  }

  get optional_feature_items(): Promise<LancerNPCFeatureItemData[]> {
    const itemData = this.data.data;
    if ("optional_features" in itemData) {
      return get_NpcFeatures_pack().then(async allFeatures => {
        return allFeatures.filter(feature => itemData.optional_features.includes(feature.data.id));
      });
    } else {
      return Promise.resolve([]);
    }
  }
  */

  // ============================================================
  //          GENERAL
  // ============================================================

  /**
   * Search the Item's tags to see if any have the given ID or name.
   * @param id Tag ID to search for.
   * @param name Tag name to search for.
   * @returns true if the tag was found, false otherwise.
   */
  searchTags(id: string, name: string): boolean {
    const data = this.data.data as any;
    if (!data.tags || !Array.isArray(data.tags)) return false;
    let result = false;
    data.tags.forEach((t: TagData) => {
      if (t.id.toLowerCase() === id || t.name.toUpperCase() === name) result = true;
    });
    return result;
  }
}

// Provide some convenient shorthands
export type LancerCoreBonusData = FoundryRegItemData<EntryType.CORE_BONUS>;
export type LancerCoreBonus = LancerItem<EntryType.CORE_BONUS>;

export type LancerFrameData = FoundryRegItemData<EntryType.FRAME>;
export type LancerFrame = LancerItem<EntryType.FRAME>;

export type LancerLicenseData = FoundryRegItemData<EntryType.LICENSE>;
export type LancerLicense = LancerItem<EntryType.LICENSE>;

export type LancerPilotArmorData = FoundryRegItemData<EntryType.PILOT_ARMOR>;
export type LancerPilotArmor = LancerItem<EntryType.PILOT_ARMOR>;

export type LancerPilotWeaponData = FoundryRegItemData<EntryType.PILOT_WEAPON>;
export type LancerPilotWeapon = LancerItem<EntryType.PILOT_WEAPON>;

export type LancerPilotGearData = FoundryRegItemData<EntryType.PILOT_GEAR>;
export type LancerPilotGear = LancerItem<EntryType.PILOT_GEAR>;

export type LancerMechSystemData = FoundryRegItemData<EntryType.MECH_SYSTEM>;
export type LancerMechSystem = LancerItem<EntryType.MECH_SYSTEM>;

export type LancerMechWeaponData = FoundryRegItemData<EntryType.MECH_WEAPON>;
export type LancerMechWeapon = LancerItem<EntryType.MECH_WEAPON>;

export type LancerNpcFeatureData = FoundryRegItemData<EntryType.NPC_FEATURE>;
export type LancerNpcFeature = LancerItem<EntryType.NPC_FEATURE>;

export type LancerNpcTemplateData = FoundryRegItemData<EntryType.NPC_TEMPLATE>;
export type LancerNpcTemplate = LancerItem<EntryType.NPC_TEMPLATE>;

export type LancerNpcClassData = FoundryRegItemData<EntryType.NPC_CLASS>;
export type LancerNpcClass = LancerItem<EntryType.NPC_CLASS>;

export type LancerSkillData = FoundryRegItemData<EntryType.SKILL>;
export type LancerSkill = LancerItem<EntryType.SKILL>;

export type LancerTalentData = FoundryRegItemData<EntryType.TALENT>;
export type LancerTalent = LancerItem<EntryType.TALENT>;

export type LancerWeaponModData = FoundryRegItemData<EntryType.WEAPON_MOD>;
export type LancerWeaponMod = LancerItem<EntryType.WEAPON_MOD>;
