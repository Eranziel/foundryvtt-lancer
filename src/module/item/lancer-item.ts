import { LANCER, TypeIcon } from "../config";
import {
  EntryType,
  funcs,
  LiveEntryTypes,
  MechSystem,
  MechWeapon,
  NpcFeature,
  NpcFeatureType,
  OpCtx,
  RangeType,
  RegEntry,
  RegEntryTypes,
  RegRangeData,
} from "machine-mind";
import { system_ready } from "../../lancer";
import { mm_wrap_item } from "../mm-util/helpers";

const lp = LANCER.log_prefix;

interface DerivedProperties<T extends LancerItemType> {
  // license: RegRef<EntryType.LICENSE> | null; // The license granting this item, if one could be found
  max_uses: number; // The max uses, augmented to also include any actor bonuses
  mm: LiveEntryTypes<T> | null;
  mm_promise: Promise<LiveEntryTypes<T>>; // The above, in promise form. More robust
}

interface LancerItemDataSource<T extends LancerItemType> {
  type: T;
  data: RegEntryTypes<T>;
}
interface LancerItemDataProperties<T extends LancerItemType> {
  type: T;
  data: RegEntryTypes<T> & {
    derived: DerivedProperties<T>;
  };
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
    const filter = new Set(types);
    switch (this.type) {
      case EntryType.MECH_WEAPON:
        // @ts-expect-error Should be fixed with v10 types
        const p = this.system.selected_profile;
        // @ts-expect-error Should be fixed with v10 types
        return this.system.profiles[p].range.filter(r => filter.has(r.type));
      case EntryType.PILOT_WEAPON:
        // @ts-expect-error Should be fixed with v10 types
        return this.system.range.filter(r => filter.has(r.type));
      case EntryType.NPC_FEATURE:
        // @ts-expect-error Should be fixed with v10 types
        if (this.system.type !== NpcFeatureType.Weapon) return [];
        // @ts-expect-error Should be fixed with v10 types
        return this.system.range.filter(r => filter.has(r.type));
      default:
        return [];
    }
  }

  // Use this to prevent race conditions / carry over data
  private _current_prepare_job_id!: number;
  private _job_tracker!: Map<number, Promise<AnyMMItem>>;
  private _prev_derived: this["data"]["data"]["derived"] | undefined;

  /**
   * Force name down to item,
   * And more importantly, perform MM workflow
   */
  prepareData() {
    super.prepareData();

    // If no id, leave
    if (!this.id) return;

    // Track which prepare iteration this is
    if (this._current_prepare_job_id == undefined) {
      this._current_prepare_job_id = 0;
      this._job_tracker = new Map();
    }
    this._current_prepare_job_id++;
    let job_id = this._current_prepare_job_id;

    // Push down name
    // @ts-expect-error Should be fixed with v10 types
    this.system.name = this.name;
    // @ts-expect-error Should be fixed with v10 types
    if (!this.img) this.img = CONST.DEFAULT_TOKEN;

    let dr: this["data"]["data"]["derived"];

    // Init our derived data if necessary
    // @ts-expect-error Should be fixed with v10 types
    if (!this.system.derived) {
      dr = {
        max_uses: 0,
        mm: null as any, // We will set this shortly
        mm_promise: null as any, // We will set this shortly
      };

      // We set it normally.
      // @ts-expect-error Should be fixed with v10 types
      this.system.derived = dr;
    } else {
      // Otherwise, grab existing
      // @ts-expect-error Should be fixed with v10 types
      dr = this.system.derived;
    }

    // Do we already have a ctx from our actor?
    let actor_ctx = this.actor?._actor_ctx;

    // Spool up our Machine Mind wrapping process
    // Promise<A | B> is apparently unassignable to Promise<A> | Promise<B>
    (<Promise<LiveEntryTypes<LancerItemType>>>dr.mm_promise) = system_ready
      .then(() => mm_wrap_item(this, actor_ctx ?? new OpCtx()))
      .then(async mm => {
        // If our job ticker doesnt match, then another prepared object has usurped us in setting these values.
        // We return this elevated promise, so anyone waiting on this task instead waits on the most up to date one
        if (job_id != this._current_prepare_job_id) {
          return this._job_tracker.get(this._current_prepare_job_id)! as any; // This will definitely be a different promise
        }

        // Delete all old tracked jobs
        for (let k of this._job_tracker.keys()) {
          if (k != job_id) {
            this._job_tracker.delete(k);
          }
        }

        // Save the document to derived
        Object.defineProperties(dr, {
          mm: {
            enumerable: false,
            configurable: true,
            writable: false,
            value: mm,
          },
        });

        // Also, compute max uses if needed
        let base_limit = (mm as any).BaseLimit;
        if (base_limit) {
          dr.max_uses = base_limit; // A decent baseline - start with the limited tag

          // If we have an actor, then try to get limited bonuses
          if (this.actor) {
            // @ts-expect-error Should be fixed with v10 types
            let actor_mm = await this.actor.system.derived.mm_promise;
            if (
              (actor_mm.Type == EntryType.MECH || actor_mm.Type == EntryType.PILOT) &&
              !(this.is_pilot_armor() || this.is_pilot_gear() || this.is_pilot_weapon())
            ) {
              // Add pilot/mech lim bonus
              dr.max_uses += actor_mm.LimitedBonus;
            }
          }
        }

        return mm;
      });
  }

  /** @override
   * Want to destroy derived data before passing it to an update
   */
  async update(data: any, options = {}) {
    if (data?.derived) {
      delete data.derived;
    }
    console.log("Data:", data);
    return super.update(data, options);
  }

  protected async _preCreate(...[data, options, user]: Parameters<Item["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);
    // If base item has data, then we are probably importing. Skip this step
    // @ts-expect-error Should be fixed with v10 types
    if (data.system && data.system.lid != "") {
      console.log(`${lp} New ${this.type} has data provided from an import, skipping default init.`);
      return;
    }

    console.log(`${lp} Initializing new ${this.type}`);

    // Select default image
    let icon_lookup: string = this.type;
    if (this.is_npc_feature()) {
      icon_lookup += this.type;
    }
    let img = TypeIcon(icon_lookup);

    let default_data: RegEntryTypes<LancerItemType>;
    switch (this.type) {
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

    // @ts-expect-error Should be fixed with v10 types
    this.updateSource({
      // system: default_data,
      img: img,
      name: default_data.name,
    });
  }

  // Typeguards
  is_core_bonus(): this is LancerItem & { data: LancerItemDataProperties<EntryType.CORE_BONUS> } {
    return this.type === EntryType.CORE_BONUS;
  }
  is_environment(): this is LancerItem & { data: LancerItemDataProperties<EntryType.ENVIRONMENT> } {
    return this.type === EntryType.ENVIRONMENT;
  }
  is_faction(): this is LancerItem & { data: LancerItemDataProperties<EntryType.FACTION> } {
    return this.type === EntryType.FACTION;
  }
  is_frame(): this is LancerItem & { data: LancerItemDataProperties<EntryType.FRAME> } {
    return this.type === EntryType.FRAME;
  }
  is_license(): this is LancerItem & { data: LancerItemDataProperties<EntryType.LICENSE> } {
    return this.type === EntryType.LICENSE;
  }
  is_manufacturer(): this is LancerItem & { data: LancerItemDataProperties<EntryType.MANUFACTURER> } {
    return this.type === EntryType.MANUFACTURER;
  }
  is_mech_system(): this is LancerItem & { data: LancerItemDataProperties<EntryType.MECH_SYSTEM> } {
    return this.type === EntryType.MECH_SYSTEM;
  }
  is_mech_weapon(): this is LancerItem & { data: LancerItemDataProperties<EntryType.MECH_WEAPON> } {
    return this.type === EntryType.MECH_WEAPON;
  }
  is_npc_class(): this is LancerItem & { data: LancerItemDataProperties<EntryType.NPC_CLASS> } {
    return this.type === EntryType.NPC_CLASS;
  }
  is_npc_feature(): this is LancerItem & { data: LancerItemDataProperties<EntryType.NPC_FEATURE> } {
    return this.type === EntryType.NPC_FEATURE;
  }
  is_npc_template(): this is LancerItem & { data: LancerItemDataProperties<EntryType.NPC_TEMPLATE> } {
    return this.type === EntryType.NPC_TEMPLATE;
  }
  is_organization(): this is LancerItem & { data: LancerItemDataProperties<EntryType.ORGANIZATION> } {
    return this.type === EntryType.ORGANIZATION;
  }
  is_pilot_armor(): this is LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_ARMOR> } {
    return this.type === EntryType.PILOT_ARMOR;
  }
  is_pilot_gear(): this is LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_GEAR> } {
    return this.type === EntryType.PILOT_GEAR;
  }
  is_pilot_weapon(): this is LancerItem & { data: LancerItemDataProperties<EntryType.PILOT_WEAPON> } {
    return this.type === EntryType.PILOT_WEAPON;
  }
  is_quirk(): this is LancerItem & { data: LancerItemDataProperties<EntryType.QUIRK> } {
    return this.type === EntryType.QUIRK;
  }
  is_reserve(): this is LancerItem & { data: LancerItemDataProperties<EntryType.RESERVE> } {
    return this.type === EntryType.RESERVE;
  }
  is_sitrep(): this is LancerItem & { data: LancerItemDataProperties<EntryType.SITREP> } {
    return this.type === EntryType.SITREP;
  }
  is_skill(): this is LancerItem & { data: LancerItemDataProperties<EntryType.SKILL> } {
    return this.type === EntryType.SKILL;
  }
  is_status(): this is LancerItem & { data: LancerItemDataProperties<EntryType.STATUS> } {
    return this.type === EntryType.STATUS;
  }
  is_tag(): this is LancerItem & { data: LancerItemDataProperties<EntryType.TAG> } {
    return this.type === EntryType.TAG;
  }
  is_talent(): this is LancerItem & { data: LancerItemDataProperties<EntryType.TALENT> } {
    return this.type === EntryType.TALENT;
  }
  is_weapon_mod(): this is LancerItem & { data: LancerItemDataProperties<EntryType.WEAPON_MOD> } {
    return this.type === EntryType.WEAPON_MOD;
  }
}

// This seems like it could be removed eventually
export type AnyMMItem = LiveEntryTypes<LancerItemType>;

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

// export function has_lid<T extends AnyMMItem | AnyMMActor>(item: AnyMMItem | AnyMMActor): item is T & {ID: string} {
// return (item as any).LID != undefined;
// }

export function is_reg_mech_weapon(item: RegEntry<any>): item is MechWeapon {
  return item.Type === EntryType.MECH_WEAPON;
}

export function is_reg_mech_system(item: RegEntry<any>): item is MechSystem {
  return item.Type === EntryType.MECH_SYSTEM;
}

export function is_reg_npc_feature(item: RegEntry<any>): item is NpcFeature {
  return item.Type === EntryType.NPC_FEATURE;
}
