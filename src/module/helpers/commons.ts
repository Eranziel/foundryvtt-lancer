import { HelperOptions } from "handlebars";
import {
  EntryType,
  LiveEntryTypes,
  RegEntry,
  Range,
  Damage,
  RegRef,
  funcs,
  MountType,
  RangeType,
  DamageType,
  SystemMount,
  WeaponMount,
  WeaponSize,
  FittingSize,
  MechWeaponProfile,
  FrameTrait,
  Bonus,
  SerUtil
} from "machine-mind";
import { defaults } from "machine-mind/dist/funcs";
import { HTMLEditDialog } from "../apps/text-editor";
import { LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import { MMEntityContext } from "../mm-util/helpers";

// A shorthand for only including the first string if the second value is truthy
export function inc_if(val: string, test: any) {
  return test ? val : "";
}

// Simple helper to simplify mapping truthy values to "checked"
export function checked(truthytest: any): string {
  return truthytest ? "checked" : "";
}

// Simple helper to simplify mapping truthy values to "selected"
export function selected(truthytest: any): string {
  return truthytest ? "selected" : "";
}

/** Performs a similar behavior to the foundry inplace mergeObject, but is more forgiving for arrays, is universally non-destructive, and doesn't create new fields (but will create new indices).
 * Expects flattened data. Does not go recursive
 */
export function gentle_merge(dest: any, flat_data: any) {
  // Make sure either both objects or both arrays
  if (!(dest instanceof Object || dest instanceof Array) || !(flat_data instanceof Object)) {
    throw new Error("One of original or other are not Objects or Arrays!");
  }

  // Try to apply each
  for (let [k, v] of Object.entries(flat_data)) {
    let curr = dest;
    let leading = k.split(".");
    let tail = leading.splice(leading.length - 1)[0];

    // Drill down to reach tail, if we can
    for (let p of leading) {
      let next = curr[p];

      curr = next;
      if(!curr) break;
    }

    // If curr still exists and is an array or object, attempt the assignment
    if (curr instanceof Object && curr[tail] !== undefined) {
      // Implicitly hits array as well
      curr[tail] = v;
    } else  {
      // console.log(`Gentlemerge skipped key "${k}" while merging `, dest, flat_data);
    }
  }
}

/** Insert an array item specified by a dot pathspec, in place
 * Inserted BEFORE that element. If specified index is beyond the length of the array, will simply be appended. 
 * If "delete" specified, deletes (splices) instead. Value is unused
 * Has no effect if target is not an array.
*/
export function array_path_edit(target: any, flat_path: string, value: any, mode: "insert" | "delete") {
  // Break it up
  flat_path = format_dotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolve_dotpath(target, lead);
  if(Array.isArray(array) && !Number.isNaN(index)) {
    // Bound our index
    if(index > array.length) {
      index = array.length;
    }
    if(index < 0) {
      // For negative indexes, count back from end, python style.
      // With the caveat that this also shifts behavior to insert AFTER. So, -1 to append to end, -2 to 1 before end, etc.
      index = array.length + index + 1;

      // If still negative, then we've gone backwards past start of list, and so we bound to zero
      if(index < 0) {
        index = 0;
      }
    }

    // Different behavior depending on mode
    if(mode == "delete") {
      array.splice(index, 1);
    } else if(mode == "insert") {
      array.splice(index, 0, value);
    }
  } else {
    console.error(`Unable to insert array item "${flat_path}[${tail}]": not an array (or not a valid index)`);
  }
}

/** Makes many icons in the same format with ease an icon */
export class IconFactory {
  // Applied to each icon
  private classes: string[] = [];
  private icon_prefix: string = "";

  constructor(args: {
    light?: boolean, // Force icon white
    dark?: boolean, // Force icon black
    size?: "xs" | "s" | "sm" | "m" | "l" | "xl",
    /*
    This arg a bit fancy. 
    - Can be left unset, in which case you'll invoke r with a fairly conventional r("cci cci-heat"), for example.
    - Can be set with the icon grouping, e.x. "cci", in which case one would only have to supply r("cci-heat")
    - Can be set with icon grouping and glyph prefix, e.x. "cci,cci" in which case it will automatically prefix any params to arg with the prefix. So, can do r("heat")
    */
    icon_set?: string 
  }) {
    // Turn options into classes
    if(args.light) {
      this.classes.push("i--light");
    }
    if(args.dark) {
      this.classes.push("i--dark");
    }

    this.classes.push(`i--${args.size ?? "m"}`); // Default medium

    if(args.icon_set) {
      let split = args.icon_set.split(",");
      if(split.length > 1) {
        // Advanced prefixing mode
        this.classes.push(split[0]);
        this.icon_prefix = split[1].trim() + "-";
      } else {
        // Simpler mode
        this.classes.push(args.icon_set);
      }
    }
  }

  // Produces an icon with the given glyph using configured classes
  r(icon: string): string {
    return `<i class="${this.classes.join(" ")} ${this.icon_prefix}${icon}"> </i>`;
  }
}

// Common to many feature/weapon/system previews. Auto-omits on empty body
export function effect_box(title: string, text: string, add_classes:string = ""): string {
  if (text) {
    return `
      <div class="effect-box ${add_classes}">
        <span class="effect-title">${title}</span>
        <span class="effect-text" style="padding: 0 5px ">${text}</span>
      </div>
      `;
  } else {
    return "";
  }
}

// JSON parses a string, returning null instead of an exception on a failed parse
export function safe_json_parse(str: string): any | null {
  try {
    let result = JSON.parse(str);
    return result;
  } catch {
    return null;
  }
}

// Check that a parsed result is probably a ref
export function is_ref(v: any): v is RegRef<any> {
  return (v as RegRef<any> | null)?.fallback_mmid !== undefined;
}

// Check that a parsed result is probably an item
// export function is_item(v: any): v is RegRef<any> {
  // let vt = v as LancerItem<LancerItemType> | null; // Better type
  // return vt?._id !== undefined && vt?.type !== undefined && LancerItemTypes
// }
// Helper function to format a dotpath to not have any square brackets, instead using pure dot notation
export function format_dotpath(path: string): string {
  return path
    .replace(/\[/g, ".")
    .replace(/]/g, "");
}

// Helper function to get arbitrarily deep array references
export function resolve_dotpath(object: any, path: string, default_: any = null) {
  return format_dotpath(path)
    .split(".")
    .reduce((o, k) => o?.[k], object) ?? default_;
}

// Helper function to get arbitrarily deep array references, specifically in a helperoptions, and with better types for that matter
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string): T
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string, default_: T): T
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string, default_: T, try_parent: boolean): T
export function resolve_helper_dotpath(helper: HelperOptions, path: string, default_: any = null, try_parent: boolean = false): any {
  if(try_parent) {
    const false_fail = "MaybeWecanTryagian"; // A temporary default value. Distinguish this from like, a "real" null/default/whatever
    let data = helper.data;

    // Loop until no _parent
    while(data) {
      let resolved = resolve_dotpath(data?.root, path, false_fail);
      if(resolved != false_fail) {
        // Looks like we found something!
        return resolved;
      }
      data = data._parent;
    }

    // We've found nothing. Sad
    return default_;
  } else {
    // Trivial wrapper.
    return resolve_dotpath(helper.data?.root, path, default_);
  }
}

/**
 * Use this when invoking a helper from another helper, and you want to augment the hash args in some way
 * @argument defaults These properties will be inserted iff the hash doesn't already have that value.
 * @argument overrides These properties will be inserted regardless of pre-existing value
*/
export function ext_helper_hash(orig_helper: HelperOptions, overrides: HelperOptions["hash"], defaults: HelperOptions["hash"] = {}): HelperOptions {
  return {
    fn: orig_helper.fn,
    inverse: orig_helper.inverse,
    hash: {
      ...defaults,
      ...orig_helper.hash,
      ...overrides
    },
    data: orig_helper.data
  }
}

/** Enables controls that can:
 * - "delete": delete() the item located at data-path
 * - "null": set as null the value at the specified path
 * - "splice": remove the array item at the specified path
 * - "set": set as `data-action-value` the item at the specified path.
 *    - if prefixed with (string), will use rest of val as plain string
 *    - if prefixed with (int), will parse as int
 *    - if prefixed with (float), will parse as float
 *    - if prefixed with (bool), will parse as boolean
 *    - if prefixed with (struct), will refer to the LANCER.control_structs above, generating whatever value matches the key
 * - "append": append the item to array at the specified path, using same semantics as data-action-value
 * - "insert": insert the item to array at the specified path, using same semantics as data-action-value. Resolves path in same way as "splice". Inserts before.
 * all using a similar api: a `path` to the item, and an `action` to perform on that item. In some cases, a `val` will be used
 * 
 * The data getter and commit func are used to retrieve the target data, and to save it back (respectively)
 */
export function HANDLER_activate_general_controls<T extends LancerActorSheetData<any> | LancerItemSheetData<any>>(
    html: JQuery, 
    // Retrieves the data that we will operate on
    data_getter: (() => (Promise<T> | T)),
    commit_func: ((data: T) => void | Promise<void>)) {

    html.find(".gen-control").on("click", async (event: any) => { 
     // Get the id/action
      event.stopPropagation();
      const elt = event.currentTarget;
      const path = elt.dataset.path;
      const action = elt.dataset.action;
      const data = await data_getter();
      const raw_val: string = elt.dataset.actionValue ?? "";

      if(!path || !data) {
          console.error("Gen control failed: missing path");
      } else if(!action) {
          console.error("Gen control failed: missing action");
      } else if(!data) {
        console.error("Gen control failed: data could not be retrieved");
      }

      if(action == "delete") {
          // Find and delete the item at that path
          let item = resolve_dotpath(data, path) as RegEntry<any>;
          return item.destroy_entry();
      } else if(action == "splice") {
          // Splice out the value at path dest, then writeback
          array_path_edit(data, path, null, "delete");
      } else if(action == "null") {
          // Null out the target space
          gentle_merge(data, {[path]: null});
      } else if(["set", "append", "insert"].includes(action)) {
          let result = await parse_control_val(raw_val, data.mm);
          let success = result[0];
          let value = result[1];
          if(!success) {
            console.warn(`Bad data-action-value: ${value}`);
            return; // Bad arg - no effect
          }

          // Multiplex with our parsed actions
          switch(action) {
            case "set":
              gentle_merge(data, {[path]: value});
              break;
            case "append":
              array_path_edit(data, path + "[-1]", value, "insert");
              break;
            case "insert":
              array_path_edit(data, path, value, "insert");
              break;
          }
      }

      // Handle writing back our changes
      await commit_func(data);
    });
}

// Used by above to figure out how to handle "set"/"append" args
// Returns [success: boolean, val: any]
async function parse_control_val(raw_val: string, ctx: MMEntityContext<any>): Promise<[boolean, any]> {
  // Declare
  let real_val: string | number | boolean | any;

  // Determine what we're working with
  let match = raw_val.match(/\((.*?)\)(.*)/)
  if(match) {
    let type = match[1];
    let val = match[2];
    switch(type) {
      case "int":
        let parsed_int = parseInt(val);
        if(!Number.isNaN(parsed_int)) {
          return [true, parsed_int];
        } 
        break;
      case "float":
        let parsed_float = parseFloat(val);
        if(!Number.isNaN(parsed_float)) {
          return [true, parsed_float];
        }
        break;
      case "bool":
        if(val == "true") {
          return [true, true];
        } else if(val == "false") {
          return [true, false];
        }
      case "struct":
        return control_structs(val, ctx);
    }
  }

  // No success
  return [false, null];
}

// Used by above to insert/set more advanced items. Expand as needed
// Returns [success: boolean, val: any]
async function control_structs(key: string, ctx: MMEntityContext<any>): Promise<[boolean, any]> {
  // Look for a matching result
  switch(key) {
    case "empty_array":
      return [true, []];
    case "npc_stat_array":
      return [true, [0, 0, 0]];
    case "frame_trait":
      let trait = new FrameTrait(ctx.reg, ctx.ctx, funcs.defaults.FRAME_TRAIT());
      return [true, await trait.ready()];
    case "bonus":
      return [true, new Bonus(funcs.defaults.BONUS())];
    case "mount_type":
      return [true, MountType.Main];
    case "range":
      return [true, new Range({
        type: RangeType.Range,
        val: "5"
      })];
    case "damage":
      return [true, new Damage({
        type: DamageType.Kinetic,
        val: "1d6"
      })];
    case "sys_mount":
      let sys_mount = new SystemMount(ctx.reg, ctx.ctx, {system: null});
      return [true, await sys_mount.ready()];
    case "wep_mount":
      let wep_mount = new WeaponMount(ctx.reg, ctx.ctx, funcs.defaults.WEAPON_MOUNT_DATA()); 
      return [true, await wep_mount.ready()];
    case "weapon_profile": 
      let profile = new MechWeaponProfile(ctx.reg, ctx.ctx, funcs.defaults.WEAPON_PROFILE());
      return [true, await profile.ready()];
  }

  // Didn't find a match
  return [false, null];
}

// Our standardized functions for making simple key-value input pair
// Todo - these could on the whole be a bit fancier, yeah?

/**
 * Our standardized string/number inputs.
 * By default, just invoked with a path expression which is resolved into a value.
 * However, can supply the following
 * - `label`: Prefix the input with a label
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `classes`: Additional classes to put on the input.
 * - `label_classes`: Additional classes to put on the label, if one exists.
 * - `default`: If resolved value is undefined, use this
 */
function std_input(path: string, type: string, options: HelperOptions) {
  // Get other info
  let input_classes: string = options.hash["classes"] || "";
  let label: string = options.hash["label"] || "";
  let label_classes: string = options.hash["label_classes"] || "";
  let default_val: string = "" + (options.hash["default"] ?? ""); // May sometimes get zero. Handle that

  let value: string | undefined = options.hash["value"];
  if(value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path) ?? default_val;
  }

  let input = `<input class="grow ${input_classes}" name="${path}" value="${value}" type="${type.toLowerCase()}" data-dtype="${type}" />`;

  if(label) {
    return `
    <label class="flexrow no-wrap ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span> 
      ${input}
    </label>`;
  } else {
    return input;
  }
}

export function std_string_input(path: string, options: HelperOptions) {
  return std_input(path, "String", options);
}

export function std_num_input(path: string, options: HelperOptions) {
  return std_input(path, "Number", options);
}

// Shows a [X] / Y display, where X is an editable value and Y is some total (e.x. max hp)
export function std_x_of_y(x_path: string, x: number, y: number, add_classes: string = "") {
  return ` <div class="flexrow flex-center no-wrap ${add_classes}">
              <input class="lancer-stat lancer-invisible-input" type="number" name="${x_path}" value="${x}" data-dtype="Number" style="justify-content: left"/>
              <span>/</span>
              <span class="lancer-stat" style="justify-content: left"> ${y}</span>
            </div>`;
}

/**
 * Our standardized checkbox
 * By default, just invoked with a path expression which is resolved into a value, which is used as the initial selection true/false
 * However, can supply the following
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `label`: Label to use, if any
 * - `classes`: Additional classes to put on the checkbox itself.
 * - `label_classes`: Additional classes to put on the label, if it exists
 * - `default`: Change the default value if resolution fails. Otherwise, we just use the first one in the enum.
 */
export function std_checkbox(path: string, options: HelperOptions) {
  // Get hash args
  let input_classes: string = options.hash["classes"] || "";
  let label: string = options.hash["label"] || "";
  let label_classes: string = options.hash["label_classes"] || "";
  let default_val: boolean = !!options.hash["default"]; 

  // Get the value, either by supplied arg, path resolution, or default
  let value: boolean | undefined = options.hash["value"];
  if(value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path) ?? default_val;
  }



  let input = `<input class="${input_classes}" name="${path}" ${inc_if("checked", value)} type="checkbox" />`;
  if(label) {
  return `
    <label class="flexrow flex-center ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span>
      ${input}
    </label>`;
  } else {
    return input; // Nothing else needed
  }
}

/**
 * Our standardized select, which allows picking of a choice from an enum of options
 * By default, just invoked with a path expression which is resolved into a value, which is used as the initial selection
 * However, can supply the following
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `classes`: Additional classes to put on the select.
 * - `default`: Change the default value if resolution fails. Otherwise, we just use the first one in the enum.
 */
export function std_enum_select<T extends string>(path: string, enum_: {[key: string]: T}, options: HelperOptions) {
  // Get the classes to add
  let select_classes: string = options.hash["classes"] || "";

  // Get the default. If undefined, use first found.
  let default_val: T | undefined = options.hash["default"];
  if(default_val == undefined) {
    default_val = Object.values(enum_)[0];
  }

  // Get the value
  let value: T | undefined = options.hash["value"];
  if(value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path, default_val);
  }

  // Restrict value to the enum
  let selected = SerUtil.restrict_enum(enum_, default_val, value!);

  let choices: string[] = [];
  for(let choice of Object.values(enum_)) {
    choices.push(`<option value="${choice}" ${inc_if("selected", choice === selected)}>${choice.toUpperCase()}</option>`);
  }

  let select = `
      <select name="${path}" class="${select_classes}" data-type="String" style="height: 2em; align-self: center;" >
        ${choices.join("")}
      </select>`;
  return select;
}

// A button to open a popout editor targeting the specified path
export function popout_editor_button(path: string) {
  return `<a class="fas fa-edit popout-text-edit-button" data-path="${path}"> </a>`;
}

export function HANDLER_activate_popout_text_editor<T extends LancerActorSheetData<any> | LancerItemSheetData<any>>(
    html: JQuery, 
    // Retrieves the data that we will operate on
    data_getter: (() => (Promise<T> | T)),
    commit_func: ((data: T) => void | Promise<void>)) {

    html.find(".popout-text-edit-button").on("click", async evt => {
      let cd = await data_getter();
      evt.stopPropagation();
      const elt = evt.currentTarget;
      const path = elt.dataset.path;
      if(path) {
        HTMLEditDialog.edit_text(cd, path, commit_func);
      }
    })
}


// A handlebars helper that makes the provided html safe by closing tags and eliminating all on<eventname> attributes
export function safe_html_helper(orig: string) {
  // Do simple html correction
  let doc = document.createElement('div');
  doc.innerHTML = orig;
  orig = doc.innerHTML; // Will have had all tags etc closed

  // then kill all on<event>. Technically this will hit attrs, we don't really care
  let bad = /on[a-zA-Z\-]+=".*?"/g
  orig = orig.replace(bad, "");
  return orig;
}

// These typically are the exact same so we made a helper for 'em
export function large_textbox_card(title: string, text_path: string, helper: HelperOptions) {
  let resolved = resolve_helper_dotpath(helper, text_path, "");
  return `
  <div class="card full clipped">
    <div class="lancer-header">
      <span>${title}</span>
      ${popout_editor_button(text_path)}
    </div>
    <div class="desc-text">
      ${safe_html_helper(resolved.trim() || "// MISSING ENTRY //")}
    </div>
  </div>
  `;
}