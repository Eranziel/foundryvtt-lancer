import { HelperOptions } from "handlebars";
import { EntryType, Mech, MechLoadout  } from "machine-mind";
import { WeaponMount } from "machine-mind";
import { SystemMount } from "machine-mind/dist/class";
import { inc_if, resolve_helper_dotpath } from "./commons";
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
    <div class="mount card">
      <span class="lancer-header">
        <span>System Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-system-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </span>
      <div class="lancer-body">
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
  let slots = mount.Slots.map((slot, index) => mech_weapon_refview(`${mount_path}.Slots.${index}.Weapon`, mech_path, helper, slot.Size));
  let err = mount.validate() ?? "";
      // <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">

  return ` 
    <div class="mount card" >
      <div class="lancer-header" data-path="${mount_path}">
        <span class="mount-type-ctx-root" data-path="${mount_path}">${mount.MountType} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      ${inc_if(`
        <span class="lancer-header error">${err.toUpperCase()}</span>`, 
        err)}
      <div class="lancer-body">
        ${slots.join("")}
      </div>
    </div>`;
}

// Helper to display all weapon mounts on a mech loadout
function all_weapon_mount_view(mech_path: string, loadout_path: string, helper: HelperOptions) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const weapon_mounts = loadout.WepMounts.map((wep, index) => weapon_mount(mech_path, `${loadout_path}.WepMounts.${index}`, helper));

  return `
    <span class="lancer-header loadout-category submajor">
        <span>MOUNTED WEAPONS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.WepMounts" data-action-value="(struct)wep_mount"></a>
        <a class="reset-all-weapon-mounts-button fas fa-redo" data-path="${loadout_path}.WepMounts"></a>
    </span>
    <div class="wraprow double">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all system mounts on a mech loadout
function all_system_mount_view(mech_path: string, loadout_path: string, helper: HelperOptions) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const system_slots = loadout.SysMounts.map((sys, index) => system_mount(mech_path, `${loadout_path}.SysMounts.${index}`, helper));

  return `
    <span class="lancer-header loadout-category submajor">
        <span>MOUNTED SYSTEMS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>
        <a class="gen-control fas fa-trash" data-action="set" data-path="${loadout_path}.SysMounts" data-action-value="(struct)empty_array"></a>
    </span>
    <div class="wraprow quadruple">
      ${system_slots.join("")}
    </div>
    `;
}

/** Suuuuuper work in progress helper. The loadout view for a mech (tech here can mostly be reused for pilot)
 * TODO:
 * - Weapon mods
 * - .... system mods :)
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

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_helper_dotpath(options, data_path);
  return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);
}

// A drag-drop slot for a frame. TODO: fancify, giving basic stats or something???
export function frame_refview(frame_path: string, helper: HelperOptions): string {
  let frame = resolve_helper_dotpath(helper, frame_path);
  return `<div class="lancer-header loadout-category submajor">
            <span>CURRENT FRAME</span>
          </div>
          ${simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path)}
          `;
}
