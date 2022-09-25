import { OpCtx, RegEntry, RegRef } from "machine-mind";
import { EntryType } from "machine-mind";
import { AnyMMActor, is_actor_type, LancerActor } from "../actor/lancer-actor";
import { AnyMMItem, is_item_type, LancerItem } from "../item/lancer-item";
import { FoundryReg, FoundryRegName } from "../mm-util/foundry-reg";
import { get_pack_id, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";
import { is_ref, safe_json_parse } from "./commons";
import { recreate_ref_from_element } from "./refs";
import { FetcherCache, PENDING } from "../util/async";

////////////// HERE BE DRAGON DROPS ////////////
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
      // Set data using callback. Clear old data
      event.originalEvent!.dataTransfer!.clearData();
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

export type FoundryDropData = {
  // TODO - update to league type, when those typings work
  type: "Actor" | "Item" | "JournalEntry" | "Macro"; // TODO: Scenes, sounds
  uuid: string;
};

// Result of resolving a native drop to its corresponding document
// Mostly just for ease of typing
export type ResolvedDropData =
  | {
      type: "Item";
      document: LancerItem;
    }
  | {
      type: "Actor";
      document: LancerActor;
    }
  | {
      type: "JournalEntry";
      document: JournalEntry;
    }
  | {
      type: "Macro";
      document: Macro;
    };

// Resolves a native foundry actor/item drop event datatransfer to the actual contained actor/item/journal
// This can be annoying, so we made it a dedicated method
// Input is either a stringified JSON dropData or a uuid
export async function resolve_native_drop(drop: string | FoundryDropData): Promise<ResolvedDropData | null> {
  // Get dropped data
  if (typeof drop == "string") {
    drop = safe_json_parse(drop) as FoundryDropData;
  }
  if (!drop) {
    // Attempt uuid route
    let document = await fromUuid(drop);
    if (!document) return null;
    if (document instanceof LancerActor) {
      return {
        type: "Actor",
        document,
      };
    } else if (document instanceof LancerItem) {
      return {
        type: "Item",
        document,
      };
    } else if (document instanceof Macro) {
      return {
        type: "Macro",
        document,
      };
    } else if (document instanceof JournalEntry) {
      return {
        type: "JournalEntry",
        document,
      };
    }
  } else {
    // We presume it to be a normal dropData.
    if (drop.type == "Actor") {
      // @ts-ignore
      let document = await LancerActor.fromDropData(drop);
      return document
        ? {
            type: "Actor",
            document,
          }
        : null;
    } else if (drop.type == "Item") {
      // @ts-ignore
      let document = await LancerItem.fromDropData(drop);
      return document
        ? {
            type: "Item",
            document,
          }
        : null;
    } else if (drop.type == "JournalEntry") {
      // @ts-ignore
      let document = await JournalEntry.fromDropData(drop);
      return document
        ? {
            type: "JournalEntry",
            document,
          }
        : null;
    } else if (drop.type == "Macro") {
      // @ts-ignore
      let document = await Macro.fromDropData(drop);
      return document
        ? {
            type: "Macro",
            document,
          }
        : null;
    }
  }
  return null;
}

// Turns a regref into a native drop, if possible
// OMEGA deprecated.
export function convert_ref_to_native_drop<T extends EntryType>(ref: RegRef<T>): FoundryDropData | null {
  return null;
}

// A basic cache suitable for native drop lookups - a common task
export type DragFetcherCache = FetcherCache<string | FoundryDropData, ResolvedDropData | null>;
export function dragResolverCache(): DragFetcherCache {
  return new FetcherCache(resolve_native_drop);
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
  const check_targ_type = (entry: RegEntry<any>, elt: JQuery<HTMLElement>) => {
    // Check that the dest type matches. dest_type must always be provided
    // Using `includes` allows for multiple types
    let dest_type = elt[0].dataset.type;
    return !dest_type || dest_type.includes(entry.Type);
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
      let resolved = resolver.sync_fetch(data);

      // We aren't there yet
      if (resolved === PENDING) {
        return true; // Note - this allows dropping unresolved items! We allow this for particularly speedy users. We therefore need to check can_drop again in actual drop func
      } else if (!resolved) {
        console.warn("Failed to resolve ref.", data);
        return false; // Can't drop something that was completed+unresolveable, lol
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
export class MMDragResolveCache extends FetcherCache<string, AnyMMActor | AnyMMItem | null> {
  constructor(private readonly ctx: OpCtx) {
    super(async key => {
      // Get the drop payload, which'll either be a foundry-native drop, or a serialized regref
      let as_json: RegRef<EntryType> | FoundryDropData | null = safe_json_parse(key);
      if (!as_json) return null;

      // Distinguish
      let resolved: AnyMMActor | AnyMMItem | null = null;
      if (is_ref(as_json)) {
        // Resolution is simple
        resolved = await new FoundryReg().resolve(this.ctx, as_json);
      } else {
        // Resolution is complex but still solved
        let drop = await resolve_native_drop(as_json);
        if (drop?.type == "Actor") {
          resolved = await mm_wrap_actor(drop.document, this.ctx);
        } else if (drop?.type == "Item") {
          resolved = await mm_wrap_item(drop.document, this.ctx);
        } else {
          resolved = null;
        }
      }

      return resolved;
    }, 30_000);
  }
}

// Tracks state and handles global flag set/unsetting.
// Only set by HANDLER_enable_mm_dragging. If you're using other things, well, good luck
export const GlobalMMDragState = {
  dragging: false as boolean,
  curr_dragged_type: EntryType,
  curr_dragged_entity: null as LancerActor | LancerItem | null, // If it is a native document, we set this
  curr_dragged_ref: null as RegRef<EntryType> | null, // If it is a ref, we set this
};

function dragging_class(for_type: EntryType): string {
  return `dragging-${for_type}`;
}

function set_global_drag(to: LancerActor | LancerItem | RegRef<any>) {
  // Check for duplicate work and clear if that isn't the case
  if (GlobalMMDragState.curr_dragged_entity == to || GlobalMMDragState.curr_dragged_ref == to) {
    return; // don't repeat
  }
  clear_global_drag();

  // Mark us as dragging and store the draggee
  GlobalMMDragState.dragging = true;
  let type: EntryType;
  let rr = to as RegRef<any>;
  let doc = to as LancerActor | LancerItem;
  if (rr.fallback_lid !== undefined) {
    GlobalMMDragState.curr_dragged_ref = rr;
    type = rr.type;
  } else if (doc.data !== undefined) {
    GlobalMMDragState.curr_dragged_entity = doc;
    type = doc.data.type;
  } else {
    console.error("Error while setting global drag");
    return; // hmmm
  }

  // @ts-ignore
  GlobalMMDragState.curr_dragged_type = type;

  // Add an appropriate class
  $("body").addClass(dragging_class(type));
}

function clear_global_drag() {
  if (GlobalMMDragState.dragging) {
    GlobalMMDragState.dragging = false;
    if (GlobalMMDragState.curr_dragged_entity) {
      $("body").removeClass(dragging_class(GlobalMMDragState.curr_dragged_entity.data.type));
    } else if (GlobalMMDragState.curr_dragged_ref?.type) {
      $("body").removeClass(dragging_class(GlobalMMDragState.curr_dragged_ref.type));
    }
    GlobalMMDragState.curr_dragged_entity = null;
    GlobalMMDragState.curr_dragged_ref = null;
  }
}

// Setup global drag mm resolution
export function applyGlobalDragListeners() {
  let body = document.getElementsByTagName("body")[0];

  // Capture when we start dragging anything anywhere - this covers regrefs and native drags
  body.addEventListener(
    "dragstart",
    e => {
      // Even though we are capturing, we need to wait a moment so the event data transfer can occur
      setTimeout(async () => {
        // Ok. Try to resolve
        let text = e.dataTransfer?.getData("text/plain") ?? null;
        if (!text) {
          // Drop it - we can't really do much about this happening
          return;
        }

        let resolved = await resolve_native_drop(text);

        // No joy - is it by chance already a ref
        if (!resolved) {
          let ar = safe_json_parse(text) as RegRef<any>;
          if (ar?.fallback_lid !== undefined) {
            // It's a ref!
            set_global_drag(ar);
          }
          return; // Well! no idea what that is
        }

        // Upon success
        if (resolved.type == "Item" || resolved.type == "Actor") {
          set_global_drag(resolved.document);
        }
      }, 100);
    },
    {
      capture: true, // We don't want people preventing us from seeing this!
      passive: true, // Improves performance. We only want to watch
    }
  );

  // Clear whenever we stop dragging anywhere
  body.addEventListener(
    "dragend",
    e => {
      clear_global_drag();
    },
    {
      capture: true, // Same as above
      passive: true,
    }
  );
}
