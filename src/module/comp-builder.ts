import { LANCER } from "./config.js";
const lp = LANCER.log_prefix;
import { LCPIndex } from "./apps/lcp-manager.js";
import { get_pack } from "./util/doc.js";
import type { LancerActor } from "./actor/lancer-actor.js";
import { LancerItem } from "./item/lancer-item.js";
import { EntryType } from "./enums.js";
import type {
  IContentPack,
  PackedPilotArmorData,
  PackedPilotGearData,
  PackedPilotWeaponData,
} from "./util/unpacking/packed-types.js";
import type { UnpackContext } from "./models/shared.js";
import { unpackMechWeapon } from "./models/items/mech_weapon.js";
import { unpackFrame } from "./models/items/frame.js";
import { unpackMechSystem } from "./models/items/mech_system.js";
import { unpackCoreBonus } from "./models/items/core_bonus.js";
import { unpackTagTemplate } from "./models/bits/tag.js";
import type { TagTemplateData } from "./models/bits/tag.js";
import { unpackTalent } from "./models/items/talent.js";
import { unpackPilotArmor } from "./models/items/pilot_armor.js";
import { unpackPilotGear } from "./models/items/pilot_gear.js";
import { unpackPilotWeapon } from "./models/items/pilot_weapon.js";
import { unpackSkill } from "./models/items/skill.js";
import { unpackLicense } from "./models/items/license.js";
import { unpackNpcClass } from "./models/items/npc_class.js";
import { unpackNpcTemplate } from "./models/items/npc_template.js";
import { unpackNpcFeature } from "./models/items/npc_feature.js";
import { unpackWeaponMod } from "./models/items/weapon_mod.js";
import { unpackReserve } from "./models/items/reserve.js";
import { unpackStatus } from "./models/items/status.js";

export const PACK_SCOPE = "world";

// Clear all packs
export async function clearAll(): Promise<void> {
  await setAllLock(false);
  for (let p of Object.values(EntryType)) {
    let pack = game.packs.get(`${PACK_SCOPE}.${p}`);
    if (!pack) continue;

    let docs = await pack.getDocuments();
    let keys = docs.map(d => d.id!);
    await pack.documentClass.deleteDocuments(keys, { pack: pack.collection });
  }
  await setAllLock(true);
}

export async function importCP(
  cp: IContentPack,
  progress_callback?: (done: number, out_of: number) => void
): Promise<void> {
  await setAllLock(false);

  try {
    // Stub in a progress callback so we don't have to null check it all the time
    if (!progress_callback) {
      progress_callback = (_a, _b) => {};
    }

    // Count the total items in the reg. We only do this for progress bar accurace
    let totalItems = 0;
    totalItems += cp.data.coreBonuses?.length ?? 0;
    totalItems += cp.data.frames?.length ?? 0;
    totalItems += cp.data.mods?.length ?? 0;
    totalItems += cp.data.npcClasses?.length ?? 0;
    totalItems += cp.data.npcFeatures?.length ?? 0;
    totalItems += cp.data.npcTemplates?.length ?? 0;
    totalItems += cp.data.pilotGear?.length ?? 0;
    totalItems += cp.data.reserves?.length ?? 0;
    totalItems += cp.data.skills?.length ?? 0;
    totalItems += cp.data.statuses?.length ?? 0;
    totalItems += cp.data.systems?.length ?? 0;
    totalItems += cp.data.tags?.length ?? 0;
    totalItems += cp.data.talents?.length ?? 0;
    totalItems += cp.data.weapons?.length ?? 0;

    // Iterate over everything in core, collecting all lids
    let existing_lids: string[] = [];
    for (let et of Object.values(EntryType)) {
      let pack = await get_pack(et);
      // Get them all
      let docs = await pack.getDocuments();
      // Get their ids
      // @ts-expect-error Should be fixed with v10 types
      let doc_lids = docs.map(d => (d as LancerActor | LancerItem).system.lid);
      existing_lids.push(...doc_lids);
    }

    // Import data to the actual foundry reg
    let transmitCount = 0;
    let progress_hook = (doc: any) => {
      if (doc.pack && !doc.parent) {
        // Presumably part of this import
        transmitCount++;
        progress_callback!(transmitCount, totalItems);
      }
    };
    Hooks.on("createItem", progress_hook);

    let context: UnpackContext = {
      createdDeployables: [],
    };

    let allCoreBonuses = cp.data.coreBonuses?.map(cb => unpackCoreBonus(cb, context)) ?? [];
    let allFrames = cp.data.frames?.map(d => unpackFrame(d, context)) ?? [];
    let allMods = cp.data.mods?.map(d => unpackWeaponMod(d, context)) ?? [];
    let allNpcClasses = cp.data.npcClasses?.map(d => unpackNpcClass(d, context)) ?? [];
    let allNpcFeatures = cp.data.npcFeatures?.map(d => unpackNpcFeature(d, context)) ?? [];
    let allNpcTemplates = cp.data.npcTemplates?.map(d => unpackNpcTemplate(d, context)) ?? [];
    let allPilotArmor =
      cp.data.pilotGear
        ?.filter(g => g.type == "Armor")
        .map(pa => unpackPilotArmor(pa as PackedPilotArmorData, context)) ?? [];
    let allPilotGear =
      cp.data.pilotGear?.filter(g => g.type == "Gear").map(pa => unpackPilotGear(pa as PackedPilotGearData, context)) ??
      [];
    let allPilotWeapons =
      cp.data.pilotGear
        ?.filter(g => g.type == "Weapon")
        .map(pa => unpackPilotWeapon(pa as PackedPilotWeaponData, context)) ?? [];
    let allReserves = cp.data.reserves?.map(s => unpackReserve(s, context)) ?? [];
    let allSkills = cp.data.skills?.map(s => unpackSkill(s, context)) ?? [];
    let allStatuses = cp.data.statuses?.map(s => unpackStatus(s, context)) ?? [];
    let allSystems = cp.data.systems?.map(s => unpackMechSystem(s, context)) ?? [];
    let allTags = cp.data.tags?.map(t => unpackTagTemplate(t)) ?? [];
    let allTalents = cp.data.talents?.map(t => unpackTalent(t, context)) ?? [];
    let allWeapons = cp.data.weapons?.map(d => unpackMechWeapon(d, context)) ?? [];
    let allLicenses = [];
    let existingLicenses =
      (await game.packs.get(`world.${EntryType.LICENSE}`)?.getDocuments())?.map(l => (l as any).system.key) ?? [];
    for (let frame of cp.data.frames ?? []) {
      let lid = frame.license_id ?? frame.id;
      // Check existing
      if (existingLicenses.includes(lid)) continue;
      allLicenses.push(unpackLicense(frame.name, lid, frame.source, context));
    }

    // Get creating
    await CONFIG.Item.documentClass.createDocuments(allCoreBonuses, { pack: `world.${EntryType.CORE_BONUS}` });
    await CONFIG.Item.documentClass.createDocuments(allFrames, { pack: `world.${EntryType.FRAME}` });
    await CONFIG.Item.documentClass.createDocuments(allMods, { pack: `world.${EntryType.WEAPON_MOD}` });
    await CONFIG.Item.documentClass.createDocuments(allLicenses, { pack: `world.${EntryType.LICENSE}` });
    await CONFIG.Item.documentClass.createDocuments(allNpcClasses, { pack: `world.${EntryType.NPC_CLASS}` });
    await CONFIG.Item.documentClass.createDocuments(allNpcTemplates, { pack: `world.${EntryType.NPC_TEMPLATE}` });
    await CONFIG.Item.documentClass.createDocuments(allNpcFeatures, { pack: `world.${EntryType.NPC_FEATURE}` });
    await CONFIG.Item.documentClass.createDocuments(allPilotArmor, { pack: `world.${EntryType.PILOT_ARMOR}` });
    await CONFIG.Item.documentClass.createDocuments(allPilotGear, { pack: `world.${EntryType.PILOT_GEAR}` });
    await CONFIG.Item.documentClass.createDocuments(allPilotWeapons, { pack: `world.${EntryType.PILOT_WEAPON}` });
    await CONFIG.Item.documentClass.createDocuments(allReserves, { pack: `world.${EntryType.RESERVE}` });
    await CONFIG.Item.documentClass.createDocuments(allSkills, { pack: `world.${EntryType.SKILL}` });
    await CONFIG.Item.documentClass.createDocuments(allStatuses, { pack: `world.${EntryType.STATUS}` });
    await CONFIG.Item.documentClass.createDocuments(allSystems, { pack: `world.${EntryType.MECH_SYSTEM}` });
    await CONFIG.Item.documentClass.createDocuments(allTalents, { pack: `world.${EntryType.TALENT}` });
    await CONFIG.Item.documentClass.createDocuments(allWeapons, { pack: `world.${EntryType.MECH_WEAPON}` });
    await CONFIG.Actor.documentClass.createDocuments(context.createdDeployables, {
      pack: `world.${EntryType.DEPLOYABLE}`,
    });

    // Tags are stored in config
    let newTagConfig = foundry.utils.duplicate(game.settings.get(game.system.id, LANCER.setting_tag_config)) as Record<
      string,
      TagTemplateData
    >;
    for (let t of allTags) {
      transmitCount++;
      newTagConfig[t.lid] = t;
      progress_callback(transmitCount, totalItems);
    }
    game.settings.set(game.system.id, LANCER.setting_tag_config, newTagConfig);

    Hooks.off("createItem", progress_hook);

    // Finish by forcing all packs to re-prepare
    for (let p of Object.values(EntryType)) {
      (await get_pack(p)).clear();
    }
    progress_callback(transmitCount, totalItems);
  } catch (err) {
    console.error(err);
  }
  await setAllLock(true);
}

// Lock/Unlock all packs
export let IS_IMPORTING = false;
export async function setAllLock(lock = false) {
  IS_IMPORTING = !lock;
  for (let p of Object.values(EntryType)) {
    const key = `${PACK_SCOPE}.${p}`;
    let pack = game.packs.get(key);
    await pack?.configure({ private: false, locked: lock });
  }
}

export async function clearCompendiumData() {
  ui.notifications!.info(`Clearing all LANCER Compendium data. Please wait.`);
  console.log(`${lp} Clearing all LANCER Compendium data.`);
  await game.settings.set(game.system.id, LANCER.setting_core_data, "0.0.0");
  await game.settings.set(game.system.id, LANCER.setting_lcps, new LCPIndex(null));
  await clearAll();
  ui.notifications!.info(`LANCER Compendiums cleared.`);
}
