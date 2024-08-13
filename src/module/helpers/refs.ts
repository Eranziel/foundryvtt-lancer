import type { HelperOptions } from "handlebars";
import { TypeIcon } from "../config";
import {
  LancerItem,
  LancerItemType,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_FEATURE,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerWEAPON_MOD,
  LancerRESERVE,
} from "../item/lancer-item";
import { array_path_edit_changes, drilldownDocument, extendHelper, hex_array, resolveHelperDotpath } from "./commons";
import { FoundryDropData, handleDocDropping, handleDragging, ResolvedDropData } from "./dragdrop";
import {
  framePreview,
  licenseRefView,
  mechWeaponDisplay as mechWeaponView,
  npcFeatureView,
  weaponModView,
} from "./item";
import { mechSystemViewHBS } from "./loadout";
import { LancerDoc } from "../util/doc";
import { EntryType } from "../enums";
import { LancerActor } from "../actor/lancer-actor";
import { coreBonusView, skillView, talent_view as talentView } from "./pilot";
import { SourceData } from "../source-template";
import { LancerActiveEffect } from "../effects/lancer-active-effect";

/*
"Ref" manifesto - Things for handling everything in data that is either a ResolvedUuidRefField or ResolvedEmbeddedRefField.

.ref - Signals that it is a ref, more of a marker class than anything
  .set - Signals that the ref currently has a value
  .slot - Styling indicator for an empty ref slot. Almost if not always drop-settable

  .drop-settable - Signals that the ref can be set via a drag event

data-uuid ~= "Actor.293180213" = UUID (even if embed) of the item, if .set
data-accept-types ~= "<Type1> <Type2> ..." = Space-separated list of EntryTypes to accept
data-mode = RefMode = How the ref, if it is a slot, should be set.

helper options:
 - value=??? = An override of what to show. Instead of showing what the path is resolved to, show this
*/

// Creates the params common to all refs, essentially just the html-ified version of a RegRef
export function ref_params(doc: LancerDoc, path?: string) {
  if (path) {
    return ` data-uuid="${doc.uuid}" data-path="${path}" `;
  } else {
    return ` data-uuid="${doc.uuid}" `;
  }
}

// A small, visually appealing slot for indicating where an item can go / is
// If a slot_path is provided, then this will additionally be a valid drop-settable location for items of this type
export function simple_ref_slot(path: string = "", accept_types: string | EntryType[], _options: HelperOptions) {
  // Format types
  let flat_types: string;
  let arr_types: EntryType[];
  if (Array.isArray(accept_types)) {
    arr_types = accept_types;
    flat_types = accept_types.join(" ");
  } else {
    arr_types = accept_types.split(" ") as EntryType[];
    flat_types = accept_types;
  }

  // Get present value
  let doc = _options.hash["value"] ?? (resolveHelperDotpath(_options, path) as LancerDoc);

  if (!doc || doc.status == "missing") {
    // Show an icon for each accepted type
    let icons = (arr_types || ["dummy"]).filter(t => t).map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref ref-card slot" 
                 data-accept-types="${flat_types}"
                 data-path="${path}">
          ${icons.join(" ")}
          <span class="major">Empty</span>
      </div>`;
  } else if (doc.then !== undefined) {
    return `<span>ASYNC not handled yet</span>`;
  } else {
    // The data-type
    return `<div class="ref ref-card set click-open" 
                  data-accept-types="${flat_types}"
                  data-path="${path}"
                  ${ref_params(doc)}
                  >
          <img class="ref-icon" src="${doc.img}"></img>
          <span class="major">${doc.name}</span>
      </div>`;
  }
}

// A helper hook to handle clicks on refs. Opens/focuses the clicked item's window
export async function click_evt_open_ref(event: any) {
  event.preventDefault();
  event.stopPropagation();
  const elt = event.currentTarget.closest(".ref") as HTMLElement;
  const doc = await resolve_ref_element(elt);
  if (doc) {
    doc.sheet?.render(true, { focus: true });
  }
}

// Given a ref element (as created by simple_ref or similar function), find the item it is currently referencing
// Has special logic for resolving ephemeral active effects
export async function resolve_ref_element(
  elt: HTMLElement
): Promise<LancerItem | LancerActor | LancerActiveEffect | null> {
  if (!elt.dataset.uuid) {
    return null;
  } else {
    let found = await fromUuid(elt.dataset.uuid);
    if (found && (found instanceof LancerItem || found instanceof LancerActor || found instanceof LancerActiveEffect)) {
      // Special case for editing possibly-ephemeral effects
      if (elt.dataset.activeEffectIndex) {
        // The uuid provided is actually to the actor which has the active effect on it
        // Look it up by index. Some are ephemeral, hence this circuitous route
        let x = parseInt(elt.dataset.activeEffectIndex);
        let i = 0;
        for (let effect of (found as LancerActor).allApplicableEffects()) {
          if (x == i) return effect;
          i++;
        }
        return null;
      }

      // Otherwise just return the document
      return found;
    } else if (found) {
      console.warn(`Ref element pointed at a ${found.documentName} - unsupported`);
    }
    return null;
  }
}

//
/**
 * Creates an img that is also a draggable ref. Expects guaranteed data! Use this to display the primary image in item/actor sheets,
 * so that they can be used as a sort of "self" ref
 *
 * @param img_path The path to read/edit said image
 * @param item The reffable item/actor itself
 */
export function refPortrait<T extends EntryType>(
  img: string,
  img_path: string,
  item: LancerDoc<T>,
  _options: HelperOptions
) {
  // Fetch the image
  return `<img class="profile-img ref set" src="${img}" data-edit="${img_path}" ${ref_params(
    item
  )} width="100" height="100" />`;
}

// A helper suitable for showing a small preview of a ref (slot)
// In general, any preview here is less for "use" (e.x. don't tend to have elaborate macros) and more just to show something is there
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function itemPreview<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null" | null,
  options: HelperOptions
): string {
  // Fetch
  let doc = options.hash["item"] ?? resolveHelperDotpath<LancerDoc<T>>(options, item_path);
  if (!doc) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path} in `, options.data);
    return "<span>err</span>";
  }
  // Make a re-used trashcan imprint
  let trash_can = "";
  if (trash_action) {
    trash_can = `<a class="gen-control i--white" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>`;
  }

  // Handle based on type
  if (doc.is_mech_system()) {
    return mechSystemViewHBS(item_path, options);
  } else if (doc.is_mech_weapon()) {
    return mechWeaponView(item_path, null, options);
  } else if (doc.is_weapon_mod()) {
    return weaponModView(item_path, null, options);
  } else if (doc.is_talent()) {
    return talentView(item_path, options);
  } else if (doc.is_skill()) {
    return skillView(item_path, options);
  } else if (doc.is_core_bonus()) {
    return coreBonusView(item_path, options);
  } else if (doc.is_license()) {
    return licenseRefView(item_path, options);
  } else if (doc.is_npc_feature()) {
    return npcFeatureView(item_path, options);
  } else if (doc.is_frame()) {
    return framePreview(item_path, options);
  } else {
    // Basically the same as the simple ref card, but with control added
    return `
      <div class="ref set ref-card click-open" 
              ${ref_params(doc)}>
        <img class="ref-icon" src="${doc.img}"></img>
        <span class="major">${doc.name}</span>
        <hr class="vsep"> 
        <div class="ref-controls">
          <a class="lancer-context-menu" data-path="${item_path}">
            <i class="fas fa-ellipsis-v"></i>
          </a>
        </div>
      </div>`;
  }
}

export function limitedUsesIndicator(
  item:
    | LancerMECH_WEAPON
    | LancerMECH_SYSTEM
    | LancerWEAPON_MOD
    | LancerPILOT_WEAPON
    | LancerPILOT_GEAR
    | LancerNPC_FEATURE,
  path: string,
  options?: { nonInteractive?: boolean }
): string {
  const uses = item.system.uses;
  const nonInteractive = options?.nonInteractive ? "non-interactive" : "";
  const hexes = hex_array(uses.value, uses.max, path, `uses-hex`);

  return `<div class="clipped card limited-card ${nonInteractive}"><span>USES</span> ${hexes.join("")}</div>`;
}

export function loadingIndicator(
  item: LancerMECH_WEAPON | LancerPILOT_WEAPON | LancerWEAPON_MOD | LancerNPC_FEATURE,
  path: string,
  options?: { nonInteractive?: boolean }
): string {
  if (!item.is_weapon()) return "";
  const loaded = item.system.loaded;
  const nonInteractive = options?.nonInteractive ? "non-interactive" : "";
  const hexes = hex_array(loaded ? 1 : 0, 1, path, "loaded-hex");

  return `<div class="clipped card limited-card ${nonInteractive}"><span>LOADED</span> ${hexes.join("")}</div>`;
}

export function chargedIndicator(
  item: LancerNPC_FEATURE,
  path: string,
  options?: { nonInteractive?: boolean }
): string {
  const charged = item.system.charged;
  const nonInteractive = options?.nonInteractive ? "non-interactive" : "";
  const hexes = hex_array(charged ? 1 : 0, 1, path, "charged-hex");

  return `<div class="clipped card charged-box ${nonInteractive}">
    <span style="margin:4px;">CHARGED</span>
    ${hexes.join("")}
  </div>`;
}

export function reserveUsesIndicator(path: string, options: HelperOptions): string {
  let used = resolveHelperDotpath(options, path) as LancerRESERVE;
  const hexes = hex_array(used ? 0 : 1, 1, path, "uses-hex");

  return `<div class="clipped card limited-card"><span>USES</span> ${hexes.join("")}</div>`;
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function lidItemList(itemArrayPath: string, values: LancerItem[], allowedTypes: string, options: HelperOptions) {
  let lids = resolveHelperDotpath<Array<any> | Set<any>>(options, itemArrayPath, []);
  let trash = options.hash["trash"] ?? null;
  let previews = Array.from(lids).map((_, i) =>
    itemPreview(`${itemArrayPath}.${i}`, trash, extendHelper(options, { item: values[i], isRef: true }))
  );
  return `
    <div class="flexcol lid-list" 
      data-path="${itemArrayPath}" 
      data-accept-types="${allowedTypes}">
      ${previews.join("")}
      ${dropIndicator(allowedTypes, options)}
    </div>`;
}

// CSS'd to only be visible when dragging one of allowed_types, which is a comma-separated list of EntryTypes
export function dropIndicator(allowed_types: string, options: HelperOptions) {
  let types = allowed_types.split(",");
  let classes = types.map(t => `drop-target-${t}`);
  return `<div class="line-drop-target ${classes.join(" ")}">DROP HERE</div>`;
}

// Enables clicking document refs to open their sheets
export function handleRefClickOpen(html: JQuery) {
  $(html).find(".ref.set.click-open, .ref.set .click-open").on("click", click_evt_open_ref);
}

// Enables dropping of items into open slots at the end of lists generated by mm_ref_list_append_slot
// This doesn't handle natives. Requires two callbacks: One to get the item that will actually have its list appended,
// and one to commit any changes to aforementioned object
export function handleDocListDropping<T>(html: JQuery, root_doc: LancerActor | LancerItem) {
  // Use our handy dandy helper
  handleDocDropping(html.find(".ref-list"), async (rdd, evt) => {
    if (!(rdd.type == "Actor" || rdd.type == "Item")) return; // For now, don't allow adding macros etc to lists

    // Gather context information
    let path = evt[0].dataset.path;
    let allowed_items_raw = evt[0].dataset.acceptTypes ?? "";

    // Check type is allowed type
    if (allowed_items_raw && !allowed_items_raw.includes(rdd.document.type)) return;

    // Try to apply the list addition
    if (path) {
      let dd = drilldownDocument(root_doc, path);
      let array = dd.terminus;
      if (Array.isArray(array)) {
        let changes = array_path_edit_changes(dd.sub_doc, dd.sub_path + ".-1", rdd.document, "insert");
        dd.sub_doc.update({ [changes.path]: changes.new_val });
      }
    }
  });
}

export function handleLIDListDropping<T>(html: JQuery, root_doc: LancerActor | LancerItem) {
  // Use our handy dandy helper
  handleDocDropping(html.find(".lid-list"), async (rdd, evt) => {
    if (!(rdd.type == "Actor" || rdd.type == "Item")) return; // For now, don't allow adding macros etc to lists

    // Gather context information
    let path = evt[0].dataset.path;
    let allowed_items_raw = evt[0].dataset.acceptTypes ?? "";

    // Check type is allowed type
    if (allowed_items_raw && !allowed_items_raw.includes(rdd.document.type)) return;

    // Try to apply the list addition
    if (path) {
      let dd = drilldownDocument(root_doc, path);
      let array = dd.terminus;
      if (Array.isArray(array)) {
        let lid = rdd.document.system.lid;
        let changes = array_path_edit_changes(dd.sub_doc, dd.sub_path + ".-1", lid, "insert");
        dd.sub_doc.update({ [changes.path]: changes.new_val });
      } else if (array instanceof Set) {
        let lid = rdd.document.system.lid;
        array.add(lid);
        dd.sub_doc.update({ [dd.sub_path]: Array.from(array) });
      }
    }
  });
}

export function handleUsesInteraction<T>(html: JQuery, doc: LancerActor | LancerItem) {
  let elements = html.find(".uses-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();
    const itemElement = ev.currentTarget.closest(".set[data-uuid*='Item']") as HTMLElement;
    const uuid = itemElement.dataset.uuid;
    const params = ev.currentTarget.dataset;
    if (!uuid) return;
    const item = (await fromUuid(uuid)) as
      | LancerMECH_SYSTEM
      | LancerMECH_WEAPON
      | LancerPILOT_GEAR
      | LancerRESERVE
      | LancerNPC_FEATURE;
    const available = params.available === "true";

    if (item.is_reserve()) {
      item.update({ "system.used": available });
    } else {
      let newUses = item.system.uses.value;
      if (available) {
        // Deduct uses.
        newUses = Math.max(newUses - 1, item.system.uses.min);
      } else {
        // Increment uses.
        newUses = Math.min(newUses + 1, item.system.uses.max);
      }
      item.update({ "system.uses": newUses });
    }
  });
}

export function handleLoadedInteraction(html: JQuery, _doc: LancerActor | LancerItem) {
  let elements = html.find(".loaded-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();
    const itemElement = ev.currentTarget.closest(".set[data-uuid*='Item']") as HTMLElement;
    const uuid = itemElement.dataset.uuid;
    if (!uuid) return;
    const item = (await fromUuid(uuid)) as LancerMECH_WEAPON | LancerPILOT_WEAPON | LancerWEAPON_MOD;

    if (item.is_weapon()) {
      item.update({ "system.loaded": !item.system.loaded });
    }
  });
}

export function handleChargedInteraction(html: JQuery, _doc: LancerActor | LancerItem) {
  let elements = html.find(".charged-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();
    const itemElement = ev.currentTarget.closest(".set[data-uuid*='Item']") as HTMLElement;
    const uuid = itemElement.dataset.uuid;
    if (!uuid) return;
    const item = (await fromUuid(uuid)) as LancerNPC_FEATURE;
    item.update({ "system.charged": !item.system.charged });
  });
}

// Enables dragging of ref cards (or anything with .ref.set and the appropriate fields)
// This doesn't handle natives
export function handleRefDragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  handleDragging(html.find(".ref.set"), (source, evt) => {
    let uuid = evt.currentTarget.dataset.uuid as string;
    if (!uuid || !(uuid.includes("Item.") || uuid.includes("Actor.") || uuid.includes("Token."))) {
      console.error("Unable to properly drag ref", source, evt.currentTarget);
      throw new Error("Drag error");
    }
    let result: FoundryDropData = {
      type: uuid.includes("Item.") ? "Item" : "Actor",
      uuid,
    };
    return JSON.stringify(result);
  });
}

// Allow every ".ref.drop-settable" spot to be dropped onto, with a payload of a JSON RegRef
// Additionally provides the "pre_finalize_drop" function to (primarily) facillitate taking posession of items,
// but in general apply whatever transformations deemed necessary
export function handleRefSlotDropping(
  html: JQuery,
  root_doc: LancerActor | LancerItem,
  pre_finalize_drop: ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null
) {
  handleDocDropping(html.find(".ref.drop-settable"), async (drop, dest, evt) => {
    // Pre-finalize the entry
    if (pre_finalize_drop) {
      drop = await pre_finalize_drop(drop);
    }

    // Decide the mode
    let path = dest[0].dataset.path;
    let types = dest[0].dataset.acceptTypes as string;
    let val = drop.document;

    // Check allows
    if (types && !types.includes((drop.document as any).type ?? "err")) {
      return;
    }

    // Then set it to path, with an added correction of unsetting any other place its set on the same document's loadout (if path in loadout)
    if (path) {
      let dd = drilldownDocument(
        root_doc,
        path.endsWith(".value") ? path.slice(0, path.length - ".value".length) : path
      ); // If dropping onto an item.value, then truncate to target the item
      let updateData = {} as any;
      if (path.includes("loadout") && dd.sub_doc instanceof LancerActor) {
        // Do clear-correction here
        if (dd.sub_doc.is_pilot()) {
          // If other occurrences of val
          let cl = (dd.sub_doc as any).system._source.loadout as SourceData.Pilot["loadout"];
          if (cl.armor.some(x => x == val.id))
            updateData["system.loadout.armor"] = cl.armor.map(x => (x == val.id ? null : x));
          if (cl.gear.some(x => x == val.id))
            updateData["system.loadout.gear"] = cl.gear.map(x => (x == val.id ? null : x));
          if (cl.weapons.some(x => x == val.id))
            updateData["system.loadout.weapons"] = cl.weapons.map(x => (x == val.id ? null : x));
        } else if (dd.sub_doc.is_mech()) {
          let cl = (dd.sub_doc as any).system._source.loadout as SourceData.Mech["loadout"];
          if (cl.systems.some(x => x == val.id))
            updateData["system.loadout.systems"] = cl.systems.map(x => (x == val.id ? null : x));
          if (cl.weapon_mounts.some(x => x.slots.some(y => y.weapon == val.id || y.mod == val.id))) {
            updateData["system.loadout.weapon_mounts"] = cl.weapon_mounts.map(wm => ({
              slots: wm.slots.map(s => ({
                weapon: s.weapon == val.id ? null : s.weapon,
                mod: s.mod == val.id ? null : s.mod,
                size: s.size,
              })),
              bracing: wm.bracing,
              type: wm.type,
            }));
          }
        }
      }
      updateData[dd.sub_path] = val.id;
      dd.sub_doc.update(updateData);
    }
  });
}
