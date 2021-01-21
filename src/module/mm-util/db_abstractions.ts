import { EntryType, LiveEntryTypes, RegEntryTypes } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType } from "../actor/lancer-actor";
import { FriendlyTypeName, LANCER } from "../config";
import { LancerItem, LancerItemType } from "../item/lancer-item";

const lp = LANCER.log_prefix;

// The associated entity to a given entity type. Type's a lil complex, but we need it to get things correct between abstracters that take items vs actors
export type EntFor<
  T extends EntryType & (LancerItemType | LancerActorType)
> = T extends LancerItemType ? LancerItem<T> : T extends LancerActorType ? LancerActor<T> : never;

export interface GetResult<T extends LancerItemType | LancerActorType> {
  item: RegEntryTypes<T>;
  entity: EntFor<T>;
  id: string; // only truly necessary on enums, but still convenient
  type: T; // same
}

// This can wrap an actors inventory, the global actor/item inventory, or a compendium
export abstract class EntityCollectionWrapper<T extends EntryType> {
  // Create an item and return a reference to it
  abstract create(item: RegEntryTypes<T>): Promise<GetResult<T>>; // Return id
  // Update the specified item of type T
  abstract update(id: string, item: RegEntryTypes<T>): Promise<void>;
  // Retrieve the specified item of type T, or yield null if it does not exist
  abstract get(id: string): Promise<GetResult<T> | null>;
  // Delete the specified item
  abstract destroy(id: string): Promise<RegEntryTypes<T> | null>;
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

  // Handles type checking
  private subget(id: string): LancerItem<T> | null {
    let fi = game.items.get(id);
    if (fi && fi.type == this.type) {
      return fi as LancerItem<T>;
    } else {
      return null;
    }
  }

  async create(data: RegEntryTypes<T>): Promise<GetResult<T>> {
    // Create the item
    data = duplicate(data);
    let name = data.name || "unknown";
    let new_item = (await Item.create({ type: this.type, name, data: data })) as EntFor<T>;

    // TODO: Try to remove this, as it should be unnecessary once we have proper template.json
    await new_item.update({ data }, {});

    // Return the reference
    return {
      id: new_item.data._id,
      entity: new_item,
      type: this.type,
      item: data,
    };
  }

  // Fetch and call .update()
  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    let fi = this.subget(id);
    if (fi) {
      await fi.update({ data: item }, {});
    } else {
      console.error(`Failed to update item ${id} of type ${this.type} - item not found`);
    }
  }

  // Call game.items.get
  async get(id: string): Promise<GetResult<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return {
        item: fi.data.data as RegEntryTypes<T>,
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
    let subgot = this.subget(id);
    if (subgot) {
      await subgot.delete();
      return subgot.data.data;
    } else {
      return null;
    }
  }

  // Just pull from game.items.entities
  async enumerate(): Promise<GetResult<T>[]> {
    return game.items.entities
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: (e.data as any)._id,
        item: e.data.data as RegEntryTypes<T>,
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

  // Handles type checking
  private subget(id: string): Actor | null {
    let fi = game.actors.get(id);
    if (fi && fi.data.type == this.type) {
      return fi;
    } else {
      return null;
    }
  }

  async create(data: RegEntryTypes<T>): Promise<GetResult<T>> {
    // Create the item
    data = duplicate(data);
    let name = data.name || "unknown";
    let new_item = (await Actor.create({ type: this.type, name, data })) as EntFor<T>;

    // TODO: Remove this, as it should (theoretically) be unnecessary once we have proper template.json
    await new_item.update({ data });

    // Return the reference
    return {
      id: new_item.data._id,
      entity: new_item,
      type: this.type,
      item: data,
    };
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    let fi = this.subget(id);
    if (fi) {
      await fi.update({ data: item }, {});
    } else {
      console.error(`Failed to update actor ${id} of type ${this.type} - actor not found`);
    }
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return {
        item: fi.data.data as RegEntryTypes<T>,
        entity: fi as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    let subgot = this.subget(id);
    if (subgot) {
      await subgot.delete();
      return subgot.data.data;
    } else {
      return null;
    }
  }

  async enumerate(): Promise<GetResult<T>[]> {
    return game.actors.entities
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: (e.data as any)._id,
        item: e.data.data as RegEntryTypes<T>,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to the placeable tokens synthetic actor set
export class TokensActorsWrapper<T extends LancerActorType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  // Handles type checking
  private subget(id: string): Token | null {
    let fi: Token | undefined = canvas.tokens.get(id);
    if (fi && fi.actor.data.type == this.type) {
      return fi;
    } else {
      return null;
    }
  }

  async create(data: RegEntryTypes<T>): Promise<GetResult<T>> {
    // No
    throw new Error("This is an ill advised way to create a token. Do better");
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    let fi = this.subget(id);
    if (fi) {
      await fi.actor.update({ data: item }, {});
    } else {
      console.error(`Failed to update actor ${id} of type ${this.type} - actor not found`);
    }
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return {
        item: fi.actor.data.data as RegEntryTypes<T>,
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
    return (canvas.tokens.placeables as Array<Token>)
      .filter(e => e?.actor?.data?.type == this.type)
      .map(e => ({
        id: e.id,
        item: e.actor.data.data as RegEntryTypes<T>,
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
    if(!actor) {
      throw new Error("Bad actor");
    }
    this.type = type;
    this.actor = actor;
    this.for_compendium = !!actor.compendium;
  }

  // Handles type checking
  private async subget(id: string): Promise<LancerItem<T> | null> {
    let fi = this.actor.items.get(id);
    if (fi && fi.type == this.type) {
      return fi as LancerItem<T>;
    } else {
      return null;
    }
  }

  async create(data: RegEntryTypes<T>): Promise<GetResult<T>> {
    // Create the item
    data = duplicate(data); // better safe than sorry
    let name = data.name || "unknown";
    let new_item = (await this.actor.createOwnedItem({ type: this.type, name, data })) as EntFor<T>;

    // TODO: Try to remove this, as it should be unnecessary once we have proper template.json
    // await new_item.update({data}, {});

    // Return the ref
    return {
      id: new_item._id,
      entity: new_item,
      type: this.type,
      item: data,
    };
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    if(this.for_compendium) {
      console.warn("Warning: Cannot currently edit owned items of actors. Re-examine this with Foundry .8, as there was mention of this changing with further tweaks to active effects");
      return;
    }

    let fi = await this.subget(id);
    if (fi) {
      await fi.update({ data: item }, {});
      return;
    } else {
      console.error(
        `Failed to update item ${id} of type ${this.type} in actor. Actor or item not found`,
        this.actor
      );
    }
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = await this.subget(id);
    if (fi) {
      return {
        item: fi.data.data as RegEntryTypes<T>,
        entity: fi as EntFor<T>,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    let subgot = await this.subget(id);
    if (subgot) {
      await subgot.delete();
      return subgot.data.data;
    } else {
      return null;
    }
  }

  async enumerate(): Promise<GetResult<T>[]> {
    // let items = (this.actor.items as unknown) as LancerItem<T>[] | Collection<LancerItem<T>>; // Typings are wrong here. Entities and entries appear to have swapped type decls
    // if(!Array.isArray(items)) {
      // items = Array.from(items.values());
    // }
    let items = (this.actor.items.entries as unknown) as LancerItem<T>[]; // Typings are wrong here. Entities and entries appear to have swapped type decls
    return items
      .filter(e => e.data.type == this.type)
      .map(e => ({
        id: e.data._id,
        item: e.data.data,
        entity: e as EntFor<T>,
        type: this.type,
      }));
  }
}

// Handles accesses to items owned by token. Luckily, synthetic token actors work just like normal actors, so we can just subclass
export class TokenInventoryWrapper<T extends LancerItemType> extends ActorInventoryWrapper<T> {
  // Where we get the items from.
  token: Token;

  constructor(type: T, token: Token) {
    super(type, token.actor);
    if(!token) {
      throw new Error("Bad token");
    }
    this.token = token;
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

  // We cache the pack. This probably isn't a huge performance boon, but anything helps when it comes to this compendium shit
  private cached_pack: any = null;
  private async pack(): Promise<Compendium> {
    if (!this.cached_pack) {
      this.cached_pack = get_pack(this.type);
    }
    return this.cached_pack;
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

  async create(data: RegEntryTypes<T>): Promise<GetResult<T>> {
    let name = (data.name || "unknown").toUpperCase();
    data = duplicate(data); // better safe than sorry
    let p = await this.pack();
    let new_item = (await p.createEntity({
      type: this.type,
      name,
      data,
    })) as EntFor<T>;

    // Add it to the currently cached version
    // console.log("Compendium wrapper used to create ", name, new_item._id);
    PackContentMapCache.soft_fetch(this.type)?.set(new_item._id, new_item);

    // TODO: Try to remove this, as it should be unnecessary once we have proper template.json
    // await new_item.update({ data }, {});

    return {
      id: new_item.data._id,
      entity: new_item,
      type: this.type,
      item: data,
    };
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    let fi = await this.subget(id);
    if (fi) {
      await fi.update({ data: item }, {}); 
      // No need to flush cache - item was updated in place
    } else {
      console.error(`Failed to update item ${id} of type ${this.type} - item not found`);
    }
  }

  async get(id: string): Promise<GetResult<T> | null> {
    let fi = await this.subget(id);
    if (fi) {
      return {
        item: fi.data.data as RegEntryTypes<T>,
        entity: fi,
        id,
        type: this.type,
      };
    } else {
      return null;
    }
  }

  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    let pack = await this.pack();
    let subgot = await this.subget(id);
    if (subgot) {
      await pack.deleteEntity(id);
      // Rather than flush, we just remove this item from the cached map if it exists
      PackContentMapCache.soft_fetch(this.type)?.delete(id);
      return subgot.data.data as RegEntryTypes<T>;
    } else {
      return null;
    }
  }

  async enumerate(): Promise<GetResult<T>[]> {
    let content = await cached_get_pack_map(this.type);
    return Array.from(content.values())
      .filter(e => e.data.type == this.type) // Sanity check
      .map(e => ({
        id: (e.data as any)._id,
        item: e.data.data as RegEntryTypes<T>,
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
    const entity_type = is_actor_type(type) ? "Actor" : "Item";
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

/********* COMPENDIUM CACHING **********/
const COMPENDIUM_CACHE_TIMEOUT = 4 * 1000;

// Simple mechanism for caching fetchable values for a certain length of time
class FetcherCache<A, T> {
  // The currently cached value
  private cached_values: Map<A, Promise<T>> = new Map();
  private cached_resolved_values: Map<A, T> = new Map();

  // Holds the expiration time of specified keys. Repeated access will keep alive for longer
  private timeout_map: Map<A, number> = new Map();

  constructor(private readonly timeout: number | null, private readonly fetch_func: ((arg: A) => Promise<T>)) {}

  // Fetch the value using the specified arg
  async fetch(arg: A): Promise<T> {
    let now = Date.now();

    // Refresh the lookup on our target value (or set it for the first time, depending) ((if we have a timeout))
    if(this.timeout) {
      this.timeout_map.set(arg, now + this.timeout);

      // Pre-emptively cleanup
      this.cleanup();
    }

    // Check if we have cached data. If so, yield. If not, create
    let cached = this.cached_values.get(arg);
    if(cached) {
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
    for(let [arg, expire] of this.timeout_map.entries()) {
      if(expire < now) {
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
    this.cached_resolved_values.clear()
    this.timeout_map.clear();
  }
}


// Caches getContent() _as a map_ (wowee!). Idk if generating these maps are expensive but why tempt fate, lmao
const PackContentMapCache = new FetcherCache(COMPENDIUM_CACHE_TIMEOUT, async (type: LancerItemType | LancerActorType) => {
  console.log(`Generating timed cache for ${type} compendium entries`);
  let pack = await get_pack(type);
  let data = await pack.getContent();
  let map = new Map();
  for(let e of data) {
    map.set(e._id, e);
  }
  return map;
});


// This wraps interfacing with above caches, but with better typing!
export async function cached_get_pack_map<T extends LancerItemType | LancerActorType>(type: T): Promise<Map<string, T extends LancerItemType ? LancerItem<T> : T extends LancerActorType ? LancerActor<T> : never>> {
  return PackContentMapCache.fetch(type);
}