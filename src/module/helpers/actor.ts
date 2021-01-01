import { HelperOptions } from "handlebars";
import { EntryType, Frame, funcs, LiveEntryTypes, Mech, MechLoadout, RegEntry, WeaponMod  } from "machine-mind";
import { WeaponMount, WeaponSlot } from "machine-mind";
import { SystemMount } from "machine-mind/dist/class";
import { LancerActorType, LancerItemType } from "../config";
import { resolve_dotpath } from "./commons";
import { simple_mm_ref } from "./refs";

// A drag-drop slot for a frame.
export function frame_slot(loadout: MechLoadout, loadout_path: string): string {
  let frame = loadout.Frame;
  let frame_path = `${loadout_path}.Frame`;
  return simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path);
}


// A drag-drop slot for a system mount. TODO: delete button, clear button
function system_mount(
  mount: SystemMount,
  mount_path: string
): string {
  let slot = simple_mm_ref(EntryType.MECH_SYSTEM, mount.System, "No System", `${mount_path}.System`);

  return ` 
    <div class="lancer-mount-container">
      <span class="mount-header clipped-top">
        System Mount
        <a class="gen-control" data-action="splice" data-path="${mount_path}"><i class="fas fa-trash"></i></a>
        <a class="reset-system-mount-button" data-path="${mount_path}"><i class="fas fa-redo"></i></a>
      </span>
      <span class="lancer-mount-body">
        ${slot}
      </span>
    </div>`;
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(
  mount: WeaponMount,
  mount_path: string,
): string {
  let slots = mount.Slots.map((slot, index) => weapon_slot(slot, `${mount_path}.Slots.${index}`));

  return ` 
    <div class="lancer-mount-container">
      <span class="mount-header clipped-top">
        ${mount.MountType} Weapon Mount
        <a class="gen-control" data-action="splice" data-path="${mount_path}"><i class="fas fa-trash"></i></a>
        <a class="reset-weapon-mount-button" data-path="${mount_path}"><i class="fas fa-redo"></i></a>
      </span>
      <span class="lancer-mount-body">
        ${slots.join("")}
      </span>
    </div>`;
}

// A drag-drop slot for a weapon mount. TODO: delete button, modding capabilities
function weapon_slot(slot: WeaponSlot, slot_path: string) {
  return simple_mm_ref(EntryType.MECH_WEAPON, slot.Weapon, "No Weapon", `${slot_path}.Weapon`);
}

// Display all weapon mounts
function all_weapon_mount_view(loadout: MechLoadout, loadout_path: string) {
  const weapon_mounts = loadout.WepMounts.map((wep, index) => weapon_mount(wep, `${loadout_path}.WepMounts.${index}`));

  return `
    <span class="lancer-stat-header major">
        WEAPONS
        <a class="add-weapon-mount-button">+</a>
        <a class="reset-all-weapon-mounts-button"><i class="fas fa-redo"></i></a>
    </span>
    <div class="flexrow">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Display all system mounts
function all_system_mount_view(loadout: MechLoadout, loadout_path: string) {
  const system_slots = loadout.SysMounts.map((sys, index) => system_mount(sys, `${loadout_path}.SysMounts.${index}`));

  return `
    <span class="lancer-stat-header major">
        SYSTEMS
        <a class="add-system-mount-button">+</a>
        <a class="reset-all-system-mounts-button"><i class="fas fa-redo"></i></a>
    </span>
    <div class="flexrow">
      ${system_slots.join("")}
    </div>
    `;
  return `
    <span class="lancer-stat-header major">SYSTEMS</span>

    `;
}

/** Suuuuuper work in progress helper. The loadout view for a mech (tech here can mostly be reused for pilot)
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
  const loadout: MechLoadout | null = resolve_dotpath(options.data?.root, loadout_path);
  if(!loadout) {return "err";}

  const frame = frame_slot(loadout, loadout_path);
  // const system_slots = loadout.SysMounts.map((sys, index) => simple_mm_ref(sys));
  const system_slots = ["todo"];
  return `
    <div class="flexcol">
        <span> Equipped frame: </span>
        ${frame_slot(loadout, loadout_path)}
        ${all_weapon_mount_view(loadout, loadout_path)}
        ${all_system_mount_view(loadout, loadout_path)}
    </div>`;
}

// Create a div with flags for dropping native dragged refs (IE foundry behavior, drag from actor list, etc)
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_dotpath(options.data?.root, data_path);
  return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path);
}

// A helper suitable for showing lists of refs that aren't really slots.
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function editable_mm_ref_list_item<T extends EntryType>(item_path: string, trash_action: "delete" | "splice" | "null",  helper: HelperOptions) {
  let item: RegEntry<T> | null = resolve_dotpath(helper.data?.root, item_path);

  if(item) {
    // Add controls if the item exists
    let controls = `<div class="ref-list-controls">
      <a class="gen-control i--dark" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>
    </div>`

    return `
      <div class="flexrow">
        ${simple_mm_ref(item.Type, item, "")} 
        ${controls}
    </div>`;

  } else {
    // If item not recovered, we produce nothing. This shouldn't really happen, like, ever, so we make a fuss and print an error
    console.error("List item failed to resolve");
    return "";
  }
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
export function overcharge_button(overcharge_path: string, options: HelperOptions): string {
  const overcharge_sequence = ["1", "1d3", "1d6", "1d6 + 4"];

  let index = resolve_dotpath(options.data?.root, overcharge_path) as number;
  index = funcs.bound_int(index, 0, overcharge_sequence.length - 1)
  let over_val = overcharge_sequence[index];
  return `
    <div class="card clipped flexcol">
      <div class="lancer-stat-header clipped-top">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class=flexrow>
        <a class="overcharge-button">
          <i class="cci cci-overcharge i--dark i--sm"> </i>
        </a>
        <span>${over_val}</span>
      </div>
    </div>`;
}
