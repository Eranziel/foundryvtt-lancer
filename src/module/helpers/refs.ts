import {
  EntryType,
  OpCtx,
  RegEntry,
  RegRef,
  Manufacturer,
  LiveEntryTypes,
} from "machine-mind";
import { is_actor_type, LancerActor } from "../actor/lancer-actor";
import { LANCER, TypeIcon } from "../config";
import { is_item_type, LancerItem } from "../item/lancer-item";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";

// We use these for virtually every ref function
export function ref_commons<T extends EntryType>(item: RegEntry<T> | null): null | ({
  img: string,
  name: string, 
  ref: RegRef<T>
}) {
  // Nulls beget nulls
  if(!item) {
    return null;
  }

  // Grab flags to retrieve original entity
  let flags = item.flags as FlagData<T>;

  // Declare our results
  let ref = item.as_ref();
  let img: string;
  let name: string;

  // best to know what we are working with
  if (is_actor_type(item.Type)) {
    // 'tis an actor, sire
    let actor = flags.orig_entity as LancerActor<any>;
    img = actor.img;
    name = actor.name;
  } else if (is_item_type(item.Type)) {
    // 'tis an item, m'lord
    let item = flags.orig_entity as LancerItem<any>;
    img = item.img;
    name = item.name;
  } else {
    console.warn("Error making item/actor ref", item);
    return null;
  }

  // Combine and return
  return {
    img,
    name,
    ref 
  }
}

// A multiplexer-helper on machine-mind objects, to create actor/item ref items
// If a slot_path is provided, then this will additionally be a valid drop location for items of this type
export function simple_mm_ref<T extends EntryType>(
  type: T,
  item: RegEntry<T> | null,
  fallback: string = "Empty",
  slot_path: string = "",
  native: boolean = false
) {
  // Generate commons
  let cd = ref_commons(item);

  // Generate path snippet
  let path_class_snippet = "";
  if(slot_path) {
    path_class_snippet = ` drop-target `;
  }

  // Generate native drop snippet if we want one
  let native_drop_snippet = native ? " native-refdrop " : "";

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref ref-card ${native_drop_snippet} ${path_class_snippet} ${type}" 
                        data-path="${slot_path}" 
                        data-type="${type}">
          <img class="ref-icon" src="${TypeIcon(type)}"></img>
          <span class="major">${fallback}</span>
      </div>`;
  }

  return `<div class="valid ${cd.ref.type} ref ref-card ${native_drop_snippet} ${path_class_snippet}" 
                data-id="${cd.ref.id}" 
                data-ref-type="${cd.ref.type}" 
                data-reg-name="${cd.ref.reg_name}" 
                data-path="${slot_path}"
                data-type="${type}">
         <img class="ref-icon" src="${cd.img}"></img>
         <span class="major">${cd.name}</span>
     </div>`;
}



// The hook to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.valid").on("click", HANDLER_onClickRef);
export async function HANDLER_openRefOnClick<T extends EntryType>(event: any) {
  event.preventDefault();
  const element = event.currentTarget;

  const found_entity = await resolve_ref_element(element);
  if (!found_entity) return;

  // We didn't really need the fully resolved class but, hwatever
  // open that link
  let sheet = (found_entity.flags as FlagData<T>).orig_entity.sheet;

  // If the sheet is already rendered:
  if (sheet.rendered) {
    //@ts-ignore foundry-pc-types has a spelling error here
    sheet.maximize(); // typings say "maximise", are incorrect
    //@ts-ignore and it is entirely missing this function
    sheet.bringToTop();
  }

  // Otherwise render the sheet
  else sheet.render(true);
}

// Given a ref element (as created by simple_mm_ref or similar function), reconstruct a RegRef to the item it is referencing
export function recreate_ref_from_element<T extends EntryType>(element: HTMLElement): RegRef<T> | null {
    let id = element.dataset.id;
    let type = element.dataset.refType as T | undefined;
    let reg_name = element.dataset.regName;
    let fallback_mmid = "";

    // Check existence
    if(!id) {
        console.error("Could not drag ref: missing data-id");
        return null;
    } else if(!type) {
        console.error("Could not drag ref: missing data-ref-type");
        return null;
    } else if(!reg_name){
        console.error("Could not drag ref: missing data-reg-name");
        return null;
    }

  let ref: RegRef<T> = {
    id,
    type,
    reg_name,
    fallback_mmid,
  };

  return ref;
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is currently referencing
export async function resolve_ref_element<T extends EntryType>(
  element: HTMLElement
): Promise<LiveEntryTypes<T> | null> {
  // We reconstruct the ref
  let ref = recreate_ref_from_element(element) as RegRef<T>;

  // Then we resolve it
  let ctx = new OpCtx();
  let found_entity = await new FoundryReg().resolve(ctx, ref);

  if (found_entity) {
    return found_entity;
  } else {
    console.warn("Failed to resolve ref element");
    return null;
  }
}

// A specific MM ref helper focused on displaying manufacturer info.
export function manufacturer_ref(source: Manufacturer | null): string {
  let cd = ref_commons(source);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    return `<div class="valid ${EntryType.MANUFACTURER} ref ref-card" data-id="${cd.ref.id}" data-ref-type="${cd.ref.type}" data-reg-name="${cd.ref.reg_name}"> 
              <h3 class="mfr-name" style="color: ${source!.GetColor(false)};">${source!.Name}</h3>
              <i>${source!.Quote}</i>
            </div>
        `;
  } else {
    return `<div class="ref ref-card">
              <h3 class="mfr-name">No source specified</h3>
            </div>
        `;
  }
}
