import {
  LancerCoreBonusData,
  LancerFrameData,
  LancerItem,
  LancerLicenseData,
  LancerMechSystemData,
  LancerMechWeaponData,
  LancerNpcClassData,
  LancerNpcFeatureData,
  LancerNpcTemplateData,
  LancerPilotArmorData,
  LancerPilotGearData,
  LancerPilotWeaponData,
  LancerSkillData,
  LancerTalentData,
} from "./lancer-item";

import { EntryType, LiveEntryTypes, RegEntryTypes } from "machine-mind";
import { FoundryRegItemData } from "../mm-util/foundry-reg";

/*
export type SupportedCompconEntity =
  | Skill
  | Talent
  | CoreBonus
  | License
  | PilotArmor
  | PilotWeapon
  | PilotGear
  | Frame
  | MechWeapon
  | MechSystem
  | NpcClass
  | NpcTemplate
  | NpcFeature;
  */

// Useful constants
export const SKILLS_PACK = "skills";
export const TALENTS_PACK = "talents";
export const CORE_BONUS_PACK = "core_bonuses";
export const PILOT_ARMOR_PACK = EntryType.PILOT_ARMOR;
export const PILOT_WEAPON_PACK = "pilot_weapons";
export const PILOT_GEAR_PACK = EntryType.PILOT_GEAR;
export const FRAME_PACK = "frames";
export const MECH_SYSTEM_PACK = "systems";
export const MECH_WEAPON_PACK = "weapons";
export const NPC_CLASS_PACK = "npc_classes";
export const NPC_TEMPLATE_PACK = "npc_templates";
export const NPC_FEATURE_PACK = "npc_features";

// Get compendium for the specified entry type
async function get_pack_content<T extends EntryType>(type: T): Promise<FoundryRegItemData<T>[]> {
  let full_pack_name = `world.${type}`;
  let pack = game.packs.get(full_pack_name);
  if (pack) {
    return pack.getContent().then(g => g.map(v => v.data)) as Promise<FoundryRegItemData<T>[]>;
  } else {
    console.warn("No such pack: ", full_pack_name);
    return [];
  }
}

// Lookups. Currently a bit inefficient as it just looks in literally every item in the pack. But oh well
async function pack_lookup<T extends LancerItem<any>>(
  pack_name: string,
  compcon_id: string
): Promise<T | null> {
  let full_pack_name = `world.${pack_name}`;

  let pack = game.packs.get(full_pack_name);
  if (!pack) {
    console.warn("No such pack: ", full_pack_name);
    return null;
  }

  // Lookup in all items
  let index = await pack.getContent();
  let found = index.find(i => i.data.data.id === compcon_id);
  if (!found) {
    return null;
  }

  // Get by index
  return found as T;
}

// These two accumulator classes accomplish mostly the same thing, except one tracks items vs the other data.
/*
export class ItemManifest {
  skills: LancerSkill[] = [];
  talents: LancerTalent[] = [];
  core_bonuses: LancerCoreBonus[] = [];
  licenses: LancerLicense[] = [];
  pilot_armor: LancerPilotArmor[] = [];
  pilot_weapons: LancerPilotWeapon[] = [];
  pilot_gear: LancerPilotGear[] = [];
  frames: LancerFrame[] = [];
  mech_weapons: LancerMechWeapon[] = [];
  mech_systems: LancerMechSystem[] = [];
  npc_classes: LancerNPCClass[] = [];
  npc_templates: LancerNPCTemplate[] = [];
  npc_features: LancerNPCFeature[] = [];

  // Add an item to the accumulator
  add_item(item: LancerItem): ItemManifest {
    // Ugly as sin, but there's little to be done about that
    if (item.type === EntryType.SKILL) {
      this.skills.push(item as LancerSkill);
    } else if (item.type === EntryType.TALENT) {
      this.talents.push(item as LancerTalent);
    } else if (item.type === EntryType.CORE_BONUS) {
      this.core_bonuses.push(item as LancerCoreBonus);
    } else if (item.type === "license") {
      this.licenses.push(item as LancerLicense);
    } else if (item.type === EntryType.PILOT_ARMOR) {
      this.pilot_armor.push(item as LancerPilotArmor);
    } else if (item.type === EntryType.PILOT_WEAPON) {
      this.pilot_weapons.push(item as LancerPilotWeapon);
    } else if (item.type === EntryType.PILOT_GEAR) {
      this.pilot_gear.push(item as LancerPilotGear);
    } else if (item.type === EntryType.FRAME) {
      this.frames.push(item as LancerFrame);
    } else if (item.type === EntryType.MECH_WEAPON) {
      this.mech_weapons.push(item as LancerMechWeapon);
    } else if (item.type === EntryType.MECH_SYSTEM) {
      this.mech_systems.push(item as LancerMechSystem);
    } else if (item.type === EntryType.NPC_CLASS) {
      this.npc_classes.push(item as LancerNPCClass);
    } else if (item.type === EntryType.NPC_TEMPLATE) {
      this.npc_templates.push(item as LancerNPCTemplate);
    } else if (item.type === EntryType.NPC_FEATURE) {
      this.npc_features.push(item as LancerNPCFeature);
    }
    return this;
  }

  // Add several items. Returns this
  add_items(items: Iterable<LancerItem>): ItemManifest {
    for (let i of items) {
      this.add_item(i);
    }
    return this;
  }

  // "Demote" this item to just data. This is inefficient, objectively, but I really don't want to re-implement every function twice
  demote(): ItemDataManifest {
    let r = new ItemDataManifest();
    r.skills.push(...this.skills.map(m => m.data));
    r.talents.push(...this.talents.map(m => m.data));
    r.core_bonuses.push(...this.core_bonuses.map(m => m.data));
    r.licenses.push(...this.licenses.map(m => m.data));
    r.pilot_armor.push(...this.pilot_armor.map(m => m.data));
    r.pilot_weapons.push(...this.pilot_weapons.map(m => m.data));
    r.pilot_gear.push(...this.pilot_gear.map(m => m.data));
    r.frames.push(...this.frames.map(m => m.data));
    r.mech_weapons.push(...this.mech_weapons.map(m => m.data));
    r.mech_systems.push(...this.mech_systems.map(m => m.data));
    r.npc_classes.push(...this.npc_classes.map(m => m.data));
    r.npc_templates.push(...this.npc_templates.map(m => m.data));
    r.npc_features.push(...this.npc_features.map(m => m.data));
    return r;
  }
}
*/

// Caches a filtered list of these thingies
export class ItemDataManifest {
  [EntryType.SKILL]: LancerSkillData[] = [];
  [EntryType.TALENT]: LancerTalentData[] = [];
  [EntryType.CORE_BONUS]: LancerCoreBonusData[] = [];
  [EntryType.LICENSE]: LancerLicenseData[] = [];
  [EntryType.PILOT_ARMOR]: LancerPilotArmorData[] = [];
  [EntryType.PILOT_WEAPON]: LancerPilotWeaponData[] = [];
  [EntryType.PILOT_GEAR]: LancerPilotGearData[] = [];
  [EntryType.FRAME]: LancerFrameData[] = [];
  [EntryType.MECH_WEAPON]: LancerMechWeaponData[] = [];
  [EntryType.MECH_SYSTEM]: LancerMechSystemData[] = [];
  [EntryType.NPC_CLASS]: LancerNpcClassData[] = [];
  [EntryType.NPC_TEMPLATE]: LancerNpcTemplateData[] = [];
  [EntryType.NPC_FEATURE]: LancerNpcFeatureData[] = [];

  // Add an item to the accumulator. Returns self
  add_item(item: FoundryRegItemData<any>): ItemDataManifest {
    // Ugly as sin, but there's little to be done about that
    if (item.type === EntryType.SKILL) {
      this.skill.push(item as LancerSkillData);
    } else if (item.type === EntryType.TALENT) {
      this.talent.push(item as LancerTalentData);
    } else if (item.type === EntryType.CORE_BONUS) {
      this.core_bonus.push(item as LancerCoreBonusData);
    } else if (item.type === "license") {
      this.license.push(item as LancerLicenseData);
    } else if (item.type === EntryType.PILOT_ARMOR) {
      this.pilot_armor.push(item as LancerPilotArmorData);
    } else if (item.type === EntryType.PILOT_WEAPON) {
      this.pilot_weapon.push(item as LancerPilotWeaponData);
    } else if (item.type === EntryType.PILOT_GEAR) {
      this.pilot_gear.push(item as LancerPilotGearData);
    } else if (item.type === EntryType.FRAME) {
      this.frame.push(item as LancerFrameData);
    } else if (item.type === EntryType.MECH_WEAPON) {
      this.mech_weapon.push(item as LancerMechWeaponData);
    } else if (item.type === EntryType.MECH_SYSTEM) {
      this.mech_system.push(item as LancerMechSystemData);
    } else if (item.type === EntryType.NPC_CLASS) {
      this.npc_class.push(item as LancerNpcClassData);
    } else if (item.type === EntryType.NPC_TEMPLATE) {
      this.npc_template.push(item as LancerNpcTemplateData);
    } else if (item.type === EntryType.NPC_FEATURE) {
      this.npc_feature.push(item as LancerNpcFeatureData);
    }

    return this;
  }

  // Add several items. Returns this
  add_items(items: Iterable<FoundryRegItemData<any>>): ItemDataManifest {
    for (let i of items) {
      this.add_item(i);
    }
    return this;
  }

  // I forget why I made this - its kind of useless generally, since typically you can just use the o.g. source that was used to make the manifest. Whatever
  flatten(): FoundryRegItemData<any>[] {
    return [
      ...this.core_bonus,
      ...this.frame,
      ...this.license,
      ...this.mech_system,
      ...this.mech_weapon,
      ...this.pilot_armor,
      ...this.pilot_gear,
      ...this.pilot_weapon,
      ...this.skill,
      ...this.talent,
      ...this.npc_class,
      ...this.npc_feature,
      ...this.npc_template,
    ];
  }

  // Counts the sp for systems, weapons, mods, etc
  count_sp(): number {
    let acc = 0;
    // Systems
    for (let sys of this.mech_system) {
      acc += sys.data.sp;
    }

    // Mods
    //for(let mod of items.mo

    // Weapons
    for (let wep of this.mech_weapon) {
      acc += wep.data.sp;
    }

    return acc;
  }
}

/*
export async function MachineMind_to_VTT_create_items(
  x: SupportedCompconEntity[]
): Promise<LancerItem[]> {
  let data = x.map(MachineMind_to_VTT_data);
  return LancerItem.createMany(data) as Promise<LancerItem[]>;
}

// TODO: implement
export function MachineMind_to_VTT_data(x: SupportedCompconEntity): LancerItemData[] {
  let conv = new Converter("");

  // In most cases, serialized data is fine
  if (x instanceof Skill) {
    //return conv.ISkillData_to_LancerSkillData(Skill.Serialize(x));
  }
  return null as any;
}

// Basically, just wraps the awaiting and null checking aspects of pushing found items to an array
async function push_helper<T extends LancerItem>(
  into: T[],
  errors: string[],
  pack: string,
  item: CompendiumItem | CustomSkill
) {
  let found_item = await pack_lookup<T>(pack, item.ID);
  if (found_item) {
    into.push(found_item);
  } else {
    // ui.notifications.warn(`Unable to find ${item.Name} (${item.ID}) in pack ${pack}`);
    errors.push(`Unable to find ${item.Name} (${item.ID}) in pack ${pack}`);
  }
}

// Given a machine mind pilot, attempts to find all of its equipment by ID in the compendium.
// From there, it adds them all to the pilot
// Failed items will be shown by import
export async function MachineMind_pilot_to_VTT_items_compendium_lookup(
  p: Pilot
): Promise<{ items: LancerItem[]; errors: string[] }> {
  let mech = p.ActiveMech;
  let pilot = p.Loadout;

  let r: LancerItem[] = [];
  let e: string[] = [];

  for (let x of [...pilot.Weapons, ...pilot.ExtendedWeapons]) {
    if (x) await push_helper(r, e, PILOT_WEAPON_PACK, x);
  }

  for (let x of pilot.Armor) {
    if (x) await push_helper(r, e, PILOT_ARMOR_PACK, x);
  }

  for (let x of [...pilot.Gear, ...pilot.ExtendedGear]) {
    if (x) await push_helper(r, e, PILOT_GEAR_PACK, x);
  }

  if (mech) {
    if (mech.ActiveLoadout) {
      for (let x of mech.ActiveLoadout.Weapons) {
        await push_helper(r, e, MECH_WEAPON_PACK, x);
      }

      for (let x of mech.ActiveLoadout.Systems) {
        await push_helper(r, e, MECH_SYSTEM_PACK, x);
      }
    }

    await push_helper(r, e, FRAME_PACK, mech.Frame);
  }

  // for(let x of p.Licenses) {
  // await push_helper(r, LICENSE_PACK, x.ID);
  // }

  for (let x of p.CoreBonuses) {
    await push_helper(r, e, CORE_BONUS_PACK, x);
  }

  for (let x of p.Skills) {
    if (x.IsCustom) {
      let conv = new Converter("");
      let sd: LancerSkillData = conv.CustomSkill_to_LancerSkillData(x.Skill as CustomSkill);
      sd.rank = x.Rank;
      let sid: LancerSkillItemData = {
        name: sd.name,
        type: EntryType.SKILL,
        img: "systems/lancer/assets/icons/skill.svg",
        flags: {},
        data: sd,
      };
      let customSkill = new LancerSkill(sid, {});
      r.push(customSkill);
    } else {
      await push_helper(r, e, SKILLS_PACK, x.Skill);
    }
  }

  for (let x of p.Talents) {
    await push_helper(r, e, TALENTS_PACK, x.Talent);
  }

  return {
    items: r,
    errors: e,
  };
}

// Move data to cc from foundry, and vice versa
const COMPENDIUM_CONTENT_PACK = "vtt_cmp";

// Convert all items in the compendium into compcon style entities (via content pack, for convenience)
export async function CompendiumData_as_ContentPack(): Promise<IContentPack> {
  let conv = new Converter("");

  // Get them packs
  let raw_skills = await get_Skills_pack();
  let raw_talents = await get_Talents_pack();
  let raw_core_bonuses = await get_CoreBonuses_pack();
  let raw_armor = await get_PilotArmor_pack();
  let raw_pilot_weapons = await get_PilotWeapons_pack();
  let raw_gear = await get_PilotGear_pack();
  let raw_frames = await get_Frames_pack();
  let raw_systems = await get_MechSystems_pack();
  let raw_weapons = await get_MechWeapons_pack();
  let raw_npc_templates = await get_NpcTemplates_pack();
  let raw_npc_classes = await get_NpcClassses_pack();
  let raw_npc_features = await get_NpcFeatures_pack();

  // Convert
  let skills = raw_skills.map(c => conv.LancerSkillData_to_ISkillData(c.data));
  let coreBonuses = raw_core_bonuses.map(c => conv.LancerCoreBonusData_to_ICoreBonusData(c.data));
  let frames = raw_frames.map(c => conv.LancerFrameData_to_IFrameData(c.data));
  // let mods = raw_frames.map(LancerModData_to_IModData);
  let npcClasses = raw_npc_classes.map(c => conv.LancerNPCClassData_to_INpcClassData(c.data));
  let npcFeatures = raw_npc_features.map(c => conv.LancerNPCFeatureData_to_INpcFeatureData(c.data));
  let npcTemplates = raw_npc_templates.map(c =>
    conv.LancerNPCTemplateData_to_INpcTemplateData(c.data)
  );
  let pilotGear = raw_gear.map(c => conv.LancerPilotGearData_to_IPilotEquipment(c.data));
  let pilotArmor = raw_armor.map(c => conv.LancerPilotArmorData_to_IPilotEquipment(c.data));
  let pilotWeapons = raw_pilot_weapons.map(c =>
    conv.LancerPilotWeaponData_to_IPilotEquipment(c.data)
  );
  let systems = raw_systems.map(c => conv.LancerMechSystemData_to_IMechSystemData(c.data));
  let talents = raw_talents.map(c => conv.LancerTalentData_to_ITalentData(c.data));
  let weapons = raw_weapons.map(c => conv.LancerMechWeaponData_to_IMechWeaponData(c.data));

  let res: IContentPackData = {
    skills,
    coreBonuses,
    frames,

    mods: [], // todo
    npcClasses,
    npcFeatures,
    npcTemplates,
    pilotGear: [...pilotArmor, ...pilotGear, ...pilotWeapons],
    systems,
    tags: [], // todo
    talents,
    weapons,

    factions: [],
    manufacturers: [],
  };

  return {
    active: true,
    data: res,
    id: "vtt_cc",
    manifest: {
      author: "machine-mind",
      item_prefix: "", // We assume that it has been pre-prefixed
      name: "Combined foundry vtt compendium data",
      version: "0.0.0",
    },
  };
}

// Populates the machine-mind store with all compendium items, as well as maybe player items (in the future - we'll see)
// Currently that just means eating CompendiumData_as_ContentPack
export async function reload_store(): Promise<void> {
  // Get all compendium data
  let comp = CompendiumData_as_ContentPack();

  // Get all player data
  // -- todo

  // Add the data
  let replacement = new ContentPack(await comp);
  store.compendium.deleteContentPack(COMPENDIUM_CONTENT_PACK);
  store.compendium.addContentPack(replacement);
  store.compendium.populate();
}

*/
