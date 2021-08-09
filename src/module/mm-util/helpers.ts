import { EntryType, License, LicensedItem, LiveEntryTypes, OpCtx, Pilot, RegEntry } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType, LancerMech, LancerPilot } from "../actor/lancer-actor";
import { PACK_SCOPE } from "../compBuilder";
import { friendly_entrytype_name } from "../config";
import { AnyLancerItem, AnyMMItem, LancerItem, LancerItemType } from "../item/lancer-item";
import { FoundryFlagData, FoundryReg } from "./foundry-reg";

// Simple caching mechanism for handling async fetchable values for a certain length of time
export class FetcherCache<A, T> {
  // The currently cached value
  private cached_values: Map<A, Promise<T>> = new Map();
  private cached_resolved_values: Map<A, T> = new Map();

  // Holds the expiration time of specified keys. Repeated access will keep alive for longer
  private timeout_map: Map<A, number> = new Map();

  constructor(private readonly timeout: number, private readonly fetch_func: (arg: A) => Promise<T>) {}

  // Fetch the value using the specified arg
  async fetch(arg: A): Promise<T> {
    let now = Date.now();

    // Refresh the lookup on our target value (or set it for the first time, depending) ((if we have a timeout))
    this.timeout_map.set(arg, now + this.timeout);

    // Pre-emptively cleanup
    this.cleanup();

    // Check if we have cached data. If so, yield. If not, create
    let cached = this.cached_values.get(arg);
    if (cached) {
      return cached;
    } else {
      let new_val_promise = this.fetch_func(arg);
      this.cached_values.set(arg, new_val_promise);
      new_val_promise.then(resolved => this.cached_resolved_values.set(arg, resolved));
      return new_val_promise;
    }
  }

  // Fetch the value iff it is currently cached. Essentially a no-cost peek, useful for editing the cached val without doing a full re-fetch
  // Refreshes cache time
  soft_fetch(arg: A): T | null {
    if (this.cached_resolved_values.has(arg)) {
      this.timeout_map.set(arg, Date.now() + this.timeout);
      return this.cached_resolved_values.get(arg)!;
    }
    return null;
  }

  // Do we have this value resolved?
  has_resolved(arg: A): boolean {
    return this.cached_resolved_values.has(arg);
  }

  // Destroys all entries that should be destroyed
  private cleanup() {
    let now = Date.now();
    for (let [arg, expire] of this.timeout_map.entries()) {
      if (expire < now) {
        this.timeout_map.delete(arg);
        this.cached_values.delete(arg);
      }
    }
  }

  // Destroy a particular set of cached values
  public flush(arg: A) {
    this.cached_values.delete(arg);
    this.cached_resolved_values.delete(arg);
    this.timeout_map.delete(arg);
  }

  // Destroy all entries, period.
  public flush_all() {
    this.cached_values.clear();
    this.cached_resolved_values.clear();
    this.timeout_map.clear();
  }
}

export async function mm_wrap_item<T extends EntryType & LancerItemType>(
  item: LancerItem,
  use_existing_ctx: OpCtx
): Promise<LiveEntryTypes<T>> {
  // Get the reg that'd hold this item
  let reg: FoundryReg;

  if (item.parent != null) {
    // We are an owned item
    if (item.pack != null) {
      // A compendium actor owned item
      reg = new FoundryReg({
        src: "comp_actor",
        comp_id: item.pack,
        actor_id: item.actor!.id!,
      });
    } else if (item.parent.isToken) {
      // A token actor owned item
      reg = new FoundryReg({
        src: "scene_token",
        scene_id: item.actor!.token!.parent!.id!,
        token_id: item.actor!.token!.id!,
      });
    } else {
      // A world actor owned item
      reg = new FoundryReg({
        src: "game_actor",
        actor_id: item.actor!.id!,
      });
    }
  } else {
    // We are an unowned item
    if (item.pack != null) {
      // An unowned compendium item
      if (is_core_pack_name(item.pack)) {
        // An unowned core compendium item
        reg = new FoundryReg({
          src: "comp_core",
        });
      } else {
        // An unowned custom compendium item
        reg = new FoundryReg({
          src: "comp",
          comp_id: item.pack,
        });
      }
    } else {
      // An unowned game item
      reg = new FoundryReg({
        src: "game",
      });
    }
  }

  let ctx = use_existing_ctx || new OpCtx();

  // Load up the item. This _should_ always work
  // let ent = (await reg.get_cat(item.type).get_live(ctx, item.id)) as LiveEntryTypes<T>;
  let cat = reg.get_cat(item.data.type);
  // @ts-ignore Poor typescript doesn't know how to handle these
  let ent = await cat.dangerous_wrap_doc(ctx, item);
  if (!ent) {
    throw new Error("Something went wrong while trying to contextualize an item...");
  }
  return ent;
}

export async function mm_wrap_actor<T extends EntryType & LancerActorType>(
  actor: LancerActor,
  use_existing_ctx: OpCtx
): Promise<LiveEntryTypes<T>> {
  // Get our reg. Thankfully simpler than mm_wrap_item since we don't really need to worry as much about parent
  let reg: FoundryReg;
  if (actor.isToken) {
    // Is a token actor. Note that we aren't trying to get its inventory, so we leave it at the scene scope, not scene_token
    reg = new FoundryReg({
      src: "scene",
      scene_id: actor.token!.parent!.id!,
    });
  } else if (actor.pack) {
    // Is a compendium actor. Note that we aren't trying to get its inventory, so we leave it at the compendium scope
    if (is_core_pack_name(actor.pack)) {
      // Is core
      reg = new FoundryReg({
        src: "comp_core",
      });
    } else {
      // Is non-core
      reg = new FoundryReg({
        src: "comp",
        comp_id: actor.pack,
      });
    }
  } else {
    // Is a game actor. Note that we aren't trying to get its inventory, so we leave it at game scope
    reg = new FoundryReg({
      src: "game",
    });
  }
  let ctx = use_existing_ctx || new OpCtx();

  // let ent = (await reg.get_cat(actor.data.type).get_live(ctx, id)) as LiveEntryTypes<T>;
  let cat = reg.get_cat(actor.data.type);
  // @ts-ignore Poor typescript doesn't know how to handle these
  let ent = await cat.dangerous_wrap_doc(ctx, actor as any);
  if (!ent) {
    throw new Error("Something went wrong while trying to contextualize an actor...");
  }

  return ent;
}

// Sort mm items. Moves moverand to dest, either before or after depending on third arg
export async function resort_item(moverand: AnyLancerItem, dest: AnyLancerItem, sort_before = true) {
  // Make sure owner is the same
  if (!dest.actor || !moverand.actor || dest.actor != moverand.actor) {
    console.warn("Cannot sort items from two separate actors / unowned items");
    return;
  }

  // Ok, now get siblings
  let siblings: AnyLancerItem[] = dest.collection.contents;
  siblings = siblings.filter(s => s.id != moverand.id);

  // Now resort
  return moverand.sortRelative({ target: dest, siblings, sortBefore: sort_before });
}

// Same as above but takes mm
export async function mm_resort_item(moverand: AnyMMItem, dest: AnyMMItem, sort_before = true) {
  let m_doc = moverand.Flags.orig_doc;
  let d_doc = dest.Flags.orig_doc;

  if (!m_doc || !d_doc) {
    console.warn("Cannot sort items without flagged orig_docs");
    return;
  }

  return resort_item(m_doc, d_doc, sort_before);
}

// Define a helper to check if a license includes the specified item. Checks by lid. Maybe change that in the future?
// export function license_has(license: License, item: LiveEntryTypes<LancerItemType>) {
// return license.FlatUnlocks.some(unlockable => unlockable.LID == (item as any).LID);
// }

// Helper for finding what license an item comes from. Checks by name, an inelegant solution but probably good enough
export async function find_license_for(
  mm: LiveEntryTypes<LancerItemType>,
  in_actor?: LancerMech | LancerPilot
): Promise<License | null> {
  // If the item does not have a license name, then we just bail
  let license_name = (mm as LicensedItem).License;
  if (!license_name) {
    return null;
  }

  // If an actor was supplied, we first check their inventory.
  if (in_actor) {
    let actor_mm = await in_actor.data.data.derived.mm_promise;

    // Only pilots should have licenses, so for mechs we go to active pilot
    let pilot: Pilot | null = null;
    if (actor_mm.Type == EntryType.MECH) {
      pilot = actor_mm.Pilot;
    }

    // Check pilot inventory, in case they have a weird custom license
    if (pilot) {
      let found = pilot.Licenses.find(lic => lic.LicenseKey == license_name);
      if (found) {
        return found;
      }
    }
  }

  // Actor was a bust. Try global
  return world_and_comp_license_cache.fetch(license_name);
}

// The cache to implement the above. Doesn't need to last long - this just happens in bursts
// Just keeps track of license refs by name
const world_and_comp_license_cache = new FetcherCache<string, License | null>(60_000, async license_name => {
  let ctx = new OpCtx();
  let world_reg = new FoundryReg("game"); // Actor src doesn't matter at all
  let world_license = await world_reg.get_cat(EntryType.LICENSE).lookup_live(ctx, { key: license_name });
  if (world_license.length) {
    return world_license[0];
  }

  // Ok. Try core compendium. This is most likely to be where it is, but best to try world first
  let compendium_reg = new FoundryReg("comp_core");
  let compendium_license = await compendium_reg.get_cat(EntryType.LICENSE).lookup_live(ctx, { key: license_name });
  if (compendium_license.length) {
    return compendium_license[0];
  }

  // Oh well!
  console.log(
    `Did not find ${license_name} in world/core compendium. Note that external compendiums are not (yet) scanned as part of this procedure`
  );
  return null;
});

// Get the owner of an item, or null if none exists
export function mm_owner<T extends LancerItemType>(item: RegEntry<T>): LancerActor | null {
  let flags = item.Flags as FoundryFlagData<T>;
  let owner = (flags.orig_doc as AnyLancerItem).actor;
  if (owner) {
    return owner as LancerActor;
  } else {
    return null;
  }
}

// Returns true if this is one of the packs thats controlled by get_pack
export function is_core_pack_name(name: string): boolean {
  // Cut off leading stuff before .
  let imp = name.substr(name.indexOf(".") + 1);

  // Is it an entry type?
  for (let e of Object.values(EntryType)) {
    if (e == imp) {
      return true;
    }
  }
  return false;
}

// Lists all packs of specified type that aren't in the core pack. We cache this. Can clear cache by setting v to null
const cached_alt_packs = {
  Item: null as any,
  Actor: null as any,
};

export function get_secondary_packs(doc_type: "Actor" | "Item"): any[] {
  if (cached_alt_packs[doc_type] == null) {
    // Get all packs of items
    let candidates = game.packs.contents.filter(p => p.documentName == doc_type).map(p => p.collection) as string[];

    // Remove all that are just a core pack, and store
    cached_alt_packs[doc_type] = candidates.filter(name => !is_core_pack_name(name));
  }
  return cached_alt_packs[doc_type];
}

// Get a pack id
export function get_pack_id(type: EntryType): string {
  return `${PACK_SCOPE}.${type}`;
}

// Retrieve a pack, or create it as necessary
// async to handle the latter case
export async function get_pack(
  type: LancerItemType | LancerActorType
): Promise<CompendiumCollection<CompendiumCollection.Metadata>> {
  // Find existing world compendium
  let pack = game.packs.get(get_pack_id(type));
  if (pack) {
    return pack;
  } else {
    // Compendium doesn't exist yet. Create a new one.
    // Create our metadata
    const entity_type = is_actor_type(type) ? "Actor" : "Item";
    const metadata: CompendiumCollection.Metadata = {
      name: type,
      entity: entity_type,
      label: friendly_entrytype_name(type),
      system: "lancer",
      package: "world",
      path: `./packs/${type}.db`,
      private: false,
    };

    return CompendiumCollection.createCompendium(metadata);
  }
}
