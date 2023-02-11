import type { HelperOptions } from "handlebars";
import {
  Action,
  CoreBonus,
  Deployable,
  EntryType,
  License,
  LiveEntryTypes,
  MechSystem,
  MechWeapon,
  NpcFeature,
  OpCtx,
  PilotGear,
  PilotWeapon,
  RegEntry,
  RegRef,
  Reserve,
  Skill,
  SystemType,
  Talent,
  WeaponMod,
} from "machine-mind";
import { is_limited } from "machine-mind/dist/classes/mech/EquipUtil";
import { AnyMMActor, is_actor_type } from "../actor/lancer-actor";
import { TypeIcon } from "../config";
import type { LancerMacroData } from "../interfaces";
import { AnyMMItem, is_item_type, LancerItemType } from "../item/lancer-item";
import { encodeMacroData } from "../macros";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import { effect_box, gentle_merge, read_form, resolve_dotpath, resolve_helper_dotpath, sp_display } from "./commons";
import {
  AllowMMDropPredicateFunc,
  convert_ref_to_native_drop,
  HANDLER_enable_dragging,
  HANDLER_enable_mm_dragging,
  HANDLER_enable_mm_dropping,
  MMDragResolveCache,
} from "./dragdrop";
import { buildActionHTML, buildDeployableHTML, license_ref } from "./item";
import { compact_tag_list } from "./tags";
import { CollapseRegistry } from "./loadout";

// We use these for virtually every ref function
export function ref_commons<T extends EntryType>(
  item: RegEntry<T> | null
): null | {
  img: string;
  name: string;
  uuid: string;
  ref: RegRef<T>;
} {
  // Nulls beget nulls
  if (!item) {
    return null;
  }

  // Grab flags to retrieve original document
  let flags = item.Flags as FoundryFlagData<T>;

  // Declare our results
  let ref = item.as_ref();
  let img: string;
  let name: string;
  let uuid: string;

  // best to know what we are working with
  if (is_actor_type(item.Type)) {
    // 'tis an actor, sire
    let actor = flags.orig_doc;
    img = actor.img!;
    name = actor.name!;
    uuid = actor.uuid;
  } else if (is_item_type(item.Type)) {
    // 'tis an item, m'lord
    let item = flags.orig_doc;
    img = item.img!;
    name = item.name!;
    uuid = item.uuid;
  } else {
    console.warn("Error making item/actor ref", item);
    return null;
  }

  // Combine and return
  return {
    img,
    name,
    ref,
    uuid,
  };
}

// Creates the params common to all refs, essentially just the html-ified version of a RegRef
export function ref_params(ref: RegRef<any>, uuid: string, path?: string) {
  if (path) {
    return ` data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}" data-uuid="${uuid}" data-path="${path}" `;
  } else {
    return ` data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}" data-uuid="${uuid}" `;
  }
}

// A multiplexer-helper on machine-mind objects, to create actor/item ref items
// If a slot_path is provided, then this will additionally be a valid drop-settable location for items of this type
export function simple_mm_ref<T extends EntryType>(
  types: T | T[],
  item: RegEntry<T> | null,
  fallback: string = "Empty",
  slot_path: string = "",
  native: boolean = false
) {
  // Flatten types
  if (!Array.isArray(types)) {
    types = [types];
  }
  let flat_types = types.join(" ");

  // Generate commons
  let cd = ref_commons(item);

  // Generate path snippet
  let settable_snippet = "";
  if (slot_path) {
    settable_snippet = ` drop-settable `;
  }

  // Generate native drop snippet if we want one
  let native_drop_snippet = native ? " native-refdrop " : "";

  if (!cd) {
    // Show an icon for each potential type
    let icons = types.map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref ref-card ${native_drop_snippet} ${settable_snippet} ${flat_types}" 
                        data-path="${slot_path}" 
                        data-type="${flat_types}">
          ${icons.join(" ")}
          <span class="major">${fallback}</span>
      </div>`;
  }

  // The data-type
  return `<div class="valid ${cd.ref.type} ref clickable-ref ref-card ${native_drop_snippet} ${settable_snippet}" 
                ${ref_params(cd.ref, cd.uuid)}
                data-path="${slot_path}" >
         <img class="ref-icon" src="${cd.img}"></img>
         <span class="major">${cd.name}</span>
     </div>`;
}

// The hook to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.valid").on("click", HANDLER_onClickRef);
export async function HANDLER_activate_ref_clicking<T extends EntryType>(event: any) {
  event.preventDefault();
  event.stopPropagation();
  const element = event.currentTarget;

  const found_doc = await resolve_ref_element(element);
  if (!found_doc) return;

  // We didn't really need the fully resolved class but, hwatever
  // open that link
  let sheet = (found_doc.Flags as FoundryFlagData<T>).orig_doc.sheet;

  // If the sheet is already rendered:
  if (sheet?.rendered) {
    sheet.maximize(); // typings say "maximise", are incorrect
    sheet.bringToTop();
  }

  // Otherwise render the sheet
  else sheet?.render(true);
}

// Given a ref element (as created by simple_mm_ref or similar function), reconstruct a RegRef to the item it is referencing
export function recreate_ref_from_element<T extends EntryType>(
  element: HTMLElement
): (RegRef<T> & { uuid: string }) | null {
  let id = element.dataset.id;
  let type = element.dataset.type as T | undefined;
  let reg_name = element.dataset.regName;
  let uuid = element.dataset.uuid;
  let fallback_lid = "";

  // Check existence
  if (!id) {
    console.error("Could not drag ref: missing data-id");
    return null;
  } else if (!type) {
    console.error("Could not drag ref: missing data-type");
    return null;
  } else if (!reg_name) {
    console.error("Could not drag ref: missing data-reg-name");
    return null;
  } else if (!uuid) {
    console.error("Could not drag ref: missing uuid");
    return null;
  }

  return {
    id,
    type,
    reg_name,
    fallback_lid,
    uuid,
  };
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is currently referencing
export async function resolve_ref_element<T extends EntryType>(
  element: HTMLElement,
  ctx?: OpCtx
): Promise<LiveEntryTypes<T> | null> {
  // We reconstruct the ref
  let ref = recreate_ref_from_element(element) as RegRef<T>;

  // Then we resolve it
  ctx = ctx ?? new OpCtx();
  let found_doc = await new FoundryReg().resolve(ctx, ref);

  if (found_doc) {
    return found_doc;
  } else {
    console.warn("Failed to resolve ref element");
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
export function mm_ref_portrait<T extends EntryType>(
  img: string,
  img_path: string,
  item: RegEntry<T>,
  _helper: HelperOptions
) {
  // Fetch the image
  return `<img class="profile-img ref valid ${item.Type}" src="${img}" data-edit="${img_path}" ${ref_params(
    item.as_ref(),
    item.Flags.orig_doc.uuid
  )} width="100" height="100" />`;
}

// Use this slot callback to add items of certain kind(s) to a list.

// A helper suitable for showing lists of refs that can be deleted/spliced out, or slots that can be nulled
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function editable_mm_ref_list_item<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null" | null,
  helper: HelperOptions,
  registry?: CollapseRegistry
) {
  // Fetch the item
  let item_: RegEntry<T> | null = resolve_helper_dotpath(helper, item_path);

  // Generate commons
  let cd = ref_commons(item_);

  if (!cd) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path} in `, helper.data);
    return "ERR: Devs, don't try and show null things in a list. this ain't a slot (but it could be if you did some magic)";
  }

  let item = item_!; // cd truthiness implies item truthiness

  // Make a re-used trashcan imprint
  let trash_can = "";
  if (trash_action) {
    trash_can = `<a class="gen-control i--white" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>`;
  }

  let collapseID;
  let collapse_trigger = "";
  if (registry != null) {
    // On sheet, enable collapse.
    registry[item.LID] == null && (registry[item.LID] = 0);

    let collapseNumCheck = ++registry[item.LID];
    collapseID = `${item.LID}_${collapseNumCheck}`;
  }
  if (collapseID) {
    collapse_trigger = `<i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="${collapseID}"> </i>`;
  }

  switch (item.Type) {
    case EntryType.MECH_SYSTEM:
      let sys: MechSystem = <MechSystem>(<any>item);
      let icon: string;
      let sp: string;
      let desc: string | undefined;
      let actions: string | undefined;
      let deployables: string | undefined;
      let eff: string | undefined;

      const icon_types = [SystemType.Deployable, SystemType.Drone, SystemType.Mod, SystemType.System, SystemType.Tech];
      icon = icon_types.includes(sys.SysType)
        ? `cci cci-${sys.SysType.toLowerCase()} i--m i--click`
        : `cci cci-system i--m i--click`;

      sp = sp_display(sys.SP ? sys.SP : 0);

      if (sys.Description && sys.Description !== "No description") {
        desc = `<div class="desc-text" style="padding: 5px">
          ${sys.Description}
        </div>`;
      }

      if (sys.Effect) {
        eff = effect_box("EFFECT", sys.Effect);
      }

      if (sys.Actions.length) {
        actions = sys.Actions.map((a: Action, i: number | undefined) => {
          return buildActionHTML(a, { full: true, num: i });
        }).join("");
      }

      if (sys.Deployables.length) {
        deployables = sys.Deployables.map((d: Deployable, i: number) => {
          return buildDeployableHTML(d, true, i);
        }).join("");
      }

      let macroData: LancerMacroData = {
        iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
        title: sys.Name,
        fn: "prepareItemMacro",
        args: [sys.Flags.orig_doc.actor?.id ?? "", sys.Flags.orig_doc.id],
      };

      let limited = "";
      if (is_limited(sys)) {
        limited = limited_uses_indicator(sys, item_path);
      }
      return `<li class="valid ref card clipped mech-system item ${
        sys.SysType === SystemType.Tech ? "tech-item" : ""
      }" ${ref_params(cd.ref, cd.uuid)} style="margin: 0;">
        <div class="lancer-header ${sys.Destroyed ? "destroyed" : ""}" style="grid-area: 1/1/2/3; display: flex">
          <i class="${sys.Destroyed ? "mdi mdi-cog" : icon}"> </i>
          <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
          <span class="minor grow">${sys.Name}</span>
          ${collapse_trigger}
          <div class="ref-list-controls">
            <a class="lancer-context-menu" data-context-menu="${item.Type}" data-path="${item_path}"">
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
          ${compact_tag_list(item_path + ".Tags", sys.Tags, false)}
        </div>
        </li>`;

    case EntryType.TALENT:
      let talent: Talent = <Talent>(<any>item);
      let retStr = `<li class="card clipped talent-compact item ref valid" ${ref_params(cd.ref, cd.uuid)}>
        <div class="lancer-talent-header medium clipped-top" style="grid-area: 1/1/2/4">
          <i class="cci cci-talent i--m"></i>
          <span class="major">${talent.Name}</span>
          ${collapse_trigger}
          <div class="ref-list-controls">
            <a class="lancer-context-menu" data-context-menu="${item.Type}" data-path="${item_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
      <ul ${collapse_trigger ? `class="collapse" data-collapse-id="${collapseID}"` : ""} style="grid-area: 2/1/3/3">`;

      for (var i = 0; i < talent.CurrentRank; i++) {
        let talent_actions = "";

        if (talent.Ranks[i].Actions) {
          talent_actions = talent.Ranks[i].Actions.map((a: Action) => {
            return buildActionHTML(a, { full: true, num: talent.Actions.indexOf(a) });
          }).join("");
        }

        let macroData: LancerMacroData = {
          iconPath: `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`,
          title: talent.Ranks[i]?.Name,
          fn: "prepareTalentMacro",
          args: [talent.Flags.orig_doc.actor?.id ?? "", talent.Flags.orig_doc.id, i],
        };

        retStr += `<li class="talent-rank-compact card clipped" style="padding: 5px">
        <a class="cci cci-rank-${i + 1} i--l i--dark talent-macro lancer-macro" data-macro="${encodeMacroData(
          macroData
        )}" style="grid-area: 1/1/2/2"></a>
        <span class="major" style="grid-area: 1/2/2/3">${talent.Ranks[i]?.Name}</span>
        <div class="effect-text" style="grid-area: 2/1/3/3">
        ${talent.Ranks[i]?.Description}
        ${talent_actions}
        </div>
        </li>`;
      }

      retStr += `</ul>
      </li>`;

      return retStr;

    case EntryType.SKILL:
      let skill: Skill = <Skill>(<any>item);
      return `
      <li class="card clipped skill-compact item macroable ref valid" ${ref_params(cd.ref, cd.uuid)}>
        <div class="lancer-trigger-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-skill i--m i--dark"> </i>
          <span class="major modifier-name">${skill.Name}</span>
          <div class="ref-list-controls">
            <a class="lancer-context-menu" data-context-menu="${item.Type}" data-path="${item_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <a class="flexrow skill-macro" style="grid-area: 2/1/3/2;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
          <div class="major roll-modifier" style="align-self: center">+${skill.CurrentRank * 2}</div>
        </a>
        <div class="desc-text" style="grid-area: 2/2/3/3">${skill.Description}</div>
      </li>`;

    case EntryType.CORE_BONUS:
      let cb: CoreBonus = <CoreBonus>(<any>item);
      return `
      <li class="card clipped item ref valid" ${ref_params(cd.ref, cd.uuid)}>
        <div class="lancer-corebonus-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-corebonus i--m i--dark"> </i>
          <span class="major modifier-name">${cb.Name}</span>
          ${collapse_trigger}
          <div class="ref-list-controls">
            <a class="lancer-context-menu" data-context-menu="${item.Type}" data-path="${item_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div ${collapse_trigger ? `class="collapse" data-collapse-id="${collapseID}"` : ""}>
          <div class="desc-text" style="grid-area: 2/2/3/3">${cb.Description}</div>
          <div style="grid-area: 2/3/3/4">${cb.Effect}</div>
        </div>
      </li>`;

    case EntryType.LICENSE:
      let license: License = <License>(<any>item);
      return license_ref(license, license.CurrentRank, item_path);

    default:
      // Basically the same as the simple ref card, but with control added
      console.log("You're using the default refview, you may not want that");
      return `
      <div class="valid ${cd.ref.type} ref clickable-ref ref-card" 
              ${ref_params(cd.ref, cd.uuid)}>
        <img class="ref-icon" src="${cd.img}"></img>
        <span class="major">${cd.name}</span>
        <hr class="vsep"> 
        <div class="ref-list-controls">
          ${trash_can}
        </div>
      </div>`;
  }
}

export function hex_array(curr: number, max: number, path: string) {
  return [...Array(max)].map((_ele, index) => {
    const available = index + 1 <= curr;
    return `<a><i class="uses-hex mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}"></i></a>`;
  });
}

export function limited_uses_indicator(
  item: MechWeapon | MechSystem | WeaponMod | PilotWeapon | PilotGear | NpcFeature,
  path: string
): string {
  const uses = item.Uses;
  const maxUses = item.OrigData.derived.max_uses;

  const hexes = hex_array(uses, maxUses, path);

  return `<div class="clipped card limited-card">USES ${hexes.join("")}</div>`;
}

export function reserve_used_indicator(item: Reserve, path: string): string {
  const hexes = hex_array(item.Used ? 0 : 1, 1, path);

  return `<div class="clipped card limited-card">USED ${hexes.join("")}</div>`;
}

function limited_HTML(
  item: MechWeapon | MechSystem | PilotWeapon | PilotGear,
  path: string,
  helper: HelperOptions
): string {
  let val_path = path + ".Uses";
  let data_val = resolve_helper_dotpath(helper, val_path, 0);

  return `Uses: 
  <div class="flexrow flex-center no-wrap">
  <input class="lancer-stat" type="number" name="${val_path}" value="${data_val}" data-dtype="Number" data-commit-item="${path}" style="justify-content: left"/>
  <span>/</span>
  <span class="lancer-stat" style="justify-content: left"> ${item.OrigData.derived.max_uses}</span>
</div>`;
}

// Exactly as above, but drags as a native when appropriate handlers called
export function editable_mm_ref_list_item_native(
  item_path: string,
  trash_action: "delete" | "splice" | "null" | null,
  helper: HelperOptions
) {
  return editable_mm_ref_list_item(item_path, trash_action, helper).replace("ref ref-card", "ref ref-card native-drag");
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function mm_ref_list_append_slot(item_array_path: string, allowed_types: string, _helper: HelperOptions) {
  return `
    <div class="ref ref-card ref-list-append ${allowed_types}" 
            data-path="${item_array_path}" 
            data-type="${allowed_types}">
      <span class="major">Drop to add item</span>
    </div>`;
}

export function HANDLER_activate_uses_editor<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T
) {
  let elements = html.find(".uses-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();

    const params = ev.currentTarget.dataset;
    const data = await data_getter();
    if (params.path) {
      const item = resolve_dotpath(data, params.path) as
        | MechSystem
        | MechWeapon
        | WeaponMod
        | NpcFeature
        | PilotGear
        | PilotWeapon
        | Reserve;
      const available = params.available === "true";
      if (item.Type === EntryType.RESERVE) {
        item.Used = !item.Used;
      } else {
        if (available) {
          // Deduct uses.
          item.Uses = item.Uses > 0 ? item.Uses - 1 : 0;
        } else {
          // Increment uses.
          item.Uses = item.Uses < item.OrigData.derived.max_uses ? item.Uses + 1 : item.OrigData.derived.max_uses;
        }
      }
      await item.writeback();
      console.debug(item);
    }
  });
}

// Enables dropping of items into open slots at the end of lists generated by mm_ref_list_append_slot
// This doesn't handle natives. Requires two callbacks: One to get the item that will actually have its list appended,
// and one to commit any changes to aforementioned object
export function HANDLER_add_ref_to_list_on_drop<T>(
  resolver: MMDragResolveCache,
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  // Use our handy dandy helper
  HANDLER_enable_mm_dropping(
    html.find(".ref.ref-list-append"),
    resolver,
    null, // In general these are explicitly meant to refer to "outside" items, so no real filtering needed
    async (entry, evt) => {
      let data = await data_getter();
      let path = evt[0].dataset.path;
      if (path) {
        let array = resolve_dotpath(data, path) as Array<RegEntry<any>>;
        if (Array.isArray(array)) {
          array.push(entry);
          console.debug("Success", entry, array);
          await commit_func(data);
        }
      }
    }
  );
}

// Enables dragging of ref cards (or anything with .ref.valid and the appropriate fields)
// Highlights anything labeled with classes "ref drop-settable ${type}" where ${type} is the type of the dragged item
// This doesn't handle natives
export function HANDLER_activate_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  HANDLER_enable_mm_dragging(html.find(".ref.valid:not(.native-drag)"), (start_stop, src, _evt) => {
    // Highlight valid drop points
    let drop_set_target_selector = `.ref.drop-settable.${src[0].dataset.type}`;
    let drop_append_target_selector = `.ref.ref-list-append.${src[0].dataset.type}`;
    let target_selector = `${drop_set_target_selector}, ${drop_append_target_selector}`;

    if (start_stop == "start") {
      $(target_selector).addClass("highlight-can-drop");
    } else {
      $(target_selector).removeClass("highlight-can-drop");
    }
  });
}

// Enables dragging of ref cards (or anything with .ref.valid and the appropriate fields) marked with ".native-drag", converting the dragged item to a native foundry ref
export function HANDLER_activate_native_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  HANDLER_enable_dragging(html.find(".ref.valid.native-drag"), drag_src => {
    // Drag a JSON ref
    let ref = recreate_ref_from_element(drag_src[0]);
    let native = ref ? convert_ref_to_native_drop(ref) : null;
    if (native) {
      return JSON.stringify(native);
    } else {
      return "";
    }
  });
}

// Allow every ".ref.drop-settable" spot to be dropped onto, with a payload of a JSON RegRef
// Uses same getter/commit func scheme as other callbacks
// Additionally provides the "pre_finalize_drop" function to (primarily) facillitate taking posession of items
export function HANDLER_activate_ref_drop_setting<T>(
  resolver: MMDragResolveCache,
  html: JQuery,
  can_drop: null | AllowMMDropPredicateFunc,
  pre_finalize_drop: ((entry: AnyMMItem | AnyMMActor) => Promise<AnyMMItem | AnyMMActor>) | null,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  HANDLER_enable_mm_dropping(html.find(".ref.drop-settable"), resolver, can_drop, async (entry, evt) => {
    // Pre-finalize the entry
    if (pre_finalize_drop) {
      entry = await pre_finalize_drop(entry);
    }

    // Then just merge-set to the path
    let data = await data_getter();
    let path = evt[0].dataset.path;
    if (path) {
      // Set the item at the data path
      gentle_merge(data, { [path]: entry });
      await commit_func(data);
    }
  });
}
// Allow every ".ref.drop-settable" spot to be right-click cleared
// Uses same getter/commit func scheme as other callbacks
export function HANDLER_activate_ref_drop_clearing<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  html.find(".ref.drop-settable").on("contextmenu", async event => {
    let data = await data_getter();
    let path = event.target.dataset.path;
    if (path) {
      // Check there's anything there before doing anything
      if (!resolve_dotpath(data, path)) return;
      gentle_merge(data, { [path]: null });
      await commit_func(data);
    }
  });
}

/**
 * Use this for previews of items. Will prevent change/submit events from propagating all the way up,
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
      let item_data = resolve_dotpath(sheet_data, path);
      if (item_data) {
        // Apply and writeback
        gentle_merge(sheet_data, form_data); // Will apply any modifications to the item
        await item_data.writeback();
      }
    }
  });
}
