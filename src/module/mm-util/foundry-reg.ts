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
import { is_actor_type, LancerActor, LancerActorType, LancerActorTypes } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { is_item_type, LancerItem, LancerItemType } from "../item/lancer-item";
import {
  EntityCollectionWrapper,
  CompendiumWrapper,
  WorldActorsWrapper,
  ActorInventoryWrapper,
  WorldItemsWrapper,
  EntFor,
  GetResult,
  cached_get_pack_map,
  TokensActorsWrapper as TokenActorsWrapper,
  TokenInventoryWrapper,
} from "./db_abstractions";
import { MMEntityContext } from "./helpers";

// Pluck
const defaults = funcs.defaults;

// Standardizing these, the config values
// Sources of unowned items
const ITEMS_WORLD = "world";
const ITEMS_COMP = "compendium";

// Sources of inventory items
const ITEMS_ACTOR_INV = "actor"; // This one is a bit odd. Used in config because we don't particularly care if an Actor is from world or compendium, as it is easily deduced from the actor
const ITEMS_WORLD_INV = "world_inv";
const ITEMS_COMP_INV = "compendium_inv";
const ITEMS_TOKEN_INV = "token";

// Sources of actors
const ACTORS_COMP = "compendium"
const ACTORS_WORLD = "world"
const ACTORS_TOKEN = "token"

///////////////////////////////// UTILITY TYPES ///////////////////////////////////////
// This is what an item-data for machine-mind compatible items looks like in foundry.
export interface FoundryRegItemData<T extends EntryType> {
  _id: string;
  data: RegEntryTypes<T> & {
    // Derived data. Should be removed from any update calls
    derived: {
      mmec: MMEntityContext<T>;
      mmec_promise: Promise<MMEntityContext<T>>; // The above, in promise form. More robust
      // Include other details as appropriate to the entity
    }
  };
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

/**
 * Possible configurations for our registry, depending on where we intend to lookup ids
 */
interface RegArgs {
  item_source: [typeof ITEMS_WORLD, null] | [typeof ITEMS_COMP, null] | [typeof ITEMS_TOKEN_INV, Token] | [typeof ITEMS_ACTOR_INV, Actor]; // Default "world", null
  actor_source: typeof ACTORS_WORLD | typeof ACTORS_COMP | typeof ACTORS_TOKEN; // Default "world"
}

///////////////////////////////// REGISTRY IMPLEMENTATION ///////////////////////////////////////
/**
 * Format:
 * <item_source>|<actor_source>
 * 
 * Where <item_source> is one of:
 * compendium                     // The general compendium registry
 * compendium_inv:{{actor_id}}    // The inventory of an actor in the compendium
 * world                          // The general world registry
 * world_inv:{{actor_id}}         // The inventory of an actor in the world
 * token_inv:{{actor_id}}         // The inventory of an unlinked token in the token layer
 *  -- token is not included because items cannot exist on the token layer
 * 
 * And <actor_source> is one of
 * compendium               // The general compendium registry
 * world                    // The general world registry
 * token                    // The token layer 
 */
const cached_regs = new Map<string, FoundryReg>(); // Since regs are stateless, we can just do this
export class FoundryReg extends Registry {
  // Give a registry for the provided inventoried item
  async switch_reg_inv(for_inv_item: InventoriedRegEntry<EntryType>): Promise<Registry> {
    // We can usually deduce which to use based on which registry we were recovered from
    let reg = for_inv_item.Registry as FoundryReg;
    let new_reg: Registry | null = null;
    let id = for_inv_item.RegistryID;

    if(reg.config.actor_source == ACTORS_COMP) {
      let comp_key = `${ITEMS_COMP_INV}:${id}|${ACTORS_COMP}`; 
      new_reg = await this.switch_reg(comp_key);
    } 
    else if(reg.config.actor_source == ACTORS_TOKEN) {
      let token_key = `${ITEMS_TOKEN_INV}:${id}|${ACTORS_TOKEN}`; 
      new_reg = await this.switch_reg(token_key);
    } 
    else if(reg.config.actor_source == ACTORS_WORLD) {
      let world_key = `${ITEMS_WORLD_INV}:${id}|${ACTORS_WORLD}`; 
      new_reg = await this.switch_reg(world_key);
    }

    if(!new_reg) {
      throw new Error("Failed to switch reg.... hmmmmmm");
    } else {
      return new_reg;
    }
  }

  // Get a name descriptor of what region/set of items/whatever this registry represents/ provides access to
  // Sibling function to switch_reg. See comment above class def for explanation of naming convention
  name(): string {
    // First generate the item side, in accordance with our config
    let items: string;
    switch(this.config.item_source[0]) {
      case ITEMS_COMP:
        items = ITEMS_COMP; // Items from the compendium
        break;
      default:
      case ITEMS_WORLD:
        items = ITEMS_WORLD; // Items from the world
        break;
      case "token":
        items = `${ITEMS_TOKEN_INV}:${this.config.item_source[1].id}`; // Inventory of a synthetic token actor
        break;
      case "actor":
        let actor = this.config.item_source[1];
        if(actor.compendium) {
          items = `${ITEMS_COMP_INV}:${actor.id}`; // Inventory of a compendium actor
        } else {
          items = `${ITEMS_WORLD_INV}:${actor.id}`; // Inventory of a world actor
        }
        break;
      }

      // Actor source is much simpler
      let actors = this.config.actor_source;
      return `${items}|${actors}`
  }

  async switch_reg(reg_id: string): Promise<Registry | null> {
    // Check cache. Use cached entry if available
    if (cached_regs.has(reg_id)) {
      return cached_regs.get(reg_id)!;
    }

    // Get subtype/id by splitting on colon. See comment above class def for explanation
    let [raw_items, raw_actors] = reg_id.split("|");
    let split_items = raw_items.split(":");
    let item_src = split_items[0];
    let item_src_id: string | null = split_items.length > 1 ? split_items[1] : null;

    // Quickly validate actors
    if(![ACTORS_WORLD, ACTORS_COMP, ACTORS_TOKEN].includes(raw_actors)) {
      console.error(`Invalid actor source "${raw_actors}" from "${reg_id}"`);
      return null;
    }
    let actors = raw_actors as typeof ACTORS_WORLD | typeof ACTORS_COMP | typeof ACTORS_TOKEN;

    // The only remaining task is to find the appropriate item/token if needed
    let reg: FoundryReg;
    if(item_src_id) {
      // Id is found, which means this is an inventory
      if(item_src == ITEMS_TOKEN_INV) {
        // Recover the token
        let token: Token | null | undefined = canvas.tokens.get(item_src_id);
        if(token) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_TOKEN_INV, token]
          });
        } else {
          console.error(`Unable to find token actor ${item_src_id}`);
          return null;
        }

      } else if(item_src == ITEMS_WORLD_INV) {
        // Recover the world actor
        let world_actor = game.actors.get(item_src_id);
        if(world_actor) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_ACTOR_INV, world_actor]
          });
        } else {
          console.error(`Unable to find world actor ${item_src_id}`);
          return null;
        }

      } else if(item_src == ITEMS_COMP_INV) {
        // Recover the compendium actor
        // A bit kludgey, but we check all actor packs for a matching item. 
        // Caching makes this less onerous than it otherwise might be
        let comp_actor = (
                  (await cached_get_pack_map(EntryType.DEPLOYABLE)).get(item_src_id)
                ??(await cached_get_pack_map(EntryType.NPC)).get(item_src_id)
                ??(await cached_get_pack_map(EntryType.MECH)).get(item_src_id)
                ??(await cached_get_pack_map(EntryType.PILOT)).get(item_src_id)
                ?? null);
        if(comp_actor) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_ACTOR_INV, comp_actor]
          });
        } else {
          console.error(`Unable to find compendium actor ${item_src_id}`);
          return null;
        }

      } else {
        // We got an inventory id but we couldn't figure out what it was for
        console.warn(`Invalid actor inventory type ${item_src}`);
        return null;
      }

    } else {
      // No inventory ID - it's either a world or compendium item source. Either way, pretty simple
      if(item_src == ITEMS_WORLD) { 
        reg = new FoundryReg({
          actor_source: actors,
          item_source: [ITEMS_WORLD, null]
        });
      } else if(item_src == ITEMS_COMP) {
        reg = new FoundryReg({
          actor_source: actors,
          item_source: [ITEMS_COMP, null]
        });
      } else {
        // If it somehow wasn't either of those types, report back
        console.error(`Invalid item source type ${item_src}`);
        return null; 
      }
    }

    // Set cache and return
    cached_regs.set(reg_id, reg);
    return reg;   
  }

  // The configuration we were provided
  config: RegArgs;

  // By default world scope. Can specify either that this is in a compendium, or is in an actor
  constructor(config?: Partial<RegArgs>) {
    super();

    // Set defaults
    config = config ? config : {};
    config.actor_source = config.actor_source ?? "world";
    config.item_source = config.item_source ?? ["world", null];

    // All fields set, use this for convenience
    let _config = config as Required<RegArgs>;
    this.config = _config;

    // Quick function for generating an item/actor wrapper depending on if we have an actor / depending if the type is an actor type
    function quick_wrapper<T extends EntryType>(for_type: T): EntityCollectionWrapper<T> {
      if(is_actor_type(for_type)) {
        // Use the actor source for this
        if(_config.actor_source == ACTORS_WORLD) {
          return new WorldActorsWrapper(for_type)
        } else if(_config.actor_source == ACTORS_COMP) {
          return new CompendiumWrapper(for_type)
        } else {
          return new TokenActorsWrapper(for_type)
        }
      } else if(is_item_type(for_type)) {
        if(_config.item_source[0] == ITEMS_WORLD) {
          return new WorldItemsWrapper(for_type);
        } else if(_config.item_source[0] == ITEMS_COMP) {
          return new CompendiumWrapper(for_type);
        } else if(_config.item_source[0] == ITEMS_ACTOR_INV) {
          return new ActorInventoryWrapper(for_type, _config.item_source[1]);
        } else if(_config.item_source[0] == ITEMS_TOKEN_INV) {
          return new TokenInventoryWrapper(for_type, _config.item_source[1]);
        }
      }
      throw new Error(`Unhandled item type: ${for_type}`);
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
      if (is_actor_type(orig.type)) {
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

  // Just create using our handler
  async create_many_raw(...vals: RegEntryTypes<T>[]): Promise<RegRef<T>[]> {
    let created: Promise<GetResult<T>>[] = [];

    // Set and revive all
    for (let raw of vals) {
      created.push(this.handler.create(raw));
    }

    return Promise.all(created).then(created_results => {
      return created_results.map(g => ({
        id: g.id,
        fallback_mmid: "",
        type: g.type,
        reg_name: this.parent.name(),
      }));
    });
  }

  // Just delegate above
  async create_default(ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    return this.create_many_live(ctx, this.defaulter()).then(a => a[0]);
  }
}
