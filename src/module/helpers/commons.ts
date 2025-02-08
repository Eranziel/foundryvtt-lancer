import type { HelperOptions } from "handlebars";
import { HTMLEditDialog } from "../apps/text-editor";
import type { GenControlContext } from "../interfaces";
import * as defaults from "../util/unpacking/defaults";

import tippy from "tippy.js";
import { ActivationType, MountType, WeaponSize, WeaponType } from "../enums";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { slugify } from "../util/lid";

export const defaultPlaceholder = "// MISSING ENTRY //";

// A shorthand for only including the first string if the second value is truthy
export function inc_if(val: string, test: any) {
  return test ? val : "";
}

// Generic template for dice roll results in chat
export function lancerDiceRoll(roll: Roll, tooltip?: string, icon?: string): string {
  const iconHTML = icon ? `<i class="${icon}"></i>` : "";
  const tooltipHTML = tooltip ? `<div style="text-align: left;">${tooltip}</div>` : "";
  return `
<div class="dice-roll lancer-dice-roll collapse">
  <div class="dice-result">
    <div class="dice-formula lancer-dice-formula flexrow">
      <span style="text-align: left; margin-left: 5px;">${roll.formula}</span>
      <span class="dice-total lancer-dice-total major">${roll.total}</span>${iconHTML}
    </div>
    ${tooltipHTML}
  </div>
</div>
  `;
}

// Simple helper to simplify mapping truthy values to "checked"
export function checked(truthytest: any): string {
  return truthytest ? "checked" : "";
}

// Simple helper to simplify mapping truthy values to "selected"
export function selected(truthytest: any): string {
  return truthytest ? "selected" : "";
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
  flat_path = formatDotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolveDotpath(target, lead);
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
  flat_path = formatDotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolveDotpath(target, lead);
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
export function effectBox(title: string, text: string, options?: { add_classes?: string; flow?: boolean }): string {
  if (text) {
    const flowButton = options?.flow
      ? `<div class="action-flow-container flexrow">
        <a class="effect-flow lancer-button"><i class="cci cci-free-action i--sm"></i><span>USE</span></a>
        <hr class="vsep">
      </div>`
      : "";
    return `
      <div class="effect-box ${options?.add_classes || ""}">
        <span class="effect-title clipped-bot">${title}</span>
        <span class="effect-text" style="padding: 0 0.5em 0.5em 0.5em;">
          ${flowButton}
          ${text}
        </span>
      </div>
      `;
  } else {
    return "";
  }
}

export function spDisplay(sp: number | string) {
  const sp_num = parseInt(sp.toString());
  if (isNaN(sp_num)) return "";
  let icons = "";
  for (let i = 0; i < sp_num; i++) icons += `<i class="cci cci-system-point i--s"> </i>`;
  return `<div class="sp-wrapper">
            ${icons}
            <span class="medium" style="padding: 5px;">${sp} SYSTEM POINTS</span>
          </div>`;
}

export function activationIcon(activation: ActivationType): string {
  switch (activation) {
    case ActivationType.Quick:
      return "cci cci-activation-quick";
    case ActivationType.Full:
      return "cci cci-activation-full";
    case ActivationType.Invade:
    case ActivationType.QuickTech:
      return "cci cci-tech-quick";
    case ActivationType.FullTech:
      return "cci cci-tech-full";
    case ActivationType.Reaction:
      return "cci cci-reaction";
    case ActivationType.Protocol:
      return "cci cci-protocol";
    case ActivationType.Free:
    case ActivationType.Passive:
    default:
      return "cci cci-free-action";
  }
}

export function activationStyle(activation: ActivationType): string {
  switch (activation) {
    case ActivationType.Quick:
      return "lancer-quick";
    case ActivationType.Full:
      return "lancer-full";
    case ActivationType.Invade:
    case ActivationType.QuickTech:
    case ActivationType.FullTech:
      return "lancer-tech";
    case ActivationType.Reaction:
      return "lancer-reaction";
    case ActivationType.Protocol:
      return "lancer-protocol";
    case ActivationType.Free:
      return "lancer-free";
    case ActivationType.Passive:
    default:
      return "lancer-secondary";
  }
}

export function manufacturerStyle(mfr: string, border?: boolean): string {
  let manufacturer = slugify(mfr, "-");
  if (!["gms", "ips-n", "ssc", "horus", "ha"].includes(manufacturer)) {
    manufacturer = "primary";
  }
  return `lancer${border ? "-border" : ""}-${manufacturer}`;
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
export function formatDotpath(path: string): string {
  return path.replace(/\[/g, ".").replace(/]/g, "");
}

// Helper function to get arbitrarily deep array references
// Returns every item along the path, starting with the object itself
// Any failed resolutions will still be emitted, but as an undefined
// An empty string resolved in this way will simply return root.
export function stepwiseResolveDotpath(
  obj: any,
  dotpath: string
): Array<{
  pathlet: string | null;
  val: unknown;
}> {
  let pathlets = formatDotpath(dotpath).split(".");

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

/**
 * A variant of resolveDotpath that provides more context about documents we encounter along the way.
 *
 * @param rootDoc The document we are starting at
 * @param path The path to resolve
 * @returns An object providing context on the path and result relative to the most deploy nested document we encounter
 */
export function drilldownDocument(
  rootDoc: LancerActor | LancerItem,
  path: string
): {
  sub_doc: LancerActor | LancerItem; // The last document traversed while following path from root_doc. Usually just root_doc
  sub_path: string; // Path to terminus, continuing from sub_doc
  terminus: any; // What was found at the end of the path
} {
  let steps = stepwiseResolveDotpath(rootDoc, path);
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
      return { sub_doc, sub_path, terminus: steps[steps.length - 1].val };
    }
  }
  throw new Error("Drilldown document must have at least one document in its path");
}

// Helper function to get arbitrarily deep array references
// Returns every item along the path, starting with the object itself
// Any failed resolutions will still be emitted, but as a dedicated symbol
export function resolveDotpath<T>(ob: any, path: string): T | null;
export function resolveDotpath<T>(ob: any, path: string, default_: T): T;
export function resolveDotpath(
  obj: any,
  dotpath: string,
  default_: any = null,
  opts?: {
    shorten_by?: number; // If provided, skip the last N path items
  }
): unknown {
  let path = stepwiseResolveDotpath(obj, dotpath);
  let item;

  // Get the last item, or one even further back if shorten-by provided
  if (opts?.shorten_by) {
    item = path[path.length - 1 - opts.shorten_by];
  } else {
    item = path[path.length - 1];
  }
  return item.val === undefined ? default_ : item.val;
}

// Get the root item from the helper
export function helper_root_doc(options: HelperOptions): LancerActor | LancerItem {
  let root = options.data?.root;
  return root.item ?? root.actor;
}

const RESOLVE_FAIL = Symbol("Fail");
// Helper function to get arbitrarily deep array references, specifically in a helperoptions, and with better types for that matter
export function resolveHelperDotpath<T>(options: HelperOptions, path: string): T | null;
export function resolveHelperDotpath<T>(options: HelperOptions, path: string, default_: T): T;
export function resolveHelperDotpath<T>(options: HelperOptions, path: string, default_: T, try_parent: boolean): T;
export function resolveHelperDotpath(
  options: HelperOptions,
  path: string,
  default_: any = null,
  try_parent: boolean = false
): any {
  if (try_parent) {
    let data = options.data;

    // Loop until no _parent
    while (data) {
      let resolved = resolveDotpath(data?.root, path, RESOLVE_FAIL);
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
    return resolveDotpath(options.data?.root, path, default_);
  }
}

/**
 * Use this when invoking a helper from another helper, and you want to augment the hash args in some way
 * @argument defaults These properties will be inserted iff the hash doesn't already have that value.
 * @argument overrides These properties will be inserted regardless of pre-existing value
 */
export function extendHelper(
  orig_options: HelperOptions,
  overrides: Record<string, any>,
  defaults: Record<string, any> = {}
): HelperOptions {
  return {
    fn: orig_options.fn,
    inverse: orig_options.inverse,
    hash: {
      ...defaults,
      ...orig_options.hash,
      ...overrides,
    },
    data: orig_options.data,
  };
}

/**
 * Use this when invoking a helper from outside a helper.
 * A shitty hack that will break if handlebars partials are invoked
 * @argument fake_data Will be used as the "data" for the hash
 */
export function spoofHelper(fake_data: any): HelperOptions {
  let fail_callback = () => {
    throw new Error("spoofHelper is not sufficient here.");
  };
  return {
    fn: fail_callback,
    inverse: fail_callback,
    hash: {},
    data: fake_data,
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
export function handleGenControls(
  html: JQuery,
  // Retrieves the data that we will operate on
  doc: LancerActor | LancerItem,
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
        if (!result.success) {
          console.error(`Gen control failed: Bad data-action-value: ${raw_val}`);
          return; // Bad arg - no effect
        } else {
          val = result.val;
        }
      }

      // Construct our ctx
      let path = elt.dataset.path!;
      let docOverride: LancerActor | LancerItem | null = null;
      let dd: ReturnType<typeof drilldownDocument>;
      if (elt.dataset.uuid) {
        docOverride = (await fromUuid(elt.dataset.uuid)) as any;
        if (!docOverride) {
          return ui.notifications?.error("Bad uuid: " + elt.dataset.uuid);
        }
        dd = drilldownDocument(docOverride, path);
      } else {
        dd = drilldownDocument(doc, path);
      }
      let ctx: GenControlContext = {
        // Base
        elt,
        path,
        action: <any>elt.dataset.action,
        raw_val: elt.dataset.actionValue,
        base_document: doc,

        // Derived
        path_target: dd.terminus,
        parsed_val: val,
        target_document: dd.sub_doc,
        relative_path: dd.sub_path,
      };

      // Check our less reliably fetchable data
      if (!ctx.path) {
        console.error("Gen control failed: missing path");
      } else if (!ctx.action) {
        console.error("Gen control failed: missing action");
      } else if (!dd.sub_doc) {
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
      case "string":
        // Just pass val as-is
        return { success: true, val };
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
    case "tag":
      return { success: true, val: defaults.TAG() };
    case "bond_question":
      return { success: true, val: defaults.BOND_QUESTION() };
    case "power":
      return { success: true, val: defaults.POWER() };
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
    value = resolveHelperDotpath(options, path) ?? default_val;
  }

  let html_type = type.toLowerCase();
  let data_type = type == "Password" || type == "Text" ? "String" : type;
  let placeholder = type == "Text" || type == "String" ? `placeholder="${defaultPlaceholder}"` : "";

  let input = `<input class="grow ${input_classes}" name="${path}" value="${value}" type="${html_type}" data-dtype="${data_type}" ${placeholder}/>`;

  if (label) {
    return `
    <label class="flexrow no-wrap flex-center ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span> 
      ${input}
    </label>`;
  } else {
    return input;
  }
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
              <input class="lancer-stat" type="number" name="${x_path}" value="${x}" data-dtype="Number" style="justify-content: left"/>
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
    value = resolveHelperDotpath(options, path) ?? default_val;
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
 * - `select_classes`: Additional classes to put on the select.
 * - `label_classes`: Additional classes to put on the select.
 * - `default`: Change the default value if resolution fails. Otherwise, we just use the first one in the enum.
 */
export function std_enum_select<T extends string>(path: string, enum_: { [key: string]: T }, options: HelperOptions) {
  let entries = Object.entries(enum_);
  // Sort the entries
  if (!options.hash["presorted"]) {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }
  // Get the classes to add
  let select_classes: string = options.hash["select_classes"] || "";
  let label_classes: string = options.hash["label_classes"] || "";

  // Get the default. If undefined, use first found.
  let default_val: T | undefined = options.hash["default"];
  if (default_val == undefined) {
    default_val = entries[0][1];
  }

  // Get the value
  let value: T | undefined = options.hash["value"];
  if (value == undefined) {
    // Resolve
    value = resolveHelperDotpath(options, path, default_val);
  }

  // Restrict value to the enum
  let currentVal = restrict_enum(enum_, default_val, value!);

  let choices: string[] = [];
  for (let choice of entries) {
    choices.push(
      `<option value="${choice[1]}" ${selected(choice[1] === currentVal)}>${choice[0].toUpperCase()}</option>`
    );
  }

  let select = `
      <select name="${path}" class="${select_classes}" data-type="String" style="height: 2em; align-self: center; margin: 4px;" >
        ${choices.join("")}
      </select>`;
  if (options.hash["label"]) {
    return `<label class="flexrow flex-center no-wrap ${label_classes}">
      ${options.hash["label"]}
      ${select}
    </label>`;
  } else {
    return select;
  }
}

// A button to open a popout editor targeting the specified path
export function popout_editor_button(path: string) {
  return `<a class="fas fa-edit popout-text-edit-button" data-path="${path}"> </a>`;
}

export function handlePopoutTextEditor(html: JQuery, root_doc: LancerActor | LancerItem) {
  html.find(".popout-text-edit-button").on("click", async evt => {
    evt.stopPropagation();
    const elt = evt.currentTarget;
    const path = elt.dataset.path;
    if (path) {
      let dd = drilldownDocument(root_doc, path);
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
  return orig || defaultPlaceholder;
}

// These typically are the exact same so we made a helper for 'em
export function large_textbox_card(title: string, text_path: string, options: HelperOptions) {
  let resolved = resolveHelperDotpath(options, text_path, "");
  return `
  <div class="card full clipped">
    <div class="lancer-header lancer-primary">
      <span>${title}</span>
      ${popout_editor_button(text_path)}
    </div>
    <div class="desc-text">
      ${safe_html_helper(resolved?.trim() || defaultPlaceholder)}
    </div>
  </div>
  `;
}

// Our standard save/cancel buttons for most of our smaller edit forms
export function saveCancelButtons() {
  return `<div class="dialog-buttons">
        <button data-button="confirm">
            <i class="fas fa-save"></i>
            Save
        </button>
        <button data-button="cancel">
            <i class="fas fa-times"></i>
            Cancel
        </button>
    </div>`;
}

// Reads the specified form to a JSON object, including unchecked inputs
// Wraps the build in foundry method
export function read_form(form_element: HTMLFormElement): Record<string, string | number | boolean> {
  let form_data = new FormDataExtended(form_element);
  return form_data.object;
}

/** Clip paths kill native foundry context menus. Mix our own!
 * This just generates the hooked context menu html, with click listeners. Up to you to put it wherever you want
 * @argument parent: The element to which this menu will be attached. Identical to foundry behavior
 * @argument options: The options to show
 * @argument onSelectAny: Called when any options is selected, after calling callback. Useful for closing menus etc
 */
export function createContextMenu(
  parent: JQuery<HTMLElement>,
  options: ContextMenuEntry[],
  onSelectAny?: () => void
): Element {
  let menu = $(`<div class="lancer-context-menu flexcol" />`);
  for (let o of options) {
    let ro = $(`<div class="lancer-context-item">${o.icon ?? ""}${o.name}</div>`);
    ro.on("click", () => {
      o.callback(parent);
      if (onSelectAny) onSelectAny();
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
export function tippyContextMenu(targets: JQuery<HTMLElement>, event_types: string, options: ContextMenuEntry[]): void {
  targets.each((_, _target) => {
    let target = $(_target);

    // Filter the options
    let curr_options = options.filter(o => (o.condition ? o.condition === true || o.condition(target) : true));
    if (!curr_options.length) return; // No options, no menu

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
    let content = createContextMenu(target, curr_options, () => instance.hide());
    instance.setContent(content);

    // Bind it to whatever event is provided. Sometimes we want left clicks, other times right
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
  if (!provided) return default_choice;
  let lcp = provided.toLowerCase();
  // Try matching on lower case
  for (let caseFix of choices) {
    if (caseFix.toLowerCase() == lcp) {
      return caseFix;
    }
  }

  return default_choice;
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

export function hex_array(curr: number, max: number, path: string, classes?: string) {
  return [...Array(max)].map((_ele, index) => {
    const available = index + 1 <= curr;
    return `<a><i class="${classes ?? ""} mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}"></i></a>`;
  });
}
