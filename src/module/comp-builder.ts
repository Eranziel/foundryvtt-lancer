import { LANCER } from "./config";
const lp = LANCER.log_prefix;
import { LCPIndex } from "./apps/lcpManager";
import { get_pack } from "./util/doc";
import type { LancerActor } from "./actor/lancer-actor";
import type { LancerItem } from "./item/lancer-item";
import { EntryType } from "./enums";
import { IContentPack } from "./util/mmigration/packed-types";

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
    let total_items = 0;
    total_items += cp.data.coreBonuses?.length ?? 0;
    total_items += cp.data.frames?.length ?? 0;
    total_items += cp.data.mods?.length ?? 0;
    total_items += cp.data.npcClasses?.length ?? 0;
    total_items += cp.data.npcFeatures?.length ?? 0;
    total_items += cp.data.npcTemplates?.length ?? 0;
    total_items += cp.data.pilotGear?.length ?? 0;
    total_items += cp.data.reserves?.length ?? 0;
    total_items += cp.data.skills?.length ?? 0;
    total_items += cp.data.statuses?.length ?? 0;
    total_items += cp.data.systems?.length ?? 0;
    total_items += cp.data.tags?.length ?? 0;
    total_items += cp.data.talents?.length ?? 0;
    total_items += cp.data.weapons?.length ?? 0;

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
    let transmit_count = 0;
    let progress_hook = (doc: any) => {
      if (doc.pack && !doc.parent) {
        // Presumably part of this import
        transmit_count++;
        progress_callback!(transmit_count, total_items);
      }
    };
    Hooks.on("createActor", progress_hook);
    Hooks.on("createItem", progress_hook);

    console.log("TODO");

    Hooks.off("createActor", progress_hook);
    Hooks.off("createItem", progress_hook);

    // Finish by forcing all packs to re-prepare
    for (let p of Object.values(EntryType)) {
      (await get_pack(p)).clear();
    }
    progress_callback(transmit_count, total_items);
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
