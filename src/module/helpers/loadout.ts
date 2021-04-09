import { HelperOptions } from "handlebars";
import { EntryType, Mech, MechLoadout, SystemMount, Pilot, Frame, RegEntry, FrameTrait, Action, Deployable, CoreSystem } from 'machine-mind';
import { WeaponMount } from "machine-mind";
import { ChipIcons } from "../enums";
import { LancerMacroData } from "../interfaces";
import { inc_if, resolve_helper_dotpath, array_path_edit } from './commons';
import { mech_weapon_refview, buildActionHTML, buildDeployableHTML, buildChipHTML } from './item';
import { editable_mm_ref_list_item, ref_commons, ref_params, simple_mm_ref } from "./refs";
import { compact_tag_list } from "./tags";
import { LancerActor } from '../actor/lancer-actor';

// A drag-drop slot for a system mount. TODO: delete button, clear button
function system_mount(mech_path: string, mount_path: string, helper: HelperOptions): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as SystemMount;
  if(!mount) return '';

  let item_: RegEntry<EntryType.MECH_SYSTEM> | null = resolve_helper_dotpath(helper, `${mount_path}.System`);
  if(item_) {
    let slot = editable_mm_ref_list_item(`${mount_path}.System`,"delete",helper);
  
    return ` 
      <div class="mount card">
        ${slot}
      </div>`;
  } else {
    // Assuming we just want to delete empty mounts, which may be a faulty assumption
    array_path_edit(helper.data.root,mount_path,null,"delete")
    return system_mount(mech_path,mount_path,helper);
  }
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(mech_path: string, mount_path: string, helper: HelperOptions): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as WeaponMount;
  // let mech = resolve_helper_dotpath(helper, mech_path, EntryType.MECH);
  let slots = mount.Slots.map((slot, index) =>
    mech_weapon_refview(`${mount_path}.Slots.${index}.Weapon`, mech_path, helper, slot.Size)
  );
  let err = mount.validate() ?? "";

  return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.MountType} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      ${inc_if(
        `
        <span class="lancer-header error">${err.toUpperCase()}</span>`,
        err
      )}
      <div class="lancer-body">
        ${slots.join("")}
      </div>
    </div>`;
}

// Helper to display all weapon mounts on a mech loadout
function all_weapon_mount_view(mech_path: string, loadout_path: string, helper: HelperOptions) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const weapon_mounts = loadout.WepMounts.map((wep, index) =>
    weapon_mount(mech_path, `${loadout_path}.WepMounts.${index}`, helper)
  );

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
  const system_slots = loadout.SysMounts.map((sys, index) =>
    system_mount(mech_path, `${loadout_path}.SysMounts.${index}`, helper)
  );


  // Archiving add button: <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>

  return `
    <span class="lancer-header loadout-category submajor">
        <span>MOUNTED SYSTEMS</span>
    </span>
    <div class="flexcol">
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
  if (!mech) {
    return "err";
  }
  const loadout_path = `${mech_path}.Loadout`;
  return `
    <div class="flexcol">
        ${all_weapon_mount_view(mech_path, loadout_path, helper)}
        ${all_system_mount_view(mech_path, loadout_path, helper)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_helper_dotpath<Pilot | null>(options, data_path, null);
  if(!existing) return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);

  // Generate commons
  let cd = ref_commons(existing);
  if(!cd) return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);

  return `<div class="pilot-summary 
          valid ${cd.ref.type} ref" 
          ${ref_params(cd.ref)}">
    <img src="${existing.Flags.top_level_data.img}">
    <div class="pilot-summary-name">
      <span>${existing.Name}</span>
    </div>
    <div class="pilot-summary-ll">
      <span>LL${existing.Level}</span>
    </div>
</div>`

}

// A drag-drop slot for a frame. TODO: fancify, giving basic stats or something???
export function frame_refview(frame_path: string, helper: HelperOptions): string {
  let frame = resolve_helper_dotpath<Frame | null>(helper, frame_path, null);
  if(!frame) return simple_mm_ref(EntryType.FRAME, frame, "No Pilot", frame_path, true);

  // Generate commons
  let cd = ref_commons(frame);
  if(!cd) return simple_mm_ref(EntryType.FRAME, frame, "No Pilot", frame_path, true);

  return `<div class="lancer-header submajor clipped-top frame-header">
            <span>${frame.Name}</span>
          </div>
          <div class="frame-traits flexcol">${frameTraits(frame)}</div>
          ${frame.CoreSystem ? buildCoreSysHTML(frame.CoreSystem) : ""}
          `;
}

function buildCoreSysHTML(core: CoreSystem) {
  let tags: string | undefined;
  if(core.Tags !== undefined) {
    tags = compact_tag_list("",core.Tags,false);
  }

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  return `<div class="core-wrapper frame-coresys flexcol">
    <div class="coresys-title">
      <span>${core.Name}</span>
    </div>
    <div class="frame-active">${frame_active(core)}</div>
    <div class="frame-passive">${frame_passive(core)}</div>
    ${tags ? tags : ""}
  </div>`
}

function frameTraits(frame: Frame): string {
  return frame.Traits.map((t: FrameTrait, i: number | undefined) => {
    return buildFrameTrait(t);
  }).join("");
}

function buildFrameTrait(trait: FrameTrait): string {
  return `<div class="frame-trait">
    <span class="lancer-header submajor clipped-top frame-trait-header">
        ${trait.Name}
    </span>
    <span>${trait.Description}</span>
  </div>`;
}

function frame_active(core: CoreSystem): string {

  // So we have a CoreSystem with all the traits of an action inside itself as Active and Passive...
  // And then it has whole other arrays for its actions
  // :pain:

  let actionHTML = core.ActiveActions.map((a: Action, i: number | undefined) => {
    return buildActionHTML(a, {full: true, num: i});
  }).join("");

  let depHTML = core.Deployables.map((d: Deployable, i: number | undefined) => {
    return buildDeployableHTML(d, true, i);
  }).join("");

  // Should find a better way to do this...
  //@ts-ignore
  let actor: LancerActor = core.Registry.config.item_source[1];

  let coreMacroData: LancerMacroData = {
    command: `game.lancer.prepareCoreActiveMacro("${actor._id}")`,
    title: `${actor.name} | CORE POWER`,
    iconPath: `systems/lancer/assets/icons/macro-icons/corebonus.svg`
  }

  return `
  <div class="core-active-wrapper">
    <span class="lancer-header submajor clipped-top">
      ${core.ActiveName}
    </span>
    ${core.ActiveEffect ? core.ActiveEffect : ""}
    ${actionHTML ? actionHTML : ""}
    ${depHTML ? depHTML : ""}
    ${buildChipHTML(core.Activation, {icon: ChipIcons.Core, fullData: coreMacroData})}
  </div>
  `;
}

function frame_passive(core: CoreSystem): string {

  let actionHTML = core.PassiveActions.map((a: Action, i: number | undefined) => {
    return buildActionHTML(a, {full: true, num: i});
  }).join("");

  return `
  <div class="core-active-wrapper">
    <span class="lancer-header submajor clipped-top">
      ${core.PassiveName}
    </span>
    ${core.PassiveEffect ? core.PassiveEffect : ""}
    ${actionHTML ? actionHTML : ""}
  </div>
  `;
}