import { HelperOptions } from "handlebars";
import { EntryType, Mech, MechLoadout  } from "machine-mind";
import { WeaponMount } from "machine-mind";
import { SystemMount } from "machine-mind/dist/class";
import { resolve_helper_dotpath } from "./commons";
import { mech_weapon_refview } from "./item";
import { simple_mm_ref } from "./refs";

// A drag-drop slot for a system mount. TODO: delete button, clear button
function system_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperOptions
): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as SystemMount;
  let slot = simple_mm_ref(EntryType.MECH_SYSTEM, mount.System, "No System", `${mount_path}.System`);

  return ` 
    <div class="lancer-mount-container flexcol">
      <span class="mount-header clipped-top">
        System Mount
        <a class="gen-control" data-action="splice" data-path="${mount_path}"><i class="fas fa-trash"></i></a>
        <a class="reset-system-mount-button" data-path="${mount_path}"><i class="fas fa-redo"></i></a>
      </span>
      <div class="lancer-mount-body">
        ${slot}
      </div>
    </div>`;
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperOptions
): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as WeaponMount
  // let mech = resolve_helper_dotpath(helper, mech_path, EntryType.MECH);
  let slots = mount.Slots.map((slot, index) => mech_weapon_refview(`${mount_path}.Slots.${index}.Weapon`, mech_path, helper));

  return ` 
    <div class="lancer-mount-container flexcol">
      <span class="mount-header clipped-top">
        ${mount.MountType} Weapon Mount
        <a class="gen-control" data-action="splice" data-path="${mount_path}"><i class="fas fa-trash"></i></a>
        <a class="reset-weapon-mount-button" data-path="${mount_path}"><i class="fas fa-redo"></i></a>
      </span>
      <div class="lancer-mount-body">
        ${slots.join("")}
      </div>
    </div>`;
}

// Helper to display all weapon mounts on a mech loadout
function all_weapon_mount_view(mech_path: string, loadout_path: string, helper: HelperOptions) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const weapon_mounts = loadout.WepMounts.map((wep, index) => weapon_mount(mech_path, `${loadout_path}.WepMounts.${index}`, helper));

  return `
    <span class="lancer-loadout-header major">
        MOUNTED WEAPONS
        <a class="add-weapon-mount-button">+</a>
        <a class="reset-all-weapon-mounts-button"><i class="fas fa-redo"></i></a>
    </span>
    <div class="wraprow triple">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all system mounts on a mech loadout
function all_system_mount_view(mech_path: string, loadout_path: string, helper: HelperOptions) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const system_slots = loadout.SysMounts.map((sys, index) => system_mount(mech_path, `${loadout_path}.SysMounts.${index}`, helper));

  return `
    <span class="lancer-loadout-header major">
        MOUNTED SYSTEMS
        <a class="add-system-mount-button">+</a>
        <a class="reset-all-system-mounts-button"><i class="fas fa-redo"></i></a>
    </span>
    <div class="wraprow quadruple">
      ${system_slots.join("")}
    </div>
    `;
}

/** Suuuuuper work in progress helper. The loadout view for a mech (tech here can mostly be reused for pilot)
 * TODO:
 * - Select mount type
 * - Weapon mods
 * - .... system mods :)
 * - Set pilot button/drag interface
 * - Diagnostic messages (invalid mount, over/under sp, etc)
 * - Ref validation (you shouldn't be able to equip another mechs items, etc)
 */
export function mech_loadout(mech_path: string, helper: HelperOptions): string {
  const mech: Mech = resolve_helper_dotpath(helper, mech_path);
  if(!mech) {return "err";}
  const loadout_path = `${mech_path}.Loadout`;
  return `
    <div class="flexcol">
        ${frame_refview(`${loadout_path}.Frame`, helper)}
        ${all_weapon_mount_view(mech_path, loadout_path, helper)}
        ${all_system_mount_view(mech_path, loadout_path, helper)}
    </div>`;
}

// Create a div with flags for dropping native dragged refs (IE foundry behavior, drag from actor list, etc)
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_helper_dotpath(options, data_path);
  return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);
}

// A drag-drop slot for a frame. TODO: fancify, giving basic stats or something???
export function frame_refview(frame_path: string, helper: HelperOptions): string {
  let frame = resolve_helper_dotpath(helper, frame_path);
  return `<span class="lancer-loadout-header major">
            CURRENT FRAME 
          </span>
          ${simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path)}`;
}
