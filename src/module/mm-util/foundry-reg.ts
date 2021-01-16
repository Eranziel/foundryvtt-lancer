import {
  funcs,
  CoreBonus,
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
  NpcFeature,
  PilotWeapon,
  NpcTemplate,
  InsinuationRecord,
  InventoriedRegEntry,
} from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { LANCER, LancerActorType, LancerItemType } from "../config";
import { LancerItem } from "../item/lancer-item";
import {
  EntityCollectionWrapper,
  CompendiumWrapper,
  WorldActorsWrapper,
  ActorInventoryWrapper,
  WorldItemsWrapper,
  EntFor,
  GetResult,
} from "./db_abstractions";

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

// Ditto for actors
export interface FoundryRegActorData<T extends EntryType> extends FoundryRegItemData<T> {
  effects: any[];
  token: Token;
}

export interface FlagData<T extends EntryType> {
  orig_entity: EntFor<T>;
}

///////////////////////////////// REGISTRY IMPLEMENTATION ///////////////////////////////////////
/**
 * Formats:
 * comp                     // The general compendium registry
 * comp_actor:{{actor_id}}  // The inventory of an actor in the compendium
 * world                    // The general world registry
 * world_actor:{{actor_id}} // The inventory of an actor in the world
 */
export class FoundryReg extends Registry {
  // This reduces the number of new registries we must create. Caches both RegEntry lookups and string lookups
  private cached_regs = new Map<any, FoundryReg>();

  // Give a registry for the provided inventoried item
  switch_reg_inv(for_inv_item: InventoriedRegEntry<EntryType>): Registry {
    // Check cache
    if (this.cached_regs.has(for_inv_item)) {
      return this.cached_regs.get(for_inv_item)!;
    }

    // Base our decision on for_inv_item's registry
    let fii_regname = for_inv_item.Registry.name();

    // Behaviour changes if original was compendium - if so, need a compendium + actor reg
    let reg: FoundryReg;
    if (fii_regname.substr(0, 4) == "comp") {
      console.warn("Compendium actor inventories not yet properly supported");
      reg = new FoundryReg({ /*for_actor: actor*/ for_compendium: true });
    } else {
      let actor = game.actors.get(for_inv_item.RegistryID) as LancerActor<LancerActorType>;
      reg = new FoundryReg({ for_actor: actor });
    }

    // Set cache and return
    this.cached_regs.set(for_inv_item, reg);
    return reg;
  }

  // Get a name descriptor of what region/set of items/whatever this registry represents/ provides access to
  name(): string {
    // Depends on our actor and compendium flags
    if (this.for_compendium) {
      if (this.actor) {
        return `comp_actor:${this.actor._id}`;
      } else {
        return "comp";
      }
    } else {
      if (this.actor) {
        return `world_actor:${this.actor._id}`;
      } else {
        return "world";
      }
    }
  }

  switch_reg(inventory_id: string): Registry | null {
    // Check cache
    if (this.cached_regs.has(inventory_id)) {
      return this.cached_regs.get(inventory_id)!;
    }

    // Get subtype
    let [subtype, id] = inventory_id.split(":");
    id = id ?? "";
    let reg: FoundryReg;
    switch (subtype) {
      case "comp":
        reg = new FoundryReg({ for_compendium: true });
        break;
      case "world":
        reg = new FoundryReg();
        break;
      case "world_actor":
        // return an actor-compendium with actor fetched v. simply
        let actor = game.actors.get(id);
        if (actor) {
          reg = new FoundryReg({ for_actor: actor });
          break;
        } else {
          return null;
        }
      case "comp_actor":
        console.warn("Compendium actor item refs not yet supported");
        return null;
      default:
        return null;
    }

    // Set cache and return
    this.cached_regs.set(inventory_id, reg);
    return reg;
  }

  // The associated actor, if any
  public actor: Actor | null;
  for_compendium: boolean;

  // By default world scope. Can specify either that this is in a compendium, or is in an actor
  constructor(
    { for_compendium, for_actor }: { for_compendium?: boolean; for_actor?: Actor | null } = {
      for_compendium: false,
    }
  ) {
    super();
    this.for_compendium = for_compendium ?? false;

    this.actor = for_actor ?? null;
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
        // Make a wrapper to handle actors, pulling from game.actors
        // @ts-ignore This is a case of typescripts enum discrimination not holding up in more complex cases.
        return new WorldActorsWrapper(for_type);
      } else if (for_actor) {
        // Make a wrapper to handle an individual actor's inventory items
        // @ts-ignore This is a case of typescripts enum discrimination not holding up in more complex cases.
        return new ActorInventoryWrapper(for_type, _actor);
      } else {
        // Make a wrapper to handle items, pulling from game.items
        // @ts-ignore This is a case of typescripts enum discrimination not holding up in more complex cases.
        return new WorldItemsWrapper(for_type);
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
    do_cat(EntryType.DEPLOYABLE, Deployable, defaults.DEPLOYABLE);
    do_cat(EntryType.ENVIRONMENT, Environment, defaults.ENVIRONMENT);
    do_cat(EntryType.FACTION, Faction, defaults.FACTION);
    do_cat(EntryType.FRAME, Frame, defaults.FRAME);
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

  // Hook - carries over additional data when insinuating from an item
  async hook_post_insinuate<T extends EntryType>(record: InsinuationRecord<T>) {
    // Check if we have an original entity
    let orig = record.new_item.flags?.orig_entity;
    if (record.new_item.flags?.orig_entity) {
      if (LANCER.actor_types.includes(orig.type)) {
        // 'tis an actor
        let orig_entity = record.new_item.flags.orig_entity as LancerActor<T & LancerActorType>;
        let img = orig_entity.data?.img;
        let name = orig_entity.data?.name;
        let token = orig_entity.data?.token;
        await orig_entity.update({ img, name, token });
      } else {
        // 'tis an item
        let orig_entity = record.new_item.flags.orig_entity as LancerItem<T & LancerItemType>;
        let img = orig_entity.data?.img;
        let name = orig_entity.data?.name;
        await orig_entity.update({ img, name }, {});
      }
    }
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
    let gotten = await this.handler.get(id);
    return gotten?.item ?? null;
  }

  // Return the 'entries' array
  async list_raw(): Promise<RegEntryTypes<T>[]> {
    return (await this.handler.enumerate()).map(d => d.item);
  }

  // Converts a getresult into an appropriately flagged live item
  private async revive_and_flag(g: GetResult<T>, ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    let result = await this.revive_func(this.parent, ctx, g.id, g.item);
    let flags: FlagData<T> = {
      orig_entity: g.entity,
    };
    result.flags = flags;
    return result;
  }

  // Just call revive on the '.get' result, then set flag to orig item
  async get_live(ctx: OpCtx, id: string): Promise<LiveEntryTypes<T> | null> {
    let retrieved = await this.handler.get(id);
    if (!retrieved) {
      return null;
    }
    return this.revive_and_flag(retrieved, ctx);
  }

  // Just call revive on each of the 'entries'
  async list_live(ctx: OpCtx): Promise<LiveEntryTypes<T>[]> {
    let sub_pending: Promise<LiveEntryTypes<T>>[] = [];
    for (let e of await this.handler.enumerate()) {
      let live = this.revive_and_flag(e, ctx);
      sub_pending.push(live);
    }
    return Promise.all(sub_pending);
  }

  // Use our update function
  async update_many_raw(items: Array<{ id: string; data: RegEntryTypes<T> }>): Promise<void> {
    // Actor.update({_id: exp._id, name:" Help"})
    let pending: Promise<any>[] = [];
    for (let i of items) {
      pending.push(this.handler.update(i.id, i.data));
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
      let viv = created.then(c => this.revive_and_flag(c, ctx));
      revived.push(viv);
    }

    return Promise.all(revived);
  }

  // Just create
  async create_many_raw(...vals: RegEntryTypes<T>[]): Promise<RegRef<T>[]> {
    let created: Promise<GetResult<T>>[] = [];

    // Set and revive all
    for (let raw of vals) {
      created.push(this.handler.create(raw));
    }

    return Promise.all(created).then(created_results => {
      return created_results.map(g => ({
        id: g.id,
        type: g.type,
        is_unresolved_mmid: false,
        reg_name: this.parent.name(),
      }));
    });
  }

  // Just delegate above
  async create_default(ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    return this.create_many_live(ctx, this.defaulter()).then(a => a[0]);
  }
}
