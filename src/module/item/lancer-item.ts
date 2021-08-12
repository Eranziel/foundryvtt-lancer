import { LANCER, TypeIcon } from "../config";
import { EntryType, funcs, LiveEntryTypes, OpCtx, RegEntryTypes } from "machine-mind";
import { system_ready } from "../../lancer";
import { mm_wrap_item } from "../mm-util/helpers";

const lp = LANCER.log_prefix;

export function lancerItemInit(base_item: any, provided_data: any) {
  // If base item has data, then we are probably importing. Skip this step
  if (provided_data?.data) {
    return;
  }

  console.log(`${lp} Initializing new ${base_item.type}`);

  // Select default image
  let icon_lookup = base_item.type;
  if (base_item.type == EntryType.NPC_FEATURE) {
    icon_lookup += base_item.type ?? "";
  }
  let img = TypeIcon(icon_lookup);

  let default_data: any;
  switch (base_item.type as EntryType) {
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
  default_data.name = base_item.name ?? default_data.name;

  return base_item.data.update({
    data: default_data,
    img: img,
    name: default_data.name,
  });
}

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
   * Force name down to item,
   * And more importantly, perform MM workflow
   */
  prepareData() {
    super.prepareData();

    // If no id, leave
    if (!this.id) return;

    // Push down name
    this.data.data.name = this.data.name;
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;

    let dr: this["data"]["data"]["derived"];

    // Init our derived data if necessary
    if (!this.data.data.derived) {
      dr = {
        max_uses: 0,
        mm: null as any, // We will set this shortly
        mm_promise: null as any, // We will set this shortly
      };

      // We set it normally.
      this.data.data.derived = dr;
    } else {
      // Otherwise, grab existing
      dr = this.data.data.derived;
    }

    // Do we already have a ctx from our actor?
    let actor_ctx = this.actor?._actor_ctx;

    // Spool up our Machine Mind wrapping process
    // Promise<A | B> is apparently unassignable to Promise<A> | Promise<B>
    (<Promise<LiveEntryTypes<LancerItemType>>>dr.mm_promise) = system_ready
      .then(() => mm_wrap_item(this, actor_ctx ?? new OpCtx()))
      .then(async mm => {
        // Save the entity to derived
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
            let actor_mm = await this.actor.data.data.derived.mm_promise;
            if (actor_mm.Type == EntryType.MECH || actor_mm.Type == EntryType.PILOT) {
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
    if (data?.data?.derived) {
      delete data.data.derived;
    }
    return super.update(data, options);
  }
  // Typeguards
  is_core_bonus(): this is LancerItem & { data: { type: EntryType.CORE_BONUS } } {
    return this.data.type === EntryType.CORE_BONUS;
  }
  is_environment(): this is LancerItem & { data: { type: EntryType.ENVIRONMENT } } {
    return this.data.type === EntryType.ENVIRONMENT;
  }
  is_faction(): this is LancerItem & { data: { type: EntryType.FACTION } } {
    return this.data.type === EntryType.FACTION;
  }
  is_frame(): this is LancerItem & { data: { type: EntryType.FRAME } } {
    return this.data.type === EntryType.FRAME;
  }
  is_license(): this is LancerItem & { data: { type: EntryType.LICENSE } } {
    return this.data.type === EntryType.LICENSE;
  }
  is_manufacturer(): this is LancerItem & { data: { type: EntryType.MANUFACTURER } } {
    return this.data.type === EntryType.MANUFACTURER;
  }
  is_mech_system(): this is LancerItem & { data: { type: EntryType.MECH_SYSTEM } } {
    return this.data.type === EntryType.MECH_SYSTEM;
  }
  is_mech_weapon(): this is LancerItem & { data: { type: EntryType.MECH_WEAPON } } {
    return this.data.type === EntryType.MECH_WEAPON;
  }
  is_npc_class(): this is LancerItem & { data: { type: EntryType.NPC_CLASS } } {
    return this.data.type === EntryType.NPC_CLASS;
  }
  is_npc_feature(): this is LancerItem & { data: { type: EntryType.NPC_FEATURE } } {
    return this.data.type === EntryType.NPC_FEATURE;
  }
  is_npc_template(): this is LancerItem & { data: { type: EntryType.NPC_TEMPLATE } } {
    return this.data.type === EntryType.NPC_TEMPLATE;
  }
  is_organization(): this is LancerItem & { data: { type: EntryType.ORGANIZATION } } {
    return this.data.type === EntryType.ORGANIZATION;
  }
  is_pilot_armor(): this is LancerItem & { data: { type: EntryType.PILOT_ARMOR } } {
    return this.data.type === EntryType.PILOT_ARMOR;
  }
  is_pilot_gear(): this is LancerItem & { data: { type: EntryType.PILOT_GEAR } } {
    return this.data.type === EntryType.PILOT_GEAR;
  }
  is_pilot_weapon(): this is LancerItem & { data: { type: EntryType.PILOT_WEAPON } } {
    return this.data.type === EntryType.PILOT_WEAPON;
  }
  is_quirk(): this is LancerItem & { data: { type: EntryType.QUIRK } } {
    return this.data.type === EntryType.QUIRK;
  }
  is_reserve(): this is LancerItem & { data: { type: EntryType.RESERVE } } {
    return this.data.type === EntryType.RESERVE;
  }
  is_sitrep(): this is LancerItem & { data: { type: EntryType.SITREP } } {
    return this.data.type === EntryType.SITREP;
  }
  is_skill(): this is LancerItem & { data: { type: EntryType.SKILL } } {
    return this.data.type === EntryType.SKILL;
  }
  is_status(): this is LancerItem & { data: { type: EntryType.STATUS } } {
    return this.data.type === EntryType.STATUS;
  }
  is_tag(): this is LancerItem & { data: { type: EntryType.TAG } } {
    return this.data.type === EntryType.TAG;
  }
  is_talent(): this is LancerItem & { data: { type: EntryType.TALENT } } {
    return this.data.type === EntryType.TALENT;
  }
  is_weapon_mod(): this is LancerItem & { data: { type: EntryType.WEAPON_MOD } } {
    return this.data.type === EntryType.WEAPON_MOD;
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
