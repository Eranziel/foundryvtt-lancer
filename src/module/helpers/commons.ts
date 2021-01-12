import { HelperOptions } from "handlebars";
import {
  EntryType,
  LiveEntryTypes,
  RegEntry,
  RegRef
} from "machine-mind";

// Simple helper to simplify mapping truthy values to "checked"
export function checked(truthytest: any): string {
  return truthytest ? "checked" : "";
}

// Simple helper to simplify mapping truthy values to "selected"
export function selected(truthytest: any): string {
  return truthytest ? "selected" : "";
}

/** Performs a similar behavior to the foundry inplace mergeObject, but is more forgiving for arrays, is universally non-destructive, and doesn't create new fields.
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
      if (curr === undefined) break;
      curr = curr[p];
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

/** Delete an array item specified by a dot pathspec, in place
 * Has no effect if index does not exist, or if target is not an array
*/
export function del_arr_key(dest: any, flat_path: string) {
  // Break it up
  let leading = flat_path.split(".");
  let tail = leading.splice(leading.length - 1)[0];

  // Drill down to reach tail, if we can
  let curr = dest;
  for (let p of leading) {
    curr = curr[p];
    if (curr === undefined) {
      console.error(`Unable to delete array item "${flat_path}": ${p} resulted in undefined`);
      return;
    }
  }

  // Now we just have the tail
  let tail_parsed = Number.parseInt(tail);
  if(Array.isArray(curr) && !Number.isNaN(tail_parsed)) {
    curr.splice(tail_parsed, 1);
  } else {
    console.error(`Unable to delete array item "${flat_path}[${tail}]": not an array (or not a valid index)`);
  }
}

/** Makes an icon */
export function render_icon(icon_name: string): string {
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
  return (v as RegRef<any> | null)?.is_unresolved_mmid !== undefined;
}

// Check that a parsed result is probably an item
// export function is_item(v: any): v is RegRef<any> {
  // let vt = v as LancerItem<LancerItemType> | null; // Better type
  // return vt?._id !== undefined && vt?.type !== undefined && LancerItemTypes
// }

// Helper function to get arbitrarily deep array references
export function resolve_dotpath(object: any, path: string) {
  return path
    .replace(/\[/g, ".")
    .replace(/]/g, "")
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
 * - "set": set as `data-action-value` the item at the specified path. Defaults to string. 
 *    - if prefixed with (int), will parse as int
 *    - if prefixed with (bool), will parse as boolean
 * all using a similar api: a `path` to the item, and an `action` to perform on that item. In some cases, a `val` will be used
 * 
 * The data getter and commit func are used to retrieve the target data, and to save it back (respectively)
 */
export function activate_general_controls<T>(
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

      if(!path || !data) {
          console.error("Gen control failed: missing path");
      } else if(!action) {
          console.error("Gen control failed: missing action");
      } else if(!data) {
        console.error("Gen control failed: data could not be retrieved");
      }

      switch(action) {
        default: 
          return; // No-op
        case "delete":
          // Find and delete the item at that path
          let item = resolve_dotpath(data, path) as RegEntry<any>;
          return item.destroy_entry();

        case "splice":
          // Splice out the value at path dest, then writeback
          del_arr_key(data, path);
          break;
        case "null":
          // Null out the target space
          gentle_merge(data, {[path]: null});
          break;
        case "set":
          // Null out the target space
          let raw_val: string = elt.dataset.actionValue ?? "";
          let real_val: string | number | boolean;
          if(raw_val.slice(0, 5) == "(int)") {
            real_val = Number.parseInt(raw_val.slice(5));
          } else if(raw_val.slice(0, 6) == "(bool)") {
            real_val = (raw_val.slice(6) === "true");
          } else {
            real_val = raw_val;
          }
          gentle_merge(data, {[path]: real_val});
          break;
      }

      // Handle writing back our changes
      await commit_func(data);
    });
}