import { LANCER } from "./config";
import { Converter } from "./ccdata_io";
import { ContentPack } from "machine-mind";
import {
  CORE_BONUS_PACK,
  FRAME_PACK,
  MECH_SYSTEM_PACK,
  MECH_WEAPON_PACK,
  NPC_CLASS_PACK,
  NPC_FEATURE_PACK,
  NPC_TEMPLATE_PACK,
  PACKS,
  PILOT_ARMOR_PACK,
  PILOT_GEAR_PACK,
  PILOT_WEAPON_PACK,
  SKILLS_PACK,
  TALENTS_PACK,
} from "./item/util";
import { LancerItem } from "./item/lancer-item";
import {
  LancerCoreBonusData,
  LancerFrameData,
  LancerLicenseData,
  LancerMechSystemData,
  LancerMechWeaponData,
  LancerNPCClassData,
  LancerNPCFeatureData,
  LancerNPCTemplateData,
  LancerPilotArmorData,
  LancerPilotGearData,
  LancerPilotWeaponData,
  LancerSkillData,
  LancerTalentData,
} from "./interfaces";
const lp = LANCER.log_prefix;

async function unlockAllPacks() {
  // Unlock all the packs
  //@ts-ignore
  const config = game.settings.get("core", Compendium.CONFIG_SETTING);
  console.log(`${lp} Pre-unlock config:`, config);
  for (let p of PACKS) {
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
  for (let p of PACKS) {
    const key = `world.${p}`;
    if (!config[key]) {
      config[key] = { private: false, locked: true };
    }
    config[key] = mergeObject(config[key], { locked: true });
  }
  //@ts-ignore
  await game.settings.set("core", Compendium.CONFIG_SETTING, config);
}

export async function buildCompendiums(cp: ContentPack): Promise<void> {
  await unlockAllPacks();
  const conv = new Converter(cp.ID);
  await buildSkillCompendium(conv, cp);
  await buildTalentCompendium(conv, cp);
  await buildCoreBonusCompendium(conv, cp);
  await buildPilotEquipmentCompendiums(conv, cp);
  await buildFrameCompendium(conv, cp);
  await buildMechSystemCompendium(conv, cp);
  await buildMechWeaponCompendium(conv, cp);
  // TODO: weapon mods
  // TODO: licenses
  await buildNPCClassCompendium(conv, cp);
  await buildNPCTemplateCompendium(conv, cp);
  await buildNPCFeatureCompendium(conv, cp);
  await lockAllPacks();
  return Promise.resolve();
}

export async function clearCompendiums(): Promise<void> {
  await unlockAllPacks();
  for (let p of PACKS) {
    let pack: Compendium | undefined;
    pack = game.packs.get(`world.${p}`);

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

async function updateItem(
  pack: Compendium,
  content: LancerItem[],
  newData:
    | LancerSkillData
    | LancerTalentData
    | LancerCoreBonusData
    | LancerLicenseData
    | LancerPilotArmorData
    | LancerPilotWeaponData
    | LancerPilotGearData
    | LancerFrameData
    | LancerMechSystemData
    | LancerMechWeaponData
    | LancerNPCFeatureData
    | LancerNPCTemplateData
    | LancerNPCClassData,
  type: string,
  img: string
): Promise<Entity> {
  let item = content.find(e => e.data.data.id === newData.id);

  // The item already exists in the pack, update its data.
  if (item) {
    console.log(`LANCER | Updating ${type} ${item.name} in compendium ${pack.collection}`);
    let d: any = item.data;
    d.name = newData.name;
    d.img = img;
    d.data = newData;
    return await pack.updateEntity(d, { entity: item });
  } else {
    // The item doesn't exist yet, create it
    const itemData: any = {
      name: newData.name,
      img: img,
      type: type,
      flags: {},
      data: newData,
    };
    console.log(`LANCER | Adding ${type} ${itemData.name} to compendium ${pack.collection}`);
    // Create an Item from the item data
    return await pack.createEntity(itemData);
  }
}

async function buildSkillCompendium(conv: Converter, cp: ContentPack) {
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of skills and add them each to the Compendium
  for (let skill of skills) {
    await updateItem(pack, content, conv.Skill_to_LancerSkillData(skill), "skill", img);
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of talents and add them each to the Compendium
  for (let talent of talents) {
    await updateItem(pack, content, conv.Talent_to_LancerTalentData(talent), "talent", img);
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let cb of coreBonus) {
    await updateItem(pack, content, conv.CoreBonus_to_LancerCoreBonusData(cb), "core_bonus", img);
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
  let paContent = (await paPack.getContent()) as LancerItem[];
  let pwContent = (await pwPack.getContent()) as LancerItem[];
  let pgContent = (await pgPack.getContent()) as LancerItem[];

  // Iterate through the lists of pilot equipment and add them each to the Compendium
  for (let arm of pilotArmor) {
    await updateItem(
      paPack,
      paContent,
      conv.PilotArmor_to_LancerPilotArmorData(arm),
      "pilot_armor",
      armorImg
    );
  }
  for (let weapon of pilotWeapon) {
    await updateItem(
      pwPack,
      pwContent,
      conv.PilotWeapon_to_LancerPilotWeaponData(weapon),
      "pilot_weapon",
      weaponImg
    );
  }
  for (let gear of pilotGear) {
    await updateItem(
      pgPack,
      pgContent,
      conv.PilotGear_to_LancerPilotGearData(gear),
      "pilot_gear",
      gearImg
    );
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
  let content = (await pack.getContent()) as LancerItem[];

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
    await updateItem(pack, content, conv.Frame_to_LancerFrameData(frame), "frame", img);
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let system of systems) {
    await updateItem(
      pack,
      content,
      conv.MechSystem_to_LancerMechSystemData(system),
      "mech_system",
      img
    );
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let weapon of weapons) {
    await updateItem(
      pack,
      content,
      conv.MechWeapon_to_LancerMechWeaponData(weapon),
      "mech_weapon",
      img
    );
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let cls of npcClasses) {
    await updateItem(pack, content, conv.NpcClass_to_LancerNPCClassData(cls), "npc_class", img);
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let template of npcTemplates) {
    await updateItem(
      pack,
      content,
      conv.NpcTemplate_to_LancerNPCTemplateData(template),
      "npc_template",
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
  let content = (await pack.getContent()) as LancerItem[];

  // Iterate through the list of core bonuses and add them each to the Compendium
  for (let feature of npcFeatures) {
    await updateItem(
      pack,
      content,
      conv.NpcFeature_to_LancerNPCFeatureData(feature),
      "npc_feature",
      img
    );
  }
  return Promise.resolve();
}
