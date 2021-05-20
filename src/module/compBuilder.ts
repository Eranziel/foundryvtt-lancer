import { LANCER } from "./config";
const lp = LANCER.log_prefix;
import {
  EntryType,
  funcs,
  IContentPack,
  LiveEntryTypes,
  OpCtx,
  quick_relinker,
  RegEntry,
  RegEnv,
  Registry,
  StaticReg,
} from "machine-mind";
import { FoundryReg } from "./mm-util/foundry-reg";
import { invalidate_cached_pack_map } from "./mm-util/db_abstractions";

// Some useful subgroupings
type MechItemEntryType = EntryType.FRAME | EntryType.MECH_WEAPON | EntryType.MECH_SYSTEM | EntryType.WEAPON_MOD;
type PilotItemEntryType =
  | EntryType.CORE_BONUS
  | EntryType.TALENT
  | EntryType.SKILL
  | EntryType.QUIRK
  | EntryType.RESERVE
  | EntryType.FACTION
  | EntryType.ORGANIZATION
  | EntryType.PILOT_ARMOR
  | EntryType.PILOT_WEAPON
  | EntryType.PILOT_GEAR /* | EntryType.LICENSE */;

type ItemEntryType = MechItemEntryType | PilotItemEntryType;

// Clear all packs
export async function clear_all(): Promise<void> {
  await set_all_lock(false);
  for (let p of Object.values(EntryType)) {
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
  await set_all_lock(true);
}

// Transfers a category. Returns a list of all the insinuated items
async function transfer_cat<G extends EntryType>(
  type: G,
  from: Registry,
  to: Registry,
  ctx: OpCtx
): Promise<LiveEntryTypes<G>[]> {
  // Insinuate each item in the cat
  invalidate_cached_pack_map(type);
  let from_cat = from.get_cat(type);

  let items: LiveEntryTypes<G>[] = [];

  for (let item of await from_cat.list_live(ctx)) {
    // Do the deed
    let insinuated = (await item.insinuate(to, null, {
      relinker: quick_relinker({
        key_pairs: [["LID", "lid"] as any, ["Name", "name"]],
      }) as any,
    })) as LiveEntryTypes<G>;
    items.push(insinuated);
    // We try pretty hard to find a matching item.
    // First by MMID
    // if (has_lid(src_item)) {
    /*
          let by_id = await dest_cat.lookup_lid_live(ctx, (src_item as any).LID);
          if (by_id) {
            new_v = false;
            linked_items.push(by_id as any);
            return by_id;
          }
        } else {
          let by_name = await dest_cat.lookup_live(ctx, cand => cand.name == src_item.Name);
          if (by_name) {
            new_v = false;
            linked_items.push(by_name as any);
            return by_name;
          }
        }

        // We give up! Make a new thing
        return null;
      },
    })) as unknown) as RegEntry<T>;
    */
  }
  return items;
}

export async function import_cp(
  cp: IContentPack,
  progress_callback?: (done: number, out_of: number) => void
): Promise<void> {
  await set_all_lock(false);

  // Stub in a progress callback so we don't have to null check it all the time
  if (!progress_callback) {
    progress_callback = (a, b) => {};
  }

  // Make a static reg, and load in the reg for pre-processing
  let env = new RegEnv();
  let tmp_lcp_reg = new StaticReg(env);

  // Name it compendium so that refs will (mostly) carry through properly. Id's will still be borked but fallback lid's should handle that
  tmp_lcp_reg.set_name("compendium|compendium");
  await funcs.intake_pack(cp, tmp_lcp_reg);

  // Count the total items in the reg
  let total_items = 0;
  for (let type of Object.values(EntryType)) {
    let cat = tmp_lcp_reg.get_cat(type);
    total_items += (await cat.raw_map()).size;
  }

  // Insinuate data to the actual foundry reg
  // We want to do globals first
  // We only want to do "top level features" - so no deployables, etc that would be included in a frame/weapon/whatever (as they will be insinuated naturally)
  let comp_reg = new FoundryReg({
    item_source: ["compendium", null],
    actor_source: "compendium",
  });
  let dest_ctx = new OpCtx();

  let transmit_count = 0;

  // Do globals
  transmit_count += await transfer_cat(EntryType.MANUFACTURER, tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
  progress_callback(transmit_count, total_items);
  transmit_count += await transfer_cat(EntryType.TAG, tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
  progress_callback(transmit_count, total_items);

  let errata: EntryType[] = [EntryType.DEPLOYABLE, EntryType.TAG, EntryType.MANUFACTURER];

  // Do the rest
  for (let type of Object.values(EntryType)) {
    // Skip if subtype
    if (!errata.includes(type)) {
      transmit_count += await transfer_cat(type, tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
      progress_callback(transmit_count, total_items);
    }
  }

  progress_callback(transmit_count, total_items);
  await set_all_lock(true);
}

// Lock/Unlock all packs
async function set_all_lock(lock: boolean) {
  // Unlock all the packs
  const config = game.settings.get("core", "compendiumConfiguration");
  console.log(`${lp} Pre-unlock config:`, config);

  for (let p of Object.values(EntryType)) {
    const key = `world.${p}`;
    if (!config[key]) {
      config[key] = { private: false, locked: lock };
    } else {
      config[key] = mergeObject(config[key], { locked: lock });
    }
  }
  await game.settings.set("core", "compendiumConfiguration", config);
}
