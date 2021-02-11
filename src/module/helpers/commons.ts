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
  Bonus
} from "machine-mind";
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
    } else {
      console.log(`Gentlemerge skipped key "${k}" while merging `, dest, flat_data);
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

/** Makes an icon */
export function render_light_icon(icon_name: string): string {
  return `<i class="cci ${icon_name} i--m i--light"> </i>`;
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
export function resolve_dotpath(object: any, path: string) {
  return format_dotpath(path)
    .split(".")
    .reduce((o, k) => o?.[k], object) ?? null;
}

// Helper function to get arbitrarily deep array references, specifically in a helperoptions, and with better types for that matter
export function resolve_helper_dotpath(helper: HelperOptions, path: string): any {
  let resolved = resolve_dotpath(helper.data?.root, path);
  return resolved;
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

    html.on("click", async (event: any) => { 
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
