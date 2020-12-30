import { HelperOptions } from "handlebars";
import { EntryType, funcs, LiveEntryTypes, Mech, MechLoadout } from "machine-mind";
import { LancerActorType } from "../config";
import { ref_drop_box, resolve_dotpath, simple_mm_ref } from "./commons";

// A drag-drop slot for a frame.
export function frame_slot(loadout: MechLoadout, loadout_path: string): string {
  let frame = loadout.Frame;
  let frame_path = `${loadout_path}.Frame`;
  return ref_drop_box(simple_mm_ref(frame, "No Frame"), frame_path, EntryType.FRAME);
}

// A drag-drop slot for a system mount. TODO: delete button, clear button
export function system_mount(
  loadout: MechLoadout,
  loadout_path: string,
  slot_index: number
): string {
  return "";
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
export function weapon_mount(
  loadout: MechLoadout,
  loadout_path: string,
  slot_index: number
): string {
  return "";
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button, modding capabilities
export function weapon_slot() {
  return "";
}

/** Suuuuuper work in progress. The loadout view for a mech (tech here can mostly be reused for pilot)
 * TODO:
 * - Add/delete system mount button
 * - Add/delete weapon mount button
 * - Mount reset button
 * - Set pilot button/drag interface
 * - SP view
 * - Diagnostic messages (invalid mount, over/under sp, etc)
 * - Ref validation (you shouldn't be able to equip another mechs items, etc)
 */
export function mech_loadout(loadout_path: string, options: HelperOptions): string {
  const loadout = resolve_dotpath(options.data?.root, loadout_path);
  const frame = frame_slot(loadout, loadout_path);
  // const weapon_slots = loadout.WepMounts.map((wep, index) => simple_mm_ref(wep.Slots[0]?.Weapon ?? null)); // TODO: Tidy this up
  const weapon_slots = ["todo"];
  // const system_slots = loadout.SysMounts.map((sys, index) => simple_mm_ref(sys));
  const system_slots = ["todo"];
  return `
        <span> Equipped frame: </span>
        ${frame}
        <span> Equipped weapons: </span>
        ${weapon_slots.join("\n")}
        <span> Equipped systems: </span>
        ${system_slots.join("\n")}
    </span>`;
}

// Create a div with flags for dropping native dragged refs (IE foundry behavior, drag from actor list, etc)
export function actor_slot<T extends LancerActorType>(data_path: string, accepts_type: T, options: HelperOptions): string {
  // get the existing
  let existing = resolve_dotpath(options.data?.root, data_path);
  return `<div class="native-refdrop" data-path="${data_path}" data-type="${accepts_type}">${simple_mm_ref(existing)}</div>`;
}

// ---------------------------------------
// Some simple stat editing thingies

// Shows an X / MAX clipped card
export function stat_edit_card_max(title: string, icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  let max_val = resolve_dotpath(options.data?.root, max_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <div class="flexrow" style="align-items: center">
        <input class="lancer-stat major" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
        <span class="medium" style="max-width: min-content;">/</span>
        <span class="lancer-stat major">${max_val}</span>
      </div>
    </div>
    `;
}

// Shows an X clipped card
export function stat_edit_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <input class="lancer-stat major" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
    </div>
    `;
}

// Shows a readonly value clipped card
export function stat_view_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <span class="lancer-stat major">${data_val}</span>
    </div>
    `;
}

// Shows a compact readonly value
export function compact_stat_view(icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  return `        
    <div class="compact-stat">
        <i class="${icon} i--m i--dark"></i>
        <span class="lancer-stat minor">${data_val}</span>
    </div>
    `;
}

// Shows a compact editable value
export function compact_stat_edit(icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  let max_val = resolve_dotpath(options.data?.root, max_path);
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          <input class="lancer-stat minor" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
          <span class="minor" style="max-width: min-content;" > / </span>
          <span class="lancer-stat minor">${max_val}</span>
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(target: string, value: string) {
    // Init value to 0 if it doesn't exist
    // So the arrows work properly
    if (!value) {
      value = "0";
    }

    return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      <input class="lancer-stat major" type="number" name="${target}" value="${value}" data-dtype="Number"\>
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
}

// The above, in card form
export function clicker_stat_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_dotpath(options.data?.root, data_path);
  return `<div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" styles="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      ${clicker_num_input(data_path, data_val)}
    </div>
  `;
}


/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param overcharge_path Path to current overcharge level, from 0 to 3
 */
export function overcharge_button(overcharge_path: string, options: HelperOptions) {
  const overcharge_sequence = ["1", "1d3", "1d6", "1d6 + 4"];

  let index = resolve_dotpath(options.data?.root, overcharge_path) as number;
  index = funcs.bound_int(index + 1, 0, overcharge_sequence.length)
  let over_val = overcharge_sequence[index];
  return `
    <div class="card clipped flexcol">
      <div class="lancer-stat-header clipped-top">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class=flexrow>
        <a class="i--dark i--sm" id="overcharge-button">
          <i class="fas fa-dice-d20"> </i>
        </a>
        <span>${over_val}</span>
      </div>
    </div>`;
}
