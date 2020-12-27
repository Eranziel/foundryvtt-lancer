import { HelperOptions } from "handlebars";
import { Bonus, Damage, Range, DamageType, RangeType, WeaponType, WeaponSize, EntryType, OpCtx, RegEntry, RegRef, Manufacturer, LiveEntryTypes } from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";

// Simple helper to simplify mapping truthy values to "checked"
export function checked(truthytest: any): string{
  return truthytest ? "checked" : "";
}

// Simple helper to simplify mapping truthy values to "selected"
export function selected(truthytest: any): string{
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
  for(let [k, v] of Object.entries(flat_data)) {
    let curr = dest;
    let leading = k.split(".");
    let tail = leading.splice(leading.length - 1)[0];

    // Drill down to reach tail, if we can
    for(let p of leading) {
      if(curr === undefined) break;
      curr = curr[p];
    }

    // If curr still exists and is an array or object, attempt the assignment
    if(curr instanceof Object && curr[tail] !== undefined) { // Implicitly hits array as well
      curr[tail] = v;
    } else {
      console.log(`Gentlemerge skipped key "${k}" while merging `, dest, flat_data);
    }
  }
}

/** Makes an icon */
export function render_icon(icon_name: string): string{
    return `<i class="cci ${icon_name} i--m i--light"> </i>`;
}

/** Expected arguments: 
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function bonus_editor(bonus_path: string, bonus: Bonus) {
    // Our main two inputs
    let id_input = `<label>ID: <input name="${bonus_path}.ID" value="${bonus.ID}" data-dtype="String" /> </label>`;
    let val_input = `<label>Value: <input name="${bonus_path}.Value" value="${bonus.Value}" data-dtype="String" /> </label>`;

    // Our type options
    let damage_checkboxes: string[] = [];
    for(let dt of Object.values(DamageType)) {
        damage_checkboxes.push(`<label>${render_icon(Damage.icon_for(dt))} <input type="checkbox" name="${bonus_path}.DamageTypes.${dt}" ${checked(bonus.DamageTypes[dt])} /> </label>`);
    }
    
    let range_checkboxes: string[] = [];
    for(let rt of Object.values(RangeType)) {
        range_checkboxes.push(`<label>${render_icon(Range.icon_for(rt))} <input type="checkbox" name="${bonus_path}.RangeTypes.${rt}"  ${checked(bonus.RangeTypes[rt])} /> </label>`);
    }

    let type_checkboxes: string[] = [];
    for(let tt of Object.values(WeaponType)) {
        type_checkboxes.push(`<label>${tt} <input type="checkbox" name="${bonus_path}.WeaponTypes.${tt}" ${checked(bonus.WeaponTypes[tt])} /> </label>`);
    }

    let size_checkboxes: string[] = [];
    for(let st of Object.values(WeaponSize)) {
        size_checkboxes.push(`<label>${st} <input type="checkbox" name="${bonus_path}.WeaponSizes.${st}" ${checked(bonus.WeaponSizes[st])} /> </label>`);
    }
    

    // Consolidate them into rows
    return (
   `<div class="card clipped">
      ${id_input} <br>
      ${val_input} <br>
      <div class="d-flex">
        ${damage_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${range_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${type_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${size_checkboxes.join(" ")}
      </div>
    </div>`
    );
}

/** Expected arguments: 
 * - bonuses_path=<string path to the bonuses array>,  ex: ="ent.mm.Bonuses"
 * - bonuses=<bonus array to pre-populate with>. 
 */
export function bonus_array(bonuses_path: string, bonuses_array: Bonus[]) {
    let rows = bonuses_array.map((bonus, index) => bonus_editor(`${bonuses_path}.${index}`, bonus));
    rows = rows.map(r => `<li> ${r} </li>`);
    return (
    `<ul>
        ${rows.join("\n")}
    </ul>`
    );
}

////////////// DRAGON DROPS ////////////
// Very useful:
// https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#drop
// more raw api data:
// https://developer.mozilla.org/en-US/docs/Web/API/Document/drag_event

// We only expect to have one dragged item at a time. Because like, i'm 90% sure its impossible to do two at once
let curr_dragged: JQuery | null = null;

/**
 * Enables dropability on the specified jquery items/query.
 * The first argument is either an existing jquery object, or a string with which to $() make it
 * 
 * The second argument is a callback provided with the data for the drag, the src/dest of the drag, as well as the dragover event. 
 * It is called once, on a successful drop
 * Not all of these arguments are usually necessary: remember you can just _ away unused vars
 * 
 * The third argument is an optional callback provided with the source/dest of the drag, as well as the dragover event.
 * It determines if the dest is a valid drop target
 * 
 * The fourth and final argument is an optional callback provided with all info as the drop handler, but also is informed if the mouse is entering or exiting
 * This can be used for fancier on-hover enter/exit visual behavior. It is only called if dropping is permitted on that item
 */
export function enable_dropping(items: string | JQuery, 
                         drop_handler: ((data: string, drag_origin: JQuery, drag_dest: JQuery, drop_event: JQuery.DropEvent) => void), 
                         allow_drop?: ((drag_origin: JQuery, drag_dest: JQuery, dragover_event: JQuery.DragOverEvent | JQuery.DragEnterEvent | JQuery.DragLeaveEvent) => boolean), 
                         hover_handler?: ((mode: "enter" | "leave", drag_origin: JQuery, drag_dest: JQuery, drag_event: JQuery.DragEnterEvent | JQuery.DragLeaveEvent) => void)) {
  // Force to jq
  if(typeof items == "string") {
    items = $(items);
  }

  // Bind these individually, so we don't have to rely so much on the drop target being preserved
  items.each((_, _item) => {
    let item = $(_item);

    // To permit dropping, we must override the base dragover behavior.
    item.on("dragover", (event) => {
      let drop_permitted = !allow_drop || allow_drop(curr_dragged!, item, event);

      // If permitted, override behavior
      if(drop_permitted) {
        event.preventDefault();
        return false;
      }
    });


    // We also must signal this via the dragenter event
    item.on("dragenter", (event) => {
      // Duplicate of logic above. It is unclear if we truly need both -- I would imagine that only dragenter is "truly" needed. Alas! Better safe than sorry
      let drop_permitted = !allow_drop || allow_drop(curr_dragged!, item, event);
      console.log("Drag enter ", item);

      if(drop_permitted) {
        console.log("permitted");
        // Override behavior to allow dropping here
        event.preventDefault();

        // While we're here, fire hover handler if drop is allowed
        if(hover_handler) {
          hover_handler("enter", curr_dragged!, item, event);
        }
        return false;
      }

      return true; // I guess?
    });

    // Bind a leave if we are doing hover stuff
    if(hover_handler) {
      item.on("dragleave", (event) => {    
        // Unfortunately, the docs read as though we still need to check if a drag was permitted on the item we are leaving. Browser doesn't seem to remember!
        let drop_permitted = !allow_drop || allow_drop(curr_dragged!, item, event);

        if(drop_permitted) {
          hover_handler("leave", curr_dragged!, item, event);
        }
      });
    }

    // Finally and most importantly, dropping
    item.on("drop", (event) => {
      let data = event.originalEvent?.dataTransfer?.getData("text/plain");
      if(data) {
        console.log("Drop it like it's hot");
        drop_handler(data, curr_dragged!, item, event);
      }

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
export function enable_dragging(items: string | JQuery, 
                                data_transfer_func: ((drag_source: JQuery, event: JQuery.DragStartEvent) => string),
                                start_stop_func?: ((mode: "start" | "stop", drag_source: JQuery) => void)) {
  // Force to jq
  if(typeof items == "string") {
    items = $(items);
  }

  // Make draggable
  items.prop("draggable", true);

  // Bind these individually, so we don't have to rely so much on the drop target being preserved
  items.each((_, _item) => {
    let item = $(_item);
    item.on("dragstart", (event) => {
      // Set global
      curr_dragged = item;

      // Set data using callback
      event.originalEvent!.dataTransfer!.setData("text/plain", data_transfer_func(item, event));

      // Trigger start if necessary
      if(start_stop_func) {
        start_stop_func("start", item);
      }
    });

    // Handle drag ends
    item.on("dragend", (event) => {
      // Call stop func if we have one
      if(start_stop_func) {
        start_stop_func("stop", $(event.target));
      }

      // Clear global. Not strictly necessary, but good practice
      curr_dragged = null;
    });
  });
}

////////////// REFS //////////////
const UNKNOWN_ICON = "lancer/assets/icons/difficulty.svg";

// A multiplexer on machine-mind objects, to create above ref items
// We take advantage of the fact that these items are flagged to have their corr ent
export function simple_mm_ref<T extends EntryType>(item: RegEntry<T> | null, fallback: string = "Empty") {
    if(!item) {
      return `<div class="ref card">
          <img class="ref-icon" src="${UNKNOWN_ICON}"></img>
          <span class="major">${fallback}</span>
      </div>`;
    }

    let flags = item.flags as FlagData<T>;

    // Need these to make our thingy
    let ref = item.as_ref();
    let img = "";
    let name = "???"

    // best to know what we are working with
    if(LANCER.mm_compat_actor_types.includes(item.Type as any)) {
        // 'tis an actor, sire
        let actor = flags.orig_entity as LancerActor<any>;
        img = actor.img;
        name = actor.name;
    } else if(LANCER.mm_compat_item_types.includes(item.Type as any)) {
        // 'tis an item, m'lord
        let item = flags.orig_entity as LancerItem<any>;
        img = item.img;
        name = item.name;
    } else {
        return "<span> Error making item/actor ref</span>";
    }

    return `<div class="valid ${item.Type} ref card" data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}">
         <img class="ref-icon" src="${img}"></img>
         <span class="major">${name}</span>
     </div>`;
}


// The hookd to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.valid").on("click", HANDLER_onClickRef);
export async function HANDLER_onClickRef<T extends EntryType>(event: any) {
  event.preventDefault();
  const element = event.currentTarget;

  const found_entity = await resolve_ref_element(element);
  if(!found_entity) return;

  // We didn't really need the fully resolved class but, hwatever
  // open that link
  let sheet = (found_entity.flags as FlagData<T>).orig_entity.sheet;

  // If the sheet is already rendered:
  if ( sheet.rendered ) {
    //@ts-ignore
    sheet.maximize(); // typings say "maximise", are incorrect
    //@ts-ignore
    sheet.bringToTop();
  }

  // Otherwise render the sheet
  else sheet.render(true);
}

// Given a ref element (as created by simple_mm_ref or similar function), reconstruct a RegRef to the item it is referencing
export function recreate_ref_element_ref<T extends EntryType>(element: HTMLElement): RegRef<T> {
  let ref: RegRef<T> = {
    id: element.dataset.id!,
    type: element.dataset.type! as T,
    reg_name: element.dataset.regName!,
    is_unresolved_mmid: false
  };
  return ref;
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is referencing
export async function resolve_ref_element<T extends EntryType>(element: HTMLElement): Promise<LiveEntryTypes<T> | null> {
  // We reconstruct the ref
  let ref = recreate_ref_element_ref(element) as RegRef<T>;
  console.log("Resolving ref ", ref);

  // Then we resolve it
  let ctx = new OpCtx();
  let found_entity = await new FoundryReg().resolve(ctx, ref);

  if(found_entity) {
    return found_entity;
  }
  else {
    console.warn("Failed to resolve ref element");
    return null;
  }
}


// A specific MM ref display focused on displaying manufacturer info.
export function manufacturer_ref(source: Manufacturer | null): string {
  // TODO? maybe do a little bit more here, aesthetically speaking
  if(source) {
    let ref = source.as_ref();
    return `<div class="valid ${EntryType.MANUFACTURER} ref card" data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}"> 
              <h3 class="mfr-name" style="color: ${source.GetColor(false)};">${source.Name}</h3>
              <i>${source.Quote}</i>
            </div>
        `;
  } else {
    return `<div class="ref card">
              <h3 class="mfr-name">No source specified</h3>
            </div>
        `;
  }
}


// Create a div with flags for dropping and stuff
export function ref_drop_box(inner: string, data_path: string, accepts_type: EntryType): string {
  return `<div class="refdrop" data-path="${data_path}" data-type="${accepts_type}">${inner}</div>`
}

export function ref_drop_box_helper(data_path: string, accepts_type: EntryType, options: HelperOptions): string {
  // This line require JS style "this" semantics, which TS tends to not enjoy
  //@ts-ignore
  let inner = options.fn(this);
  return ref_drop_box(inner, data_path, accepts_type);
}
