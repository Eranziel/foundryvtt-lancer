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
  InventoriedRegEntry,
} from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType } from "../actor/lancer-actor";
import { is_item_type, LancerItem, LancerItemType } from "../item/lancer-item";
import {
  EntityCollectionWrapper,
  CompendiumWrapper,
  WorldActorsWrapper,
  ActorInventoryWrapper,
  WorldItemsWrapper,
  EntFor as DocFor,
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
const ACTORS_COMP = "compendium";
const ACTORS_WORLD = "world";
const ACTORS_TOKEN = "token";

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
    };
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

// This flag data will, as best as possible, be placed on every item
export interface FoundryFlagData<T extends EntryType> {
  // The foundry document that this document corresponds to
  orig_doc: DocFor<T>;

  // Will be included in any create/update calls. Merged in after the real data. Should/must be in flat key format (please!)
  top_level_data: { [key: string]: any };
}

/**
 * Possible configurations for our registry, depending on where we intend to lookup ids
 */
interface RegArgs {
  item_source:
    | [typeof ITEMS_WORLD, null]
    | [typeof ITEMS_COMP, null]
    | [typeof ITEMS_TOKEN_INV, Token]
    | [typeof ITEMS_ACTOR_INV, Actor]; // Default "world", null
  actor_source: typeof ACTORS_WORLD | typeof ACTORS_COMP | typeof ACTORS_TOKEN; // Default "world"
}

///////////////////////////////// REGISTRY IMPLEMENTATION ///////////////////////////////////////
/**
 * Format of registry names:
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
  // Give a registry for the provided inventoried item. 
  async switch_reg_inv(for_inv_item: InventoriedRegEntry<EntryType>): Promise<Registry> {
    // Determine based on actor metadata
    let flags = for_inv_item.Flags as FoundryFlagData<EntryType>;
    let orig = flags.orig_doc as LancerActor<any>;  

    // If a compendium actor, make a compendium reg
    if (orig.compendium) {
      return new FoundryReg({
        actor_source: "compendium", // Associated actors will come from compendium
        item_source: ["actor", orig as LancerActor<any>] // Items will come from this actors inventory
      });
    } else if (orig.isToken) {
      return new FoundryReg({
        actor_source: "token", // Associated actors will probably be tokens, as a first guess. Isn't super important.
        item_source: ["token", orig.token] // Items will come from token
      });
    } else {
      return new FoundryReg({ 
        actor_source: "world", // Associated actors will come from world
        item_source: ["actor", orig] // Items will come from actor inventory
      });
    }
  }

  // Get a name descriptor of what region/set of items/whatever this registry represents/ provides access to
  // Sibling function to switch_reg. See comment above class def for explanation of naming convention
  name(): string {
    // First generate the item side, in accordance with our config
    let items: string;
    switch (this.config.item_source[0]) {
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
        if (actor.compendium) {
          items = `${ITEMS_COMP_INV}:${actor.id}`; // Inventory of a compendium actor
        } else {
          items = `${ITEMS_WORLD_INV}:${actor.id}`; // Inventory of a world actor
        }
        break;
    }

    // Actor source is much simpler
    let actors = this.config.actor_source;
    return `${items}|${actors}`;
  }

  async switch_reg(reg_id: string): Promise<Registry | null> {
    // Generally handles data that just hasn't got what we need
    if (!reg_id || !reg_id.includes("|")) {
      return null;
    }

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
    if (![ACTORS_WORLD, ACTORS_COMP, ACTORS_TOKEN].includes(raw_actors)) {
      console.error(`Invalid actor source "${raw_actors}" from "${reg_id}"`);
      return null;
    }
    let actors = raw_actors as typeof ACTORS_WORLD | typeof ACTORS_COMP | typeof ACTORS_TOKEN;

    // The only remaining task is to find the appropriate item/token if needed
    let reg: FoundryReg;
    if (item_src_id) {
      // Id is found, which means this is an inventory
      if (item_src == ITEMS_TOKEN_INV) {
        // Recover the token. Only works on current scene, unfortunately
        let token: Token | null | undefined = canvas.tokens.get(item_src_id);
        if (token) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_TOKEN_INV, token],
          });
        } else {
          console.error(`Unable to find token actor ${item_src_id}`);
          return null;
        }
      } else if (item_src == ITEMS_WORLD_INV) {
        // Recover the world actor
        let world_actor = game.actors.get(item_src_id);
        if (world_actor) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_ACTOR_INV, world_actor],
          });
        } else {
          console.error(`Unable to find world actor ${item_src_id}`);
          return null;
        }
      } else if (item_src == ITEMS_COMP_INV) {
        // Recover the compendium actor
        // A bit kludgey, but we check all actor packs for a matching item.
        // Caching makes this less onerous than it otherwise might be
        let comp_actor =
          (await cached_get_pack_map(EntryType.DEPLOYABLE)).get(item_src_id) ??
          (await cached_get_pack_map(EntryType.NPC)).get(item_src_id) ??
          (await cached_get_pack_map(EntryType.MECH)).get(item_src_id) ??
          (await cached_get_pack_map(EntryType.PILOT)).get(item_src_id) ??
          null;
        if (comp_actor) {
          reg = new FoundryReg({
            actor_source: actors,
            item_source: [ITEMS_ACTOR_INV, comp_actor],
          });
        } else {
          console.error(`Unable to find compendium actor ${item_src_id} from reg_id=${reg_id}`);
          return null;
        }
      } else {
        // We got an inventory id but we couldn't figure out what it was for
        console.warn(`Invalid actor inventory type ${item_src}`);
        return null;
      }
    } else {
      // No inventory ID - it's either a world or compendium item source. Either way, pretty simple
      if (item_src == ITEMS_WORLD) {
        reg = new FoundryReg({
          actor_source: actors,
          item_source: [ITEMS_WORLD, null],
        });
      } else if (item_src == ITEMS_COMP) {
        reg = new FoundryReg({
          actor_source: actors,
          item_source: [ITEMS_COMP, null],
        });
      } else {
        // If it somehow wasn't either of those types, report back
        console.error(`Invalid item source type ${item_src}`);
        return null;
      }
    }

    // Set cache and return
    // cached_regs.set(reg_id, reg); // CACHING DISABLED UNTIL REGISTRYS ARE MADE STATELESS ONCE MORE - currently hooks interferes with this
    return reg;
  }

  // The configuration we were provided
  config: RegArgs;

  // Quick function for generating an item/actor wrapper depending on if we have an actor / depending if the type is an actor type
  protected make_wrapper<T extends EntryType>(
    config: RegArgs,
    for_type: T
  ): EntityCollectionWrapper<T> {
    if (is_actor_type(for_type)) {
      // Use the actor source for this
      if (config.actor_source == ACTORS_WORLD) {
        return new WorldActorsWrapper(for_type);
      } else if (config.actor_source == ACTORS_COMP) {
        return new CompendiumWrapper(for_type);
      } else {
        return new TokenActorsWrapper(for_type);
      }
    } else if (is_item_type(for_type)) {
      if (config.item_source[0] == ITEMS_WORLD) {
        return new WorldItemsWrapper(for_type);
      } else if (config.item_source[0] == ITEMS_COMP) {
        return new CompendiumWrapper(for_type);
      } else if (config.item_source[0] == ITEMS_ACTOR_INV) {
        return new ActorInventoryWrapper(for_type, config.item_source[1]);
      } else if (config.item_source[0] == ITEMS_TOKEN_INV) {
        return new TokenInventoryWrapper(for_type, config.item_source[1]);
      }
    }
    throw new Error(`Unhandled item type: ${for_type}`);
  }

  // Our reviver function-maker. Revivers are responsible for converting reg entry data into full fledged objects, and managing OpCtx state
  protected make_revive_func<T extends EntryType>(
    for_type: T,
    clazz: EntryConstructor<T>
  ): ReviveFunc<T> {
    return async (reg, ctx, id, raw, flags) => {
      // Our actual builder function shared between all cats.
      // First check for existing item in ctx
      let pre = ctx.get(id);
      if (pre) {
        await pre.ready();
        return pre as LiveEntryTypes<T>;
      }

      // Otherwise create
      let new_item = new clazz(for_type, reg, ctx, id, raw, flags);
      ctx.set(id, new_item);
      await new_item.ready();

      // And we're done
      return new_item;
    };
  }

  // A quick helper to rapidly setup cats by combining the above two functions
  protected make_cat<T extends EntryType>(
    config: RegArgs,
    for_type: T,
    clazz: EntryConstructor<T>,
    defaulter: () => RegEntryTypes<T>
  ) {
    this.init_set_cat(
      new FoundryRegCat(
        this,
        for_type,
        defaulter,
        this.make_revive_func(for_type, clazz),
        this.make_wrapper(config, for_type)
      )
    );
  }

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

    // Aand now we do it
    this.make_cat(_config, EntryType.CORE_BONUS, CoreBonus, defaults.CORE_BONUS);
    this.make_cat(_config, EntryType.DEPLOYABLE, Deployable, defaults.DEPLOYABLE);
    this.make_cat(_config, EntryType.ENVIRONMENT, Environment, defaults.ENVIRONMENT);
    this.make_cat(_config, EntryType.FACTION, Faction, defaults.FACTION);
    this.make_cat(_config, EntryType.FRAME, Frame, defaults.FRAME);
    this.make_cat(_config, EntryType.LICENSE, License, defaults.LICENSE);
    this.make_cat(_config, EntryType.MANUFACTURER, Manufacturer, defaults.MANUFACTURER);
    this.make_cat(_config, EntryType.MECH, Mech, defaults.MECH);
    this.make_cat(_config, EntryType.MECH_SYSTEM, MechSystem, defaults.MECH_SYSTEM);
    this.make_cat(_config, EntryType.MECH_WEAPON, MechWeapon, defaults.MECH_WEAPON);
    this.make_cat(_config, EntryType.NPC, Npc, defaults.NPC);
    this.make_cat(_config, EntryType.NPC_CLASS, NpcClass, defaults.NPC_CLASS);
    this.make_cat(_config, EntryType.NPC_TEMPLATE, NpcTemplate, defaults.NPC_TEMPLATE);
    this.make_cat(_config, EntryType.NPC_FEATURE, NpcFeature, defaults.NPC_FEATURE);
    this.make_cat(_config, EntryType.ORGANIZATION, Organization, defaults.ORGANIZATION);
    this.make_cat(_config, EntryType.PILOT, Pilot, defaults.PILOT);
    this.make_cat(_config, EntryType.PILOT_ARMOR, PilotArmor, defaults.PILOT_ARMOR);
    this.make_cat(_config, EntryType.PILOT_GEAR, PilotGear, defaults.PILOT_GEAR);
    this.make_cat(_config, EntryType.PILOT_WEAPON, PilotWeapon, defaults.PILOT_WEAPON);
    this.make_cat(_config, EntryType.QUIRK, Quirk, defaults.QUIRK);
    this.make_cat(_config, EntryType.RESERVE, Reserve, defaults.RESERVE);
    this.make_cat(_config, EntryType.SITREP, Sitrep, defaults.SITREP);
    this.make_cat(_config, EntryType.SKILL, Skill, defaults.SKILL);
    this.make_cat(_config, EntryType.STATUS, Status, defaults.STATUS);
    this.make_cat(_config, EntryType.TAG, TagTemplate, defaults.TAG_TEMPLATE);
    this.make_cat(_config, EntryType.TALENT, Talent, defaults.TALENT);
    this.make_cat(_config, EntryType.WEAPON_MOD, WeaponMod, defaults.WEAPON_MOD);

    // Insinuation hook - carries over additional data when insinuating from an item
    this.hooks.pre_final_write = async record => {
      // Pending is an odd thing, because though it claims to be from the destination register, that is just a ruse (a deliberate one, mind you)
      // Conveniently, this means that all of its associations etc have their original entities flagged, and also that the top level name/img data
      // is fixed up properly already as well.
      let orig = record.pending.Flags.orig_doc;
      /*
      if (is_actor_type(orig.type)) {
        // 'tis an actor
        let orig_actor = orig as AnyLancerActor;
        let img = orig_actor.data?.img;
        let name = orig_actor.data?.name;
        let token = orig_actor.data?.token;
        await orig_actor.update({ img, name, token });
      } else {
        // 'tis an item. Update its img and name
        let orig_entity = orig as AnyLancerItem;
        let img = orig_entity.data?.img;
        let name = orig_entity.data?.name;
        await orig_entity.update({ img, name }, {});
      }
      */
    };

    this.init_finalize();
  }
  // Mirror implementation of the same function on the base reg, but don't actually make entities.
  async resolve_to_foundry_doc<T extends EntryType>(ref: RegRef<T>): Promise<DocFor<T> | null> {
    // Switch pass
    if (ref.reg_name != this.name()) {
      return ((await this.switch_reg(ref.reg_name)) as FoundryReg).resolve_to_foundry_doc(ref);
    }

    // If we have a type, simple. Otherwise must iterate
    if (ref.type) {
      let cat = this.get_cat(ref.type) as FoundryRegCat<T>;
      return (
        cat.get_foundry_entity(ref.id) ??
        cat.get_foundry_entity_by_name_or_mmid(ref.fallback_mmid) ??
        null
      );
    } else {
      // First look for by id
      for (let type of Object.values(EntryType)) {
        let cat = this.get_cat(type) as FoundryRegCat<EntryType>;
        let by_id = await cat.get_foundry_entity(ref.id);
        if (by_id) return by_id as DocFor<T>;
      }

      // Then by fallback
      for (let type of Object.values(EntryType)) {
        let cat = this.get_cat(type) as FoundryRegCat<EntryType>;
        let by_id = await cat.get_foundry_entity_by_name_or_mmid(ref.fallback_mmid);
        if (by_id) return by_id as DocFor<T>;
      }

      // I yield
      return null;
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
  async lookup_raw(
    criteria: (x: RegEntryTypes<T>) => boolean
  ): Promise<{ id: string; val: RegEntryTypes<T> } | null> {
    // Just call criteria on all items. O(n) lookup, which is obviously not ideal, but if it must be done it must be done
    for (let wrapper of await this.handler.enumerate()) {
      if (criteria(wrapper.item)) {
        return { id: wrapper.id, val: wrapper.item };
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
  async raw_map(): Promise<Map<string, RegEntryTypes<T>>> {
    let map = new Map<string, RegEntryTypes<T>>();
    for (let gr of await this.handler.enumerate()) {
      map.set(gr.id, gr.item);
    }
    return map;
  }

  // Converts a getresult into an appropriately flagged live item
  private async revive_and_flag(g: GetResult<T>, ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    let flags: FoundryFlagData<T> = {
      orig_doc: g.entity,
      top_level_data: {
        name: g.entity.name,
        img: g.entity.img,
      },
    };
    let result = await this.revive_func(this.parent, ctx, g.id, g.item, flags);
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

  // Directly wrap a foundry document, without going through resolution mechanism. Careful here
  async wrap_doc(ctx: OpCtx, ent: T extends LancerActorType ? LancerActor<T> : T extends LancerItemType ? LancerItem<T> : never): Promise<LiveEntryTypes<T> | null> {
    let id = ent.id;

    // ID is different if we are an unlinked token 
    if(ent instanceof LancerActor && ent.isToken) {
      id = ent.token.id;
      
      // Warn if this isn't housed in a sensible reg. I _think_ it'll still work? But something we'd like to be aware of
      if((this.parent as FoundryReg).config.actor_source != "token") {
        console.warn("Wrapping a token doc while not in a token reg.");
      }
    }

    let contrived: GetResult<T> = {
      entity: ent as any,
      id,
      item: ent.data.data as any,
      type: ent.data.type as T
    };
    return this.revive_and_flag(contrived, ctx);
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
  async update(...items: Array<LiveEntryTypes<T>>): Promise<void> {
    return this.handler.update(items);
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

  // For if we just want to get the entity by its id
  async get_foundry_entity(id: string): Promise<DocFor<T> | null> {
    return (await this.handler.get(id))?.entity ?? null;
  }

  // Look through all entries, picking first by mmid and, failing that, by name
  async get_foundry_entity_by_name_or_mmid(id: string): Promise<DocFor<T> | null> {
    let all = await this.handler.enumerate();

    // Look for mmid
    for (let gotten of all) {
      let mmid = (gotten.item as any).id;
      if (id == mmid) {
        return gotten.entity;
      }
    }

    // Look for name
    for (let gotten of all) {
      let name = gotten.entity.name;
      if (id == name) {
        return gotten.entity;
      }
    }

    // Oh well
    return null;
  }
}
