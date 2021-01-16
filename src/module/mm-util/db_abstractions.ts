import { EntryType, RegEntryTypes } from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { FriendlyTypeName, LANCER, LancerActorType, LancerItemType } from "../config";
import { LancerItem } from "../item/lancer-item";

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

// Handles accesses to items owned by actor
export class ActorInventoryWrapper<T extends LancerItemType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;

  // Where we get the items from. Has to remain as a promise due to some annoying sync/async api issues that are totally my fault but that aren't worth changing
  actor: Actor;
  constructor(type: T, actor: Actor) {
    super();
    this.type = type;
    this.actor = actor;
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
    await new_item.update({data}, {});

    // Return the ref
    return {
      id: new_item._id,
      entity: new_item,
      type: this.type,
      item: data,
    };
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
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
    let pack = await this.pack();
    let retrieved = await pack.getEntity(id);

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

    // TODO: Try to remove this, as it should be unnecessary once we have proper template.json
    await new_item.update({ data }, {});

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
      return subgot.data.data as RegEntryTypes<T>;
    } else {
      return null;
    }
  }

  async enumerate(): Promise<GetResult<T>[]> {
    let pack = await this.pack();
    let content = await pack.getContent();
    return content
      .filter(e => e.data.type == this.type)
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

