import { LANCER, LancerActorType } from "./config";
const lp = LANCER.log_prefix;
import { EntryType, IContentPack, LiveEntryTypes, RegCat, RegEntryTypes, RegEnv, Registry, StaticReg } from "machine-mind";
import {
  CORE_BONUS_PACK,
  FRAME_PACK,
  MECH_SYSTEM_PACK,
  MECH_WEAPON_PACK,
  NPC_CLASS_PACK,
  NPC_FEATURE_PACK,
  NPC_TEMPLATE_PACK,
  PILOT_ARMOR_PACK,
  PILOT_GEAR_PACK,
  PILOT_WEAPON_PACK,
  SKILLS_PACK,
  TALENTS_PACK,
} from "./item/util";
import { defaults, intake_pack } from "machine-mind/dist/funcs";

// Some useful subgroupings
type MechItemEntryType = EntryType.CORE_SYSTEM | EntryType.FRAME | EntryType.FRAME_TRAIT | EntryType.MECH_WEAPON | EntryType.MECH_SYSTEM | EntryType.WEAPON_MOD;
const MechItemEntryTypes = [EntryType.CORE_SYSTEM , EntryType.FRAME , EntryType.FRAME_TRAIT , EntryType.MECH_WEAPON , EntryType.MECH_SYSTEM , EntryType.WEAPON_MOD];
type PilotItemEntryType = EntryType.CORE_BONUS | EntryType.TALENT | EntryType.SKILL | EntryType.QUIRK | EntryType.RESERVE | EntryType.FACTION | EntryType.ORGANIZATION | EntryType.PILOT_ARMOR | EntryType.PILOT_WEAPON | EntryType.PILOT_GEAR /* | EntryType.LICENSE */; 
const PilotItemEntryTypes = [EntryType.CORE_BONUS , EntryType.TALENT , EntryType.SKILL , EntryType.QUIRK , EntryType.RESERVE , EntryType.FACTION , EntryType.ORGANIZATION , EntryType.PILOT_ARMOR , EntryType.PILOT_WEAPON , EntryType.PILOT_GEAR /* , EntryType.LICENSE */];
type ItemEntryType = MechItemEntryType | PilotItemEntryType;


interface PackMetadata {
    name: string,
    label: string,
    system: "lancer",
    package: "world",
    path: string, // "./packs/skills.db",
    entity: "Item" | "Actor",
}

async function unlockAllPacks() {
  // Unlock all the packs
  //@ts-ignore
  const config = game.settings.get("core", Compendium.CONFIG_SETTING);
  console.log(`${lp} Pre-unlock config:`, config);
  for (let p of Object.values(EntryType)) {
    const key = `world.${p}`;
    if (!config[key]) {
      config[key] = { private: false, locked: false };
    } else {
      config[key] = mergeObject(config[key], { locked: false });
    }
  }
  //@ts-ignore
  await game.settings.set("core", Compendium.CONFIG_SETTING, config);
}

async function lockAllPacks() {
  // Lock all the packs
  //@ts-ignore
  const config = game.settings.get("core", Compendium.CONFIG_SETTING);
  console.log(`${lp} Pre-lock config:`, config);
  for (let p of Object.values(EntryType)) {
    const key = `world.${p}`;
    if (!config[key]) {
      config[key] = { private: false, locked: true };
    }
    config[key] = mergeObject(config[key], { locked: true });
  }
  //@ts-ignore
  await game.settings.set("core", Compendium.CONFIG_SETTING, config);
}

export async function buildCompendiums(cp: IContentPack): Promise<void> {
  // Make a static reg
  let env = new RegEnv();
  let reg = new StaticReg(env);
  await intake_pack(cp, reg);
  
  await unlockAllPacks();
  await buildCompendiumFromReg(reg);
  await lockAllPacks();
  return Promise.resolve();
}

export async function clearCompendiums(): Promise<void> {
  await unlockAllPacks();
  for (let p of Object.values(EntryType)) {
    let pack: Compendium | undefined;
    pack = game.packs.get(`world.${p}`);
    console.log(pack);
    console.log(p);

    if (pack) {
      // Delete every item in the pack
      let index: { _id: string; name: string }[] = await pack.getIndex();
      index.forEach(i => {
        pack?.deleteEntity(i._id);
      });
    }
  }
  await lockAllPacks();

  return Promise.resolve();
}

async function findPack(pack_name: string, metaData: object): Promise<Compendium> {
  let pack: Compendium | undefined;

  // Find existing world compendium
  pack = game.packs.get(`world.${pack_name}`);
  if (!pack) {
    // World compendium doesn't exist, attempt to find a system compendium
    pack = game.packs.get(`lancer.${pack_name}`);
  }
  if (pack) {
    console.log(`${lp} Updating existing compendium: ${pack.collection}.`);
  } else {
    // Compendium doesn't exist yet. Create a new one.
    pack = await Compendium.create(metaData);
    console.log(`${lp} Building new compendium: ${pack.collection}.`);
  }

  return pack;
}

// Sets
async function updateEntity<T extends EntryType>(
  pack: Compendium,
  newData: RegEntryTypes<T>,
  type: EntryType,
  img: string
): Promise<void> {
  //TODO: Simply use machine mind insinuation 

  // default the name to an all-caps
  newData.name = newData.name.toUpperCase();

  // Find existing
  let entry: { _id: string; name: string } | undefined = pack.index.find(
    e => e.name === newData.name
  );

  // The item already exists in the pack, delete it
  if (entry) {
    await pack.deleteEntity(entry._id);
    console.log(`LANCER | Replacing ${type} ${entry.name} in compendium ${pack.collection}`);
  } 

  // Create or -recreate the item
  const entityData: any = {
    name: newData.name,
    img: img,
    type: type,
    flags: {},
    data: newData
  };
  let entity: Entity;
  if(LANCER.actor_types.includes(type as LancerActorType)) {
    entity = new Actor(entityData, {});
  } else {
    entity = new Item(entityData, {});
  }

  console.log(`LANCER | Adding ${type} ${entityData.name} to compendium ${pack.collection}`);
  console.log(entityData);
  let pack_item = await pack.importEntity(entity);
  // await pack_item.update({data: newData}); // For some reason it isn't sticking otherwise???
}

async function updateCompendiumFromCat<T extends EntryType>(from_cat: RegCat<T>, label: string): Promise<void> {
  const pack_name = from_cat.cat;
  const entity_type = [EntryType.MECH, EntryType.NPC, EntryType.PILOT, EntryType.DEPLOYABLE].includes(from_cat.cat) ? "Actor" : "Item";
  const metadata: PackMetadata = {
    name: pack_name,
    entity: entity_type,
    label,
    system: "lancer",
    package: "world",
    path: `./packs/${pack_name}.db`,
  }
  const img = `systems/lancer/assets/icons/${pack_name}.svg`;
  let pack: Compendium = await findPack(pack_name, metadata); // Get or create
  await pack.getIndex();

  // Create them
  for (let item of await from_cat.list_raw()) {
    await updateEntity(pack, item, pack_name, img);
  }
}

async function buildCompendiumFromReg(reg: Registry) {
  for(let type of Object.values(EntryType)) {
    let cat = reg.get_cat(type);
    let label: string;
    switch(type) {
      case EntryType.CORE_BONUS: 
        label = "Core Bonuses";
        break;
      case EntryType.CORE_SYSTEM:
        label = "Core Systems";
        break;
      case EntryType.DEPLOYABLE:
        label = "Deployables";
        break;
      case EntryType.ENVIRONMENT:
        label = "Environments";
        break;
      case EntryType.FACTION:
        label = "Factions";
        break;
      case EntryType.FRAME:
        label = "Frames";
        break;
      case EntryType.FRAME_TRAIT:
        label = "Frame Traits";
        break;
      case EntryType.LICENSE:
        label = "Licenses";
        break;
      case EntryType.MANUFACTURER:
        label = "Manufacturers";
        break;
      case EntryType.MECH:
        label = "Mech Preset";
        break;
      case EntryType.MECH_SYSTEM:
        label = "Mech Systems";
        break;
      case EntryType.MECH_WEAPON:
        label = "Mech Weapons";
        break;
      case EntryType.NPC:
        label = "Npc Presets";
        break;
      case EntryType.NPC_CLASS:
        label = "Npc Classes";
        break;
      case EntryType.NPC_FEATURE:
        label = "Npc Features";
        break;
      case EntryType.NPC_TEMPLATE:
        label = "Npc Templates";
        break;
      case EntryType.ORGANIZATION:
        label = "Organizations";
        break;
      case EntryType.PILOT:
        label = "Pilot Presets";
        break;
      case EntryType.PILOT_ARMOR:
        label = "Pilot Armor";
        break;
      case EntryType.PILOT_GEAR:
        label = "Pilot Gear";
        break;
      case EntryType.PILOT_WEAPON:
        label = "Pilot Weapons";
        break;
      case EntryType.QUIRK:
        label = "Quirks";
        break;
      case EntryType.RESERVE:
        label = "Reserves";
        break;
      case EntryType.SITREP:
        label = "Sitreps";
        break;
      case EntryType.SKILL:
        label = "Skills";
        break;
      case EntryType.STATUS:
        label = "Statuses / Conditions";
        break;
      case EntryType.TAG:
        label = "Tags";
        break;
      case EntryType.TALENT:
        label = "Talents";
        break;
      case EntryType.WEAPON_MOD:
        label = "Weapon mods";
        break;
      default:
        console.error("MISCAT ON " + type);
        label = "MISCATEGORIZED";
        break;
    }
    await updateCompendiumFromCat(cat, label);
  }
}

/*
async function buildSkillCompendium(cp: ContentPack) {
  const skills = cp.Skills;
  const p_name = SKILLS_PACK;
  const img = "systems/lancer/assets/icons/skill.svg";
  const metaData: Object = {
    name: p_name,
    label: "Skill Triggers",
    system: "lancer",
    package: "world",
    path: "./packs/skills.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of skills and add them each to the Compendium
  for (let skill of skills) {
    await updateItem(pack, conv.Skill_to_LancerSkillData(skill), EntryType.SKILL, img);
  }
  return Promise.resolve();
}

async function buildTalentCompendium(conv: Converter, cp: ContentPack) {
  const talents = cp.Talents;
  const p_name = TALENTS_PACK;
  const img = "systems/lancer/assets/icons/talent.svg";
  const metaData: Object = {
    name: p_name,
    label: "Talents",
    system: "lancer",
    package: "world",
    path: "./packs/talents.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of talents and add them each to the Compendium
  for (let talent of talents) {
    await updateItem(pack, conv.Talent_to_LancerTalentData(talent), EntryType.TALENT, img);
  }
  return Promise.resolve();
}

async function buildCoreBonusCompendium(conv: Converter, cp: ContentPack) {
  const coreBonus = cp.CoreBonuses;
  const p_name = CORE_BONUS_PACK;
  const img = "systems/lancer/assets/icons/corebonus.svg";
  const metaData: Object = {
    name: p_name,
    label: "Core Bonuses",
    system: "lancer",
    package: "world",
    path: "./packs/core_bonuses.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let cb of coreBonus) {
    await updateItem(pack, conv.CoreBonus_to_LancerCoreBonusData(cb), EntryType.CORE_BONUS, img);
  }
  return Promise.resolve();
}

async function buildPilotEquipmentCompendiums(conv: Converter, cp: ContentPack) {
  console.log("LANCER | Building Pilot Equipment compendiums.");
  const pilotArmor = cp.PilotArmor;
  const pilotWeapon = cp.PilotWeapons;
  const pilotGear = cp.PilotGear;
  const paName = PILOT_ARMOR_PACK;
  const pwName = PILOT_WEAPON_PACK;
  const pgName = PILOT_GEAR_PACK;
  const armorImg = "systems/lancer/assets/icons/shield_outline.svg";
  const weaponImg = "systems/lancer/assets/icons/weapon.svg";
  const gearImg = "systems/lancer/assets/icons/generic_item.svg";
  const armorMeta: Object = {
    name: paName,
    label: "Pilot Armor",
    system: "lancer",
    package: "world",
    path: "./packs/pilot_armor.db",
    entity: "Item",
  };
  let paPack: Compendium = await findPack(paName, armorMeta);
  const weaponMeta: Object = {
    name: pwName,
    label: "Pilot Weapons",
    system: "lancer",
    package: "world",
    path: "./packs/pilot_weapons.db",
    entity: "Item",
  };
  let pwPack: Compendium = await findPack(pwName, weaponMeta);
  const gearMeta: Object = {
    name: pgName,
    label: "Pilot Gear",
    system: "lancer",
    package: "world",
    path: "./packs/pilot_gear.db",
    entity: "Item",
  };
  let pgPack: Compendium = await findPack(pgName, gearMeta);
  await paPack.getIndex();
  await pwPack.getIndex();
  await pgPack.getIndex();

  // Iterate through the lists of pilot equipment and add them each to the Compendium
  for (let arm of pilotArmor) {
    await updateItem(paPack, conv.PilotArmor_to_LancerPilotArmorData(arm), EntryType.PILOT_ARMOR, armorImg);
  }
  for (let weapon of pilotWeapon) {
    await updateItem(
      pwPack,
      conv.PilotWeapon_to_LancerPilotWeaponData(weapon),
      EntryType.PILOT_WEAPON,
      weaponImg
    );
  }
  for (let gear of pilotGear) {
    await updateItem(pgPack, conv.PilotGear_to_LancerPilotGearData(gear), EntryType.PILOT_GEAR, gearImg);
  }
  return Promise.resolve();
}

async function buildFrameCompendium(conv: Converter, cp: ContentPack) {
  const frames = cp.Frames;
  const p_name = FRAME_PACK;
  const img = "systems/lancer/assets/icons/frame.svg";
  const metaData: Object = {
    name: p_name,
    label: "Frames",
    system: "lancer",
    package: "world",
    path: "./packs/frames.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // const licImg = "systems/lancer/assets/icons/license.svg";
  // const licMetaData: Object = {
  //   name: "licenses",
  //   label: "Licenses",
  //   system: "lancer",
  //   package: "lancer",
  //   path: "./packs/licenses.db",
  //   entity: "Item",
  // };
  // let licPack: Compendium = await findPack("licenses", licMetaData);
  // licPack.locked = false;
  // await licPack.getIndex();

  // Iterate through the list of frames and add them each to the Compendium
  for (let frame of frames) {
    await updateItem(pack, conv.Frame_to_LancerFrameData(frame), EntryType.FRAME, img);
  }
  return Promise.resolve();
}

async function buildMechSystemCompendium(conv: Converter, cp: ContentPack) {
  const systems = cp.MechSystems;
  const p_name = MECH_SYSTEM_PACK;
  const img = "systems/lancer/assets/icons/mech_system.svg";
  const metaData: Object = {
    name: p_name,
    label: "Systems",
    system: "lancer",
    package: "world",
    path: "./packs/systems.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let system of systems) {
    await updateItem(pack, conv.MechSystem_to_LancerMechSystemData(system), EntryType.MECH_SYSTEM, img);
  }
  return Promise.resolve();
}

async function buildMechWeaponCompendium(conv: Converter, cp: ContentPack) {
  const weapons = cp.MechWeapons;
  const p_name = MECH_WEAPON_PACK;
  const img = "systems/lancer/assets/icons/mech_weapon.svg";
  const metaData: Object = {
    name: p_name,
    label: "Weapons",
    system: "lancer",
    package: "world",
    path: "./packs/weapons.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let weapon of weapons) {
    await updateItem(pack, conv.MechWeapon_to_LancerMechWeaponData(weapon), EntryType.MECH_WEAPON, img);
  }
  return Promise.resolve();
}

// TODO: Weapon mods

// TODO: Licenses

async function buildNPCClassCompendium(conv: Converter, cp: ContentPack) {
  const npcClasses = cp.NpcClasses;
  const p_name = NPC_CLASS_PACK;
  const img = "systems/lancer/assets/icons/npc_class.svg";
  const metaData: Object = {
    name: p_name,
    label: "NPC Classes",
    system: "lancer",
    package: "world",
    path: "./packs/npc_classes.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let cls of npcClasses) {
    await updateItem(pack, conv.NpcClass_to_LancerNPCClassData(cls), EntryType.NPC_CLASS, img);
  }
  return Promise.resolve();
}

async function buildNPCTemplateCompendium(conv: Converter, cp: ContentPack) {
  const npcTemplates = cp.NpcTemplates;
  const p_name = NPC_TEMPLATE_PACK;
  const img = "systems/lancer/assets/icons/npc_template.svg";
  const metaData: Object = {
    name: p_name,
    label: "NPC Templates",
    system: "lancer",
    package: "world",
    path: "./packs/npc_templates.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let template of npcTemplates) {
    await updateItem(
      pack,
      conv.NpcTemplate_to_LancerNPCTemplateData(template),
      EntryType.NPC_TEMPLATE,
      img
    );
  }
  return Promise.resolve();
}

async function buildNPCFeatureCompendium(conv: Converter, cp: ContentPack) {
  const npcFeatures = cp.NpcFeatures;
  const p_name = NPC_FEATURE_PACK;
  const img = "systems/lancer/assets/icons/npc_feature.svg";
  const metaData: Object = {
    name: p_name,
    label: "NPC Features",
    system: "lancer",
    package: "world",
    path: "./packs/npc_features.db",
    entity: "Item",
  };
  let pack: Compendium = await findPack(p_name, metaData);
  await pack.getIndex();

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let feature of npcFeatures) {
    await updateItem(pack, conv.NpcFeature_to_LancerNPCFeatureData(feature), EntryType.NPC_FEATURE, img);
  }
  return Promise.resolve();
}

*/