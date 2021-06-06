import { LANCER, TypeIcon } from "../config";
import { EntryType, funcs, License, LiveEntryTypes, NpcFeatureType, OpCtx, RegRef, TagInstance } from "machine-mind";
import { FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import { system_ready } from "../../lancer";
import { mm_wrap_item } from "../mm-util/helpers";
import { IS_IMPORTING } from "../compBuilder";

const lp = LANCER.log_prefix;

export function lancerItemInit(base_item: any, provided_data: any) {
  // If base item has data, then we are probably importing. Skip this step
  if(provided_data?.data) {
    return;
  }

  console.log(`${lp} Initializing new ${base_item.type}`);

  // Select default image
  let icon_lookup = base_item.type;
  if(base_item.type == EntryType.NPC_FEATURE) {
    icon_lookup += base_item.type ?? "";
  }
  let img = TypeIcon(icon_lookup);

  let default_data: any;
  switch (base_item.type as EntryType) {
    default:
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

export class LancerItem<T extends LancerItemType> extends Item {
  data!: FoundryRegItemData<T> & {
    data: {
      // Include additional derived info
      derived: {
        license: RegRef<EntryType.LICENSE> | null; // The license granting this item, if one could be found
        max_uses: number; // The max uses, augmented to also include any actor bonuses
      };
    };
  };

  // We can narrow the type significantly (make this T???)
  get type(): T {
    return super.type as T;
  }

  /** Force name down to item,
   * And more importantly, perform MM workflow
   */
  prepareData() {
    super.prepareData();

    // If no id, leave
    if(!this.id) return;

    // Push down name
    this.data.data.name = this.data.name;
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;

    let dr: this["data"]["data"]["derived"];

    // Init our derived data if necessary
    if (!this.data.data.derived) {
      // Prepare our derived stat data by first initializing an empty obj
      dr = {
        license: null,
        max_uses: 0,
        mm: null as any, // We will set this shortly
        mm_promise: null as any, // We will set this shortly
      };

      // We set it normally.
      this.data.data.derived = dr;
    } else {
      // That done/guaranteed make a shorthand
      dr = this.data.data.derived;
    }

    // Do we already have a ctx from our actor?
    let actor_ctx: OpCtx | undefined = (this.actor as LancerActor<any> | undefined)?._actor_ctx;

    // Spool up our Machine Mind wrapping process
    let mm_promise = system_ready
      .then(() => mm_wrap_item(this, actor_ctx ?? new OpCtx()))
      .then(async mm => {
        // Always save the context
        // Save the context via defineProperty so it does not show up in JSON stringifies. Also, no point in having it writeable
        Object.defineProperty(dr, "mm", {
          value: mm,
          configurable: true,
          enumerable: false,
        });

        // Additionally we would like to find a matching license. Re-use ctx, try both a world and global reg, actor as well if it exists
        // let found_license: RegRef<EntryType.LICENSE> | null = null;
        // if (this.actor?.data.type == EntryType.PILOT || this.actor?.data.type == EntryType.MECH) {
          // found_license = await find_license_for(mm, this.actor! as LancerMech | LancerPilot);
        // } else {
          // found_license = await find_license_for(mm);
        // }

        // Store the found license
        // dr.license = found_license;

        // Also, compute max uses if needed
        let base_limit = (mm as any).BaseLimit;
        if (base_limit) {
          dr.max_uses = base_limit; // A decent baseline - start with the limited tag

          // If we have an actor, then try to get limited bonuses
          if (this.actor) {
            let actor_mm: LiveEntryTypes<LancerActorType> = await this.actor.data.data.derived.mm_promise;
            if (actor_mm.Type == EntryType.MECH || actor_mm.Type == EntryType.PILOT) {
              // Add pilot/mech lim bonus
              dr.max_uses += actor_mm.LimitedBonus;
            }
          }
        }

        return mm;
      });

    // Also assign the promise via defineProperty, similarly to prevent enumerability
    Object.defineProperty(dr, "mm_promise", {
      value: mm_promise,
      configurable: true,
      enumerable: false,
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
export function is_item_type(type: LancerActorType | LancerItemType): type is LancerItemType {
  return LancerItemTypes.includes(type as LancerActorType);
}

// export function has_lid<T extends AnyMMItem | AnyMMActor>(item: AnyMMItem | AnyMMActor): item is T & {ID: string} {
  // return (item as any).LID != undefined;
// }

