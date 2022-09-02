import type { HelperOptions } from "handlebars";
import {
  EntryType,
  Mech,
  MechLoadout,
  SystemMount,
  Pilot,
  Frame,
  RegEntry,
  FrameTrait,
  Action,
  Deployable,
  CoreSystem,
} from "machine-mind";
import type { WeaponMount } from "machine-mind";
import { ChipIcons } from "../enums";
import type { LancerMacroData } from "../interfaces";
import { encodeMacroData } from "../macros";
import { inc_if, resolve_helper_dotpath, array_path_edit } from "./commons";
import { mech_weapon_refview, buildActionHTML, buildDeployableHTML, buildChipHTML } from "./item";
import { editable_mm_ref_list_item, ref_commons, ref_params, simple_mm_ref } from "./refs";
import { compact_tag_list } from "./tags";
import type { LancerActor } from "../actor/lancer-actor";

export type CollapseRegistry = { [LID: string]: number };

// A drag-drop slot for a system mount. TODO: delete button, clear button
function system_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperOptions,
  registry?: CollapseRegistry
): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as SystemMount;
  if (!mount) return "";

  let item_: RegEntry<EntryType.MECH_SYSTEM> | null = resolve_helper_dotpath(helper, `${mount_path}.System`);
  if (item_) {
    let slot = editable_mm_ref_list_item(`${mount_path}.System`, "delete", helper, registry);

    return ` 
      <div class="mount card clipped">
        ${slot}
      </div>`;
  } else {
    // Assuming we just want to delete empty mounts, which may be a faulty assumption
    array_path_edit(helper.data.root, mount_path, null, "delete");
    return system_mount(mech_path, mount_path, helper);
  }
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperOptions,
  registry: CollapseRegistry
): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as WeaponMount;

  // If bracing, override
  if (mount.Bracing) {
    return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.MountType} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      <div class="lancer-body">
        <span class="major">LOCKED: BRACING</span>
      </div>
    </div>`;
  }

  let slots = mount.Slots.map((slot, index) =>
    mech_weapon_refview(`${mount_path}.Slots.${index}.Weapon`, mech_path, helper, registry, slot.Size)
  );
  let err = mount.validate() ?? "";

  // FLEX mount weirdness.
  if (!err && mount.MountType === "Flex") {
    if (mount.Slots[0].Weapon && mount.Slots[0].Weapon.Size === "Main") {
      slots.pop();
    } else if (mount.Slots[1].Weapon && mount.Slots[1].Size === "Auxiliary") {
      slots[0] = slots[0].replace("Insert Main", "Insert Auxiliary");
    }
  }

  return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.MountType} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      ${inc_if(`<span class="lancer-header error">${err.toUpperCase()}</span>`, err)}
      <div class="lancer-body">
        ${slots.join("")}
      </div>
    </div>`;
}

// Helper to display all weapon mounts on a mech loadout
function all_weapon_mount_view(
  mech_path: string,
  loadout_path: string,
  helper: HelperOptions,
  registry: CollapseRegistry
) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const weapon_mounts = loadout.WepMounts.map((_wep, index) =>
    weapon_mount(mech_path, `${loadout_path}.WepMounts.${index}`, helper, registry)
  );

  return `
    <span class="lancer-header loadout-category submajor">
        <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="weapons"></i>   
        <span>MOUNTED WEAPONS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.WepMounts" data-action-value="(struct)wep_mount"></a>
        <a class="reset-all-weapon-mounts-button fas fa-redo" data-path="${loadout_path}.WepMounts"></a>
    </span>
    <div class="wraprow double collapse" data-collapse-id="weapons">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all system mounts on a mech loadout
function all_system_mount_view(
  mech_path: string,
  loadout_path: string,
  helper: HelperOptions,
  _registry: CollapseRegistry
) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const system_slots = loadout.SysMounts.map((_sys, index) =>
    system_mount(mech_path, `${loadout_path}.SysMounts.${index}`, helper, _registry)
  );

  // Archiving add button: <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>

  return `
    <span class="lancer-header loadout-category submajor">
      <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="systems"></i>    
      <span>MOUNTED SYSTEMS</span>
      <span style="height:15px;width:48px;padding:0;"></span>
    </span>
    <div class="flexcol collapse" data-collapse-id="systems">
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
  const registry: CollapseRegistry = {};

  if (!mech) {
    return "err";
  }
  const loadout_path = `${mech_path}.Loadout`;
  return `
    <div class="flexcol">
        ${all_weapon_mount_view(mech_path, loadout_path, helper, registry)}
        ${all_system_mount_view(mech_path, loadout_path, helper, registry)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_helper_dotpath<Pilot | null>(options, data_path, null);
  if (!existing) return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);

  // Generate commons
  let cd = ref_commons(existing);
  if (!cd) return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);

  return `<div class="pilot-summary">
    <img class="valid ${cd.ref.type} ref clickable-ref" ${ref_params(cd.ref, cd.uuid)} style="height: 100%" src="${
    existing.Flags.top_level_data.img
  }"/>
    <div class="license-level">
      <span>LL${existing.Level}</span>
    </div>
</div>`;
}

/**
 * Builds HTML for a frame reference. Either an empty ref to give a drop target, or a preview
 * with traits and core system.
 * @param actor       Actor the ref belongs to.
 * @param frame_path  Path to the frame's location in actor data.
 * @param helper      Standard helper options.
 * @return            HTML for the frame reference, typically for inclusion in a mech sheet.
 */
export function mech_frame_refview(actor: LancerActor, frame_path: string, helper: HelperOptions): string {
  let frame = resolve_helper_dotpath<Frame | null>(helper, frame_path, null);
  if (!frame) return simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path, true);

  // Generate commons
  let cd = ref_commons(frame);
  if (!cd) return simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path, true);

  return `
    <div class="card mech-frame ${ref_params(cd.ref, cd.uuid)}">
      <span class="lancer-header submajor clipped-top">
        ${frame.Source?.LID} ${frame.Name}
      </span>
      <div class="wraprow double">
        <div class="frame-traits flexcol">
          ${frameTraits(actor, frame)}
        </div>
        ${inc_if(buildCoreSysHTML(actor, frame.CoreSystem), frame.CoreSystem)}
      </div>
    </div>
    `;
}

/**
 * Builds HTML for a mech's core system.
 * @param actor   Mech actor which owns the core system.
 * @param core    The core system.
 * @return        HTML for the core system, typically for inclusion in a mech sheet.
 */
function buildCoreSysHTML(actor: LancerActor, core: CoreSystem): string {
  let tags: string | undefined;
  if (core.Tags !== undefined) {
    tags = compact_tag_list("", core.Tags, false);
  }

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  // Generate core passive HTML only if it has one
  let passive = "";
  if (core.PassiveEffect !== "" || core.PassiveActions.length > 0 || core.PassiveBonuses.length > 0) {
    passive = `<div class="frame-passive">${frame_passive(core)}</div>`;
  }

  return `<div class="core-wrapper frame-coresys clipped-top" style="padding: 0;">
    <div class="lancer-title coresys-title clipped-top">
      <span>${core.Name}</span> // CORE
      <i 
        class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" 
        data-collapse-id="${actor.id}_coresys" > 
      </i>
    </div>
    <div class="collapse" data-collapse-id="${actor.id}_coresys">
      <div class="frame-active">${frame_active(actor, core)}</div>
      ${passive}
      ${tags ? tags : ""}
    </div>
  </div>`;
}

function frameTraits(actor: LancerActor, frame: Frame): string {
  return frame.Traits.map((t: FrameTrait, i: number) => {
    return buildFrameTrait(actor, t, i);
  }).join("");
}

function buildFrameTrait(actor: LancerActor, trait: FrameTrait, index: number): string {
  let actionHTML = trait.Actions.map((a: Action, i: number | undefined) => {
    return buildActionHTML(a, { full: true, num: i });
  }).join("");

  let depHTML = trait.Deployables.map((d: Deployable, i: number | undefined) => {
    return buildDeployableHTML(d, true, i);
  }).join("");

  let macroData: LancerMacroData = {
    title: trait.Name,
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`,
    fn: "prepareFrameTraitMacro",
    args: [actor.id, index],
  };

  return `<div class="frame-trait clipped-top">
    <div class="lancer-header submajor frame-trait-header" style="display: flex">
      <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
      <span class="minor grow">${trait.Name}</span>
    </div>
    <div class="lancer-body">
      <div class="effect-text">${trait.Description}</div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
    </div>
  </div>`;
}

function frame_active(actor: LancerActor, core: CoreSystem): string {
  // So we have a CoreSystem with all the traits of an action inside itself as Active and Passive...
  // And then it has whole other arrays for its actions
  // :pain:

  let actionHTML = core.ActiveActions.map((a: Action, i: number | undefined) => {
    return buildActionHTML(a, { full: true, num: i });
  }).join("");

  let depHTML = core.Deployables.map((d: Deployable, i: number | undefined) => {
    return buildDeployableHTML(d, true, i);
  }).join("");

  // Should find a better way to do this...
  let coreMacroData: LancerMacroData = {
    title: `${actor.name} | CORE POWER`,
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`,
    fn: "prepareCoreActiveMacro",
    args: [actor.id],
  };

  return `
  <div class="core-active-wrapper clipped-top">
    <span class="lancer-header submajor">
      ${core.ActiveName} // ACTIVE
    </span>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.ActiveEffect ? core.ActiveEffect : ""}
      </div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
      ${buildChipHTML(core.Activation, { icon: ChipIcons.Core, fullData: coreMacroData })}
    </div>
  </div>
  `;
}

function frame_passive(core: CoreSystem): string {
  let actionHTML = core.PassiveActions.map((a: Action, i: number | undefined) => {
    return buildActionHTML(a, { full: true, num: i });
  }).join("");

  return `
  <div class="core-active-wrapper clipped-top">
    <span class="lancer-header submajor">
      ${core.PassiveName} // PASSIVE
    </span>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.PassiveEffect ? core.PassiveEffect : ""}
      </div>
      ${actionHTML ? actionHTML : ""}
    </div>
  </div>
  `;
}
