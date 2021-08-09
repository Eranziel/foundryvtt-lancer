import { EntryType, OpCtx, RegEntry, RegRef } from "machine-mind";
import { AnyLancerActor, AnyMMActor, is_actor_type, LancerActor } from "../actor/lancer-actor";
import { AnyLancerItem, AnyMMItem, is_item_type, LancerItem } from "../item/lancer-item";
import { FoundryReg, FoundryRegName } from "../mm-util/foundry-reg";
import { FetcherCache, get_pack_id, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";
import { is_ref, safe_json_parse } from "./commons";
import { recreate_ref_from_element } from "./refs";

////////////// DRAGON DROPS ////////////
// Very useful:
// https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#drop
// more raw api data:
// https://developer.mozilla.org/en-US/docs/Web/API/Document/drag_event

/**
 * Enables dropability on the specified jquery items/query.
 * The first argument is either an existing jquery object, or a string with which to $() make it
 *
 * The second argument is a callback provided with the data for the drag, the dest of the drag, as well as the dragover event.
 * It is called once, on a successful drop
 * Note that it is guaranteed to have passed the allow_drop function if one was provided
 * Not all of these arguments are usually necessary: remember you can just _ away unused vars
 *
 * The third argument is an optional callback provided with the dest of the drag, as well as the dragover event.
 * It determines if the dest is a valid drop target
 *
 * The fourth and final argument is an optional callback provided with all info as the drop handler, but also is informed if the mouse is entering or exiting
 * This can be used for fancier on-hover enter/exit visual behavior. It is only called if dropping is permitted on that item
 */
export type AnyDragoverEvent = JQuery.DragOverEvent | JQuery.DragEnterEvent | JQuery.DragLeaveEvent | JQuery.DropEvent;
export type DropHandlerFunc = (data: string, drag_dest: JQuery, drop_event: JQuery.DropEvent) => void;
export type AllowDropPredicateFunc = (data: string, drag_dest: JQuery, dragover_event: AnyDragoverEvent) => boolean;
export type HoverHandlerFunc = (
  mode: "enter" | "leave",
  data: string,
  drag_dest: JQuery,
  drag_event: JQuery.DragEnterEvent | JQuery.DragLeaveEvent
) => void;

export function HANDLER_enable_dropping(
  items: string | JQuery,
  drop_handler: DropHandlerFunc,
  allow_drop?: AllowDropPredicateFunc,
  hover_handler?: HoverHandlerFunc
) {
  // Force to jq
  if (typeof items == "string") {
    items = $(items);
  }

  // Bind these individually, so we don't have to rely so much on the drop target being preserved
  items.each((_, _item) => {
    let item = $(_item);

    // To permit dropping, we must override the base dragover behavior.
    item.on("dragover", event => {
      // Get/check data
      let data = event.originalEvent?.dataTransfer?.getData("text/plain");
      if (!data) return;

      // Check if we can drop
      let drop_permitted = !allow_drop || allow_drop(data, item, event);

      // If permitted, override behavior to allow drops
      if (drop_permitted) {
        event.preventDefault();
        return false;
      }
    });

    // We also must signal this via the dragenter event
    item.on("dragenter", event => {
      // Get/check data. Don't want to fire on elements we cant even drop in
      let data = event.originalEvent?.dataTransfer?.getData("text/plain");
      if (!data) return;

      // Check if we can drop
      let drop_permitted = !allow_drop || allow_drop(data, item, event);

      if (drop_permitted) {
        // Override behavior to allow dropping here
        event.preventDefault();

        // While we're here, fire hover handler if drop is allowed
        if (hover_handler) {
          hover_handler("enter", data, item, event);
        }
        return false;
      }

      return true; // I guess?
    });

    // Bind a leave if we are doing hover stuff
    if (hover_handler) {
      item.on("dragleave", event => {
        // Get/check data
        let data = event.originalEvent?.dataTransfer?.getData("text/plain");
        if (!data) return;

        // Unfortunately, the docs read as though we still need to check if a drag was permitted on the item we are leaving. Browser doesn't seem to remember!
        let drop_permitted = !allow_drop || allow_drop(data, item, event);

        if (drop_permitted) {
          hover_handler("leave", data, item, event);
        }
      });
    }

    // Finally and most importantly, dropping
    item.on("drop", event => {
      // Get/check data
      let data = event.originalEvent?.dataTransfer?.getData("text/plain");
      if (!data) return;

      // Check dropability just to be safe - some event may have trickled down here somehow
      if (allow_drop && !allow_drop(data, item, event)) {
        return;
      }

      // Finally, call our predicate. It can decide to stop propagation if it wishes
      drop_handler(data, item, event);

      event.preventDefault();
      event.stopPropagation();
    });
  });
}

/**
 * Enables draggability on the specified jquery items/query.
 * The first argument is either an existing jquery object, or a string with which to $() make it
 * The second argument is a callback that deduces the drag payload from the drag element. Also provides event, if that is eaasier
 * The third argument is an optional callback that facillitates toggling styling changes on the drag source
 */
type DragDeriveDataFunc = (drag_source: JQuery, event: JQuery.DragStartEvent) => string;
type DragStartEndFunc = (
  mode: "start" | "stop",
  drag_source: JQuery,
  event: JQuery.DragStartEvent | JQuery.DragEndEvent
) => void;
// type AllowDragFunc = (drag_source: JQuery, event: JQuery.DragStartEvent | JQuery.DragEndEvent) => void;
export function HANDLER_enable_dragging(
  items: string | JQuery,
  data_transfer_func: DragDeriveDataFunc,
  start_stop_func?: DragStartEndFunc
  // allow_drag_func?: AllowDragFunc
) {
  // Force to jq
  if (typeof items == "string") {
    items = $(items);
  }

  // Make draggable
  items.prop("draggable", true);

  // Bind these individually, so we don't have to rely so much on the drop target being preserved
  items.each((_, _item) => {
    let item = $(_item);
    item.on("dragstart", event => {
      // Set data using callback
      event.originalEvent!.dataTransfer!.setData("text/plain", data_transfer_func(item, event));

      // We don't want weird double trouble on drags
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Trigger start if necessary
      if (start_stop_func) {
        start_stop_func("start", item, event);
      }
    });

    // Handle drag ends
    item.on("dragend", event => {
      // Call stop func if we have one
      if (start_stop_func) {
        start_stop_func("stop", item, event);
      }
    });
  });
}

export type NewNativeDrop = (
  | {
      type: "Item";
    }
  | {
      type: "ActiveEffect";
    }
) & {
  test: string;
};

// "Everything" that foundry will natively drop. Scene dropping,  are not yet implemented
type _DropContextInfo = {
  pack?: string; // Compendium pack we are dragging from
  actorId?: string; // If provided, this is the actor that the dragged item is embedded in
  tokenId?: string; // If provided, the document is embedded in a token synthetic actor associated with this token
  sceneId?: string; // If provided, the document is embedded in a token in this scene
  // Note: It is not necessarily safe to assume that tokenId implies sceneId, since floating combat tokens exist, maybe? Its iffy. Tread cautiously
};
type _PhysicalDrop = ({ type: "Item" } | { type: "ActiveEffect" } | { type: "Actor" }) &
  _DropContextInfo & { id: string };

// Meta here handles weirder stuff like journals, scenes, sounds, macros, etc
type _MetaDrop = {
  type: "JournalEntry";
  id: string;
  pack?: string;
};

export type NativeDrop = _PhysicalDrop | _MetaDrop;

// Result of resolving a native drop to its corresponding entity
export type ResolvedNativeDrop =
  | {
      type: "Item";
      entity: AnyLancerItem;
    }
  | {
      type: "Actor";
      entity: AnyLancerActor;
    }
  | {
      type: "JournalEntry";
      entity: JournalEntry;
    }
  | null;

// Resolves a native foundry actor/item drop event datatransfer to the actual contained actor/item/journal
// This can be annoying, so we made it a dedicated method
export async function resolve_native_drop(drop: string | { [key: string]: any } | null): Promise<ResolvedNativeDrop> {
  // Get dropped data
  if (typeof drop == "string") {
    drop = safe_json_parse(drop) as NativeDrop;
  }
  if (!drop) return null;

  if (drop.type == "Item") {
    let item: LancerItem | undefined;
    if (drop.pack && drop.actorId) {
      // Case 1 - Item is from a Compendium actor item
      let actor = (await game.packs.get(drop.pack)?.getDocument(drop.actorId)) as AnyLancerActor | undefined;
      item = actor?.items.get(drop.id);
    } else if (drop.sceneId && drop.tokenId) {
      // Case 2 - Item is a token actor item
      let actor = game.scenes!.get(drop.sceneId)?.tokens.get(drop.tokenId)?.actor as AnyLancerActor | undefined;
      item = actor?.items.get(drop.id);
    } else if (drop.actorId) {
      // Case 3 - Item is a game actor item
      let actor = game.actors!.get(drop.actorId);
      item = actor?.items.get(drop.id);
    } else if (drop.pack) {
      // Case 4 - Item is from a Compendium
      // Cast because I have NFI how to narrow the type on a compendium
      item = (await game.packs.get(drop.pack)!.getDocument(drop.id)) as LancerItem | undefined;
    } else {
      // Case 5 - item is a game item
      item = game.items!.get(drop.id);
    }

    // Return if it exists
    if (item) {
      return {
        type: "Item",
        entity: item,
      };
    }
  } else if (drop.type == "Actor") {
    // Same deal
    let actor: LancerActor | null | undefined;

    if (drop.pack) {
      // Case 1 - Actor is from a Compendium pack
      actor = (await game.packs.get(drop.pack)!.getDocument(drop.id)) as AnyLancerActor | undefined;
    } else if (drop.sceneId && drop.actorId) {
      // Case 2 - Actor is a scene token
      actor = game.scenes!.get(drop.sceneId)?.tokens.get(drop.tokenId)?.actor;
    } else {
      // Case 3 - Actor is a game actor
      actor = game.actors!.get(drop.id);
    }

    if (actor) {
      return {
        type: "Actor",
        entity: actor,
      };
    }
  } else if (drop.type == "JournalEntry") {
    // Same deal
    let journal: JournalEntry | null | undefined;

    // Case 1 - JournalEntry is from a Compendium pack
    if (drop.pack) {
      journal = (await game.packs.get(drop.pack)!.getDocument(drop.id)) as JournalEntry | null;
    }

    // Case 2 - JournalEntry is a World entity
    else {
      journal = game.journal!.get(drop.id);
    }

    if (journal) {
      return {
        type: "JournalEntry",
        entity: journal,
      };
    }
  }

  // All else fails
  console.log(`Couldn't resolve native drop:`, drop);
  return null;
}

// Turns a regref into a native drop, if possible
export function convert_ref_to_native_drop<T extends EntryType>(ref: RegRef<T>): NativeDrop | null {
  // Can't handle null typed refs
  if (!ref.type) {
    console.error("Attempted to turn a null-typed ref into a native drop. This is, generally, impossible");
    return null;
  }

  // Build out our scaffold
  let evt: Partial<_PhysicalDrop> = {};

  // Parse the reg name
  let rn = FoundryReg.parse_reg_args(ref.reg_name as FoundryRegName);

  // Decide type
  if (is_item_type(ref.type)) {
    evt.type = "Item";
  } else if (is_actor_type(ref.type)) {
    evt.type = "Actor";
  } else {
    console.error("Couldn't convert the following ref into a native foundry drop event:", ref);
    return null;
  }

  // Decide pack
  if (rn.src == "comp_core") {
    evt.pack = get_pack_id(ref.type);
  } else if (rn.src == "comp") {
    evt.pack = rn.comp_id;
  }

  // Decide scene
  if (rn.src == "scene") {
    evt.sceneId = rn.scene_id;
    evt.tokenId = ref.id;
  } else if (rn.src == "scene_token") {
    evt.sceneId = rn.scene_id;
    evt.tokenId = rn.token_id;
  }

  // Decide actor id
  if (rn.src == "comp_actor") {
    evt.actorId = rn.actor_id;
  } else if (rn.src == "game_actor") {
    evt.actorId = rn.actor_id;
  } else if (rn.src == "scene_token") {
    // @ts-ignore
    evt.actorId = game.scenes.get(evt.sceneId)?.tokens.get(evt.tokenId)?.actor.id;
  }

  // Decide ID, which is slightly weird for scene token actors
  if (rn.src == "scene") {
    // @ts-ignore
    evt.id = game.scenes.get(evt.sceneId)?.tokens.get(evt.tokenId)?.actor.id;
  } else {
    evt.id = ref.id;
  }

  // Done
  return evt as NativeDrop;
}

// Wraps a call to enable_dropping to specifically handle both RegRef drops and NativeDrops.
// Convenient for if you really only care about the final resolved RegEntry result (which is like, 90% of the time)
// The additional
// Allows use of hover_handler for styling
// Also enables native ref dropping
export type AllowMMDropPredicateFunc = (
  entry: AnyMMActor | AnyMMItem,
  drag_dest: JQuery,
  dragover_event: AnyDragoverEvent
) => boolean;

export function HANDLER_enable_mm_dropping(
  html_items: string | JQuery,
  resolver: MMDragResolveCache,
  can_drop: null | AllowMMDropPredicateFunc,
  on_drop: (entry: AnyMMItem | AnyMMActor, dest: JQuery, evt: JQuery.DropEvent) => void,
  hover_handler?: HoverHandlerFunc
) {
  // Make a helper for checking dest dataset
  const check_targ_type = (ent: RegEntry<any>, elt: JQuery<HTMLElement>) => {
    // Check that the dest type matches. dest_type must always be provided
    // Using `includes` allows for multiple types
    let dest_type = elt[0].dataset.type;
    return !dest_type || dest_type.includes(ent.Type);
  };

  HANDLER_enable_dropping(
    html_items,
    async (data, dest, evt) => {
      // Resolve the data once more. Should just be cached, otherwise this would never have been permitted
      let resolved = await resolver.fetch(data);

      // It is guaranteed to be acceptable to our can_drop function and basic type checks, so we
      // don't want it to propagate any further
      evt.stopPropagation();

      if (resolved) {
        // Check type
        if (!check_targ_type(resolved, dest)) {
          return false;
        }

        // If we have another predicate and it fails, then bail!
        if (can_drop && !can_drop(resolved, dest, evt)) {
          return false;
        }

        on_drop(resolved, dest, evt);
      } else {
        console.error(
          "Failed to resolve ref. This should never happen at this stage - verify that prior guards are properly validating drop options",
          data
        );
      }
    },

    // Allow drop must be synchronous, but we need to fetch async data...
    // We use the MMResolverCache to handle this! Nice!
    // When it _is_ done, we can retrieve synchronously from the cache! Nice!
    (data, dest, evt) => {
      // Resolve the data if we can, and otherwise spawn a task to do so
      let [resolved, done] = resolver.sync_fetch(data);

      // We aren't there yet
      if (!done) {
        return true; // Note - this allows dropping unresolved items! We allow this for particularly speedy users. We therefore need to check can_drop again in actual drop func
      } else if (!resolved) {
        console.warn("Failed to resolve ref.", data);
        return false; // Can't drop something that didnt resolve, lol
      }

      // Check type
      if (!check_targ_type(resolved, dest)) {
        return false;
      }

      // If we have another predicate and it fails, then bail!
      if (can_drop && !can_drop(resolved, dest, evt)) {
        return false;
      }

      // Otherwise, we have received a regentry of the correct type and stuff, so just give it the go-ahead
      return true;
    },
    hover_handler
  );
}

// Wraps a call to enable_dragging that attempts to derive a RegRef JSON from the dragged element
export function HANDLER_enable_mm_dragging(items: string | JQuery, start_stop?: DragStartEndFunc) {
  HANDLER_enable_dragging(
    items,
    drag_src => {
      // Drag a JSON ref
      let ref = recreate_ref_from_element(drag_src[0]);
      if (ref) {
        return JSON.stringify(ref);
      } else {
        return "";
      }
    },
    start_stop
  );
}

// This class coordinates the looking-up of raw drag-drop event data such that we can resolve things synchronously, while performing async fetches
// All entries are resolved to the provided ctx, which effectively provides the true cache of this resolver
export class MMDragResolveCache {
  // extends FetcherCache<string, AnyMMActor | AnyMMItem | null> {
  private cache: FetcherCache<string, AnyMMActor | AnyMMItem | null>;

  constructor(private readonly ctx: OpCtx) {
    this.cache = new FetcherCache(30_000, async key => {
      // Get the
      let as_json: RegRef<EntryType> | NativeDrop | null = safe_json_parse(key);
      if (!as_json) return null;

      // Distinguish
      if (is_ref(as_json)) {
        // Resolution is simple
        return new FoundryReg().resolve(this.ctx, as_json);
      } else {
        // Resolution is complex but still solved
        let resolved = await resolve_native_drop(as_json);
        if (resolved?.type == "Actor") {
          return mm_wrap_actor(resolved.entity, this.ctx);
        } else if (resolved?.type == "Item") {
          return mm_wrap_item(resolved.entity, this.ctx);
        } else {
          return null;
        }
      }
    });
  }

  // Fetch synchronously. Returns either:
  // [null, false] if the key is not yet cached (but the caching job will be started)
  // [<value>, true] if the key is cached. Value may still be null
  sync_fetch(event_transfer_key: string): [AnyMMActor | AnyMMItem | null, boolean] {
    if (this.cache.has_resolved(event_transfer_key)) {
      return [this.cache.soft_fetch(event_transfer_key), true];
    } else {
      this.cache.fetch(event_transfer_key);
      return [null, false];
    }
  }

  // As above, but waits for values
  async fetch(event_transfer_key: string): Promise<AnyMMActor | AnyMMItem | null> {
    return this.cache.fetch(event_transfer_key);
  }
}

// Needed for chrome, but also lets us do some nice stuff
export const GlobalMMDragState = {
  // dragging_listeners():
  // listen_
};
