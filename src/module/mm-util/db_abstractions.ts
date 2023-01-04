import { AnyRegNpcFeatureData, EntryType, LiveEntryTypes, RegEntryTypes } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType } from "../actor/lancer-actor";
import { TypeIcon } from "../config";
import type { LancerItem, LancerItemType } from "../item/lancer-item";
import type { FoundryFlagData, FoundryRegNameParsed } from "./foundry-reg";
import { get_pack, get_pack_id } from "./helpers";

// The associated document to a given entry type. Type's a lil complex, but we need it to get things correct between abstracters that take items vs actors
// tl;dr maps entrytype to LancerItem or LancerActor
// export type EntFor<T extends EntryType & (LancerItemType | LancerActorType) > = T extends LancerItemType ? LancerItem<T> : (T extends LancerActorType ? LancerActor<T> : never);
export type EntFor<T extends EntryType> = T extends LancerItemType
  ? LancerItem
  : T extends LancerActorType
  ? LancerActor
  : never;

export interface GetResult<T extends LancerItemType | LancerActorType> {
  data: RegEntryTypes<T>;
  document: EntFor<T>;
  id: string; // only truly necessary on enums, but still convenient
  type: T; // same
}

/**
 * Converts a document into an item suitable for calling .create/.update/whatver with.
 * Specifically,
 * - creates the "data" by .save()ing the document
 * - augments the data with anything in our top_level_data
 * - includes an id appropriate to the item. This will allow for bulk .update()s, and has no effect on .create()s
 *  + Note that this ID is taken from the MM entry, not the original document. This is because some techniques like
 *    insinuation rely on manually altering Registry info to propagate ref changes
 */
function as_document_blob<T extends EntryType>(entry: LiveEntryTypes<T>): any {
  let flags = entry.Flags as FoundryFlagData<T>;

  // Set name from changed data. Prioritize a changed top level name over a changed entry name
  if (flags.top_level_data.name && flags.top_level_data.name != flags.orig_doc_name) {
    // Override entry data with top level
    entry.Name = flags.top_level_data.name;
  } else if (entry.Name && entry.Name != flags.orig_doc_name) {
    // Override top level with entry data
    flags.top_level_data.name;
  }

  // v10 - Replace folder object with folder id
  if (flags.top_level_data.folder && flags.top_level_data.folder.id) {
    flags.top_level_data.folder = flags.top_level_data.folder.id;
  }

  // Combine saved data with top level data
  return mergeObject(
    {
      _id: entry.RegistryID,
      system: entry.save(),
    },
    flags.top_level_data
  );
}

/**
 * A FoundryRegNameParsed resolved into specific collections
 */
export type ResolvedRegArgs = {
  item_collection?: null | (() => Promise<any>); // If provided we use this item collection. Might be an inventory, hence the asynchronous lookup
  actor_collection?: null | any; // If provided we use this actor collection. If not provided, we use the token collection and map to the appropriate actor
  token_collection?: null | any; // If provided we use this token collection to fetch actors. Corresponds to a single Scene
};

export abstract class DocumentCollectionWrapper<T extends EntryType> {
  // Create an item and return a reference to it
  abstract create_many(items: RegEntryTypes<T>[]): Promise<GetResult<T>[]>; // Return id
  // Update the specified item of type T
  abstract update(items: Array<LiveEntryTypes<T>>): Promise<any>;
  // Retrieve the specified item of type T, or yield null if it does not exist
  abstract get(id: string): Promise<GetResult<T> | null>;
  // Delete the specified item
  abstract destroy(id: string): Promise<any>;
  // List items matching specific query items, including id for reference
  abstract query(query_ob: { [key: string]: any }): Promise<GetResult<T>[]>;
  // List all items, including id for reference
  abstract enumerate(): Promise<GetResult<T>[]>;
}

// 0.8: Should return CompendiumCollection. Lists all compendiums of specified document type that aren't in our standard id set

export class NuWrapper<T extends EntryType> extends DocumentCollectionWrapper<T> {
  // Need this to filter results by type/know what we're returning
  entry_type: T;
  // We hold onto this as well
  cfg: FoundryRegNameParsed;

  // This is our document type that we'll use for creation/destruction
  // doc_type: typeof Actor | typeof Item;

  // Our scene, if any. If provided, we use special procedures for getting data to properly fetch from here
  // Note: we ONLY set this if we are src type "scene", since "scene_token" doesn't really care
  // Scene and pack will never both be set
  scene: any | null; // 0.8 Should be `Scene` once the type is fixed

  // Our pack, if any. Should only ever be one, because
  // - If we have a parent, it will be from a single pack and thus all items in our purview will also be from that singular pack
  // - If we are core, in spite of the numerous packs we have but a single one that actually is associated with this entry type
  // - If we are not core, then we are exclusively associated with a single custom compendium pack name
  // Scene and pack will never both be set
  pack: string | null;

  private static async lookup_collection_and_parent<G extends EntryType>(entry_type: G, cfg: FoundryRegNameParsed) {
    if (cfg.src == "comp_actor") {
      // Get our desired pack
      let actor_pack = game.packs.get(cfg.comp_id);
      if (!actor_pack) {
        throw new Error("Couldn't find pack " + cfg.comp_id);
      }

      // Get our desired actor document from the pack
      let actor = (await actor_pack.getDocument(cfg.actor_id)) as LancerActor | null | undefined;
      if (!actor) {
        throw new Error("Pack " + cfg.comp_id + " didn't have actor with id " + cfg.actor_id);
      }

      // Victory! Return the actors item collection
      return [actor.items, actor];
    } else if (cfg.src == "game_actor") {
      // Lookup the actor
      let actor = game.actors!.get(cfg.actor_id);
      if (!actor) {
        throw new Error("Couldn't find game actor " + cfg.actor_id);
      }

      // Success!
      return [actor.items, actor];
    } else if (cfg.src == "scene_token") {
      // Lookup scene
      let scene = game.scenes!.get(cfg.scene_id);
      if (!scene) {
        throw new Error("Couldn't find scene " + cfg.scene_id);
      }

      // Lookup token in scene
      let token = scene.tokens.get(cfg.token_id);
      if (!token) {
        throw new Error("Couldn't find token " + cfg.token_id + " in scene " + cfg.scene_id);
      }

      // Get actor from token
      if (!token.actor) {
        throw new Error(`Token ${cfg.token_id} has no actor`); // Possible, albeit unlikely, if tokens actor is delete
      }

      // Return the token actor. Success!
      return [token.actor.items, token.actor];
    } else if (cfg.src == "comp") {
      // Get the pack collection.
      let pack = game.packs.get(cfg.comp_id);
      if (!pack) {
        throw new Error(`Pack ${cfg.comp_id} does not exist`);
      }
      return [pack, undefined];
    } else if (cfg.src == "comp_core") {
      // Get the pack collection, derived from our type
      let pack = await get_pack(entry_type);
      if (!pack) {
        throw new Error(`Failed to (re)-generate core pack ${entry_type}`);
      }
      return [pack, undefined];
    } else if (cfg.src == "game") {
      // Get the appropriate world collection
      if (is_actor_type(entry_type)) {
        return [game.actors, undefined];
      } else {
        return [game.items, undefined];
      }
    } else if (cfg.src == "scene") {
      // A bit weird, but we return game.actors
      // Separate logic will make sure that we update with the right parent
      return [game.actors, undefined];
    } else {
      throw new Error(`Invalid cfg.src ${(cfg as any).src}`);
    }
  }

  // Our collection. Can be a world collection, embedded collection, or compendiumcollection
  // Note: technically, "scene_tokens" still uses the game.actors collection
  // Has .documentClass, which we use to call updateDocuments etc
  // (Sometimes) has .parent. If we have an actor, will have .parent that yields actordata
  // collection: Promise<any>; // 0.8 Should be EmbeddedCollection | WorldCollection, and can be of Items or Actors
  private _cached_collection_and_parent: Promise<any> | null = null;
  // Resolves our collection as appropriate. Async to handle comp_actor cases. We only do this if we need to, hence it not being in constructor
  private async collection_and_parent(): Promise<any> {
    if (!this._cached_collection_and_parent) {
      this._cached_collection_and_parent = NuWrapper.lookup_collection_and_parent(this.entry_type, this.cfg);
    }
    return this._cached_collection_and_parent;
  }

  private async collection(): Promise<any> {
    return (await this.collection_and_parent())[0];
  }

  private async parent(): Promise<any> {
    return (await this.collection_and_parent())[1];
  }

  constructor(type: T, cfg: FoundryRegNameParsed) {
    super();

    // Set type and config
    this.entry_type = type;
    this.cfg = cfg;

    // Resolve our pack
    if (cfg.src == "comp" || cfg.src == "comp_actor") {
      // Resolve from our core type pack primarily, but also give others!
      this.pack = cfg.comp_id;
    } else if (cfg.src == "comp_core") {
      this.pack = get_pack_id(this.entry_type);
    } else {
      this.pack = null;
    }

    // Resolve our scene
    if (cfg.src == "scene") {
      this.scene = game.scenes!.get(cfg.scene_id);
      if (!this.scene) {
        throw new Error(`Invalid scene id: "${cfg.scene_id}"`);
      }
    } else {
      this.scene = null;
    }
  }

  // Options to provide to document editing operations.
  private async opts(): Promise<any> {
    // 0.8 Should eventually be DocumentModificationContext
    // Attempt to resolve
    let collection = await this.collection();
    let parent = await this.parent(); // Will give base actor / token

    if (parent) {
      // Fix if document option exists (sometimes parent will just be an ActorData)
      if (parent.document) {
        parent = parent.document;
      }
      return {
        parent,
        pack: this.pack,
      };
    } else {
      return {
        pack: this.pack,
      };
    }
  }

  async create_many(reg_data: RegEntryTypes<T>[]): Promise<GetResult<T>[]> {
    // Creating tokens via this mechanism is forbidden, for the time being.
    if (this.scene) {
      console.error("Creating tokens via registry is not yet supported");
      return [];
    }

    let collection = await this.collection();
    let opts = await this.opts();

    // console.log("CREATING " + reg_data.map(i => `${i.name} - ${this.entry_type}`).join(","));

    // Turn data into the format expected by createDocuments
    let docified = reg_data.map(d => ({
      type: this.entry_type,
      name: d.name,
      data: duplicate(d),
      img: TypeIcon(
        this.entry_type + (this.entry_type == EntryType.NPC_FEATURE ? (d as AnyRegNpcFeatureData).type : "")
      ),
    }));

    // Create the docs. Opts will properly put things in the right collection/actor/whatever
    let new_docs = (await collection.documentClass.createDocuments(docified, opts)) as EntFor<T>[];

    // console.log("CREATED " + new_docs.map(i => `${i.name} - ${this.entry_type} - ${i.id}`).join(","));

    // Return the reference
    return new_docs.map((item, index) => ({
      id: item.id!,
      document: item,
      type: this.entry_type,
      data: reg_data[index],
    }));
  }

  // Simple delegated call to <document class>.updateDocuments
  async update(items: Array<LiveEntryTypes<T>>): Promise<void> {
    // console.log("UPDATING " + items.map(i => `${i.Name} - ${i.Type} - ${i.RegistryID}`).join(","));
    if (this.cfg.src == "scene") {
      for (let item of items) {
        await this.scene.tokens.get(item.RegistryID)?.actor.update(as_document_blob(item));
      }
    } else {
      return (await this.collection()).documentClass.updateDocuments(items.map(as_document_blob), await this.opts());
    }
  }

  // Simple delegated call to <document class>.deleteDocuments
  async destroy(id: string): Promise<RegEntryTypes<T> | null> {
    return (await this.collection()).documentClass.deleteDocuments([id], await this.opts());
  }

  // Call a .get appropriate to our parent/pack/lack thereof
  async get(id: string): Promise<GetResult<T> | null> {
    // console.log("GETTING " + id);
    let collection = await this.collection();
    let fi: any; // Our found result

    // Getting item slightly different if we're a pack/scene
    if (this.scene) {
      let tok = this.scene.tokens.get(id);
      fi = tok?.actor;
    } else if (this.pack) {
      fi = await collection.getDocument(id); // Is a CompendiumCollection
    } else {
      fi = collection.get(id);
    }

    // Check its type and return
    if (fi && fi.type == this.entry_type) {
      return {
        data: fi.system as RegEntryTypes<T>,
        document: fi as EntFor<T>,
        id,
        type: this.entry_type,
      };
    } else {
      return null;
    }
  }

  // Call a .contents/getDocuments appropriate to our parent/container/whatever, then filter to match query
  async query(query_obj: { [key: string]: any }): Promise<GetResult<T>[]> {
    // If we are a pack must first call .getDocuments() to fetch all
    let collection = await this.collection();
    let parent = await this.parent();
    let all: any[];
    if (this.pack && !parent) {
      // Need to prepend every key with "system."
      let new_query: typeof query_obj = {};
      let legacy_query: typeof query_obj = {};
      for (let kv of Object.entries(query_obj)) {
        new_query["system." + kv[0]] = kv[1];
        legacy_query["data." + kv[0]] = kv[1];
      }

      all = await collection.getDocuments({
        ...new_query,
        type: this.entry_type,
      });
      if(!all.length) { // v9 backwards compendium support
        all = await collection.getDocuments({
          ...legacy_query,
          type: this.entry_type,
        });
      }
    } else {
      all = collection.contents;
      // But we have to filter it ourselves - no getDocuments query here!
      all = all.filter(doc => {
        // First check entry type
        if (doc.type != this.entry_type) {
          return false; // Failure! Filter it out
        }

        // Check each k, v
        for (let [k, v] of Object.entries(query_obj)) {
          if (doc._source.system[k] != v) {
            return false; // Failure! Filter it out
          }
        }
        return true; // It's fine :)
      });
    }

    // Having retrieved all, just map to our GetResult format
    return all.map((e: any) => ({
      id: e._id,
      data: e.system as RegEntryTypes<T>,
      document: e as EntFor<T>,
      type: this.entry_type,
    }));
  }

  // Just query with no filter! ez
  enumerate(): Promise<GetResult<T>[]> {
    return this.query({});
  }
}

/********* COMPENDIUM CACHING **********/
// const COMPENDIUM_CACHE_TIMEOUT = 2 * 1000; // 20 seconds

// Caches getContent() _as a map_ (wowee!). Idk if generating these maps are expensive but why tempt fate, lmao
/*
const PackContentMapCache = new FetcherCache(
  COMPENDIUM_CACHE_TIMEOUT,
  async (type: LancerItemType | LancerActorType) => {
    let pack = await get_pack(type);
    let data = await (pack as any).getDocuments();
    let map = new Map();
    for (let e of data) {
      map.set(e.id, e);
    }
    return map;
  }
);

// This wraps interfacing with above caches, but with better typing!
export async function cached_get_pack_map<T extends LancerItemType | LancerActorType>(
  type: T
): Promise<Map<string, T extends LancerItemType ? LancerItem<T> : T extends LancerActorType ? LancerActor<T> : never>> {
  // console.log("Cache flushing should be triggered off of compendium CRUD hooks");
  return PackContentMapCache.fetch(type);
}

// Use this for incoming compendium updates, as we cannot really watch for them otherwise
export function invalidate_cached_pack_map<T extends EntryType>(type: T) {
  console.log("Flushed cache. Note that this was made faster for testing, and should be more of a 60 second interval thing: ", type);
  PackContentMapCache.flush(type);
}
*/
