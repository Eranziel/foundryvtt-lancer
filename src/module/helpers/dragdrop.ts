import { LancerActor } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import { LancerItem } from "../item/lancer-item";
import { safe_json_parse } from "./commons";

////////////// HERE BE DRAGON DROPS ////////////
// Very useful:
// https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#drop
// more raw api data:
// https://developer.mozilla.org/en-US/docs/Web/API/Document/drag_event

export type AnyDragoverEvent = JQuery.DragOverEvent | JQuery.DragEnterEvent | JQuery.DragLeaveEvent | JQuery.DropEvent;
export type DropHandler = (doc: ResolvedDropData, dest: JQuery, evt: JQuery.DropEvent) => void;
export type DropPredicate = (drop: ResolvedDropData, drag_dest: JQuery, dragover_event: AnyDragoverEvent) => boolean;
export type HoverHandler = (
  mode: "enter" | "leave",
  doc: ResolvedDropData,
  drag_dest: JQuery,
  drag_event: JQuery.DragEnterEvent | JQuery.DragLeaveEvent
) => void;

/**
 * Enables dropability on the specified jquery items, using the global drag state as a lookup to allow synchronous doc handling
 *
 * @param items Either an existing jquery object, or a string with which to $() make it
 *
 * @param drop_handler: Callback provided with the data for the drag, the dest of the drag, as well as the dragover event.
 * It is called once, on a successful drop
 * Note that it is guaranteed to have passed the allow_drop function if one was provided
 * Not all of these arguments are usually necessary: remember you can just _ away unused vars
 *
 * @param allow_drop: Optional callback provided with the dest of the drag, as well as the dragover event.
 * It determines if the dest is a valid drop target
 *
 * @param hover_handler: Optional callback provided with all info as the drop handler, but also is informed if the mouse is entering or exiting
 * This can be used for fancier on-hover enter/exit visual behavior. It is only called if dropping is permitted on that item
 */
export function handleDocDropping(
  items: JQuery,
  drop_handler: DropHandler,
  allow_drop?: DropPredicate,
  hover_handler?: HoverHandler
) {
  // Bind these individually, so we don't have to rely so much on the drop target being preserved
  items.each((_, _item) => {
    let item = $(_item);

    // To permit dropping, we must override the base dragover behavior.
    item.on("dragover", event => {
      // Get/check data
      if (!GlobalDragPreview) return true; // Blanket allow drops if we don't know whats dragging

      // Check if we can drop
      let drop_permitted = !allow_drop || allow_drop(GlobalDragPreview, item, event);

      // If permitted, override behavior to allow drops
      if (drop_permitted) {
        event.preventDefault();
        return false;
      }
    });

    // We also must signal this via the dragenter event
    item.on("dragenter", event => {
      // Check if we can drop
      if (!GlobalDragPreview) return true; // Blanket allow drops if we don't know whats dragging
      let drop_permitted = !allow_drop || allow_drop(GlobalDragPreview, item, event);

      if (drop_permitted) {
        // Override behavior to allow dropping here
        event.preventDefault();

        // While we're here, fire hover handler if drop is allowed
        if (hover_handler) {
          hover_handler("enter", GlobalDragPreview!, item, event);
        }
        return false;
      }

      return true; // I guess?
    });

    // Bind a leave event as well, but only if we are doing hover stuff
    if (hover_handler) {
      item.on("dragleave", event => {
        // Due to weirdness of drop spec, we must double check here even if dragenter said no
        let drop_permitted = GlobalDragPreview && (!allow_drop || allow_drop(GlobalDragPreview, item, event));

        if (drop_permitted) {
          hover_handler("leave", GlobalDragPreview!, item, event);
        }
      });
    }

    // Finally and most importantly, dropping
    item.on("drop", event => {
      // Check dropability just to be safe - some event may have trickled down here somehow
      if (!event.originalEvent?.dataTransfer?.getData("text/plain")) {
        return;
      }

      if (GlobalDragPreview) {
        // We can proceed synchronously
        let rdd = GlobalDragPreview;
        if (!allow_drop || allow_drop(rdd, item, event)) {
          // It's a good drop - prevent propagation and handle
          event.stopImmediatePropagation();
          event.preventDefault();
          drop_handler(rdd, item, event);
        }
      } else {
        // Unfortunately, if global drag preview isn't set then it is necessary for us to aggressively cancel events to prevent possible duplicate drop handling
        event.stopImmediatePropagation();
        event.preventDefault();
        resolveNativeDrop(event.originalEvent.dataTransfer.getData("text/plain")).then(rdd => {
          if (rdd && (!allow_drop || allow_drop(rdd, item, event))) drop_handler(rdd, item, event);
        });
      }
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
export function handleDragging(
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
  type: "Actor" | "Item" | "JournalEntry" | "Macro" | "Scene"; // TODO: Scenes, sounds
  uuid: string;
};

export type LancerFlowDropData = {
  uuid: string;
  lancerType: EntryType;
  flowType: DroppableFlowType;
  flowSubtype?: string;
  args?: object;
};

export enum DroppableFlowType {
  BASIC = "lancer-flow-button",
  STAT = "roll-stat",
  ATTACK = "roll-attack",
  TECH_ATTACK = "roll-tech",
  CHAT = "chat-flow-button",
  SKILL = "skill-flow",
  BOND_POWER = "bond-power-flow",
  EFFECT = "effect-flow",
  ACTIVATION = "activation-flow",
  CORE_ACTIVE = "core_system.activation-flow",
}

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
      type: "Scene";
      document: Scene;
    }
  | {
      type: "Macro";
      document: Macro;
    };

// Resolves a native foundry actor/item drop event datatransfer to the actual contained actor/item/journal
// This can be annoying, so we made it a dedicated method
// Input is either a stringified JSON dropData or a uuid
export async function resolveNativeDrop(drop: string | FoundryDropData): Promise<ResolvedDropData | null> {
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
      let document = await LancerActor.fromUuid(drop.uuid);
      return document
        ? {
            type: "Actor",
            document,
          }
        : null;
    } else if (drop.type == "Item") {
      let document = await LancerItem.fromUuid(drop.uuid);
      return document
        ? {
            type: "Item",
            document,
          }
        : null;
    } else if (drop.type == "JournalEntry") {
      // @ts-expect-error
      let document = await JournalEntry.fromDropData(drop);
      return document
        ? {
            type: "JournalEntry",
            document,
          }
        : null;
    } else if (drop.type == "Macro") {
      // @ts-expect-error
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

// A basic cache suitable for native drop lookups - a common task
// export type DragFetcherCache = FetcherCache<string | FoundryDropData, ResolvedDropData | null>;
// export function dragResolverCache(): DragFetcherCache {
// return new FetcherCache(resolve_native_drop);
// }

// GlobalDragState provides a resolved document of whatever is being dragged, if a document can be resolved
export let GlobalDragPreview: ResolvedDropData | null = null;

function dragging_class(for_type: EntryType): string {
  return `dragging-${for_type}`;
}

function setGlobalDrag(to: LancerActor | LancerItem | Macro | Journal | Scene | null) {
  // Clear if necessary
  if (GlobalDragPreview?.type == "Actor" || GlobalDragPreview?.type == "Item") {
    $("body").removeClass(dragging_class(GlobalDragPreview.document.type as EntryType));
  }

  // Store the draggee
  if (to instanceof LancerActor) {
    GlobalDragPreview = {
      document: to,
      type: "Actor",
    };
  } else if (to instanceof LancerItem) {
    GlobalDragPreview = {
      document: to,
      type: "Item",
    };
  } else if (to instanceof Macro) {
    GlobalDragPreview = {
      document: to,
      type: "Macro",
    };
  } else if (to instanceof Scene) {
    GlobalDragPreview = {
      document: to,
      type: "Scene",
    };
  } else if (to == null) {
    GlobalDragPreview = null;
    return;
  }

  // Add an appropriate class
  if (GlobalDragPreview?.type == "Actor" || GlobalDragPreview?.type == "Item") {
    $("body").addClass(dragging_class(GlobalDragPreview.document.type as EntryType));
  }
}

// Setup global drag resolution
export function applyGlobalDragListeners() {
  let body = document.getElementsByTagName("body")[0];
  let cancel_token = { canceled: false };

  // Capture when we start dragging anything anywhere - this covers regrefs and native drags
  body.addEventListener(
    "dragstart",
    evt => {
      // Attempt to recover the item
      let target = evt.target as HTMLElement | undefined;
      let uuid = "";
      if (target?.dataset?.uuid) {
        // Is our set uuid
        uuid = target.dataset.uuid!;
      } else if (target?.dataset?.documentId) {
        // Is a foundry sidebar or compendium drag
        let sbt = $(target).parents(".sidebar-tab")[0];
        if (sbt?.dataset?.tab) {
          // Can deduce type based on the tab
          let tab = sbt.dataset.tab;
          uuid = `${tab.charAt(0).capitalize()}${tab.slice(1, tab.length - 1)}.${target.dataset.documentId}`;
        } else {
          let cd = $(target).parents(".compendium.directory")[0];
          if (cd) {
            // Can deduce pack based on the directory
            let pack = cd.dataset.pack;
            uuid = `Compendium.${pack}.${target.dataset.documentId}`;
          }
        }
      } else {
        return; // Not a uuid
      }

      // TODO: handle journals, macros, scenes

      // May or may not have a uuid by now
      // If we do, tell it to try setting global drag
      let cancel_token_copy = cancel_token;
      fromUuid(uuid).then(async doc => {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!cancel_token_copy.canceled) {
          setGlobalDrag(doc as LancerActor | LancerItem | null);
        }
      });
    },
    {
      capture: true, // We don't want people preventing us from seeing this!
      passive: true, // Improves performance. We only want to watch
    }
  );

  // Clear whenever we stop dragging anywhere. Have to handle both drag end and drop.
  const endListener = () => {
    setGlobalDrag(null);
    cancel_token.canceled = true;
    cancel_token = { canceled: false };
  };
  body.addEventListener("dragend", endListener, {
    capture: true, // Same as above
    passive: true,
  });
  body.addEventListener("drop", endListener, {
    capture: true, // Same as above
    passive: true,
  });
}
