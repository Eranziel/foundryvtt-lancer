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
  LoadOptions,
} from "machine-mind";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import type { LancerItem, LancerItemType } from "../item/lancer-item";
import { DocumentCollectionWrapper, EntFor as DocFor, GetResult, NuWrapper } from "./db_abstractions";
import { is_core_pack_name } from "./helpers";

// Pluck
const defaults = funcs.defaults;

///////////////////////////////// UTILITY TYPES ///////////////////////////////////////
// This is what an item-data for machine-mind compatible items looks like in foundry.
export interface FoundryRegItemData<T extends EntryType> {
  _id: string;
  data: RegEntryTypes<T> & {
    // Derived data. Should be removed from any update calls
    derived: {
      mm: LiveEntryTypes<T> | null;
      mm_promise: Promise<LiveEntryTypes<T>>; // The above, in promise form. More robust
      // Include other details as appropriate to the document
    };
  };
  type: T;
  img: string;
  flags: any;
  name: string;
  folder?: string | null;
}

// Ditto for actors
export interface FoundryRegActorData<T extends EntryType> extends FoundryRegItemData<T> {
  effects: any[];
  token: Token;
}

// This flag data will, as best as possible, be placed on every item
export interface FoundryFlagData<T extends EntryType = EntryType> {
  // The foundry document that this document corresponds to
  orig_doc: DocFor<T>;

  // The original foundry name. We track this so that if either the .mm.Name or the .orig_doc.name change
  orig_doc_name: string;

  // Will be included in any create/update calls. Merged in after the real data. Should/must be in flat key format (please!)
  top_level_data: {
    // name: string,
    // folder: string,
    // img: string
    [key: string]: any;
  };
}

/**
 * Parsed configuration for our registry, describing on where we intend to lookup ids etc
 */
export type FoundryRegNameParsed =
  | {
      src: "game";
    }
  | {
      src: "game_actor";
      actor_id: ActorID;
    }
  | {
      src: "scene";
      scene_id: SceneID;
    }
  | {
      src: "scene_token";
      scene_id: SceneID;
      token_id: TokenID;
    }
  | {
      src: "comp_core";
    }
  | {
      src: "comp";
      comp_id: CompendiumID;
    }
  | {
      src: "comp_actor";
      comp_id: CompendiumID;
      actor_id: ActorID;
    };

///////////////////////////////// REGISTRY IMPLEMENTATION ///////////////////////////////////////
type ActorID = string;
type TokenID = string;
type SceneID = string;
type CompendiumID = string;

type Source_Game = "game";
type Source_Scene = "scene";
type Source_Core = "comp_core";
type Source_Compendium = "comp";

type Source_GameActor = `${Source_Game}|${ActorID}`;
type Source_TokenActor = `${Source_Scene}|${SceneID}|${TokenID}`;
type Source_CustomCompendium = `${Source_Compendium}|${CompendiumID}`;
type Source_CompActor = `${Source_Compendium}|${CompendiumID}|${ActorID}`;
export type FoundryRegName =
  | Source_Game
  | Source_Scene
  | Source_Core
  | Source_CustomCompendium
  | Source_GameActor
  | Source_TokenActor
  | Source_CompActor;
/**
 * NEW
 * Format of registry names:
 * One of the following:
 * game             - Encompasses the global `game.items` collection.  Equivalent to the "Items.<item_id>" uuid pattern.
 *                    Also encompasses the   `game.actors` collection. Equivalent to the "Actors.<actor_id>" uuid pattern.
 *
 * game|<aid>       - Inventoried registry. Contains the items for game-scoped actor <aid>.
 *                    Equivalent to "Actors.<aid>.Item.<item_id>" uuid pattern.
 *
 * scene|<sid>      - Encompasses all UNLINKED tokens actors on scene <sid>. Equivalent to "Scene.<scene_id>.Token.<token_id>" uuid pattern.
 *                    Currently only really can hold actors-typed entrys, but if "dropped" items ever become a thing will cover that as well
 *
 * scene|<sid>|<aid> -Encompasses all items owned by synthetic actor <aid> on scene <sid>.
 *                    Equivalent to "Scene.<scene_id>.Token.<token_id>.Item.<item_id>" uuid pattern.
 *
 * comp_core         - Encompasses all entries across all items located in the core compendiums (IE those fetched by get_pack)
 * comp|<comp_id>    - Encompasses all entries within the _NON_CORE_ compendium at comp_id. These are slightly harder to enumerate to, naturally
 * comp|<comp_id>|<actor_id>   - Encompasses all item entries owned by the specified actor_id located in the specific compendium comp_id
 *
 *
 * DEPRECATED
 *    > Format of registry names:
 *    > <item_source>|<actor_source>
 *    >
 *    > Where <item_source> is one of:
 *    > compendium                     // The general compendium registry
 *    > compendium_inv:{{actor_id}}    // The inventory of an actor in the compendium
 *    > world                          // The general world registry
 *    > world_inv:{{actor_id}}         // The inventory of an actor in the world
 *    > token_inv:{{actor_id}}         // The inventory of an unlinked token in the token layer
 *    >  -- token is not included because items cannot exist on the token layer
 *    >
 *    > And <actor_source> is one of
 *    > compendium               // The general compendium registry
 *    > world                    // The general world registry
 *    > token                    // The token layer
 *
 * DEPRECATED TRANSLATION?
 * compendium|<anything>              -> comp
 * compendium_inv:<actor_id>|<anything>  -> lookup actor <actor> -> comp|<that_actor_pack_id>|<that_actor_id>
 * world|<anything>                   -> game
 * world_inv:<actor_id>|<anything>    -> game|<actor>
 * token_inv:<token_id>|<anything>    -> lookup token <token_id> in all scenes -> scene|<that_token_scene_id>|<that_token_id>
 */
export class FoundryReg extends Registry {
  // Give a registry for the provided inventoried item.
  async switch_reg_inv(for_inv_item: InventoriedRegEntry<EntryType>): Promise<Registry> {
    // Determine based on actor metadata
    let flags = for_inv_item.Flags as FoundryFlagData<EntryType>;
    let actor = flags.orig_doc as LancerActor;

    // If a compendium actor, make a comp_actor reg
    // If a token, make a scene_token reg
    // If a world game actor, make a game_actor reg
    if (actor.compendium) {
      return new FoundryReg({
        src: "comp_actor",
        comp_id: actor.pack!,
        actor_id: actor.id!,
      });
    } else if (actor.isToken) {
      return new FoundryReg({
        src: "scene_token",
        scene_id: actor.token!.parent!.id!,
        token_id: actor.token!.id!,
      });
    } else {
      return new FoundryReg({
        src: "game_actor",
        actor_id: actor.id!,
      });
    }
  }

  // This is a hack, but it's better than casting every call location
  get_cat<T extends EntryType>(cat: T): FoundryRegCat<T> {
    return super.get_cat(cat) as unknown as FoundryRegCat<T>;
  }

  // Get a name descriptor of what region/set of items/whatever this registry represents/ provides access to
  // Sibling function to switch_reg. See comment above class def for explanation of naming convention
  name(): FoundryRegName {
    return this.raw_config;
  }

  async switch_reg(reg_id: string) {
    return new FoundryReg(reg_id as FoundryRegName) as this;
  }

  // The configuration name we were provided
  raw_config: FoundryRegName;
  parsed_config: FoundryRegNameParsed;

  // Quick function for generating an item/actor wrapper depending on if we have an actor / depending if the type is an actor type
  protected make_wrapper<T extends EntryType>(config: FoundryRegNameParsed, for_type: T): DocumentCollectionWrapper<T> {
    return new NuWrapper(for_type, config);
  }

  // Our reviver function-maker. Revivers are responsible for converting reg entry data into full fledged objects, and managing OpCtx state
  protected make_revive_func<T extends EntryType>(for_type: T, clazz: EntryConstructor<T>): ReviveFunc<T> {
    return async (reg, ctx, id, raw, flag, opts) => {
      //         ^ Revive func
      // Our actual builder function shared between all cats.
      // First check for existing item in ctx
      let pre = ctx.get(reg.name(), id);

      if (!pre) {
        // Otherwise create
        pre = new clazz(for_type, reg, ctx, id, raw, flag ?? {});
      }

      // Wait ready if necessary
      if (opts?.wait_ctx_ready ?? true) {
        // await pre.load_done(); -- unnecessary
        await pre.ctx_ready();
      }

      // And we're done
      return pre as LiveEntryTypes<T>;
    };
  }

  // A quick helper to rapidly setup cats by combining the above two functions
  protected make_cat<T extends EntryType>(
    config: FoundryRegNameParsed,
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

  // Turns reg args provided as a dict into a dict.
  public static parse_reg_args(args: FoundryRegName): FoundryRegNameParsed {
    /// 0.9 BETA COMPAT BLOCK
    // 0.9 beta tester compat spot-fixes the earlier naming convention for refs
    // We will eventually want to remove these, probably
    let cpargs = args as string;
    if (cpargs == "compendium|compendium") {
      args = "comp_core";
      console.debug(`Tweaked to be "${args}" from "${cpargs}"`);
    } else if (cpargs == "world|world") {
      args = "game";
      console.debug(`Tweaked to be "${args}" from "${cpargs}"`);
    } else if (cpargs.slice(0, "world_inv".length) == "world_inv") {
      // * world_inv:<actor_id>|<anything>    -> game|<actor>
      let actor_id = cpargs.slice("world_inv".length + 1).split("|")[0];
      args = `game|${actor_id}` as FoundryRegName;
      console.debug(`Tweaked to be "${args}" from "${cpargs}"`);
    }
    // We don't bother converting the rest. Anyone who has made more esoteric things like compendium pilots will simply have to deal
    /// END 0.9 BETA COMPAT BLOCK

    // Tokenize
    let tokens = args.split("|");

    // Begin processing
    if (tokens[0] == "game") {
      if (tokens[1]) {
        // Is "game|<actor_id>" inventory
        return {
          src: "game_actor",
          actor_id: tokens[1],
        };
      } else {
        // Is "game" globals
        return {
          src: "game",
        };
      }
    } else if (tokens[0] == "scene") {
      if (tokens[2]) {
        // Is "scene|<scene_id>|<actor_id>" specific token inventory listing
        return {
          src: "scene_token",
          scene_id: tokens[1],
          token_id: tokens[2],
        };
      } else if (tokens[1]) {
        // Is "scene|<scene_id>" token listing
        return {
          src: "scene",
          scene_id: tokens[1],
        };
      }
    } else if (tokens[0] == "comp") {
      if (tokens[2]) {
        // Is "comp|<comp_id>|<actor_id>" specific compendium actor inventory
        return {
          src: "comp_actor",
          comp_id: tokens[1],
          actor_id: tokens[2],
        };
      } else if (tokens[1]) {
        // Is targeting a specifc compendium "comp|<comp_id>" all-compendium item amalgam
        return {
          src: "comp",
          comp_id: tokens[1],
        };
      }
    } else if (tokens[0] == "comp_core") {
      // Is targeting core compendium
      return {
        src: "comp_core",
      };
    }

    // None of the above returned? For shame!
    throw new Error(`"${args}" is not a valid FoundryReg name`);
  }

  // Turns reg args provided as a dict into a string.
  private static un_parse_reg_args(args: FoundryRegNameParsed): FoundryRegName {
    switch (args.src) {
      case "game":
        return "game";
      case "comp":
        return `comp|${args.comp_id}` as FoundryRegName;
      case "comp_core":
        return "comp_core";
      case "scene":
        return `scene|${args.scene_id}` as FoundryRegName;
      case "game_actor":
        return `game|${args.actor_id}` as FoundryRegName;
      case "scene_token":
        return `scene|${args.scene_id}|${args.token_id}` as FoundryRegName;
      case "comp_actor":
        return `comp|${args.comp_id}|${args.actor_id}` as FoundryRegName;
      default:
        console.error("Invalid parsed reg args", args);
        throw new Error("Invalid parsed reg args");
    }
  }

  // By default world scope. Can specify either that this is in a compendium, or is in an actor
  constructor(config: FoundryRegNameParsed | FoundryRegName = "game") {
    super();

    if (typeof config == "string") {
      // Save the raw name
      this.raw_config = config;

      // Parse the config
      this.parsed_config = FoundryReg.parse_reg_args(config);
    } else {
      // Save the config
      this.parsed_config = config;

      // Unparse to get raw name
      this.raw_config = FoundryReg.un_parse_reg_args(config);
    }

    // And now we initialize our categories
    this.make_cat(this.parsed_config, EntryType.CORE_BONUS, CoreBonus, defaults.CORE_BONUS);
    this.make_cat(this.parsed_config, EntryType.DEPLOYABLE, Deployable, defaults.DEPLOYABLE);
    this.make_cat(this.parsed_config, EntryType.ENVIRONMENT, Environment, defaults.ENVIRONMENT);
    this.make_cat(this.parsed_config, EntryType.FACTION, Faction, defaults.FACTION);
    this.make_cat(this.parsed_config, EntryType.FRAME, Frame, defaults.FRAME);
    this.make_cat(this.parsed_config, EntryType.LICENSE, License, defaults.LICENSE);
    this.make_cat(this.parsed_config, EntryType.MANUFACTURER, Manufacturer, defaults.MANUFACTURER);
    this.make_cat(this.parsed_config, EntryType.MECH, Mech, defaults.MECH);
    this.make_cat(this.parsed_config, EntryType.MECH_SYSTEM, MechSystem, defaults.MECH_SYSTEM);
    this.make_cat(this.parsed_config, EntryType.MECH_WEAPON, MechWeapon, defaults.MECH_WEAPON);
    this.make_cat(this.parsed_config, EntryType.NPC, Npc, defaults.NPC);
    this.make_cat(this.parsed_config, EntryType.NPC_CLASS, NpcClass, defaults.NPC_CLASS);
    this.make_cat(this.parsed_config, EntryType.NPC_TEMPLATE, NpcTemplate, defaults.NPC_TEMPLATE);
    this.make_cat(this.parsed_config, EntryType.NPC_FEATURE, NpcFeature, defaults.NPC_FEATURE);
    this.make_cat(this.parsed_config, EntryType.ORGANIZATION, Organization, defaults.ORGANIZATION);
    this.make_cat(this.parsed_config, EntryType.PILOT, Pilot, defaults.PILOT);
    this.make_cat(this.parsed_config, EntryType.PILOT_ARMOR, PilotArmor, defaults.PILOT_ARMOR);
    this.make_cat(this.parsed_config, EntryType.PILOT_GEAR, PilotGear, defaults.PILOT_GEAR);
    this.make_cat(this.parsed_config, EntryType.PILOT_WEAPON, PilotWeapon, defaults.PILOT_WEAPON);
    this.make_cat(this.parsed_config, EntryType.QUIRK, Quirk, defaults.QUIRK);
    this.make_cat(this.parsed_config, EntryType.RESERVE, Reserve, defaults.RESERVE);
    this.make_cat(this.parsed_config, EntryType.SITREP, Sitrep, defaults.SITREP);
    this.make_cat(this.parsed_config, EntryType.SKILL, Skill, defaults.SKILL);
    this.make_cat(this.parsed_config, EntryType.STATUS, Status, defaults.STATUS);
    this.make_cat(this.parsed_config, EntryType.TAG, TagTemplate, defaults.TAG_TEMPLATE);
    this.make_cat(this.parsed_config, EntryType.TALENT, Talent, defaults.TALENT);
    this.make_cat(this.parsed_config, EntryType.WEAPON_MOD, WeaponMod, defaults.WEAPON_MOD);
    this.init_finalize();
  }

  get inventory_for_ref(): RegRef<EntryType> | null {
    if (this.parsed_config.src == "game_actor") {
      return {
        reg_name: "game",
        type: null,
        id: this.parsed_config.actor_id,
        fallback_lid: "", // no need
      };
    } else if (this.parsed_config.src == "comp_actor") {
      // Want to be careful to keep core pack items as "core" refs.
      if (is_core_pack_name(this.parsed_config.comp_id)) {
        return {
          reg_name: "comp_core",
          type: null,
          id: this.parsed_config.actor_id,
          fallback_lid: "", // no need
        };
      } else {
        // Is pack specific
        return {
          reg_name: `comp|${this.parsed_config.comp_id}`,
          type: null,
          id: this.parsed_config.actor_id,
          fallback_lid: "",
        };
      }
    } else if (this.parsed_config.src == "scene_token") {
      return {
        reg_name: `scene|${this.parsed_config.scene_id}`,
        id: this.parsed_config.token_id,
        fallback_lid: "",
        type: null,
      };
    } else {
      // We arent!
      return null;
    }
  }
}

// The meat an' potatoes
export class FoundryRegCat<T extends EntryType> extends RegCat<T> {
  private defaulter: () => RegEntryTypes<T>;
  _handler: DocumentCollectionWrapper<T>;

  // Pretty much just delegates to root
  constructor(
    parent: FoundryReg,
    cat: T,
    default_template: () => RegEntryTypes<T>,
    reviver: ReviveFunc<T>,
    handler: DocumentCollectionWrapper<T>
  ) {
    super(parent, cat, reviver);
    this._handler = handler;
    this.defaulter = default_template;
  }

  // Look through all entries
  async lookup_raw(criteria: { [key: string]: any }): Promise<{ id: string; val: RegEntryTypes<T> }[]> {
    // Just call criteria on all items. O(n) lookup, which is obviously not ideal, but if it must be done it must be done
    return this._handler.query(criteria).then(m =>
      m.map(x => ({
        id: x.id,
        val: x.data,
      }))
    );
  }

  // User entry '.get'
  async get_raw(id: string): Promise<RegEntryTypes<T> | null> {
    let gotten = await this._handler.get(id);
    return gotten?.data ?? null;
  }

  // Return the 'entries' array
  async raw_map(): Promise<Map<string, RegEntryTypes<T>>> {
    let map = new Map<string, RegEntryTypes<T>>();
    for (let gr of await this._handler.enumerate()) {
      map.set(gr.id, gr.data);
    }
    return map;
  }

  // Converts a getresult into an appropriately flagged live item. Just wraps revive_func with flag generation and automatic id/raw deduction
  private async revive_and_flag(g: GetResult<T>, ctx: OpCtx, load_options?: LoadOptions): Promise<LiveEntryTypes<T>> {
    let flags: FoundryFlagData<T> = {
      orig_doc: g.document,
      orig_doc_name: g.document.name!,
      top_level_data: {
        name: g.document.name,
        img: g.document.img,
        folder: g.document.folder || null,
      },
    };
    return await this.revive_func(this.registry, ctx, g.id, g.data, flags, load_options);
  }

  // Just call revive on the '.get' result, then set flag to orig item
  async get_live(ctx: OpCtx, id: string, load_options?: LoadOptions): Promise<LiveEntryTypes<T> | null> {
    let retrieved = await this._handler.get(id);
    if (!retrieved) {
      return null;
    }
    return this.revive_and_flag(retrieved, ctx, load_options);
  }

  // Directly wrap a foundry document, without going through get_live resolution mechanism.
  // Modestly dangerous, but can save a lot of repeated computation
  // BE CAREFUL! IF YOU WRAP A DOCUMENT IN A REGISTRY THAT WOULDNT HAVE FETCHED IT, IT WONT WRITE BACK PROPERLY
  async dangerous_wrap_doc(
    ctx: OpCtx,
    ent: T extends LancerActorType ? LancerActor : T extends LancerItemType ? LancerItem : never,
    wait_ready: boolean = true
  ): Promise<LiveEntryTypes<T> | null> {
    let id = ent.id!;

    // ID is different if we are an unlinked token
    if (ent instanceof LancerActor && ent.isToken) {
      id = ent.token!.id!;
    }

    let contrived: GetResult<T> = {
      document: ent as any,
      id,
      // @ts-expect-error Should be fixed with v10 types
      data: ent.system as any,
      type: ent.type as T,
    };
    return this.revive_and_flag(contrived, ctx, {
      wait_ctx_ready: wait_ready,
    }); // Probably want to be ready
  }

  // Just call revive on each of the 'entries', and sort by sort id if we can
  async list_live(ctx: OpCtx, load_options?: LoadOptions): Promise<LiveEntryTypes<T>[]> {
    let sub_pending: Promise<LiveEntryTypes<T>>[] = [];
    for (let e of await this._handler.enumerate()) {
      let live = this.revive_and_flag(e, ctx, load_options);
      sub_pending.push(live);
    }
    let result = await Promise.all(sub_pending);
    // Sort
    return result.sort((a, b) => (a.Flags.orig_doc?.sort ?? 0) - (b.Flags.orig_doc?.sort ?? 0));
  }

  // Use our update function
  async update_impl(...items: Array<LiveEntryTypes<T>>): Promise<void> {
    return this._handler.update(items);
  }

  // Use our delete function
  async delete_id(id: string): Promise<void> {
    await this._handler.destroy(id);
  }

  // Create and revive
  async create_many_live(ctx: OpCtx, ...vals: RegEntryTypes<T>[]): Promise<LiveEntryTypes<T>[]> {
    return this._handler.create_many(vals).then(created => {
      return Promise.all(created.map(c => this.revive_and_flag(c, ctx)));
    });
  }

  // Just create using our handler
  async create_many_raw(...vals: RegEntryTypes<T>[]): Promise<RegRef<T>[]> {
    return this._handler.create_many(vals).then(created =>
      created.map(c => ({
        id: c.id,
        fallback_lid: "",
        type: c.type,
        reg_name: this.registry.name(),
      }))
    );
  }

  // Just delegate above
  async create_default(ctx: OpCtx): Promise<LiveEntryTypes<T>> {
    return this.create_many_live(ctx, this.defaulter()).then(a => a[0]);
  }
}
