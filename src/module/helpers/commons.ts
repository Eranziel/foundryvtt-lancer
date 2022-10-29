import type { HelperOptions } from "handlebars";
import { HTMLEditDialog } from "../apps/text-editor";
import type { ContextMenuItem, GenControlContext, LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import * as defaults from "../util/mmigration/defaults";

import tippy from "tippy.js";
import { ActivationType, MountType, WeaponSize, WeaponType } from "../enums";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { SystemTemplates } from "../system-template";

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
      if (!curr) break;
    }

    // If curr still exists and is an array or object, attempt the assignment
    if (curr instanceof Object && curr[tail] !== undefined) {
      // Implicitly hits array as well
      curr[tail] = v;
    } else {
      // console.log(`Gentlemerge skipped key "${k}" while merging `, dest, flat_data);
    }
  }
}

/** Insert an array item specified by a dot pathspec, in place
 * Inserted BEFORE that element. If specified index is beyond the length of the array, will simply be appended.
 * If "delete" specified, deletes (splices) instead. Value is unused
 * Has no effect if target is not an array.
 * @param target The object our path dives into
 * @param flat_path A dotpath to our target property
 * @param value The item we wish to insert into the array, if we are inserting
 * @param mode Whether we are inserting or deleting into the array
 */
export function array_path_edit(target: any, flat_path: string, value: any, mode: "insert" | "delete") {
  // Break it up
  flat_path = format_dotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolve_dotpath(target, lead);
  if (Array.isArray(array) && !Number.isNaN(index)) {
    // Bound our index
    if (index > array.length) {
      index = array.length;
    }
    if (index < 0) {
      // For negative indexes, count back from end, python style.
      // With the caveat that this also shifts behavior to insert AFTER. So, -1 to append to end, -2 to 1 before end, etc.
      index = array.length + index + 1;

      // If still negative, then we've gone backwards past start of list, and so we bound to zero
      if (index < 0) {
        index = 0;
      }
    }

    // Different behavior depending on mode
    if (mode == "delete") {
      array.splice(index, 1);
    } else if (mode == "insert") {
      array.splice(index, 0, value);
    }
  } else {
    console.error(`Unable to insert array item "${lead}[${tail}]": not an array (or not a valid index)`);
  }
}

/**
 * As above, but generates the "after" state of the targeted property.
 * Suitable for use with .updates. Does not actually edit the object.
 * As an example,
 *
 * array_path_edit_result({ foo: [ 1, 2, 3 ]}, "foo.2", 5, "insert")
 * will yield
 * {
 *  path: "foo",
 *  new_val: [1, 2, 5, 3]
 * }
 * @param target The object our path dives into
 * @param flat_path A dotpath to our target property
 * @param value The item we wish to insert into the array, if we are inserting
 * @param mode Whether we are inserting or deleting into the array
 */
export function array_path_edit_changes(
  target: any,
  flat_path: string,
  value: any,
  mode: "insert" | "delete"
): { path: string; new_val: any } {
  // Break it up
  flat_path = format_dotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolve_dotpath(target, lead);
  if (Array.isArray(array) && !Number.isNaN(index)) {
    // Bound our index
    if (index > array.length) {
      index = array.length;
    }
    if (index < 0) {
      // For negative indexes, count back from end, python style.
      // With the caveat that this also shifts behavior to insert AFTER. So, -1 to append to end, -2 to 1 before end, etc.
      index = array.length + index + 1;

      // If still negative, then we've gone backwards past start of list, and so we bound to zero
      if (index < 0) {
        index = 0;
      }
    }

    // Different behavior depending on mode
    if (mode == "delete") {
      return {
        path: lead,
        new_val: [...array.slice(0, index), ...array.slice(index + 1)], // Drop element at index
      };
    } else if (mode == "insert") {
      return {
        path: lead,
        new_val: [...array.slice(0, index), value, ...array.slice(index)], // Insert element at index
      };
    } else {
      throw new Error("Invalid path edit mode " + mode);
    }
  } else {
    throw new Error(`Unable to insert array item "${lead}[${tail}]": not an array (or not a valid index)`);
  }
}

export function arrayify_object(in_obj: any) {
  const out_arr = [];
  for (const [key, value] of Object.entries(in_obj)) {
    if (!isNaN(parseInt(key))) {
      out_arr.push(value);
    }
  }
  return out_arr;
}

/** Makes many icons in the same format with ease an icon */
export class IconFactory {
  // Applied to each icon
  private classes: string[] = [];
  private icon_prefix: string = "";

  constructor(args: {
    light?: boolean; // Force icon white
    dark?: boolean; // Force icon black
    size?: "xs" | "s" | "sm" | "m" | "l" | "xl";
    /*
    This arg a bit fancy. 
    - Can be left unset, in which case you'll invoke r with a fairly conventional r("cci cci-heat"), for example.
    - Can be set with the icon grouping, e.x. "cci", in which case one would only have to supply r("cci-heat")
    - Can be set with icon grouping and glyph prefix, e.x. "cci,cci" in which case it will automatically prefix any params to arg with the prefix. So, can do r("heat")
    */
    icon_set?: string;
  }) {
    // Turn options into classes
    if (args.light) {
      this.classes.push("i--light");
    }
    if (args.dark) {
      this.classes.push("i--dark");
    }

    this.classes.push(`i--${args.size ?? "m"}`); // Default medium

    if (args.icon_set) {
      let split = args.icon_set.split(",");
      if (split.length > 1) {
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
export function effect_box(title: string, text: string, add_classes: string = ""): string {
  if (text) {
    return `
      <div class="effect-box ${add_classes}">
        <span class="effect-title clipped-bot">${title}</span>
        <span class="effect-text" style="padding: 0 0.5em 0.5em 0.5em;">${text}</span>
      </div>
      `;
  } else {
    return "";
  }
}

export function sp_display(sp: number | string) {
  let icons = "";
  for (let i = 0; i < sp; i++) icons += `<i class="cci cci-system-point i--m i--dark"> </i>`;
  return `<div style="float: left; align-items: center; display: inherit;">
            ${icons}
            <span class="medium" style="padding: 5px;">${sp} SYSTEM POINTS</span>
          </div>`;
}

export function charged_box(charged: boolean, path: string) {
  return `<div class="clipped card charged-box ${
    charged ? "charged" : ""
  }"><span style="margin:4px;">Charged:</span><a style="margin-top:2px;" class="gen-control" data-action="set" data-action-value="(bool)${!charged}" data-path="${path}.Charged" data-commit-item="${path}"><i class="hex hex-white mdi ${
    charged ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
  }"></i></a></div>`;
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

// Helper function to format a dotpath to not have any square brackets, instead using pure dot notation
export function format_dotpath(path: string): string {
  return path.replace(/\[/g, ".").replace(/]/g, "");
}

// Helper function to get arbitrarily deep array references
// Returns every item along the path, starting with the object itself
// Any failed resolutions will still be emitted, but as an undefined
export function stepwise_resolve_dotpath(
  obj: any,
  dotpath: string
): Array<{
  pathlet: string | null;
  val: unknown;
}> {
  let pathlets = format_dotpath(dotpath).split(".");

  // Resolve each key
  let result = [
    {
      pathlet: null as string | null,
      val: obj,
    },
  ];
  for (let pathlet of pathlets) {
    obj = obj?.[pathlet];
    result.push({
      pathlet,
      val: obj,
    });
  }
  return result;
}

export function drilldown_document(
  root_doc: LancerActor | LancerItem,
  path: string
): {
  sub_doc: LancerActor | LancerItem;
  sub_path: string;
} {
  let steps = stepwise_resolve_dotpath(root_doc, path);
  for (let i = steps.length - 1; i >= 0; i--) {
    // Walk it back till first document
    let step = steps[i];
    if (step.val instanceof foundry.abstract.Document) {
      // Recombine rest of path
      let sub_path = steps
        .slice(i + 1)
        .map(v => v.pathlet)
        .join(".");
      let sub_doc = step.val as LancerActor | LancerItem;
      return { sub_doc, sub_path };
    }
  }
  throw new Error("Drilldown document must have at least one document in its path");
}

// Helper function to get arbitrarily deep array references
// Returns every item along the path, starting with the object itself
// Any failed resolutions will still be emitted, but as a dedicated symbol
const RESOLVE_FAIL = Symbol("Fail");
export function resolve_dotpath(
  obj: any,
  dotpath: string,
  default_: any = RESOLVE_FAIL,
  opts?: {
    shorten_by?: number; // If provided, skip the last N path items
  }
): unknown {
  let path = stepwise_resolve_dotpath(obj, dotpath);
  let item;

  // Get the last item, or one even further back if shorten-by provided
  if (opts?.shorten_by) {
    item = path[path.length - 1 - opts.shorten_by];
  } else {
    item = path[path.length - 1];
  }
  return item.val === undefined ? default_ : item.val;
}

// Helper function to get arbitrarily deep array references, specifically in a helperoptions, and with better types for that matter
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string): T;
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string, default_: T): T;
export function resolve_helper_dotpath<T>(helper: HelperOptions, path: string, default_: T, try_parent: boolean): T;
export function resolve_helper_dotpath(
  helper: HelperOptions,
  path: string,
  default_: any = null,
  try_parent: boolean = false
): any {
  if (try_parent) {
    let data = helper.data;

    // Loop until no _parent
    while (data) {
      let resolved = resolve_dotpath(data?.root, path);
      if (resolved != RESOLVE_FAIL) {
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
export function ext_helper_hash(
  orig_helper: HelperOptions,
  overrides: HelperOptions["hash"],
  defaults: HelperOptions["hash"] = {}
): HelperOptions {
  return {
    fn: orig_helper.fn,
    inverse: orig_helper.inverse,
    hash: {
      ...defaults,
      ...orig_helper.hash,
      ...overrides,
    },
    data: orig_helper.data,
  };
}

/** Enables controls that can (as specified by action):
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
 * If data-click is provided, it will be interpreted as follows
 * - "left" default behavior, normal left click
 *
 *
 * The data getter and commit func are used to retrieve the target data, and to save it back (respectively)
 *
 * The post_hook function is just run after all logic has been finished. It is provided the context object.
 * It has no influence on the behavior of the operation, but can nonetheless be useful for augmenting other behaviors.
 * (e.x. to delete associated entities when remove buttons cleared)
 */
export function HANDLER_activate_general_controls(
  html: JQuery,
  // Retrieves the data that we will operate on
  document: LancerActor | LancerItem,
  post_hook?: (ctrl_info: GenControlContext) => any
) {
  html
    .find(".gen-control")
    .off("click")
    .on("click", async event => {
      event.stopPropagation();

      // Collect the raw information / perform initial conversions
      let elt = event.currentTarget;
      let raw_val = elt.dataset.actionValue;

      let val: any = undefined;
      if (raw_val) {
        let result = await parse_control_val(raw_val);
        let { success, val } = result;
        if (!success) {
          console.error(`Gen control failed: Bad data-action-value: ${raw_val}`);
          return; // Bad arg - no effect
        }
      }

      // Construct our ctx
      let path = elt.dataset.path!;
      let path_items = stepwise_resolve_dotpath(document, path);
      let target_document = document;
      let relative_path = path;
      for (let i = 0; i < path_items.length; i++) {
        let pi = path_items[i];
        if (pi instanceof LancerActor || pi instanceof LancerItem) {
          target_document = pi; // Want it to be last along the list
          relative_path = format_dotpath(path)
            .split(".")
            .slice(i + 1)
            .join("."); // ANd make our relative path to it
          console.log(`Sliced path "${path}" at index ${i} to produce subpath ${relative_path}`);
        }
      }
      let ctx: GenControlContext = {
        // Base
        elt,
        path,
        action: <any>elt.dataset.action,
        raw_val: elt.dataset.actionValue,
        base_document: document,

        // Derived
        path_target: resolve_dotpath(document, elt.dataset.path!),
        parsed_val: val,
        target_document,
        relative_path,
      };

      // Check our less reliably fetchable data
      if (!ctx.path) {
        console.error("Gen control failed: missing path");
      } else if (!ctx.action) {
        console.error("Gen control failed: missing action");
      } else if (!target_document) {
        console.error("Gen control failed: target document does not exist");
      }

      // Perform action
      if (ctx.action == "delete") {
        // Find and delete the item at that path
        ctx.path_target?.delete();
      } else if (ctx.action == "splice") {
        // Splice out the value at path dest, then writeback
        let changes = array_path_edit_changes(ctx.target_document, ctx.relative_path, null, "delete");
        await ctx.target_document.update({ [changes.path]: changes.new_val });
      } else if (ctx.action == "null") {
        // Null out the target space
        await ctx.target_document.update({ [ctx.relative_path]: null });
      } else if (ctx.action == "set" && ctx.parsed_val !== undefined) {
        // Set the target space
        await ctx.target_document.update({ [ctx.relative_path]: ctx.parsed_val });
      } else if (ctx.action == "append") {
        // Append to target array
        let changes = array_path_edit_changes(ctx.target_document, ctx.relative_path + "[-1]", val, "insert");
        await ctx.target_document.update({ [changes.path]: changes.new_val });
      } else if (ctx.action == "insert") {
        // insert into target array at the specified location
        let changes = array_path_edit_changes(ctx.target_document, ctx.relative_path, val, "insert");
        await ctx.target_document.update({ [changes.path]: changes.new_val });
      } else {
        console.error("Unknown gen control action: " + ctx.action);
      }

      // Post hook if necessary
      if (post_hook) {
        post_hook(ctx);
      }
    });
}

// Used by above to figure out how to handle "set"/"append" args
// Returns [success: boolean, val: any]
async function parse_control_val(raw_val: string): Promise<{ success: boolean; val: any }> {
  // Determine what we're working with
  let match = raw_val.match(/\((.*?)\)(.*)/);
  if (match) {
    let type = match[1];
    let val = match[2];
    switch (type) {
      case "int":
        let parsed_int = parseInt(val);
        if (!Number.isNaN(parsed_int)) {
          return { success: true, val: parsed_int };
        }
        break;
      case "float":
        let parsed_float = parseFloat(val);
        if (!Number.isNaN(parsed_float)) {
          return { success: true, val: parsed_float };
        }
        break;
      case "bool":
        if (val == "true") {
          return { success: true, val: true };
        } else if (val == "false") {
          return { success: true, val: false };
        }
      case "struct":
        return control_structs(val);
    }
  }

  // No success
  return { success: false, val: null };
}

// Used by above to insert/set more advanced items. Expand as needed
// Returns [success: boolean, val: any]
async function control_structs(key: string): Promise<{ success: boolean; val: any }> {
  // Look for a matching result
  switch (key) {
    case "empty_array":
      return { success: true, val: [] };
    case "string":
      return { success: true, val: "" };
    case "npc_stat_array":
      return { success: true, val: [0, 0, 0] };
    case "frame_trait":
      let trait = defaults.FRAME_TRAIT();
      return { success: true, val: trait };
    case "bonus":
      return { success: true, val: defaults.BONUS() };
    case "action":
      return { success: true, val: defaults.ACTION() };
    case "counter":
      return { success: true, val: defaults.COUNTER() };
    case "mount_type":
      return { success: true, val: MountType.Main };
    case "range":
      return { success: true, val: defaults.RANGE() };
    case "damage":
      return { success: true, val: defaults.DAMAGE() };
    case "wep_mount":
      return { success: true, val: defaults.WEAPON_MOUNT() };
    case "weapon_profile":
      return { success: true, val: defaults.WEAPON_PROFILE() };
    case "talent_rank":
      return { success: true, val: defaults.TALENT_RANK() };
    case "WeaponSize":
      return { success: true, val: WeaponSize.Main };
    case "WeaponType":
      return { success: true, val: WeaponType.Rifle };
    case "ActivationType":
      return { success: true, val: ActivationType.Quick };
  }

  // Didn't find a match
  return { success: false, val: null };
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
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path) ?? default_val;
  }

  let html_type = type.toLowerCase();
  let data_type = type == "Password" || type == "Text" ? "String" : type;

  let input = `<input class="grow ${input_classes}" name="${path}" value="${value}" type="${html_type}" data-dtype="${data_type}" />`;

  if (label) {
    return `
    <label class="flexrow no-wrap ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span> 
      ${input}
    </label>`;
  } else {
    return input;
  }
}

// input type="string" isn't styled by foundry, but input type="text" is
// that's not a great reason to keep both of them, but it is the reason we have
export function std_string_input(path: string, options: HelperOptions) {
  return std_input(path, "String", options);
}

export function std_text_input(path: string, options: HelperOptions) {
  return std_input(path, "Text", options);
}

export function std_password_input(path: string, options: HelperOptions) {
  return std_input(path, "Password", options);
}

export function std_num_input(path: string, options: HelperOptions) {
  return std_input(path, "Number", options);
}

// Shows a [X] / Y display, where X is an editable value and Y is some total (e.x. max hp)
export function std_x_of_y(x_path: string, x: number, y: number, add_classes: string = "") {
  return ` <div class="flexrow flex-center no-wrap ${add_classes}">
              <input class="lancer-stat lancer-stat" type="number" name="${x_path}" value="${x}" data-dtype="Number" style="justify-content: left"/>
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
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path) ?? default_val;
  }

  let input = `<input class="${input_classes}" name="${path}" ${inc_if("checked", value)} type="checkbox" />`;
  if (label) {
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
export function std_enum_select<T extends string>(path: string, enum_: { [key: string]: T }, options: HelperOptions) {
  // Get the classes to add
  let select_classes: string = options.hash["classes"] || "";

  // Get the default. If undefined, use first found.
  let default_val: T | undefined = options.hash["default"];
  if (default_val == undefined) {
    default_val = Object.values(enum_)[0];
  }

  // Get the value
  let value: T | undefined = options.hash["value"];
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(options, path, default_val);
  }

  // Restrict value to the enum
  let selected = restrict_enum(enum_, default_val, value!);

  let choices: string[] = [];
  for (let choice of Object.values(enum_)) {
    choices.push(
      `<option value="${choice}" ${inc_if("selected", choice === selected)}>${choice.toUpperCase()}</option>`
    );
  }

  let select = `
      <select name="${path}" class="${select_classes}" data-type="String" style="height: 2em; align-self: center; margin: 4px;" >
        ${choices.join("")}
      </select>`;
  return select;
}

// A button to open a popout editor targeting the specified path
export function popout_editor_button(path: string) {
  return `<a class="fas fa-edit popout-text-edit-button" data-path="${path}"> </a>`;
}

export function HANDLER_activate_popout_text_editor(
  html: JQuery,
  // Retrieves the data that we will operate on
  root_doc: LancerActor | LancerItem
) {
  html.find(".popout-text-edit-button").on("click", async evt => {
    evt.stopPropagation();
    const elt = evt.currentTarget;
    const path = elt.dataset.path;
    if (path) {
      let dd = drilldown_document(root_doc, path);
      await HTMLEditDialog.edit_text(dd.sub_doc, dd.sub_path);
    }
  });
}

// A handlebars helper that makes the provided html safe by closing tags and eliminating all on<eventname> attributes
export function safe_html_helper(orig: string) {
  // Do simple html correction
  let doc = document.createElement("div");
  doc.innerHTML = orig;
  orig = doc.innerHTML; // Will have had all tags etc closed

  // then kill all on<event>. Technically this will hit attrs, we don't really care
  let bad = /on[a-zA-Z\-]+=".*?"/g;
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

// Reads the specified form to a JSON object, including unchecked inputs
// Wraps the build in foundry method
export function read_form(form_element: HTMLFormElement): Record<string, string | number | boolean> {
  // @ts-ignore The typings don't yet include this utility class
  let form_data = new FormDataExtended(form_element);
  // @ts-ignore We may want to double check this, but it's probably fine
  return form_data.toObject();
}

/** Clip paths kill native foundry context menus. Mix our own!
 * This just generates the hooked context menu html, with click listeners. Up to you to put it wherever you want
 * @argument parent: The element to which this menu will be attached. Identical to foundry behavior
 * @argument options: The options to show
 * @argument on_select_any: Called when any options is selected, after calling callback. Useful for closing menus etc
 */
export function create_context_menu(
  parent: JQuery<HTMLElement>,
  options: ContextMenuItem[],
  on_select_any?: () => void
): Element {
  let menu = $(`<div class="lancer-context-menu flexcol" />`);
  for (let o of options) {
    let ro = $(`<div class="lancer-context-item">${o.icon ?? ""}${o.name}</div>`);
    ro.on("click", () => {
      o.callback(parent);
      if (on_select_any) on_select_any();
    });
    menu.append(ro);
  }
  return menu[0];
}

/** Attach a tippy context menu to the given target(s)
 *  Options can be fixed or can be generated based on the specific target to which the context menu is being
 *  @param targets JQuery elements to attach the context menu to.
 * @param event_types JQuery event types to trigger showing the context menu.
 * @param options Array of context menu items.
 */
export function tippy_context_menu(
  targets: JQuery<HTMLElement>,
  event_types: string,
  options: ContextMenuItem[] | ((specific_target: JQuery<HTMLElement>) => ContextMenuItem[])
): void {
  targets.each((_, _target) => {
    let target = $(_target);

    // Make the options
    let curr_options = options;
    if (!Array.isArray(curr_options)) {
      curr_options = curr_options(target);
    }

    // Make the instance
    const instance = tippy(_target, {
      appendTo: () => document.body, // "parent",
      placement: "bottom",
      trigger: "manual",
      interactive: true,
      allowHTML: true,
      theme: "lancer-large",
    });

    // Generate the content
    let content = create_context_menu(target, curr_options, () => instance.hide());
    instance.setContent(content);

    // Bind it to right click
    target.on(event_types, async event => {
      event.stopPropagation();
      event.preventDefault();
      /*
        instance.setProps({
          getReferenceClientRect: () => ({
          width: 0,
          height: 0,
          top: event.clientY,
          bottom: event.clientY,
          left: event.clientX,
          right: event.clientX,
        }),
      */
      instance.show();
    });
  });
}

// Isolates a value to ensure it is compliant with a list of values
export function restrict_choices<T extends string>(choices: T[], default_choice: T, provided?: string): T {
  return choices.includes(provided as T) ? (provided as T) : default_choice;
}

// List possible values of an enum
export function list_enum<T extends string>(enum_: { [key: string]: T }): T[] {
  return Object.keys(enum_).map(k => enum_[k]);
}

// Isolates a value to ensure it is enum compliant
export function restrict_enum<T extends string>(enum_: { [key: string]: T }, default_choice: T, provided?: string): T {
  let choices = list_enum(enum_);
  return restrict_choices(choices, default_choice, provided);
}

export function filter_resolved_sync<T>(refs: SystemTemplates.ResolvedUuidRef<T>[]): T[] {
  let result: T[] = [];
  for (let ref of refs) {
    if (ref.status == "resolved") {
      result.push(ref.value);
    }
  }
  return result;
}
