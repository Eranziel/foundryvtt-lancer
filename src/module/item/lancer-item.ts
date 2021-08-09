import { LANCER, TypeIcon } from "../config";
import { EntryType, funcs, LiveEntryTypes, NpcFeatureType, OpCtx } from "machine-mind";
import { FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerActorType } from "../actor/lancer-actor";
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

interface DerivedProperties<T extends EntryType> {
  // license: RegRef<EntryType.LICENSE> | null; // The license granting this item, if one could be found
  max_uses: number; // The max uses, augmented to also include any actor bonuses
  mm: LiveEntryTypes<T> | null;
  mm_promise: Promise<LiveEntryTypes<T>>; // The above, in promise form. More robust
}

interface LancerItemEnvironmentDataSourceData {
  derived: DerivedProperties<EntryType.ENVIRONMENT>;
  name: string;
  lid: string;
}
interface LancerItemEnvironmentDataSource {
  type: EntryType.ENVIRONMENT;
  data: LancerItemEnvironmentDataSourceData;
}
interface LancerItemEnvironmentDataPropertiesData extends LancerItemEnvironmentDataSourceData {}
interface LancerItemEnvironmentDataProperties {
  type: EntryType.ENVIRONMENT;
  data: LancerItemEnvironmentDataPropertiesData;
}

interface LancerItemFactionDataSourceData {
  derived: DerivedProperties<EntryType.FACTION>;
  name: string;
  lid: string;
}
interface LancerItemFactionDataSource {
  type: EntryType.FACTION;
  data: LancerItemFactionDataSourceData;
}
interface LancerItemFactionDataPropertiesData extends LancerItemFactionDataSourceData {}
interface LancerItemFactionDataProperties {
  type: EntryType.FACTION;
  data: LancerItemFactionDataPropertiesData;
}

interface LancerItemFrameDataSourceData {
  derived: DerivedProperties<EntryType.FRAME>;
  name: string;
  lid: string;
}
interface LancerItemFrameDataSource {
  type: EntryType.FRAME;
  data: LancerItemFrameDataSourceData;
}
interface LancerItemFrameDataPropertiesData extends LancerItemFrameDataSourceData {}
interface LancerItemFrameDataProperties {
  type: EntryType.FRAME;
  data: LancerItemFrameDataPropertiesData;
}

interface LancerItemLicenseDataSourceData {
  derived: DerivedProperties<EntryType.LICENSE>;
  name: string;
  lid: string;
}
interface LancerItemLicenseDataSource {
  type: EntryType.LICENSE;
  data: LancerItemLicenseDataSourceData;
}
interface LancerItemLicenseDataPropertiesData extends LancerItemLicenseDataSourceData {}
interface LancerItemLicenseDataProperties {
  type: EntryType.LICENSE;
  data: LancerItemLicenseDataPropertiesData;
}

interface LancerItemManufacturerDataSourceData {
  derived: DerivedProperties<EntryType.MANUFACTURER>;
  name: string;
  lid: string;
}
interface LancerItemManufacturerDataSource {
  type: EntryType.MANUFACTURER;
  data: LancerItemManufacturerDataSourceData;
}
interface LancerItemManufacturerDataPropertiesData extends LancerItemManufacturerDataSourceData {}
interface LancerItemManufacturerDataProperties {
  type: EntryType.MANUFACTURER;
  data: LancerItemManufacturerDataPropertiesData;
}

interface LancerItemMechSystemDataSourceData {
  derived: DerivedProperties<EntryType.MECH_SYSTEM>;
  name: string;
  lid: string;
}
interface LancerItemMechSystemDataSource {
  type: EntryType.MECH_SYSTEM;
  data: LancerItemMechSystemDataSourceData;
}
interface LancerItemMechSystemDataPropertiesData extends LancerItemMechSystemDataSourceData {}
interface LancerItemMechSystemDataProperties {
  type: EntryType.MECH_SYSTEM;
  data: LancerItemMechSystemDataPropertiesData;
}

interface LancerItemMechWeaponDataSourceData {
  derived: DerivedProperties<EntryType.MECH_WEAPON>;
  name: string;
  selected_profile: number;
  lid: string;
}
interface LancerItemMechWeaponDataSource {
  type: EntryType.MECH_WEAPON;
  data: LancerItemMechWeaponDataSourceData;
}
interface LancerItemMechWeaponDataPropertiesData extends LancerItemMechWeaponDataSourceData {}
interface LancerItemMechWeaponDataProperties {
  type: EntryType.MECH_WEAPON;
  data: LancerItemMechWeaponDataPropertiesData;
}

interface LancerItemNpcClassDataSourceData {
  derived: DerivedProperties<EntryType.NPC_CLASS>;
  name: string;
  lid: string;
}
interface LancerItemNpcClassDataSource {
  type: EntryType.NPC_CLASS;
  data: LancerItemNpcClassDataSourceData;
}
interface LancerItemNpcClassDataPropertiesData extends LancerItemNpcClassDataSourceData {}
interface LancerItemNpcClassDataProperties {
  type: EntryType.NPC_CLASS;
  data: LancerItemNpcClassDataPropertiesData;
}

interface LancerItemNpcFeatureDataSourceData {
  derived: DerivedProperties<EntryType.NPC_FEATURE>;
  name: string;
  lid: string;
  type: NpcFeatureType;
  tags: unknown[];
  effect: string;
  trigger: string;
  tier: number;
}
interface LancerItemNpcFeatureDataSource {
  type: EntryType.NPC_FEATURE;
  data: LancerItemNpcFeatureDataSourceData;
}
interface LancerItemNpcFeatureDataPropertiesData extends LancerItemNpcFeatureDataSourceData {}
interface LancerItemNpcFeatureDataProperties {
  type: EntryType.NPC_FEATURE;
  data: LancerItemNpcFeatureDataPropertiesData;
}

interface LancerItemNpcTemplateDataSourceData {
  derived: DerivedProperties<EntryType.NPC_TEMPLATE>;
  name: string;
  lid: string;
}
interface LancerItemNpcTemplateDataSource {
  type: EntryType.NPC_TEMPLATE;
  data: LancerItemNpcTemplateDataSourceData;
}
interface LancerItemNpcTemplateDataPropertiesData extends LancerItemNpcTemplateDataSourceData {}
interface LancerItemNpcTemplateDataProperties {
  type: EntryType.NPC_TEMPLATE;
  data: LancerItemNpcTemplateDataPropertiesData;
}

interface LancerItemOrganizationDataSourceData {
  derived: DerivedProperties<EntryType.ORGANIZATION>;
  name: string;
  lid: string;
}
interface LancerItemOrganizationDataSource {
  type: EntryType.ORGANIZATION;
  data: LancerItemOrganizationDataSourceData;
}
interface LancerItemOrganizationDataPropertiesData extends LancerItemOrganizationDataSourceData {}
interface LancerItemOrganizationDataProperties {
  type: EntryType.ORGANIZATION;
  data: LancerItemOrganizationDataPropertiesData;
}

interface LancerItemPilotArmorDataSourceData {
  derived: DerivedProperties<EntryType.PILOT_ARMOR>;
  name: string;
  lid: string;
}
interface LancerItemPilotArmorDataSource {
  type: EntryType.PILOT_ARMOR;
  data: LancerItemPilotArmorDataSourceData;
}
interface LancerItemPilotArmorDataPropertiesData extends LancerItemPilotArmorDataSourceData {}
interface LancerItemPilotArmorDataProperties {
  type: EntryType.PILOT_ARMOR;
  data: LancerItemPilotArmorDataPropertiesData;
}

interface LancerItemPilotGearDataSourceData {
  derived: DerivedProperties<EntryType.PILOT_GEAR>;
  name: string;
  lid: string;
  description: string;
  tags: unknown[];
}
interface LancerItemPilotGearDataSource {
  type: EntryType.PILOT_GEAR;
  data: LancerItemPilotGearDataSourceData;
}
interface LancerItemPilotGearDataPropertiesData extends LancerItemPilotGearDataSourceData {}
interface LancerItemPilotGearDataProperties {
  type: EntryType.PILOT_GEAR;
  data: LancerItemPilotGearDataPropertiesData;
}

interface LancerItemPilotWeaponDataSourceData {
  derived: DerivedProperties<EntryType.PILOT_WEAPON>;
  name: string;
  lid: string;
}
interface LancerItemPilotWeaponDataSource {
  type: EntryType.PILOT_WEAPON;
  data: LancerItemPilotWeaponDataSourceData;
}
interface LancerItemPilotWeaponDataPropertiesData extends LancerItemPilotWeaponDataSourceData {}
interface LancerItemPilotWeaponDataProperties {
  type: EntryType.PILOT_WEAPON;
  data: LancerItemPilotWeaponDataPropertiesData;
}

interface LancerItemQuirkDataSourceData {
  derived: DerivedProperties<EntryType.QUIRK>;
  name: string;
  lid: string;
}
interface LancerItemQuirkDataSource {
  type: EntryType.QUIRK;
  data: LancerItemQuirkDataSourceData;
}
interface LancerItemQuirkDataPropertiesData extends LancerItemQuirkDataSourceData {}
interface LancerItemQuirkDataProperties {
  type: EntryType.QUIRK;
  data: LancerItemQuirkDataPropertiesData;
}

interface LancerItemReserveDataSourceData {
  derived: DerivedProperties<EntryType.RESERVE>;
  name: string;
  lid: string;
}
interface LancerItemReserveDataSource {
  type: EntryType.RESERVE;
  data: LancerItemReserveDataSourceData;
}
interface LancerItemReserveDataPropertiesData extends LancerItemReserveDataSourceData {}
interface LancerItemReserveDataProperties {
  type: EntryType.RESERVE;
  data: LancerItemReserveDataPropertiesData;
}

interface LancerItemSitrepDataSourceData {
  derived: DerivedProperties<EntryType.SITREP>;
  name: string;
  lid: string;
}
interface LancerItemSitrepDataSource {
  type: EntryType.SITREP;
  data: LancerItemSitrepDataSourceData;
}
interface LancerItemSitrepDataPropertiesData extends LancerItemSitrepDataSourceData {}
interface LancerItemSitrepDataProperties {
  type: EntryType.SITREP;
  data: LancerItemSitrepDataPropertiesData;
}

interface LancerItemSkillDataSourceData {
  derived: DerivedProperties<EntryType.SKILL>;
  name: string;
  lid: string;
  rank: number;
}
interface LancerItemSkillDataSource {
  type: EntryType.SKILL;
  data: LancerItemSkillDataSourceData;
}
interface LancerItemSkillDataPropertiesData extends LancerItemSkillDataSourceData {}
interface LancerItemSkillDataProperties {
  type: EntryType.SKILL;
  data: LancerItemSkillDataPropertiesData;
}

interface LancerItemStatusDataSourceData {
  derived: DerivedProperties<EntryType.STATUS>;
  name: string;
  lid: string;
}
interface LancerItemStatusDataSource {
  type: EntryType.STATUS;
  data: LancerItemStatusDataSourceData;
}
interface LancerItemStatusDataPropertiesData extends LancerItemStatusDataSourceData {}
interface LancerItemStatusDataProperties {
  type: EntryType.STATUS;
  data: LancerItemStatusDataPropertiesData;
}

interface LancerItemTagDataSourceData {
  derived: DerivedProperties<EntryType.TAG>;
  name: string;
  lid: string;
}
interface LancerItemTagDataSource {
  type: EntryType.TAG;
  data: LancerItemTagDataSourceData;
}
interface LancerItemTagDataPropertiesData extends LancerItemTagDataSourceData {}
interface LancerItemTagDataProperties {
  type: EntryType.TAG;
  data: LancerItemTagDataPropertiesData;
}

interface LancerItemTalentDataSourceData {
  derived: DerivedProperties<EntryType.TALENT>;
  name: string;
  lid: string;
  curr_rank: number;
}
interface LancerItemTalentDataSource {
  type: EntryType.TALENT;
  data: LancerItemTalentDataSourceData;
}
interface LancerItemTalentDataPropertiesData extends LancerItemTalentDataSourceData {}
interface LancerItemTalentDataProperties {
  type: EntryType.TALENT;
  data: LancerItemTalentDataPropertiesData;
}

interface LancerItemWeaponModDataSourceData {
  derived: DerivedProperties<EntryType.WEAPON_MOD>;
  name: string;
  lid: string;
}
interface LancerItemWeaponModDataSource {
  type: EntryType.WEAPON_MOD;
  data: LancerItemWeaponModDataSourceData;
}
interface LancerItemWeaponModDataPropertiesData extends LancerItemWeaponModDataSourceData {}
interface LancerItemWeaponModDataProperties {
  type: EntryType.WEAPON_MOD;
  data: LancerItemWeaponModDataPropertiesData;
}

type LancerItemDataSource =
  | LancerItemEnvironmentDataSource
  | LancerItemFactionDataSource
  | LancerItemFrameDataSource
  | LancerItemLicenseDataSource
  | LancerItemManufacturerDataSource
  | LancerItemMechSystemDataSource
  | LancerItemMechWeaponDataSource
  | LancerItemNpcClassDataSource
  | LancerItemNpcFeatureDataSource
  | LancerItemNpcTemplateDataSource
  | LancerItemOrganizationDataSource
  | LancerItemPilotArmorDataSource
  | LancerItemPilotGearDataSource
  | LancerItemPilotWeaponDataSource
  | LancerItemQuirkDataSource
  | LancerItemReserveDataSource
  | LancerItemSitrepDataSource
  | LancerItemSkillDataSource
  | LancerItemStatusDataSource
  | LancerItemTagDataSource
  | LancerItemTalentDataSource
  | LancerItemWeaponModDataSource;

type LancerItemDataProperties =
  | LancerItemEnvironmentDataProperties
  | LancerItemFactionDataProperties
  | LancerItemFrameDataProperties
  | LancerItemLicenseDataProperties
  | LancerItemManufacturerDataProperties
  | LancerItemMechSystemDataProperties
  | LancerItemMechWeaponDataProperties
  | LancerItemNpcClassDataProperties
  | LancerItemNpcFeatureDataProperties
  | LancerItemNpcTemplateDataProperties
  | LancerItemOrganizationDataProperties
  | LancerItemPilotArmorDataProperties
  | LancerItemPilotGearDataProperties
  | LancerItemPilotWeaponDataProperties
  | LancerItemQuirkDataProperties
  | LancerItemReserveDataProperties
  | LancerItemSitrepDataProperties
  | LancerItemSkillDataProperties
  | LancerItemStatusDataProperties
  | LancerItemTagDataProperties
  | LancerItemTalentDataProperties
  | LancerItemWeaponModDataProperties;

declare global {
  interface SourceConfig {
    Item: LancerItemDataSource;
  }
  interface DataConfig {
    Item: LancerItemDataProperties;
  }
  interface DocumentClassConfig {
    Item: typeof LancerItem;
  }
}

export class LancerItem extends Item {
  /*
  data!: FoundryRegItemData<T> & {
    data: {
      // Include additional derived info
      derived: {
        // license: RegRef<EntryType.LICENSE> | null; // The license granting this item, if one could be found
        max_uses: number; // The max uses, augmented to also include any actor bonuses
      };
    };
  };
  */

  // We can narrow the type significantly (make this T???)
  /*
  get type(): T {
    return super.type as T;
  }
  */

  /** Force name down to item,
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
    // @ts-ignore Something in machine mind is tangled up
    dr.mm_promise = system_ready
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
}

// Provide some convenient shorthands
export type LancerCoreBonus = LancerItem;
export type LancerFrame = LancerItem;
export type LancerLicense = LancerItem;
export type LancerPilotArmor = LancerItem;
export type LancerPilotWeapon = LancerItem;
export type LancerPilotGear = LancerItem;
export type LancerMechSystem = LancerItem;
export type LancerMechWeapon = LancerItem;
export type LancerNpcFeatureData = FoundryRegItemData<EntryType.NPC_FEATURE>;
export type LancerNpcFeature = LancerItem;
export type LancerNpcTemplate = LancerItem;
export type LancerNpcClass = LancerItem;
export type LancerSkill = LancerItem;
export type LancerTalent = LancerItem;
export type LancerWeaponMod = LancerItem;

export type AnyLancerItem = LancerItem;
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
