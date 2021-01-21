import { LANCER } from "./config";
const lp = LANCER.log_prefix;
import {
  EntryType,
  funcs,
  IContentPack,
  InsinuationRecord,
  Manufacturer,
  MechWeapon,
  MechWeaponProfile,
  MidInsinuationRecord,
  OpCtx,
  RegEntry,
  RegEnv,
  Registry,
  StaticReg,
  TagInstance,
  TagTemplate,
} from "machine-mind";
import { FoundryReg } from "./mm-util/foundry-reg";

// Some useful subgroupings
type MechItemEntryType =
  | EntryType.FRAME
  | EntryType.MECH_WEAPON
  | EntryType.MECH_SYSTEM
  | EntryType.WEAPON_MOD;
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

// Unlock all packs
async function unlock_all() {
  // Unlock all the packs
  // @ts-ignore We ignore here because foundry-pc-types does not have the Compendium static var "CONFIG_SETTING"
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
  // @ts-ignore We ignore here because foundry-pc-types does not have the Compendium static var "CONFIG_SETTING"
  await game.settings.set("core", Compendium.CONFIG_SETTING, config);
}

// Lock all packs
async function lock_all() {
  // Lock all the packs
  // @ts-ignore We ignore here because foundry-pc-types does not have the Compendium static var "CONFIG_SETTING"
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

// Clear all packs
export async function clear_all(): Promise<void> {
  // await unlock_all();
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
  // await lock_all();

  return Promise.resolve();
}

/*
// Create or update an item/actor
async function update_entity<T extends EntryType>(
  pack: Compendium,
  new_data: RegEntryTypes<T>,
  compendium_name: string, // How it should show in the compendium
  type: EntryType
): Promise<void> {
  // Find existing
  let entry: { _id: string; name: string } | undefined = pack.index.find(
    e => e.name === compendium_name
  );

  // The item already exists in the pack, delete it
  if (entry) {
    await pack.deleteEntity(entry._id);
    console.log(`LANCER | Replacing ${type} ${entry.name} in compendium ${pack.collection}`);
  }

  // Setup the actual entity data structure
  const entityData: any = {
    name: compendium_name,
    img: TypeIcon(type), // TODO: figure out a better method of transferring extra fields, flags, etc. An "orig" will only half cut it, as some of our fields (name, img, token) are parent to the reg_entry
    type: type,
    flags: {},
    data: new_data,
  };

  // Construct it depending on 
  let entity: Entity;
  if (LANCER.actor_types.includes(type as LancerActorType)) {
    entity = new Actor(entityData, {});
  } else {
    entity = new Item(entityData, {});
  }

  console.log(`LANCER | Adding ${type} ${entityData.name} to compendium ${pack.collection}`);
  console.log(entityData);
  await pack.importEntity(entity);
  // await pack_item.update({data: newData}); // For some reason it isn't sticking otherwise???
}
*/

// Transfers a category. Returns a list of all the insinuated items
async function transfer_cat<T extends EntryType>(type: T, from: Registry, to: Registry, ctx: OpCtx): Promise<RegEntry<T>[]> {
    // Insinuate each item in the cat
    let from_cat = from.get_cat(type);
    let promises: Array<Promise<RegEntry<T>>> = [];

    for (let item of await from_cat.list_live(ctx)) {
      // Do the deed
      let prom = (item.insinuate(to) as Promise<any>).then(insinuated => {
        console.log(`Import | Added ${type} ${item.Name}`);
        return insinuated;
      });
      promises.push(prom);
    }
    return Promise.all(promises);
}

export async function import_cp(cp: IContentPack, progress_callback?: (done: number, out_of: number) => void): Promise<void> {
  // await unlock_all(); // TODO: re-enable i guess?

  // Stub in a progress callback so we don't have to null check it all the time
  if(!progress_callback) {
    progress_callback = (a, b) => {};
  }

  // Make a static reg, and load in the reg for pre-processing
  let env = new RegEnv();
  let tmp_lcp_reg = new StaticReg(env);

  // Name it compendium so that refs will (mostly) carry through properly. Id's will still be borked but fallback mmid's should handle that
  tmp_lcp_reg.set_name("compendium|compendium");
  await funcs.intake_pack(cp, tmp_lcp_reg);

  // Count the total items in the reg
  let total_items = 0;
  for(let type of Object.values(EntryType)) {
    let cat = tmp_lcp_reg.get_cat(type);
    total_items += (await cat.list_raw()).length;
  }

  // Insinuate data to the actual foundry reg
  // We want to do globals first
  // We only want to do "top level features" - so no deployables, etc that would be included in a frame/weapon/whatever (as they will be insinuated naturally)
  let comp_reg = new ImportUtilityReg();
  await comp_reg.init();
  let dest_ctx = new OpCtx();

  let transmit_count = 0;

  // Do globals
  transmit_count += await transfer_cat(EntryType.MANUFACTURER,  tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
  progress_callback(transmit_count, total_items + comp_reg.to_kill_count());
  transmit_count += await transfer_cat(EntryType.TAG,  tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
  progress_callback(transmit_count, total_items + comp_reg.to_kill_count());
  
  let errata: EntryType[] = [EntryType.DEPLOYABLE, EntryType.TAG, EntryType.MANUFACTURER];

  // Do the rest
  for (let type of Object.values(EntryType)) {
    // Skip if subtype
    if (!errata.includes(type)) {
      transmit_count += await transfer_cat(type, tmp_lcp_reg, comp_reg, dest_ctx).then(l => l.length);
      progress_callback(transmit_count, total_items + comp_reg.to_kill_count());
    }
  }

  // Step 4: Kill the old gods
  await comp_reg.execute_order_66();
  progress_callback(transmit_count, total_items + comp_reg.to_kill_count());

  // await lock_all();
}

// This handles name-uniqueness, and destroys and existing entries with unique names
// It also handles migration of Manufacturers

// This is accomplished by tracking all items by name at the start of our import operations
// If any duplicates are encountered, those entries are marked for death, and deleted at the end of the process
class ImportUtilityReg extends FoundryReg {
  // All items in all compendiums at time of import start
  orig_item_lookup: Map<EntryType, Map<string, RegEntry<any>>> = new Map(); // Maps EntryType => name => entry

  // A mapping of types to lists of entries that we have replaced
  deletion_targets: Map<EntryType, RegEntry<any>[]> = new Map();

  // A list of manufacturers that we have imported, used for ref patching. We prefer to use these over whatever might get insinuated
  replacement_manufacturers: Map<string, Manufacturer> = new Map(); // Maps MMID -> Manufacturer
  replacement_tag_templates: Map<string, TagTemplate> = new Map(); // Maps MMID -> Template

  constructor() {
    super({
      actor_source: "compendium",
      item_source: ["compendium", null]
    });
  }

  // Initialize our indexes
  async init() {
    let ctx = new OpCtx();

    // Go through each pack, build up our map
    for (let type of Object.values(EntryType)) {
      // Build our orig object map
      let existing = await this.get_cat(type).list_live(ctx);
      let type_map = new Map<string, RegEntry<any>>();
      for(let e of existing) {
        type_map.set(e.Name, e);
      }
      this.orig_item_lookup.set(type, type_map);

      // Init deletion target list
      this.deletion_targets.set(type, []);

      // Save manufacturers and templates separately. Need these for patching later
      if(type == EntryType.MANUFACTURER) {
        for(let m of existing as Manufacturer[]) {
          this.replacement_manufacturers.set(m.ID, m);
        }
      } else if(type == EntryType.TAG) {
        for(let t of existing as TagTemplate[]) {
          this.replacement_tag_templates.set(t.ID, t);
        }
      }
    }
  }


  // We use a hook to keep track of the imported names, as well as new tags/manufacturers
  async hook_post_insinuate<T extends EntryType>(record: InsinuationRecord<T>) {
    // Check if we need to kill anyone
    let orig = this.orig_item_lookup.get(record.type)?.get(record.new_item.Name);
    if(orig) {
      this.deletion_targets.get(record.type)?.push(orig);
    }

    // Track newly added manufacturers/tags
    if(record.new_item.Type === EntryType.MANUFACTURER) {
      let man = record.new_item as Manufacturer;
      this.replacement_manufacturers.set(man.ID, man);
    } else if(record.new_item.Type === EntryType.TAG) {
      let tag = record.new_item as TagTemplate;
      this.replacement_tag_templates.set(tag.ID, tag);
    }
  }

  // We use a hook to correct "globals" like tags and manufacturers to instead use existing values in the compendium
  async hook_insinuate_pre_final_write<T extends EntryType>(record: MidInsinuationRecord<T>) {
    // A typeless shorthand
    let rp = record.pending as any;

    // Hot-wire our manufacturer/source
    let man = rp.Manufacturer ?? rp.Source;
    if(man) { 
      // Because these aren't insinuated as children, this is a leftover ref from the static reg that is about to go out of scope)
      // So, in this hook, we slot them in with existing/better data!

      // Find a better replacement. Get yourself a new man
      let existing_man = this.replacement_manufacturers.get(man.ID);
      if(existing_man && rp.Manufacturer) {
        rp.Manufacturer = existing_man;
      }
      if(existing_man && rp.Source) {
        rp.Source = existing_man;
      }
    }

    // Hot-wire our tags
    for(let in_tag of [...(rp.Tags ?? []), ...(rp.AddedTags ?? []), ...(rp.Profiles?.flatMap((p: MechWeaponProfile) => p.Tags) ?? [])] as TagInstance[]) {
      // Same shebang
      let existing_tag = this.replacement_tag_templates.get(in_tag.Tag.ID);

      if(existing_tag) {
        in_tag.Tag = existing_tag;
      }
    }
  }

  // Kill all things which we have just name-duplicated. Keep the new stuff over old stuff
  async execute_order_66() {
    for(let type of Object.values(EntryType)) {
      let to_delete = this.deletion_targets.get(type)!;

      // TODO: bulk operations
      for(let td of to_delete) {
        td.destroy_entry();
      }

      // clear
      this.deletion_targets.set(type, []);
    }
  }

  // Used for progress bar. Total of things we need to delete
  to_kill_count(): number {
    let total = 0;
    for(let v of this.deletion_targets.values()) {
      total += v.length;
    }
    return total;
  }
}
