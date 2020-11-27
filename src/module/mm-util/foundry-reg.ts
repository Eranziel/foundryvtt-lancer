import {
  funcs,
  CoreBonus,
  CoreSystem,
  Deployable,
  Environment,
  Faction,
  Registry,
  EntryType,
  EntryConstructor,
  ReviveFunc,
  LiveEntryTypes,
  RegEntryTypes,
  RegRef,
  RegCat,
  OpCtx,
  Frame,
  FrameTrait,
  License,
  Manufacturer,
  Mech,
  MechSystem,
  MechWeapon,
  NpcClass,
  Npc,
  Organization,
  PilotArmor,
  PilotGear,
  Pilot,
  Quirk,
  Reserve,
  Sitrep,
  TagTemplate,
  Skill,
  Status,
  WeaponMod,
  Talent,
  StaticReg,
  RegEnv,
  CovetousReg,
  NpcFeature,
  PilotWeapon,
} from "machine-mind";
import { NpcTemplate } from "machine-mind/dist/classes/npc/NpcTemplate";
import { intake_pack } from "machine-mind/dist/funcs";
import { LancerItem } from "../item/lancer-item";

// Pluck
const defaults = funcs.defaults;

/*

Things I'll need


  // For recomputing bonuses
  For actors we will want to override
  prepareDerivedData
  which is by default empty-bodied

  and for items, just override 
  prepareData
 

  // For ensuring all child items are carried properly
  _onDrop() ,

  or rather _onDrop's 4 child functions
  _onDropActiveEffect
  _onDropItem
  _onDropActor -- For mechs, set pilot. For pilots, own mechs and deployables
  _onDropFolder -- do nothing

  // To trigger prepareData, we can use an internal semaphore embeddedentity. When an item in a network changes, arbitrarily alter the semaphore in all of its child actors + items in order to trigger upload.
  // May need some sort of flagging to prevent bouncing? probably best to do all computations from a singular outer function that is triggered and debounced/filtered to user events to prevent any fuckery
  // logistics of this are !?!?! a bit messy, but once a framework is in place and sufficiently guarded on it should be fine

*/

///////////////////////////////// UTILITY TYPES ///////////////////////////////////////
// This is what an item-data for machine-mind compatible items looks like in foundry.
export interface FoundryRegItemData<T extends EntryType> {
  _id: string;
  data: RegEntryTypes<T>;
  type: T;
  img: string;
  flags: any;
  name: string;
}

// This is what items for machine-mind compatible items look like in foundry.
export interface FoundryRegItem<T extends EntryType> {
  data: FoundryRegItemData<T>;
  options: any;
  labels?: any;
  effects?: Map<string, any>;
  compendium: Compendium | null;
  apps: any;

  delete(): Promise<any>; // Deletes it
  update(data: Partial<FoundryRegItemData<T>>, options?: any): Promise<any>; // Deletes it
}

// Ditto for actors
export interface FoundryRegActorData<T extends EntryType> extends FoundryRegItemData<T> {
  effects: any[];
  token: Token;
}

// This is what items for machine-mind compatible items look like in foundry.
export interface FoundryRegActor<T extends EntryType> extends FoundryRegItem<T> {
  data: FoundryRegActorData<T>;
  items: Map<string, LancerItem<any>>;
  token: Token | null; // Seems to be the instance token (if unlinked), whereas within ActorData is the prototype/linked?
  overrides: any; // no idea lol
}

///////////////////////////////// REGISTRY IMPLEMENTATION ///////////////////////////////////////
export class FoundryReg extends Registry {
  get_inventory(for_actor_type: EntryType, for_actor_id: string): Registry | null {
    if (!this.for_compendium) {
      let actor = game.actors.get(for_actor_id);
      if (actor) {
        return new FoundryReg({ for_actor: actor });
      } else {
        return null;
      }
    } else {
      // Get the pack for it
      let pack_name = `world.${for_actor_type}`;
      let pack = game.packs.get(pack_name);
      if (!pack) {
        return null; // We can't handle this
      }

      // Get the actor within the pack
      let fa = pack.getEntity(for_actor_id) as Promise<Actor | null>;
      return new FoundryReg({ for_actor: fa });
    }
  }

  // The associated actor, if any
  public actor: Promise<Actor | null>;
  for_compendium: boolean;

  // By default world scope. Can specify either that this is in a compendium, or is in an actor
  constructor(
    {
      for_compendium,
      for_actor,
    }: { for_compendium?: boolean; for_actor?: Actor | Promise<Actor | null> | null } = {
      for_compendium: false,
    }
  ) {
    super();
    this.for_compendium = for_compendium ?? false;

    this.actor = Promise.resolve(for_actor ?? null).catch(_ => null);
    let _actor = this.actor;
    if (for_actor && for_compendium) {
      console.warn(
        "Editing items within a compendium actor isn't supported, as far as I can tell. You'll want to import it to another scope and make your changes there."
      );
    }

    // Quick function for generating an item/actor wrapper depending on if we have an actor / depending if the type is an actor type
    function quick_wrapper<T extends EntryType>(for_type: T): EntityCollectionWrapper<T> {
      if (for_compendium) {
        return new CompendiumWrapper(for_type);
      } else if (
        [EntryType.MECH, EntryType.PILOT, EntryType.DEPLOYABLE, EntryType.NPC].includes(for_type)
      ) {
        return new GlobalActorWrapper(for_type);
      } else if (for_actor) {
        return new ActorItemWrapper(for_type, _actor);
      } else {
        return new GlobalItemWrapper(for_type);
      }
    }

    // Our reviver function-maker
    function quick_reviver<T extends EntryType>(
      for_type: T,
      clazz: EntryConstructor<T>
    ): ReviveFunc<T> {
      return async (reg, ctx, id, raw) => {
        // Our actual builder function shared between all cats.
        // First check for existing item in ctx
        let pre = ctx.get(id);
        if (pre) {
          return pre as LiveEntryTypes<T>;
        }

        // Otherwise create
        let new_item = new clazz(for_type, reg, ctx, id, raw);
        ctx.set(id, new_item);
        await new_item.ready();

        // And we're done
        return new_item;
      };
    }

    // A quick helper to rapidly setup cats by combining the above two functions
    const do_cat = <T extends EntryType>(
      for_type: T,
      clazz: EntryConstructor<T>,
      defaulter: () => RegEntryTypes<T>
    ) => {
      this.init_set_cat(
        new FoundryRegCat(
          this,
          for_type,
          defaulter,
          quick_reviver(for_type, clazz),
          quick_wrapper(for_type)
        )
      );
    };

    // Aand now we do it
    do_cat(EntryType.CORE_BONUS, CoreBonus, defaults.CORE_BONUS);
    do_cat(EntryType.CORE_SYSTEM, CoreSystem, defaults.CORE_SYSTEM);
    do_cat(EntryType.DEPLOYABLE, Deployable, defaults.DEPLOYABLE);
    do_cat(EntryType.ENVIRONMENT, Environment, defaults.ENVIRONMENT);
    do_cat(EntryType.FACTION, Faction, defaults.FACTION);
    do_cat(EntryType.FRAME, Frame, defaults.FRAME);
    do_cat(EntryType.FRAME_TRAIT, FrameTrait, defaults.FRAME_TRAIT);
    do_cat(EntryType.LICENSE, License, defaults.LICENSE);
    do_cat(EntryType.MANUFACTURER, Manufacturer, defaults.MANUFACTURER);
    do_cat(EntryType.MECH, Mech, defaults.MECH);
    do_cat(EntryType.MECH_SYSTEM, MechSystem, defaults.MECH_SYSTEM);
    do_cat(EntryType.MECH_WEAPON, MechWeapon, defaults.MECH_WEAPON);
    do_cat(EntryType.NPC, Npc, defaults.NPC);
    do_cat(EntryType.NPC_CLASS, NpcClass, defaults.NPC_CLASS);
    do_cat(EntryType.NPC_TEMPLATE, NpcTemplate, defaults.NPC_TEMPLATE);
    do_cat(EntryType.NPC_FEATURE, NpcFeature, defaults.NPC_FEATURE);
    do_cat(EntryType.ORGANIZATION, Organization, defaults.ORGANIZATION);
    do_cat(EntryType.PILOT, Pilot, defaults.PILOT);
    do_cat(EntryType.PILOT_ARMOR, PilotArmor, defaults.PILOT_ARMOR);
    do_cat(EntryType.PILOT_GEAR, PilotGear, defaults.PILOT_GEAR);
    do_cat(EntryType.PILOT_WEAPON, PilotWeapon, defaults.PILOT_WEAPON);
    do_cat(EntryType.QUIRK, Quirk, defaults.QUIRK);
    do_cat(EntryType.RESERVE, Reserve, defaults.RESERVE);
    do_cat(EntryType.SITREP, Sitrep, defaults.SITREP);
    do_cat(EntryType.SKILL, Skill, defaults.SKILL);
    do_cat(EntryType.STATUS, Status, defaults.STATUS);
    do_cat(EntryType.TAG, TagTemplate, defaults.TAG_TEMPLATE);
    do_cat(EntryType.TALENT, Talent, defaults.TALENT);
    do_cat(EntryType.WEAPON_MOD, WeaponMod, defaults.WEAPON_MOD);
    this.init_finalize();
  }
}

// This can wrap an actors inventory, the global actor/item inventory, or a compendium
abstract class EntityCollectionWrapper<T extends EntryType> {
  // Create an item and return a reference to it
  abstract create(item: RegEntryTypes<T>): Promise<RegRef<T>>; // Return id
  // Update the specified item of type T
  abstract update(id: string, item: RegEntryTypes<T>): Promise<void>;
  // Retrieve the specified item of type T, or yield null if it does not exist
  abstract get(id: string): Promise<RegEntryTypes<T> | null>;
  // Delete the specified item
  abstract destroy(id: string): Promise<RegEntryTypes<T> | null>;
  // List items, including id for reference
  abstract enumerate(): Promise<
    Array<{
      id: string;
      item: RegEntryTypes<T>;
    }>
  >;
}

// Handles accesses to the global item set
class GlobalItemWrapper<T extends EntryType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  // Handles type checking
  private subget(id: string): FoundryRegItem<T> | null {
    let fi = game.items.get(id);
    if (fi && fi.type == this.type) {
      return (fi as unknown) as FoundryRegItem<T>;
    } else {
      return null;
    }
  }

  async create(item: RegEntryTypes<T>): Promise<RegRef<T>> {
    // Create the item
    item = duplicate(item);
    let name = item.name; // Luckily (IE by design), all reg item types have a name
    let res = await Item.create({ type: this.type, name, data: item });

    // TODO: Remove this, as it should be unnecessary once we have proper template.json
    //@ts-ignore
    await res.update({ data: item });

    // Return the reference
    return {
      id: res._id,
      is_unresolved_mmid: false,
      type: this.type,
    };
  }

  async update(id: string, item: RegEntryTypes<T>): Promise<void> {
    let fi = this.subget(id);
    if (fi) {
      await fi.update({ data: item }, {});
    } else {
      console.error(`Failed to update item ${id} of type ${this.type} - item not found`);
    }
  }

  async get(id: string): Promise<RegEntryTypes<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return fi.data.data as RegEntryTypes<T>;
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

  async enumerate(): Promise<
    Array<{
      id: string;
      item: RegEntryTypes<T>;
    }>
  > {
    return game.items.entities.map(e => ({
      id: (e.data as any)._id,
      item: e.data.data as RegEntryTypes<T>,
    }));
  }
}

// Handles accesses to the global actor set
class GlobalActorWrapper<T extends EntryType> extends EntityCollectionWrapper<T> {
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

  async create(item: RegEntryTypes<T>): Promise<RegRef<T>> {
    // Create the item
    item = duplicate(item);
    let name = item.name;
    let res = await Actor.create({ type: this.type, name, data: item });

    // TODO: Remove this, as it should be unnecessary once we have proper template.json
    //@ts-ignore
    await res.update({ data: item });

    // Return the reference
    return {
      id: res._id,
      is_unresolved_mmid: false,
      type: this.type,
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

  async get(id: string): Promise<RegEntryTypes<T> | null> {
    let fi = this.subget(id);
    if (fi) {
      return fi.data.data as RegEntryTypes<T>;
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

  async enumerate(): Promise<
    Array<{
      id: string;
      item: RegEntryTypes<T>;
    }>
  > {
    return game.actors.entities.map(e => ({
      id: (e.data as any)._id,
      item: e.data.data as RegEntryTypes<T>,
    }));
  }
}

class ActorItemWrapper<T extends EntryType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;

  // Where we get the items from. Has to remain as a promise due to some annoying sync/async api issues that are totally my fault but that aren't worth changing
  actor: Promise<Actor | null>;
  constructor(type: T, actor: Promise<Actor | null>) {
    super();
    this.type = type;
    this.actor = actor;
    actor.then(a => {
      if (!a) {
        console.warn("Failed to resolve actor. All operations in this :(");
      }
    });
  }

  // There is no sensible way to handle our actor resolving as null
  async real_actor(): Promise<Actor> {
    let a = await this.actor;
    if (!a) {
      throw new Error("Failed to resolve actor. This registry is thus invalid");
    }
    return a;
  }

  // Handles type checking
  private async subget(id: string): Promise<FoundryRegItem<T> | null> {
    let fi = (await this.real_actor()).items.get(id);
    if (fi && fi.type == this.type) {
      return (fi as unknown) as FoundryRegItem<T>;
    } else {
      return null;
    }
  }

  async create(item: RegEntryTypes<T>): Promise<RegRef<T>> {
    // Create the item
    item = duplicate(item); // better safe than sorry
    let name = item.name;
    let res = await this.real_actor().then(a =>
      a.createOwnedItem({ type: this.type, name, data: item })
    );

    // TODO: Remove this, as it should be unnecessary once we have proper template.json
    // @ts-ignore
    // await res.update({data: item});

    // Return the ref
    return {
      id: res._id,
      is_unresolved_mmid: false,
      type: this.type,
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

  async get(id: string): Promise<RegEntryTypes<T> | null> {
    let fi = await this.subget(id);
    if (fi) {
      return fi.data.data as RegEntryTypes<T>;
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

  async enumerate(): Promise<
    Array<{
      id: string;
      item: RegEntryTypes<T>;
    }>
  > {
    let actor = await this.real_actor();
    return ((actor.items.entries as unknown) as Array<FoundryRegItem<T>>).map(e => ({
      id: e.data._id,
      item: e.data.data,
    }));
  }
}

class CompendiumWrapper<T extends EntryType> extends EntityCollectionWrapper<T> {
  // Need this to filter results by type
  type: T;
  constructor(type: T) {
    super();
    this.type = type;
  }

  private get pack(): Compendium {
    let pack = game.packs.get(`world.${this.type}`);
    if (!pack) {
      throw new Error(`no such pack: world.${this.type}`);
    }
    return pack;
  }

  // Handles type checking and stuff
  private async subget(id: string): Promise<FoundryRegItem<T> | null> {
    let fi = ((await this.pack.getEntity(id)) as unknown) as FoundryRegItem<T> | null;
    if (fi && fi.data.type == this.type) {
      return fi;
    } else {
      return null;
    }
  }

  async create(data: RegEntryTypes<T>): Promise<RegRef<T>> {
    let name = data.name; // Luckily (IE by design), all reg item types have a name
    data = duplicate(data); // better safe than sorry
    let intaken = ((await this.pack.createEntity({
      type: this.type,
      name,
      data,
    })) as unknown) as FoundryRegItem<T>;

    // TODO: Remove this, as it should be unnecessary once we have proper template.json
    await intaken.update({ data: data });
    return {
      id: intaken.data._id,
      is_unresolved_mmid: false,
      type: this.type,
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

  async get(id: string): Promise<RegEntryTypes<T> | null> {
    let fi = await this.subget(id);
    if (fi) {
      return fi.data.data as RegEntryTypes<T>;
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

  async enumerate(): Promise<
    Array<{
      id: string;
      item: RegEntryTypes<T>;
    }>
  > {
    return game.items.entities.map(e => ({
      id: (e.data as any)._id,
      item: e.data.data as RegEntryTypes<T>,
    }));
  }
}

// The meat an' potatoes
export class FoundryRegCat<T extends EntryType> extends RegCat<T> {
  private defaulter: () => RegEntryTypes<T>;
  private handler: EntityCollectionWrapper<T>;

  // Pretty much just delegates to root
  constructor(
    parent: FoundryReg,
    cat: T,
    default_template: () => RegEntryTypes<T>,
    reviver: ReviveFunc<T>,
    handler: EntityCollectionWrapper<T>
  ) {
    super(parent, cat, reviver);
    this.handler = handler;
    this.defaulter = default_template;
  }

  // Look through all entries
  async lookup_mmid(ctx: OpCtx, mmid: string): Promise<LiveEntryTypes<T> | null> {
    // lil' a bit janky, but serviceable. O(N) lookup
    for (let wrapper of await this.handler.enumerate()) {
      let reg_mmid = (wrapper.item as any).id;
      if (reg_mmid == mmid) {
        return this.revive_func(this.parent, ctx, wrapper.id, wrapper.item);
      }
    }
    return null;
  }

  // User entry '.get'
  async get_raw(id: string): Promise<RegEntryTypes<T> | null> {
    return this.handler.get(id) ?? null;
  }

  // Return the 'entries' array
  async list_raw(): Promise<RegEntryTypes<T>[]> {
    return (await this.handler.enumerate()).map(d => d.item);
  }

  // Just call revive on the '.get' result
  async get_live(ctx: OpCtx, id: string): Promise<LiveEntryTypes<T> | null> {
    let raw = await this.handler.get(id);
    if (!raw) {
      return null;
    }
    return this.revive_func(this.parent, ctx, id, raw);
  }

  // Just call revive on each of the 'entries'
  async list_live(ctx: OpCtx): Promise<LiveEntryTypes<T>[]> {
    let sub_pending: Promise<LiveEntryTypes<T>>[] = [];
    for (let e of await this.handler.enumerate()) {
      let live = this.revive_func(this.parent, ctx, e.id, e.item);
      sub_pending.push(live);
    }
    return Promise.all(sub_pending);
  }

  // Use our update function
  async update(...items: LiveEntryTypes<T>[]): Promise<void> {
    // Actor.update({_id: exp._id, name:" Help"})
    let pending: Promise<any>[] = [];
    for (let i of items) {
      let saved = (await i.save()) as RegEntryTypes<T>;
      pending.push(this.handler.update(i.RegistryID, saved));
    }
    await Promise.all(pending);
  }

  // Use our delete function
  async delete_id(id: string): Promise<RegEntryTypes<T> | null> {
    return await this.handler.destroy(id);
  }

  // Create and revive
  async create_many_live(ctx: OpCtx, ...vals: RegEntryTypes<T>[]): Promise<LiveEntryTypes<T>[]> {
    let revived: Promise<LiveEntryTypes<T>>[] = [];

    // Set and revive all
    for (let raw of vals) {
      let created = this.handler.create(raw);
      let viv = created.then(c => this.revive_func(this.parent, ctx, c.id, raw));
      revived.push(viv);
    }

    return Promise.all(revived);
  }

  // Just create
  async create_many_raw(...vals: RegEntryTypes<T>[]): Promise<RegRef<T>[]> {
    let created: Promise<RegRef<T>>[] = [];

    // Set and revive all
    for (let raw of vals) {
      created.push(this.handler.create(raw));
    }

    return Promise.all(created);
  }

  // Just delegate above
  async create_default(ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    return this.create_many_live(ctx, this.defaulter()).then(a => a[0]);
  }
}

// Helper functions for oft-needed special registries
const env = new RegEnv();
const reg = new StaticReg(env);
funcs.intake_pack(funcs.get_base_content_pack(), reg);

// Create a registry backed by all item compendiums
export function create_compendium_reg(): Registry {
  // Todo: use foundry compendiums. This should probably maybe work as a shim in the meantime
  return reg;
}

// Make a covetous reg backing the specified reg.
// export function compendium_back_reg(reg: Registry): CovetousReg {
// if(reg instanceof CovetousReg) {
// throw new Error("Reconsider your approach. Stacking covetous regs very quickly gets confusing");
// }
// return new CovetousReg(reg, [create_compendium_reg()]);
// }
