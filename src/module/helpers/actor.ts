import { EntryType, MechLoadout } from "machine-mind";
import { ref_drop_box, ref_drop_box_helper, simple_mm_ref } from "./commons";

// A drag-drop slot for a frame.
export function frame_slot(loadout: MechLoadout, loadout_path: string): string {
  let frame = loadout.Frame;
  let frame_path = `${loadout_path}.Frame`;
  return ref_drop_box(simple_mm_ref(frame, "No Frame"), frame_path, EntryType.FRAME);
}

// A drag-drop slot for a system mount. TODO: delete button, clear button
export function system_mount(loadout: MechLoadout, loadout_path: string, slot_index: number): string {
  return ""
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
export function weapon_mount(loadout: MechLoadout, loadout_path: string, slot_index: number): string {
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
export function mech_loadout(loadout: MechLoadout, loadout_path: string): string {
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


