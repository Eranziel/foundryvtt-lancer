import { Bonus, Damage, Range, DamageType, RangeType, WeaponType, WeaponSize, EntryType, OpCtx, RegEntry, RegRef, Manufacturer } from "machine-mind";
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

    return `<div class="clickable ref card" data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}">
         <img class="ref-icon" src="${img}"></img>
         <span class="major">${name}</span>
     </div>`;
}


// The hookd to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.clickable").on("click", HANDLER_onClickRef);
export async function HANDLER_onClickRef<T extends EntryType>(event: any) {
  event.preventDefault();
  const element = event.currentTarget;

  // We reconstruct the ref
  let ref: RegRef<T> = {
    id: element.dataset.id,
    type: element.dataset.type,
    reg_name: element.dataset.regName,
    is_unresolved_mmid: false
  };
  console.log("Clicked ref ", ref);

  // Then we resolve it
  let ctx = new OpCtx();
  let found_entity = await new FoundryReg().resolve(ctx, ref);

  if(found_entity) {
    // We didn't really need the metadata but, hwatever
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
  else {
    console.warn("Failed to resolve ref");
  }
}

// A specific MM ref display focused on displaying manufacturer
export function manufacturer_ref(source: Manufacturer | null): string {
  // TODO? maybe do a little bit more here, aesthetically speaking
  if(source) {
    let ref = source.as_ref();
    return `<div class="clickable ref card" data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}"> 
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


