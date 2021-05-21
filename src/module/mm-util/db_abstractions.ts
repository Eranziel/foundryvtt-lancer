import { EntryType, LiveEntryTypes, RegEntry, RegEntryTypes } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType, LancerActorTypes } from "../actor/lancer-actor";
import { FriendlyTypeName, LANCER } from "../config";
import { LancerItem, LancerItemType } from "../item/lancer-item";
import { FoundryFlagData } from "./foundry-reg";

const lp = LANCER.log_prefix;

// The associated entity to a given entry type. Type's a lil complex, but we need it to get things correct between abstracters that take items vs actors
// tl;dr maps entrytype to LancerItem or LancerActor
// export type EntFor<T extends EntryType & (LancerItemType | LancerActorType) > = T extends LancerItemType ? LancerItem<T> : (T extends LancerActorType ? LancerActor<T> : never);
export type EntFor<T extends EntryType> = T extends LancerItemType
  ? LancerItem<T>
  : T extends LancerActorType
  ? LancerActor<T>
  : never;

export interface GetResult<T extends LancerItemType | LancerActorType> {
  data: RegEntryTypes<T>;
  entity: EntFor<T>;
  id: string; // only truly necessary on enums, but still convenient
  type: T; // same
}

/**
 * Converts an entity into an item suitable for calling .create/.update/whatver with.
 * Specifically,
 * - creates the "data" by .save()ing the entity
 * - augments the data with anything in our top_level_data
 * - includes an id appropriate to the item. This will allow for bulk .update()s, and has no effect on .create()s
 *  + Note that this ID is taken from the MM ent, not the original entity. This is because some techniques like insinuation rely on manually altering Registry info to propagate ref changes
 */
function as_document_blob<T extends EntryType>(ent: LiveEntryTypes<T>): any {
  let flags = ent.Flags as FoundryFlagData<T>;

  // Set name from changed data. Prioritize a changed top level name over a changed ent name
  if (flags.top_level_data.name && flags.top_level_data.name != flags.orig_doc_name) {
    // Override ent data with top level
    ent.Name = flags.top_level_data.name;
  } else if (ent.Name && ent.Name != flags.orig_doc_name) {
    // Override top level with ent data
    flags.top_level_data.name;
  }

  // Combine saved data with top level data
  let result = mergeObject(
    {
      _id: ent.RegistryID,
      data: ent.save(),
    },
    flags.top_level_data
  );

  return result;
}

// This can wrap an actors inventory, the global actor/item inventory, or a compendium
export abstract class EntityCollectionWrapper<T extends EntryType> {
  // Create an item and return a reference to it
  abstract create_many(items: RegEntryTypes<T>[]): Promise<GetResult<T>[]>; // Return id
  // Update the specified item of type T
  abstract update(items: Array<LiveEntryTypes<T>>): Promise<any>;
  // Retrieve the specified item of type T, or yield null if it does not exist
  abstract get(id: string): Promise<GetResult<T> | null>;
  // Delete the specified item
  abstract destroy(id: string): Promise<any>;
  // List items, including id for reference
  abstract enumerate(): Promise<GetResult<T>[]>;
}

// Handles accesses to the global item set
export class WorldItemsWrapper<T extends LancerItemType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type/know what we're returning
  type: T;

  constructor(type: T) {
    super();
    this.type = type;
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    // Create the item
    // @ts-ignore
    let new_items = (await Item.createDocuments(
      reg_data.map(d => ({
        type: this.type,
        name: d.name,
        data: duplicate(d),
      }))
    )) as EntFor<T>[];

    // Return the reference
    return new_items.map((item, index) => ({
      id: item.data._id,
      entity: item,
      type: this.type,
      data: reg_data[index],
    }));
  }

  // Fetch and call .update()
  async update(items: Array<LiveEntryTypes<T>>): Promise<void> {
    //@ts-ignore Typings dont yet include mass update functions
    return Item.updateDocuments(items.map(as_document_blob));
  }

  // Call game.items.get
  async get(id: string): Promise<GetResult<T> | null> {
    let fi = game.items.get(id);
    if (fi && fi.type == this.type) {
      return {
        data: fi.data.data as RegEntryTypes<T>,
        entity: fi as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  // Call .delete()
  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    //@ts-ignore .8
    return Item.deleteDocuments([id]);
  }

  // Just pull from game.items.entities
  async enumerate(): Promise<GetResult<T>[]> {
    return game.items.entities
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: (e.data as any)._id,
        data: e.data.data as RegEntryTypes<T>,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to the global actor set
export class WorldActorsWrapper<T extends LancerActorType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    // Create the actors
    // @ts-ignore
    let new_items = (await Actor.createDocuments(
      reg_data.map(d => ({
        type: this.type,
        name: d.name,
        data: duplicate(d),
      }))
    )) as EntFor<T>[];

    // Return the references
    return new_items.map((item, index) => ({
      id: item.data._id,
      entity: item,
      type: this.type,
      data: reg_data[index],
    }));
  }

  async update(items: Array<LiveEntryTypes<T>>): Promise<void> {
    //@ts-ignore .8
    return Actor.updateDocuments(items.map(as_document_blob));
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = game.actors.get(id);
    if (fi && fi.data.type == this.type) {
      return {
        data: fi.data.data as RegEntryTypes<T>,
        entity: fi as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    //@ts-ignore .8
    return Actor.deleteDocuments([id]);
  }

  async enumerate(): Promise<GetResult<T>[]> {
    return game.actors.entities
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: (e.data as any)._id,
        data: e.data.data as RegEntryTypes<T>,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to the placeable tokens synthetic actor set
export class TokenActorsWrapper<T extends LancerActorType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  // Handles type checking + complicated token lookups
  private subget(id: string): Token | null {
    let fi: Token | undefined = canvas.tokens.get(id);
    if (fi && fi.actor.data.type == this.type) {
      return fi;
    } else {
      console.warn(
        "TODO: Should search in places that arent just curr scene, in case scene changes while sheet open: see comment "
      );
      return null;
    }
    /*
    WE SHOULD MAYBE JUST BE USING UUIDS? FOR EVERY REGISTRYID? 
    I don't think that we'd actually need distinct registry names, just a more sophisticated sorting mechanism for 
    doing bulk updates (but even that is largely just a vanity project). Compendium caching probably would need revision

    alternatively, something like this, cached, would be good
    SceneDirectory.collection.reduce((group, scene) => {
      // concat scene.data.tokens onto group
      return group;
    }, [])
  */
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    // No
    throw new Error("This is an ill advised way to create a token. Do better");
  }

  async update(items: Array<LiveEntryTypes<T>>): Promise<any> {
    console.log("Updating token actors. Could this be done faster?");
    let promises: Promise<any>[] = [];
    for (let token_entry of items) {
      let fi = token_entry.Flags.orig_doc;
      if (fi) {
        promises.push(fi.actor.update(as_document_blob(token_entry), {}));
      } else {
        console.error(`Failed to update actor ${token_entry.Registry} of type ${this.type} - token actor not found`);
      }
    }
    return Promise.all(promises);
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return {
        data: fi.actor.data.data as RegEntryTypes<T>,
        entity: fi.actor as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    // No
    throw new Error("This is an ill advised way to destroy a token. Probably");
  }

  async enumerate(): Promise<GetResult<T>[]> {
    console.warn("Should we just be enumerating current scene?");
    return (canvas.tokens.placeables as Array<Token>)
      .filter(e => e?.actor?.data?.type == this.type)
      .map(e => ({
        id: e.id,
        data: e.actor.data.data as RegEntryTypes<T>,
        entity: e.actor as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to items owned by actor
export class ActorInventoryWrapper<T extends LancerItemType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;

  // Where we get the items from.
  actor: Actor;

  // Is this a compendium actor?
  for_compendium: boolean;
  constructor(type: T, actor: Actor) {
    super();
    if (!actor) {
      throw new Error("Bad actor");
    }
    this.type = type;
    this.actor = actor;
    this.for_compendium = !!actor.compendium;
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    // Create the items
    // @ts-ignore
    let new_items = (await this.actor.createEmbeddedDocuments(
      "Item",
      reg_data.map(d => ({
        type: this.type,
        name: d.name,
        data: duplicate(d),
      }))
    )) as EntFor<T>[];

    // Return the references
    return new_items.map((item, index) => ({
      id: item.data._id,
      entity: item,
      type: this.type,
      data: reg_data[index],
    }));
  }

  async update(items: Array<LiveEntryTypes<T>>): Promise<void> {
    // @ts-ignore Typings dont yet include mass update functions
    return this.actor.updateEmbeddedDocuments("Item", items.map(as_document_blob));
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = this.actor.items.get(id);
    if (fi && fi.type == this.type) {
      return {
        data: fi.data.data as RegEntryTypes<T>,
        entity: fi as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    let fi = this.actor.items.get(id);
    if (fi && fi.type == this.type) {
      await fi.delete();
      return fi.data.data;
    } else {
      return null;
    }
  }

  async enumerate(): Promise<GetResult<T>[]> {
    // @ts-ignore .8 stuff
    let items = (this.actor.items.contents as unknown) as LancerItem<T>[];
    return items
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: e.data._id,
        data: e.data.data,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to top level items/actors in compendiums
export class CompendiumWrapper<T extends EntryType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  // Handles type checking and stuff
  private async subget(id: string): Promise<EntFor<T> | null> {
    let map = await PackContentMapCache.fetch(this.type);
    // console.log(`Compendium wrapper looking up ${this.type} ${id} in map `, map);
    let retrieved = map.get(id);

    if (retrieved && retrieved.data.type == this.type) {
      return retrieved as EntFor<T>;
    } else {
      return null;
    }
  }

  // Decide which document type corr to provided entrytype
  private document_type(): any {
    if (is_actor_type(this.type)) {
      return Actor;
    } else {
      return Item;
    }
  }

  private get pack_id(): string {
    return get_pack_id(this.type);
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    let p = await get_pack(this.type);

    // Create the items
    // @ts-ignore
    let new_items = (await this.document_type().createDocuments(
      reg_data.map(
        d => ({
          type: this.type,
          name: d.name,
          data: duplicate(d),
        }),
        {
          pack: this.pack_id,
        }
      )
    )) as EntFor<T>[];

    // Add them all to the currently cached version
    for (let ni of new_items) {
      PackContentMapCache.soft_fetch(this.type)?.set(ni._id, ni);
    }

    // Return the references
    return new_items.map((item, index) => ({
      id: item.data._id,
      entity: item,
      type: this.type,
      data: reg_data[index],
    }));
  }

  async update(items: Array<LiveEntryTypes<T>>): Promise<void> {
    // Perform update
    await this.document_type().updateDocuments(items.map(as_document_blob), {
      pack: this.pack_id,
    });

    // Update cache
    for (let item of items) {
      let fi = await this.subget(item.RegistryID);
      if (fi) {
        PackContentMapCache.soft_fetch(this.type)?.set(item.RegistryID, fi);
      } else {
        console.error(`Failed to update item ${item.RegistryID} of type ${this.type} - item not found`);
      }
    }
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = await this.subget(id);
    if (fi) {
      return {
        // @ts-ignore  Typescript expands a type here then gets confused why it doesn't fit back together. Really dumb! We know better
        data: fi.data.data as RegEntryTypes<T>,
        entity: fi,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<void> {
    await this.document_type().deleteDocuments([id], { pack: this.pack_id });

    // Additionally remove item from cache
    PackContentMapCache.soft_fetch(this.type)?.delete(id);
  }

  async enumerate(): Promise<GetResult<T>[]> {
    let content = await cached_get_pack_map(this.type);
    return Array.from(content.values())
      .filter(e => e && e.data.type == this.type) // Sanity check. I've seen nulls in here
      .map(e => ({
        id: (e.data as any)._id,
        // @ts-ignore  Typescript expands a type here then gets confused why it doesn't fit back together. Really dumb! We know better
        data: e.data.data as RegEntryTypes<T>,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Information about a pack
interface PackMetadata {
  name: string;
  label: string;
  system: "lancer";
  package: "world";
  path: string; // "./packs/skills.db",
  entity: "Item" | "Actor";
}

// Get a pack id
export function get_pack_id(type: EntryType): string {
  return "lancer." + type;
}

// Retrieve a pack, or create it as necessary
// async to handle the latter case
export async function get_pack(type: LancerItemType | LancerActorType): Promise<Compendium> {
  let pack: Compendium | undefined;

  // Find existing world compendium
  pack = game.packs.get(get_pack_id(type));
  if (pack) {
    return pack;
  } else {
    // Compendium doesn't exist yet. Create a new one.
    // Create our metadata
    const entity_type = is_actor_type(type) ? "Actor" : "Item";
    const metadata: PackMetadata = {
      name: type,
      entity: entity_type,
      label: FriendlyTypeName(type),
      system: "lancer",
      package: "world",
      path: `./packs/${type}.db`,
    };

    //@ts-ignore .8
    return CompendiumCollection.createCompendium(metadata);
  }
}

/********* COMPENDIUM CACHING **********/
const COMPENDIUM_CACHE_TIMEOUT = 20 * 1000; // 20 seconds

// Simple mechanism for caching fetchable values for a certain length of time
export class FetcherCache<A, T> {
  // The currently cached value
  private cached_values: Map<A, Promise<T>> = new Map();
  private cached_resolved_values: Map<A, T> = new Map();

  // Holds the expiration time of specified keys. Repeated access will keep alive for longer
  private timeout_map: Map<A, number> = new Map();

  constructor(private readonly timeout: number | null, private readonly fetch_func: (arg: A) => Promise<T>) {}

  // Fetch the value using the specified arg
  async fetch(arg: A): Promise<T> {
    let now = Date.now();

    // Refresh the lookup on our target value (or set it for the first time, depending) ((if we have a timeout))
    if (this.timeout) {
      this.timeout_map.set(arg, now + this.timeout);

      // Pre-emptively cleanup
      this.cleanup();
    }

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
  soft_fetch(arg: A): T | null {
    return this.cached_resolved_values.get(arg) ?? null;
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

// Caches getContent() _as a map_ (wowee!). Idk if generating these maps are expensive but why tempt fate, lmao
const PackContentMapCache = new FetcherCache(
  COMPENDIUM_CACHE_TIMEOUT,
  async (type: LancerItemType | LancerActorType) => {
    let pack = await get_pack(type);
    let data = await pack.getContent();
    let map = new Map();
    for (let e of data) {
      map.set(e._id, e);
    }
    return map;
  }
);

// This wraps interfacing with above caches, but with better typing!
export async function cached_get_pack_map<T extends LancerItemType | LancerActorType>(
  type: T
): Promise<Map<string, T extends LancerItemType ? LancerItem<T> : T extends LancerActorType ? LancerActor<T> : never>> {
  console.log("Cache flushing should be triggered off of compendium CRUD hooks");
  return PackContentMapCache.fetch(type);
}

// Use this for incoming compendium updates, as we cannot really watch for them otherwise
export function invalidate_cached_pack_map<T extends EntryType>(type: T) {
  PackContentMapCache.flush(type);
}
