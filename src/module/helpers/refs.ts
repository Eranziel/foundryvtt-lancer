import type { HelperOptions } from "handlebars";
import { TypeIcon } from "../config";
import {
  LancerItem,
  is_item_type,
  LancerItemType,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_FEATURE,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerWEAPON_MOD,
  LancerTALENT,
} from "../item/lancer-item";
import { encodeMacroData } from "../macros";
import {
  array_path_edit_changes,
  drilldown_document,
  effect_box,
  gentle_merge,
  read_form,
  resolve_dotpath,
  resolve_helper_dotpath,
  sp_display,
} from "./commons";
import {
  DropPredicate,
  FoundryDropData,
  HANDLER_enable_doc_dropping,
  HANDLER_enable_dragging,
  ResolvedDropData,
} from "./dragdrop";
import { buildActionHTML, buildDeployableHTML, license_ref } from "./item";
import { compact_tag_list } from "./tags";
import { CollapseRegistry } from "./loadout";
import { LancerDoc } from "../util/doc";
import { EntryType, SystemType } from "../enums";
import { LancerActor } from "../actor/lancer-actor";
import { LancerMacroData } from "../interfaces";
import { SystemTemplates } from "../system-template";
import { LancerActiveEffect } from "../effects/lancer-active-effect";

/*
"Ref" manifesto - Things for handling everything in data that is either a ResolvedUuidRefField or ResolvedEmbeddedRefField.

.ref - Signals that it is a ref, more of a marker class than anything
  .set - Signals that the ref currently has a value
  .empty - signals that the ref does not have a value. Only really matters for `slot`

  .slot - Signals that the ref can be set via a drag event
  .list-item - Signals that the ref is part of a list of refs

data-uuid ~= "Actor.293180213" = UUID (even if embed) of the item, if .set
data-accept-types ~= "<Type1> <Type2> ..." = Space-separated list of EntryTypes to accept
data-mode = RefMode = How the ref, if it is a slot, should be set.

helper options:
 - value=??? = An override of what to show. Instead of showing what the path is resolved to, show this
*/

export type RefMode = "embed-ref" | "uuid-ref";

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
export function simple_ref_slot(
  path: string = "",
  accept_types: string | EntryType[],
  mode: RefMode,
  _helper: HelperOptions
) {
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
  let doc =
    _helper.hash["value"] ?? (resolve_helper_dotpath(_helper, path) as SystemTemplates.ResolvedUuidRef<LancerDoc>);

  if (!doc || doc.status == "missing") {
    // Show an icon for each accepted type
    let icons = (arr_types || ["dummy"]).filter(t => t).map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref ref-card empty slot" 
                 data-accept-types="${flat_types}"
                 data-path="${path}"
                 data-mode="${mode}">
          ${icons.join(" ")}
          <span class="major">Empty</span>
      </div>`;
  } else if (doc.status == "async") {
    return `<span>ASYNC not handled yet</span>`;
  } else {
    // The data-type
    return `<div class="ref set slot ref-card" 
                  data-accept-types="${flat_types}"
                  data-path="${path}"
                  data-mode="${mode}"
                  ${ref_params(doc.value)}
                  >
          <img class="ref-icon" src="${doc.value.img}"></img>
          <span class="major">${doc.value.name}</span>
      </div>`;
  }
}

// A helper hook to handle clicks on refs. Opens/focuses the clicked item's window
export async function click_evt_open_ref(event: any) {
  event.preventDefault();
  event.stopPropagation();
  const elt = event.currentTarget;
  const uuid = elt?.dataset?.uuid;
  if (uuid) {
    const doc = await fromUuid(uuid);
    if (doc) {
      (doc as LancerActor | LancerItem).render(true);
    }
  }
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is currently referencing
export async function resolve_ref_element(
  elt: HTMLElement
): Promise<LancerItem | LancerActor | LancerActiveEffect | null> {
  if (!elt.dataset.uuid) {
    return null;
  } else {
    let found = await fromUuid(elt.dataset.uuid);
    if (found && (found instanceof LancerItem || found instanceof LancerActor || found instanceof LancerActiveEffect)) {
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
 * @param item The reffable MM item/actor itself
 */
export function ref_portrait<T extends EntryType>(
  img: string,
  img_path: string,
  item: LancerDoc<T>,
  _helper: HelperOptions
) {
  // Fetch the image
  return `<img class="profile-img ref set" src="${img}" data-edit="${img_path}" ${ref_params(
    item
  )} width="100" height="100" />`;
}

// Use this slot callback to add items of certain kind(s) to a list.

// A helper suitable for showing a small preview of a ref (slot)
// In general, any preview here is less for "use" (e.x. don't tend to have elaborate macros) and more just to show something is there
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function item_preview<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null" | null,
  mode: "doc" | "embed-ref" | "uuid-ref", // Is this to an embedded ref
  helper: HelperOptions,
  registry?: CollapseRegistry
): string {
  // Fetch
  let fetched = resolve_helper_dotpath(helper, item_path);
  let doc: LancerDoc<T> | null;
  if (!!helper.hash["value"]) {
    doc = helper.hash["value"] as LancerDoc<T>;
  } else if (mode == "uuid-ref" || mode == "embed-ref") {
    let f = fetched as SystemTemplates.ResolvedUuidRef<LancerDoc<T>>;
    if (f.status == "resolved") {
      doc = f.value;
    } else {
      return `<span>ERROR: Unhandled ref status ${f.status}</span>`;
    }
  } else if (mode == "doc") {
    doc = fetched as LancerDoc<T>;
  } else {
    throw new Error("Bad item preview mode " + mode);
  }

  if (!doc) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path} in `, helper.data);
    return "ERR: Devs, don't try and show null things in a list. this ain't a slot (but it could be if you did some magic)";
  }
  // Make a re-used trashcan imprint
  let trash_can = "";
  if (trash_action) {
    trash_can = `<a class="gen-control i--white" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>`;
  }

  let collapseID;
  let collapse_trigger = "";
  if (registry != null) {
    // On sheet, enable collapse.
    registry[doc.id!] == null && (registry[doc.id!] = 0);

    let collapseNumCheck = ++registry[doc.id!];
    collapseID = `${doc.id}_${collapseNumCheck}`;
  }
  if (collapseID) {
    collapse_trigger = `<i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="${collapseID}"> </i>`;
  }

  // Handle based on type
  if (doc.is_mech_system()) {
    let icon: string;
    let sp: string;
    let desc: string | undefined;
    let actions: string | undefined;
    let deployables: string | undefined;
    let eff: string | undefined;

    const icon_types = [SystemType.Deployable, SystemType.Drone, SystemType.Mod, SystemType.System, SystemType.Tech];
    icon = icon_types.includes(doc.system.type)
      ? `cci cci-${doc.system.type.toLowerCase()} i--m i--click`
      : `cci cci-system i--m i--click`;

    sp = sp_display(doc.system.sp ?? 0);

    if (doc.system.description && doc.system.description !== "No description") {
      desc = `<div class="desc-text" style="padding: 5px">
          ${doc.system.description}
        </div>`;
    }

    if (doc.system.effect) {
      eff = effect_box("EFFECT", doc.system.effect);
    }

    if (doc.system.actions.length) {
      actions = doc.system.actions
        .map((a, i) => {
          return buildActionHTML(a, { full: true, num: i });
        })
        .join("");
    }

    if (doc.system.deployables.length) {
      deployables = doc.system.deployables
        .map((d, i) => {
          return d.status == "resolved" ? buildDeployableHTML(d.value, true, i) : "UNRESOLVED";
        })
        .join("");
    }

    let macroData: LancerMacroData = {
      iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
      title: doc.name!,
      fn: "prepareItemMacro",
      args: [doc.actor?.id ?? "", doc.id],
    };

    let limited = "";
    if (doc.is_limited()) {
      limited = limited_uses_indicator(doc, item_path);
    }
    return `<li class="ref set card clipped mech-system item ${
      doc.system.type === SystemType.Tech ? "tech-item" : ""
    }" ${ref_params(doc)} style="margin: 0;">
        <div class="lancer-header ${doc.system.destroyed ? "destroyed" : ""}" style="grid-area: 1/1/2/3; display: flex">
          <i class="${doc.system.destroyed ? "mdi mdi-cog" : icon}"> </i>
          <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
          <span class="minor grow">${doc.name}</span>
          ${collapse_trigger}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div ${collapse_trigger ? `class="collapse" data-collapse-id="${collapseID}"` : ""} style="padding: 0.5em">
          <div class="flexrow">
            ${sp}
            <div class="uses-wrapper">
              ${limited}
            </div>
          </div>
<!--          ${desc ? desc : ""}-->
          ${eff ? eff : ""}
          ${actions ? actions : ""}
          ${deployables ? deployables : ""}
          ${compact_tag_list(item_path + ".system.tags", doc.system.tags, false)}
        </div>
        </li>`;
  } else if (doc.is_talent()) {
    let retStr = `<li class="card clipped talent-compact item ref set" ${ref_params(doc)}>
        <div class="lancer-talent-header medium clipped-top" style="grid-area: 1/1/2/4">
          <i class="cci cci-talent i--m"></i>
          <span class="major">${doc.name}</span>
          ${collapse_trigger}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
      <ul ${collapse_trigger ? `class="collapse" data-collapse-id="${collapseID}"` : ""} style="grid-area: 2/1/3/3">`;

    for (var i = 0; i < doc.system.curr_rank; i++) {
      let talent_actions = "";

      if (doc.system.ranks[i].actions) {
        talent_actions = doc.system.ranks[i].actions
          .map(a => {
            return buildActionHTML(a, { full: true, num: (doc as LancerTALENT).system.actions.indexOf(a) });
          })
          .join("");
      }

      let macroData: LancerMacroData = {
        iconPath: `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`,
        title: doc.system.ranks[i]?.name,
        fn: "prepareTalentMacro",
        args: [doc.actor?.id ?? "", doc.id, i],
      };

      retStr += `<li class="talent-rank-compact card clipped" style="padding: 5px">
        <a class="cci cci-rank-${i + 1} i--l i--dark talent-macro lancer-macro" data-macro="${encodeMacroData(
        macroData
      )}" style="grid-area: 1/1/2/2"></a>
        <span class="major" style="grid-area: 1/2/2/3">${doc.system.ranks[i]?.name}</span>
        <div class="effect-text" style="grid-area: 2/1/3/3">
        ${doc.system.ranks[i]?.description}
        ${talent_actions}
        </div>
        </li>`;
    }

    retStr += `</ul>
      </li>`;

    return retStr;
  } else if (doc.is_skill()) {
    return `
      <li class="card clipped skill-compact item macroable ref set" ${ref_params(doc)}>
        <div class="lancer-trigger-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-skill i--m i--dark"> </i>
          <span class="major modifier-name">${doc.name}</span>
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <a class="flexrow skill-macro" style="grid-area: 2/1/3/2;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
          <div class="major roll-modifier" style="align-self: center">+${doc.system.rank * 2}</div>
        </a>
        <div class="desc-text" style="grid-area: 2/2/3/3">${doc.system.description}</div>
      </li>`;
  } else if (doc.is_core_bonus()) {
    return `
      <li class="card clipped item ref set" ${ref_params(doc)}>
        <div class="lancer-corebonus-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-corebonus i--m i--dark"> </i>
          <span class="major modifier-name">${doc.name}</span>
          ${collapse_trigger}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div ${collapse_trigger ? `class="collapse" data-collapse-id="${collapseID}"` : ""}>
          <div class="desc-text" style="grid-area: 2/2/3/3">${doc.system.description}</div>
          <div style="grid-area: 2/3/3/4">${doc.system.effect}</div>
        </div>
      </li>`;
  } else if (doc.is_license()) {
    return license_ref(doc, doc.system.rank, item_path);
  } else {
    // Basically the same as the simple ref card, but with control added
    console.log("You're using the default refview, you may not want that");
    return `
      <div class="ref set ref-card" 
              ${ref_params(doc)}>
        <img class="ref-icon" src="${doc.img}"></img>
        <span class="major">${doc.name}</span>
        <hr class="vsep"> 
        <div class="ref-controls">
          <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${item_path}">
            <i class="fas fa-ellipsis-v"></i>
          </a>
        </div>
      </div>`;
  }
}

export function limited_uses_indicator(
  item:
    | LancerMECH_WEAPON
    | LancerMECH_SYSTEM
    | LancerWEAPON_MOD
    | LancerPILOT_WEAPON
    | LancerPILOT_GEAR
    | LancerNPC_FEATURE,
  path: string
): string {
  const uses = item.system.uses;

  const hexes = [...Array(uses.max)].map((_ele, index) => {
    const available = index + 1 <= uses.value;
    return `<a><i class="uses-hex mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}"></i></a>`;
  });

  return `<div class="clipped card limited-card">USES ${hexes.join("")}</div>`;
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function item_preview_list(
  item_array_path: string,
  allowed_types: string,
  mode: "doc" | RefMode,
  _helper: HelperOptions,
  collapse?: CollapseRegistry
) {
  let embeds = resolve_helper_dotpath(_helper, item_array_path) as SystemTemplates.ResolvedUuidRef<
    LancerActor | LancerItem
  >[];
  let previews = embeds.map((x, i) => {
    item_preview(`${item_array_path}.${i}`, null, mode, _helper, collapse);
  });
  return `
    <div class="flexcol ref-list" 
         data-path="${item_array_path}" 
         data-type="${allowed_types}"
         data-mode="${mode}">
         ${previews.join("")}
    </div>`;
}

// Enables dropping of items into open slots at the end of lists generated by mm_ref_list_append_slot
// This doesn't handle natives. Requires two callbacks: One to get the item that will actually have its list appended,
// and one to commit any changes to aforementioned object
export function HANDLER_add_doc_to_list_on_drop<T>(html: JQuery, root_doc: LancerActor | LancerItem) {
  // Use our handy dandy helper
  HANDLER_enable_doc_dropping(html.find(".ref.ref-list"), async (rdd, evt) => {
    if (!(rdd.type == "Actor" || rdd.type == "Item")) return; // For now, don't allow adding macros etc to lists

    // Gather context information
    let path = evt[0].dataset.path;
    let mode = evt[0].dataset.mode as "embed-ref" | "uuid-ref";
    let allowed_items_raw = evt[0].dataset.type ?? "";

    // Check type is allowed type
    if (allowed_items_raw && !allowed_items_raw.includes(rdd.document.type)) return;

    // Coerce val to appropriate type
    let val;
    if (mode == "embed-ref") {
      val = rdd.document.id;
    } else if (mode == "uuid-ref") {
      val = rdd.document.uuid;
    } else if (mode == "doc") {
      return; // Cannot drop here
    } else {
      console.error("Ref list drop 'mode' missing");
      return;
    }

    // Try to apply the list addition
    if (path) {
      let dd = drilldown_document(root_doc, path);
      let array = dd.terminus;
      if (Array.isArray(array)) {
        let changes = array_path_edit_changes(dd.sub_doc, dd.sub_path + ".-1", val, "insert");
        dd.sub_doc.update({ [changes.path]: changes.new_val });
      }
    }
  });
}

export function HANDLER_activate_uses_editor<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T
) {
  /* TODO
  let elements = html.find(".uses-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();

    const params = ev.currentTarget.dataset;
    const data = await data_getter();
    if (params.path) {
      const item = resolve_dotpath(data, params.path) as MechSystem;
      const available = params.available === "true";

      if (available) {
        // Deduct uses.
        item.Uses = item.Uses > 0 ? item.Uses - 1 : 0;
      } else {
        // Increment uses.
        item.Uses = item.Uses < item.OrigData.derived.max_uses ? item.Uses + 1 : item.OrigData.derived.max_uses;
      }

      await item.writeback();
      console.debug(item);
    }
  });
  */
}

// Enables dragging of ref cards (or anything with .ref.set and the appropriate fields)
// Highlights anything labeled with classes "ref drop-settable ${type}" where ${type} is the type of the dragged item
// This doesn't handle natives
export function HANDLER_activate_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  HANDLER_enable_dragging(
    html.find(".ref.set"),
    (source, evt) => {
      let uuid = evt.currentTarget.dataset.uuid as string;
      if (!uuid || !(uuid.includes("Item.") || uuid.includes("Actor."))) {
        console.error("Unable to properly drag ref", source, evt.currentTarget);
        throw new Error("Drag error");
      }
      let result: FoundryDropData = {
        type: uuid.includes("Item.") ? "Item" : "Actor",
        uuid,
      };
      return JSON.stringify(result);
    },

    (start_stop, src, _evt) => {
      /*
    // Highlight valid drop points
    let drop_set_target_selector = `.ref.drop-settable.${src[0].dataset.type}`;
    let drop_append_target_selector = `.ref.ref-list.${src[0].dataset.type}`;
    let target_selector = `${drop_set_target_selector}, ${drop_append_target_selector}`;

    if (start_stop == "start") {
      $(target_selector).addClass("highlight-can-drop");
    } else {
      $(target_selector).removeClass("highlight-can-drop");
    }
    */
    }
  );
}

// Allow every ".ref.drop-settable" spot to be dropped onto, with a payload of a JSON RegRef
// Additionally provides the "pre_finalize_drop" function to (primarily) facillitate taking posession of items,
// but in general apply whatever transformations deemed necessary
export function HANDLER_activate_ref_slot_dropping(
  html: JQuery,
  root_doc: LancerActor | LancerItem,
  pre_finalize_drop: ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null
) {
  HANDLER_enable_doc_dropping(html.find(".ref.slot"), async (drop, dest, evt) => {
    // Pre-finalize the entry
    if (pre_finalize_drop) {
      drop = await pre_finalize_drop(drop);
    }

    // Decide the mode
    let path = dest[0].dataset.path;
    let mode = dest[0].dataset.mode as RefMode;
    let types = dest[0].dataset.acceptTypes as string;
    let val;
    if (mode == "embed-ref") {
      val = drop.document.id;
    } else if (mode == "uuid-ref") {
      val = drop.document.uuid;
    } else {
      throw new Error("Illegal drop mode " + mode);
    }

    // Check allows
    if (types && !types.includes((drop.document as any).type ?? "err")) {
      return;
    }

    // Then just merge-set to the path
    if (path) {
      let dd = drilldown_document(root_doc, path);
      dd.sub_doc.update({ [dd.sub_path]: val });
    }
  });
}
// Allow every ".ref.drop-settable" spot to be right-click cleared
// Uses same getter/commit func scheme as other callbacks
export function HANDLER_activate_ref_slot_clearing(html: JQuery, root_doc: LancerActor | LancerItem) {
  html.find(".ref.slot").on("contextmenu", async event => {
    let path = event.target.dataset.path;
    if (path) {
      let dd = drilldown_document(root_doc, path);
      if (dd.terminus) {
        dd.sub_doc.update({ [dd.sub_path]: null });
      }
    }
  });
}

/**
 * Use this for ui forms of items. Will prevent change/submit events from propagating all the way up,
 * and instead call writeback() on the appropriate document instead.
 * Control in same way as generic action handler: with the "data-commit-item" property pointing at the MM item
 */
export function HANDLER_intercept_form_changes<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T
  // commit_func: (data: T) => void | Promise<void> -- not necessary
) {
  // Capture anywhere with a data-commit-item path specified
  let capturers = html.find("[data-commit-item]");
  capturers.on("change", async evt => {
    // Don't let it reach root form
    evt.stopPropagation();

    // Get our form data. We're kinda just replicating what would happen in onUpdate, but minus all of the fancier processing that is needed there
    let form = $(evt.target).parents("form")[0];
    let form_data = read_form(form);

    // Get our target data
    let sheet_data = await data_getter();
    let path = evt.currentTarget.dataset.commitItem;
    if (path) {
      let doc = resolve_dotpath(sheet_data, path) as LancerItem | LancerActor;
      if (doc) {
        // Apply
        await doc.update(form_data);
      }
    }
  });
}
