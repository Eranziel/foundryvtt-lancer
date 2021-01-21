import {
  EntryType,
    OpCtx,
  RegEntry,
} from "machine-mind";
import { LancerActor, LancerActorType } from "../actor/lancer-actor";
import { LancerItem, LancerItemType } from "../item/lancer-item";
import { FoundryReg } from "../mm-util/foundry-reg";
import { MMEntityContext, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";
import { gentle_merge, is_ref, safe_json_parse } from "./commons";
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
 * Not all of these arguments are usually necessary: remember you can just _ away unused vars
 *
 * The third argument is an optional callback provided with the dest of the drag, as well as the dragover event.
 * It determines if the dest is a valid drop target
 *
 * The fourth and final argument is an optional callback provided with all info as the drop handler, but also is informed if the mouse is entering or exiting
 * This can be used for fancier on-hover enter/exit visual behavior. It is only called if dropping is permitted on that item
 */
type DropHandlerFunc = (data: string, drag_dest: JQuery, drop_event: JQuery.DropEvent) => void;
type AllowDropPredicateFunc = (data: string, drag_dest: JQuery, dragover_event: JQuery.DragOverEvent | JQuery.DragEnterEvent | JQuery.DragLeaveEvent) => boolean;
type HoverHandlerFunc = (mode: "enter" | "leave", data: string, drag_dest: JQuery, drag_event: JQuery.DragEnterEvent | JQuery.DragLeaveEvent) => void;

export function enable_dropping(
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
      if(!data) return;

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
      if(!data) return;

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
        if(!data) return;

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
      if(!data) return;

      drop_handler(data, item, event);

      event.preventDefault();
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
type DragStartEndFunc = (mode: "start" | "stop", drag_source: JQuery, event: JQuery.DragStartEvent | JQuery.DragEndEvent) => void;
// type AllowDragFunc = (drag_source: JQuery, event: JQuery.DragStartEvent | JQuery.DragEndEvent) => void;
export function enable_dragging(
  items: string | JQuery,
  data_transfer_func: DragDeriveDataFunc,
  start_stop_func?: DragStartEndFunc,
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

// "Everything" that foundry will natively drop. Scenes are not yet implemented
export type NativeDrop = {
  type: "Item",
  id: string,
  pack?: string
} | {
  type: "Actor",
  id: string,
  pack?: string
} | {
  type: "JournalEntry",
  id: string,
  pack?: string
} | null; 

// Result of resolving a native drop to its corresponding entity
export type ResolvedNativeDrop = {
  type: "Item",
  entity: LancerItem<LancerItemType>
} | {
  type: "Actor",
  entity: LancerActor<LancerActorType>
} | {
  type: "JournalEntry",
  entity: JournalEntry
} | null;

// Resolves a native foundry actor/item drop event datatransfer to the actual contained item
export async function resolve_native_drop(event_data: string): Promise<ResolvedNativeDrop> {
    // Get dropped data
    let data = safe_json_parse(event_data) as NativeDrop;
    if(!data) return null;

    // NOTE: these cases are copied almost verbatim from ActorSheet._onDrop
    if(data.type == "Item") {
      let item: LancerItem<LancerItemType> | null = null;
      // Case 1 - Item is from a Compendium pack
      if (data.pack) {
        item = (await game.packs.get(data.pack)!.getEntity(data.id)) as LancerItem<any>;
        console.log(`Item native dropped from compendium: `, item);
      }

      // Case 2 - Item is a World entity
      else {
        item = game.items.get(data.id) as LancerItem<any>;
        console.log(`Item native dropped from world: `, item);
      }

      if(item) {
        return {
          type: "Item",
          entity: item
        }
      }
    } else if(data.type == "Actor") {
      // Same deal
      let actor: LancerActor<LancerActorType> | null = null;

      // Case 1 - Actor is from a Compendium pack
      if (data.pack) {
        actor = (await game.packs.get(data.pack)!.getEntity(data.id)) as LancerActor<any>;
        console.log(`Actor native dropped from compendium: `, actor);
      }

      // Case 2 - Actor is a World entity
      else {
        actor = game.actors.get(data.id) as LancerActor<any>;
        console.log(`Actor native dropped from world: `, actor);
      }

      if(actor) {
        return {
          type: "Actor",
          entity: actor
        }
      }
    } else if(data.type == "JournalEntry") {
      // Same deal
      let journal: JournalEntry | null = null;

      // Case 1 - JournalEntry is from a Compendium pack
      if (data.pack) {
        journal = (await game.packs.get(data.pack)!.getEntity(data.id)) as JournalEntry;
        console.log(`JournalEntry native dropped from compendium: `, journal);
      }

      // Case 2 - JournalEntry is a World entity
      else {
        journal = game.journals.get(data.id) as JournalEntry;
        console.log(`JournalEntry native dropped from world: `, journal);
      }

      if(journal) {
        return {
          type: "JournalEntry",
          entity: journal
        }
      }
    }

    // All else fails
    return null;
}

// Wraps a call to enable_dropping to specifically handle RegRef drops.
// Convenient for if you really only care about the final resolved RegEntry result
// Allows use of hover_handler for styling
export function enable_simple_ref_dropping(
  items: string | JQuery,
  on_drop: (entry: RegEntry<any>, dest: JQuery, evt: JQuery.DropEvent) => void,
  hover_handler?: HoverHandlerFunc
) {
  enable_dropping(
      items,
      async (ref_json, dest, evt) => {
        let recon_ref: any = safe_json_parse(ref_json);
        let dest_type = dest[0].dataset.type;

        // If it isn't a ref, we don't handle
        if(!is_ref(recon_ref) || recon_ref.type != dest_type) {
          return;
        } 

        // It is a ref, so we stop anyone else from handling the drop
        // (immediate props are fine)
        evt.stopPropagation();

        // Resolve the data. Just use a new ctx. Maybe should accept as arg, but lets not overcomplicate
        let resolved = await new FoundryReg().resolve(new OpCtx(), recon_ref);
        if(resolved) {
            on_drop(resolved, dest, evt);
        }
      },

      // Allow drop simply checks if it is a ref and that the type matches the type on the elt
      (data, dest) => {
        // Parse our drag data as a ref
        let recon_ref = safe_json_parse(data);
        if(is_ref(recon_ref)) {
          let dest_type = dest[0].dataset.type;
          return recon_ref.type == dest_type // Simply confirm same type. 
        }
        return false;
      },
      hover_handler
  );
}

// Wraps a call to enable_dragging that attempts to derive a RegRef JSON from the dragged element
export function enable_simple_ref_dragging(items: string | JQuery, start_stop?: DragStartEndFunc) {
    enable_dragging(items, drag_src => {
      // Drag a JSON ref
      let ref = recreate_ref_from_element(drag_src[0]);
      if(ref) {
        return JSON.stringify(ref);
      } else {
        return "";
      }
    }, start_stop);
}

// Adds a drop handler for native drops, e.x. drag item from the sidebar to a sheet
export function enable_native_dropping(
  items: string | JQuery,
  on_drop: (entity: LancerActor<LancerActorType> | LancerItem<LancerItemType> | JournalEntry, dest: JQuery, evt: JQuery.DropEvent) => void,
  allowed_types?: (EntryType | "journal")[] | null, // null implies wildcard. `data-type` always takes precedence
  hover_handler?: HoverHandlerFunc
) {
    enable_dropping(
        items,
      async (drop_json, dest, evt) => {
        // We resolve it as a real item
        let resolved = await resolve_native_drop(drop_json);

        // If it doesn't exist, well, darn
        if(!resolved) {
          return;
        }
        evt.stopPropagation();

        // Figure out its type
        let type: EntryType | "journal";
        if(resolved.type == "JournalEntry") {
            type = "journal";
        } else {
            type = resolved.entity.data.type;
        }

        // Get our actual allowed types, as it can be overriden by data-type
        let dest_type = dest[0].dataset.type;
        let dest_allowed_types = dest_type ? [dest_type] : (allowed_types ?? null);

        // Now, as far as whether it should really have any effect, that depends on the type
        if(!dest_allowed_types || dest_allowed_types.includes(type)) {
          // We're golden. Call the callback
          on_drop(resolved.entity, dest, evt);
        }
      },
      (data, dest) => {
        // We have no idea if we should truly be able to drop here since we don't know what we're dropping
        // As such, we simply determine that it is in fact a native drag
        // Having a simple cache resolving the item is possible, but expensive / could potentially bloat really hard
        // An LRU cache would work? Long term goal, if performance ever becomes a big deal
        let pdata = safe_json_parse(data) as NativeDrop;

        if(pdata?.id !== undefined && pdata?.type !== undefined) {
          return true;
        }
        return false;

      },
      hover_handler
    );
}

// Same as above, but wraps in a MM context
export function enable_native_dropping_mm_wrap<T extends EntryType>(
  items: string | JQuery,
  on_drop: (ent_ctx: MMEntityContext<T>, dest: JQuery, evt: JQuery.DropEvent) => void,
  allowed_types?: T[] | null, // null implies wildcard. `data-type` always takes precedence
  hover_handler?: HoverHandlerFunc
){
    enable_native_dropping(
        items,
        async (entity, dest, evt) => {
            // From here, depends slightly on tye
            let item: MMEntityContext<T>;
            let ent_type = (entity as any).entity;
            if(ent_type == "Actor") {
                item = await mm_wrap_actor(entity as LancerActor<T & LancerActorType>);
            } else if(ent_type == "Item") {
                item = await mm_wrap_item(entity as LancerItem<T & LancerItemType>);
            } else {
                return;
            }

            // Make callback
            on_drop(item, dest, evt);
        },
        allowed_types,
        hover_handler);
    }
    /*
    */