import { LANCER, TypeIcon } from "../config";
import {
  EntryType,
  funcs,
  NpcFeatureType,
  RangeType,
  RegEntryTypes,
  RegRangeData,
} from "machine-mind";
import { SystemDataType } from "../source-template";

const lp = LANCER.log_prefix;

interface LancerItemDataSource<T extends LancerItemType> {
  type: T;
  data: RegEntryTypes<T>;
}
interface LancerItemDataProperties<T extends LancerItemType> {
  type: T;
  data: SystemDataType<T>;
}

/**
 * Union type for Item.data._source. Only really used in prepareData
 */
type LancerItemSource =
  | LancerItemDataSource<EntryType.CORE_BONUS>
  | LancerItemDataSource<EntryType.ENVIRONMENT>
  | LancerItemDataSource<EntryType.FACTION>
  | LancerItemDataSource<EntryType.FRAME>
  | LancerItemDataSource<EntryType.LICENSE>
  | LancerItemDataSource<EntryType.MANUFACTURER>
  | LancerItemDataSource<EntryType.MECH_SYSTEM>
  | LancerItemDataSource<EntryType.MECH_WEAPON>
  | LancerItemDataSource<EntryType.NPC_CLASS>
  | LancerItemDataSource<EntryType.NPC_FEATURE>
  | LancerItemDataSource<EntryType.NPC_TEMPLATE>
  | LancerItemDataSource<EntryType.ORGANIZATION>
  | LancerItemDataSource<EntryType.PILOT_ARMOR>
  | LancerItemDataSource<EntryType.PILOT_GEAR>
  | LancerItemDataSource<EntryType.PILOT_WEAPON>
  | LancerItemDataSource<EntryType.QUIRK>
  | LancerItemDataSource<EntryType.RESERVE>
  | LancerItemDataSource<EntryType.SITREP>
  | LancerItemDataSource<EntryType.SKILL>
  | LancerItemDataSource<EntryType.STATUS>
  | LancerItemDataSource<EntryType.TAG>
  | LancerItemDataSource<EntryType.TALENT>
  | LancerItemDataSource<EntryType.WEAPON_MOD>;

/**
 * Union type for Item.data
 * Can be discriminated by testing Item.data.type
 */
type LancerItemProperties =
  | LancerItemDataProperties<EntryType.CORE_BONUS>
  | LancerItemDataProperties<EntryType.ENVIRONMENT>
  | LancerItemDataProperties<EntryType.FACTION>
  | LancerItemDataProperties<EntryType.FRAME>
  | LancerItemDataProperties<EntryType.LICENSE>
  | LancerItemDataProperties<EntryType.MANUFACTURER>
  | LancerItemDataProperties<EntryType.MECH_SYSTEM>
  | LancerItemDataProperties<EntryType.MECH_WEAPON>
  | LancerItemDataProperties<EntryType.NPC_CLASS>
  | LancerItemDataProperties<EntryType.NPC_FEATURE>
  | LancerItemDataProperties<EntryType.NPC_TEMPLATE>
  | LancerItemDataProperties<EntryType.ORGANIZATION>
  | LancerItemDataProperties<EntryType.PILOT_ARMOR>
  | LancerItemDataProperties<EntryType.PILOT_GEAR>
  | LancerItemDataProperties<EntryType.PILOT_WEAPON>
  | LancerItemDataProperties<EntryType.QUIRK>
  | LancerItemDataProperties<EntryType.RESERVE>
  | LancerItemDataProperties<EntryType.SITREP>
  | LancerItemDataProperties<EntryType.SKILL>
  | LancerItemDataProperties<EntryType.STATUS>
  | LancerItemDataProperties<EntryType.TAG>
  | LancerItemDataProperties<EntryType.TALENT>
  | LancerItemDataProperties<EntryType.WEAPON_MOD>;

declare global {
  interface SourceConfig {
    Item: LancerItemSource;
  }
  interface DataConfig {
    Item: LancerItemProperties;
  }
  interface DocumentClassConfig {
    Item: typeof LancerItem;
  }
}


export class LancerItem extends Item { 
  /**
   * Returns all ranges for the item that match the provided range types
   */
  rangesFor(types: Set<RangeType> | RangeType[]): RegRangeData[] {
    const i = null as unknown as Item; // TODO remove


    const filter = new Set(types);
    switch (this.data.type) {
      case EntryType.MECH_WEAPON:
        const p = this.data.data.selected_profile;
        return this.data.data.profiles[p].range.filter(r => filter.has(r.type));
      case EntryType.PILOT_WEAPON:
        return this.data.data.range.filter(r => filter.has(r.type));
      case EntryType.NPC_FEATURE:
        if (this.data.data.type !== NpcFeatureType.Weapon) return [];
        return this.data.data.range.filter(r => filter.has(r.type));
      default:
        return [];
    }
  }

  /**
   * Force name down to item,
   * And more importantly, perform MM workflow
   */
  prepareData() {
    super.prepareData();

    console.warn("TODO: Re-implement item data preparation");
    /*
    // If no id, leave
    if (!this.id) return;

    let d = foundry.utils.duplicate(this.toObject());
    // Push down name
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;

    // compute max uses if needed
    // TODO: Re-implement base limits
    let base_limit = d.base_limit;
    if (base_limit) {
      dr.max_uses = base_limit; // A decent baseline - start with the limited tag

      // If we have an actor, then try to get limited bonuses
      if (this.actor) {
        let actor_mm = await this.actor.data.data.derived.mm_promise;
        if (actor_mm.Type == EntryType.MECH || actor_mm.Type == EntryType.PILOT) {
          // Add pilot/mech lim bonus
          dr.max_uses += actor_mm.LimitedBonus;
        }
      }
    }
    
    return d;
    */
  }

  /** @override
   * Want to destroy derived data before passing it to an update
   */
  async update(data: any, options = {}) {
    if (data?.data?.derived) {
      delete data.data.derived;
    }
    return super.update(data, options);
  }

  protected async _preCreate(...[data, options, user]: Parameters<Item["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);
    // If base item has data, then we are probably importing. Skip this step
    if (data?.data) return;

    console.log(`${lp} Initializing new ${this.data.type}`);

    // Select default image
    let icon_lookup: string = this.data.type;
    if (this.is_npc_feature()) {
      icon_lookup += this.data.type;
    }
    let img = TypeIcon(icon_lookup);

    let default_data: RegEntryTypes<LancerItemType>;
    switch (this.data.type) {
      default:
      case EntryType.CORE_BONUS:
        default_data = funcs.defaults.CORE_BONUS();
      case EntryType.ENVIRONMENT:
        default_data = funcs.defaults.ENVIRONMENT();
        break;
      case EntryType.FACTION:
        default_data = funcs.defaults.FACTION();
        break;
      case EntryType.FRAME:
        default_data = funcs.defaults.FRAME();
        break;
      case EntryType.LICENSE:
        default_data = funcs.defaults.LICENSE();
        break;
      case EntryType.MANUFACTURER:
        default_data = funcs.defaults.MANUFACTURER();
        break;
      case EntryType.MECH_SYSTEM:
        default_data = funcs.defaults.MECH_SYSTEM();
        break;
      case EntryType.MECH_WEAPON:
        default_data = funcs.defaults.MECH_WEAPON();
        break;
      case EntryType.NPC_CLASS:
        default_data = funcs.defaults.NPC_CLASS();
        break;
      case EntryType.NPC_FEATURE:
        default_data = funcs.defaults.NPC_FEATURE();
        break;
      case EntryType.NPC_TEMPLATE:
        default_data = funcs.defaults.NPC_TEMPLATE();
        break;
      case EntryType.ORGANIZATION:
        default_data = funcs.defaults.ORGANIZATION();
        break;
      case EntryType.PILOT_ARMOR:
        default_data = funcs.defaults.PILOT_ARMOR();
        break;
      case EntryType.PILOT_GEAR:
        default_data = funcs.defaults.PILOT_GEAR();
        break;
      case EntryType.PILOT_WEAPON:
        default_data = funcs.defaults.PILOT_WEAPON();
        break;
      case EntryType.QUIRK:
        default_data = funcs.defaults.QUIRK();
        break;
      case EntryType.RESERVE:
        default_data = funcs.defaults.RESERVE();
        break;
      case EntryType.SITREP:
        default_data = funcs.defaults.SITREP();
        break;
      case EntryType.SKILL:
        default_data = funcs.defaults.SKILL();
        break;
      case EntryType.STATUS:
        default_data = funcs.defaults.STATUS();
        break;
      case EntryType.TAG:
        default_data = funcs.defaults.TAG_TEMPLATE();
        break;
      case EntryType.TALENT:
        default_data = funcs.defaults.TALENT();
        break;
      case EntryType.WEAPON_MOD:
        default_data = funcs.defaults.WEAPON_MOD();
        break;
    }

    // Sync the name
    default_data.name = this.name ?? default_data.name;

    this.data.update({
      data: default_data,
      img: img,
      name: default_data.name,
    });
  }

  // Typeguards
  is_core_bonus(): this is LancerCORE_BONUS {
    return this.data.type === EntryType.CORE_BONUS;
  }
  is_frame(): this is LancerFRAME {
    return this.data.type === EntryType.FRAME;
  }
  is_license(): this is LancerLICENSE {
    return this.data.type === EntryType.LICENSE;
  }
  is_mech_system(): this is LancerMECH_SYSTEM {
    return this.data.type === EntryType.MECH_SYSTEM;
  }
  is_mech_weapon(): this is LancerMECH_WEAPON {
    return this.data.type === EntryType.MECH_WEAPON;
  }
  is_npc_class(): this is LancerNPC_CLASS {
    return this.data.type === EntryType.NPC_CLASS;
  }
  is_npc_feature(): this is LancerNPC_FEATURE {
    return this.data.type === EntryType.NPC_FEATURE;
  }
  is_npc_template(): this is LancerNPC_TEMPLATE {
    return this.data.type === EntryType.NPC_TEMPLATE;
  }
  is_organization(): this is LancerORGANIZATION {
    return this.data.type === EntryType.ORGANIZATION;
  }
  is_pilot_armor(): this is LancerPILOT_ARMOR {
    return this.data.type === EntryType.PILOT_ARMOR;
  }
  is_pilot_gear(): this is LancerPILOT_GEAR {
    return this.data.type === EntryType.PILOT_GEAR;
  }
  is_pilot_weapon(): this is LancerPILOT_WEAPON {
    return this.data.type === EntryType.PILOT_WEAPON;
  }
  is_reserve(): this is LancerRESERVE {
    return this.data.type === EntryType.RESERVE;
  }
  is_skill(): this is LancerSKILL {
    return this.data.type === EntryType.SKILL;
  }
  is_status(): this is LancerSTATUS {
    return this.data.type === EntryType.STATUS;
  }
  is_tag(): this is LancerTAG {
    return this.data.type === EntryType.TAG;
  }
  is_talent(): this is LancerTALENT {
    return this.data.type === EntryType.TALENT;
  }
  is_weapon_mod(): this is LancerWEAPON_MOD {
    return this.data.type === EntryType.WEAPON_MOD;
  }
}


export type LancerCORE_BONUS = LancerItem & { data: LancerItemDataProperties<EntryType.CORE_BONUS> };
export type LancerFRAME = LancerItem & { data: LancerItemDataProperties<EntryType.FRAME> };
export type LancerLICENSE = LancerItem & { data: LancerItemDataProperties<EntryType.LICENSE> };
export type LancerMANUFACTURER = LancerItem & { data: LancerItemDataProperties<EntryType.MANUFACTURER> };
export type LancerMECH_SYSTEM = LancerItem & { data: LancerItemDataProperties<EntryType.MECH_SYSTEM> };
export type LancerMECH_WEAPON = LancerItem & { data: LancerItemDataProperties<EntryType.MECH_WEAPON> };
export type LancerNPC_CLASS = LancerItem & { data: LancerItemDataProperties<EntryType.NPC_CLASS> };
export type LancerNPC_FEATURE = LancerItem & { data: LancerItemDataProperties<EntryType.NPC_FEATURE> };
export type LancerNPC_TEMPLATE = LancerItem & { data: LancerItemDataProperties<EntryType.NPC_TEMPLATE> };
export type LancerORGANIZATION = LancerItem & { data: LancerItemDataProperties<EntryType.ORGANIZATION> };
export type LancerPILOT_ARMOR = LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_ARMOR> };
export type LancerPILOT_GEAR = LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_GEAR> };
export type LancerPILOT_WEAPON = LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_WEAPON> };
export type LancerRESERVE = LancerItem & { data: LancerItemDataProperties<EntryType.RESERVE> };
export type LancerSKILL = LancerItem & { data: LancerItemDataProperties<EntryType.SKILL> };
export type LancerSTATUS = LancerItem & { data: LancerItemDataProperties<EntryType.STATUS> };
export type LancerTAG = LancerItem & { data: LancerItemDataProperties<EntryType.TAG> };
export type LancerTALENT = LancerItem & { data: LancerItemDataProperties<EntryType.TALENT> };
export type LancerWEAPON_MOD = LancerItem & { data: LancerItemDataProperties<EntryType.WEAPON_MOD> };

// This seems like it could be removed eventually
export type LancerItemType =
  | EntryType.CORE_BONUS
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
export function is_item_type(type: EntryType): type is LancerItemType {
  return LancerItemTypes.includes(type);
}
