import { FriendlyTypeName, LANCER, LancerActorType, LancerItemType, TypeIcon } from "./config";
const lp = LANCER.log_prefix;
import {
  EntryType,
  IContentPack,
  InsinuationRecord,
  LiveEntryTypes,
  OpCtx,
  RegCat,
  RegEntryTypes,
  RegEnv,
  Registry,
  StaticReg,
} from "machine-mind";
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
import { FoundryReg } from "./mm-util/foundry-reg";

// Some useful subgroupings
type MechItemEntryType =
  | EntryType.CORE_SYSTEM
  | EntryType.FRAME
  | EntryType.FRAME_TRAIT
  | EntryType.MECH_WEAPON
  | EntryType.MECH_SYSTEM
  | EntryType.WEAPON_MOD;
const MechItemEntryTypes = [
  EntryType.CORE_SYSTEM,
  EntryType.FRAME,
  EntryType.FRAME_TRAIT,
  EntryType.MECH_WEAPON,
  EntryType.MECH_SYSTEM,
  EntryType.WEAPON_MOD,
];
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
const PilotItemEntryTypes = [
  EntryType.CORE_BONUS,
  EntryType.TALENT,
  EntryType.SKILL,
  EntryType.QUIRK,
  EntryType.RESERVE,
  EntryType.FACTION,
  EntryType.ORGANIZATION,
  EntryType.PILOT_ARMOR,
  EntryType.PILOT_WEAPON,
  EntryType.PILOT_GEAR /* , EntryType.LICENSE */,
];
type ItemEntryType = MechItemEntryType | PilotItemEntryType;

interface PackMetadata {
  name: string;
  label: string;
  system: "lancer";
  package: "world";
  path: string; // "./packs/skills.db",
  entity: "Item" | "Actor";
}

// Unlock all packs
async function unlock_all() {
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

// Lock all packs
async function lock_all() {
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

// Clear all packs
export async function clear_all(): Promise<void> {
  // await unlock_all();
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
  // await lock_all();

  return Promise.resolve();
}

// Retrieve a pack, or create it as necessary
export async function get_pack(type: LancerItemType | LancerActorType): Promise<Compendium> {
  let pack: Compendium | undefined;

  // Find existing world compendium
  pack = game.packs.get(`world.${type}`) ?? game.packs.get(`lancer.${type}`);
  if (pack) {
    console.log(`${lp} Fetching existing compendium: ${pack.collection}.`);
    return pack;
  } else {
    // Compendium doesn't exist yet. Create a new one.
    console.log(`${lp} Creating new compendium: ${type}.`);

    // Create our metadata
    const entity_type = LANCER.actor_types.includes(type as LancerActorType) ? "Actor" : "Item";
    const metadata: PackMetadata = {
      name: type,
      entity: entity_type,
      label: FriendlyTypeName(type),
      system: "lancer",
      package: "world",
      path: `./packs/${type}.db`,
    };

    return Compendium.create(metadata);
  }
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

export async function import_cp(cp: IContentPack): Promise<void> {
  // Make a static reg, and load in the reg for pre-processing
  let env = new RegEnv();
  let cp_reg = new MurderousStaticReg(env, await MurderousStaticReg.gen_kill_index());
  await intake_pack(cp, cp_reg);

  // Build our wip contentpack registry.
  // First we run through all objects and set flags such that insinuation will properly set some stuff
  let ctx = new OpCtx();
  for (let type of Object.values(EntryType)) {
    let cat = cp_reg.get_cat(type);
    for (let item of await cat.list_live(ctx)) {
      let name: string = item.Name.toUpperCase();

      // Duck typing baybeeee
      item.flags = {...item.flags, data: { name } };
    }
  }

  // Step 2: Make NPC features and frame traits have unique, frame/class specific prefixes. Helps with name collisions
  let frames = cp_reg.get_cat(EntryType.FRAME);
  for(let f of await frames.list_live(ctx)) {
    for(let trait of f.Traits) {
      trait.flags.data.name = `[${f.Name}] ${trait.Name}`;
    }
    if(f.CoreSystem) {
      f.CoreSystem.flags.data.name = `[${f.Name}] ${f.CoreSystem.Name}`;
    }
  }

  // Step 3: Insinuate data to the actual foundry reg
  // We only want to do "top level features" - so no deployables, traits, etc that would be included in a frame/weapon/whatever (as they will be insinuated naturally)
  // Easier to do what we _don't_ want
  let comp_reg = new FoundryReg({ for_compendium: true });
  // await unlock_all(); // TODO: re-enable i guess?
  let sub_types: EntryType[] = [
    EntryType.FRAME_TRAIT,
    EntryType.CORE_SYSTEM,
    EntryType.DEPLOYABLE
  ];

  for (let type of Object.values(EntryType)) {
    // Skip if subtype
    if(sub_types.includes(type)) {
      continue;
    }

    // Insinuate each item in the cat. The flags should handle names
    let cat = cp_reg.get_cat(type);
    let dest_ctx = new OpCtx();
    for (let item of await cat.list_live(dest_ctx)) {
      // Do the deed
      console.log(`Import | Adding ${type} ${item.Name}`);
      await item.insinuate(comp_reg);
    }
  }

  // Step 4: Kill the old gods
  await cp_reg.execute_order_66();

  // await lock_all();

}

// This handles name-uniqueness
interface KillIndexEntry {
  type: EntryType;
  name: string;
  id: string;
}
class MurderousStaticReg extends StaticReg {
  // All items in all compendiums at time of import start
  kill_index: KillIndexEntry[];

  // A list of names that we have imported
  marked_for_death: string[] = [];

  constructor(env: RegEnv, index: KillIndexEntry[]) {
    super(env);
    this.kill_index = index; 
  }


  async hook_post_insinuate<T extends EntryType>(record: InsinuationRecord<T>) {
    // Save the name
    this.marked_for_death.push(record.old_item.flags?.data?.name);
  }

  async execute_order_66() {
    // Quick convert to map
    let mp = new Map<string, KillIndexEntry>();
    for(let item of this.kill_index) {
      mp.set(item.name, item);
    }

    // Then go hunting
    for(let name of this.marked_for_death) {
      let index_item = mp.get(name);
      if(index_item) { // This check is very necessary. It will only resolve to true when we are replacing items
        let pack = await get_pack(index_item.type);
        await pack.deleteEntity(index_item.id);
      }
    }
  }

  static async gen_kill_index(): Promise<KillIndexEntry[]> {
    let result: KillIndexEntry[] = [];
    for(let type of Object.values(EntryType)) {
      let pack = await get_pack(type);
      let index = await pack.getIndex();
        
      // Add an entry for each item in the index
      for(let i of index) {
        result.push({
          type,
          id: i.id,
          name: i.name
        });
      }
    }

    return result;
  }
}
