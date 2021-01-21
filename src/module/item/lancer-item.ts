import { DamageData, NPCDamageData, RangeData, TagData } from "../interfaces";
import { LANCER, TypeIcon } from "../config";
import { EntryType, NpcFeatureType } from "machine-mind";
import { FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerActorType } from "../actor/lancer-actor";

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

export type AnyLancerItem = LancerItem<LancerItemType>;

export type LancerItemType =  EntryType.CORE_BONUS
  | EntryType.FACTION
  | EntryType.FRAME
  | EntryType.LICENSE
  | EntryType.MECH_WEAPON
  | EntryType.MECH_SYSTEM
  | EntryType.NPC_CLASS
  | EntryType.NPC_TEMPLATE
  | EntryType.NPC_FEATURE
  | EntryType.ORGANIZATION
  | EntryType.PILOT_ARMOR
  | EntryType.PILOT_WEAPON
  | EntryType.PILOT_GEAR
  | EntryType.RESERVE
  | EntryType.SKILL
  | EntryType.STATUS
  | EntryType.TALENT
  | EntryType.WEAPON_MOD
  | EntryType.QUIRK
  | EntryType.MANUFACTURER // hmmmm.... these falls into a similar role as tag. for the time being leaving it here, but it should really be more of a journal thing. Are there journal types?
  | EntryType.SITREP
  | EntryType.ENVIRONMENT
  | EntryType.TAG;
export const LancerItemTypes = [
  EntryType.CORE_BONUS,
  EntryType.FACTION,
  EntryType.FRAME,
  EntryType.LICENSE,
  EntryType.MECH_WEAPON,
  EntryType.MECH_SYSTEM,
  EntryType.NPC_CLASS,
  EntryType.NPC_TEMPLATE,
  EntryType.NPC_FEATURE,
  EntryType.ORGANIZATION,
  EntryType.PILOT_ARMOR,
  EntryType.PILOT_WEAPON,
  EntryType.PILOT_GEAR,
  EntryType.RESERVE,
  EntryType.SKILL,
  EntryType.STATUS,
  EntryType.TALENT,
  EntryType.WEAPON_MOD,
  EntryType.QUIRK,
  EntryType.MANUFACTURER,
  EntryType.SITREP,
  EntryType.ENVIRONMENT,
  EntryType.TAG,
];
export function is_item_type(type: LancerActorType | LancerItemType): type is LancerItemType {
  return LancerItemTypes.includes(type as LancerActorType);
}
