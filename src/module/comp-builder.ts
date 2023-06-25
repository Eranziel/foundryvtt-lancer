import { LANCER } from "./config";
const lp = LANCER.log_prefix;
import { LCPIndex } from "./apps/lcp-manager";
import { get_pack } from "./util/doc";
import type { LancerActor } from "./actor/lancer-actor";
import { LancerItem, LancerLICENSE } from "./item/lancer-item";
import { EntryType } from "./enums";
import {
  IContentPack,
  PackedPilotArmorData,
  PackedPilotGearData,
  PackedPilotWeaponData,
} from "./util/unpacking/packed-types";
import { UnpackContext } from "./models/shared";
import { unpackMechWeapon } from "./models/items/mech_weapon";
import { unpackFrame } from "./models/items/frame";
import { unpackMechSystem } from "./models/items/mech_system";
import { unpackCoreBonus } from "./models/items/core_bonus";
import { TagData, TagTemplateData, unpackTag, unpackTagTemplate } from "./models/bits/tag";
import { unpackTalent } from "./models/items/talent";
import { unpackBond } from "./models/items/bond";
import { unpackPilotArmor } from "./models/items/pilot_armor";
import { unpackPilotGear } from "./models/items/pilot_gear";
import { unpackPilotWeapon } from "./models/items/pilot_weapon";
import { unpackSkill } from "./models/items/skill";
import { unpackLicense } from "./models/items/license";
import { unpackNpcClass } from "./models/items/npc_class";
import { unpackNpcTemplate } from "./models/items/npc_template";
import { unpackNpcFeature } from "./models/items/npc_feature";
import { unpackWeaponMod } from "./models/items/weapon_mod";
import { unpackReserve } from "./models/items/reserve";
import { unpackStatus } from "./models/items/status";

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
    totalItems += cp.data.bonds?.length ?? 0;
    totalItems += cp.data.weapons?.length ?? 0;

    // Iterate over everything in core, collecting all lids into a map of LID -> document
    let existing_lids: Map<string, LancerItem | LancerActor> = new Map();
    for (let et of Object.values(EntryType)) {
      let pack = await get_pack(et);
      // Get them all
      let docs = await pack.getDocuments();
      // Get their ids
      docs.forEach(d => {
        // @ts-expect-error Should be fixed with v10 types
        existing_lids.set((d as LancerActor | LancerItem).system.lid, d);
      });
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
    let allBonds = cp.data.bonds?.map(b => unpackBond(b)) ?? [];
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

    // Get creating, or updating if the lid is already created. Typing is extremely fuzzy here, sorry, I just didn't really want to fight it
    const createOrUpdateDocs = async (doc_class: any, item_data: Array<any>, et: EntryType) => {
      let existing_updates = [];
      let new_creates = [];
      for (let d of item_data) {
        let existing = existing_lids.get(d.system.lid);
        if (existing) {
          // Formulate as an update
          existing_updates.push({
            ...d,
            _id: existing.id,
          });
        } else {
          // Formulate as a doc
          new_creates.push(d);
        }
      }
      await doc_class.createDocuments(new_creates, { pack: `world.${et}` });
      await doc_class.updateDocuments(existing_updates, { pack: `world.${et}` });
    };

    await createOrUpdateDocs(CONFIG.Item.documentClass, allCoreBonuses, EntryType.CORE_BONUS);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allFrames, EntryType.FRAME);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allMods, EntryType.WEAPON_MOD);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allLicenses, EntryType.LICENSE);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allNpcClasses, EntryType.NPC_CLASS);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allNpcTemplates, EntryType.NPC_TEMPLATE);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allNpcFeatures, EntryType.NPC_FEATURE);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allPilotArmor, EntryType.PILOT_ARMOR);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allPilotGear, EntryType.PILOT_GEAR);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allPilotWeapons, EntryType.PILOT_WEAPON);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allReserves, EntryType.RESERVE);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allSkills, EntryType.SKILL);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allStatuses, EntryType.STATUS);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allSystems, EntryType.MECH_SYSTEM);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allTalents, EntryType.TALENT);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allBonds, EntryType.BOND);
    await createOrUpdateDocs(CONFIG.Item.documentClass, allWeapons, EntryType.MECH_WEAPON);
    await createOrUpdateDocs(CONFIG.Actor.documentClass, context.createdDeployables, EntryType.DEPLOYABLE);

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
