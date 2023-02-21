import type { HelperOptions } from "handlebars";
import { ChipIcons, EntryType } from "../enums";
import type { LancerMacroData } from "../interfaces";
import { encodeMacroData } from "../macros";
import { inc_if, resolve_helper_dotpath, array_path_edit } from "./commons";
import { mech_loadout_weapon_slot, buildActionHTML, buildDeployableHTML, buildChipHTML } from "./item";
import { item_preview, ref_params, simple_ref_slot } from "./refs";
import { compact_tag_list } from "./tags";
import type { LancerActor, LancerMECH, LancerPILOT } from "../actor/lancer-actor";
import { SystemData, SystemTemplates } from "../system-template";
import { LancerCORE_BONUS, LancerFRAME, LancerMECH_SYSTEM } from "../item/lancer-item";
import { ActionData } from "../models/bits/action";

export type CollapseRegistry = { [LID: string]: number };

// A drag-drop slot for a system mount.
function system_view(system_path: string, options: HelperOptions, collapse?: CollapseRegistry): string {
  let system = resolve_helper_dotpath(
    options,
    system_path
  ) as SystemTemplates.ResolvedEmbeddedRef<LancerMECH_SYSTEM> | null;
  if (!system) return "";

  if (system && system.status == "resolved") {
    let slot = item_preview(system_path, "splice", "embed-ref", options, collapse);

    return ` 
      <div class="mount card clipped">
        ${slot}
      </div>`;
  } else {
    // Assuming we just want to delete empty mounts, which may be a faulty assumption
    return "TODO: Handle bad slot";
  }
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(mount_path: string, options: HelperOptions, collapse: CollapseRegistry): string {
  let mech = resolve_helper_dotpath(options, "actor") as LancerMECH;
  let mount = resolve_helper_dotpath(options, mount_path) as SystemData.Mech["loadout"]["weapon_mounts"][0];

  // If bracing, override
  if (mount.bracing) {
    return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.type} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      <div class="lancer-body">
        <span class="major">LOCKED: BRACING</span>
      </div>
    </div>`;
  }

  let slots = mount.slots.map((slot, index) =>
    mech_loadout_weapon_slot(`${mount_path}.slots.${index}.weapon`, options, collapse, slot.size)
  );
  let err = mech.loadoutHelper.validateMount(mount) ?? "";

  // FLEX mount: Don't show the empty aux if a main is equipped.
  if (!err && mount.type === "Flex") {
    if (mount.slots[0].weapon?.value?.system.size === "Main") {
      slots = [slots[0]];
    }
  }

  return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.type} Weapon Mount</span>
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
function all_weapon_mount_view(loadout_path: string, options: HelperOptions, collapse: CollapseRegistry) {
  let loadout = resolve_helper_dotpath(options, loadout_path) as SystemData.Mech["loadout"];
  const weapon_mounts = loadout.weapon_mounts.map((_wep, index) =>
    weapon_mount(`${loadout_path}.weapon_mounts.${index}`, options, collapse)
  );

  return `
    <span class="lancer-header loadout-category submajor">
        <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="weapons"></i>   
        <span>MOUNTED WEAPONS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.weapon_mounts" data-action-value="(struct)wep_mount"></a>
        <a class="reset-all-weapon-mounts-button fas fa-redo" data-path="${loadout_path}.weapon_mounts"></a>
    </span>
    <div class="wraprow double collapse" data-collapse-id="weapons">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all systems mounted on a mech loadout
function all_system_view(loadout_path: string, options: HelperOptions, collapse: CollapseRegistry) {
  let loadout = resolve_helper_dotpath(options, loadout_path) as LancerMECH["system"]["loadout"];
  const system_views = loadout.systems.map((_sys, index) =>
    system_view(`${loadout_path}.systems.${index}`, options, collapse)
  );

  // Archiving add button: <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>

  return `
    <span class="lancer-header loadout-category submajor">
      <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="systems"></i>    
      <span>MOUNTED SYSTEMS</span>
      <span style="height:15px;width:48px;padding:0;"></span>
    </span>
    <div class="flexcol collapse" data-collapse-id="systems">
      ${system_views.join("")}
    </div>
    `;
}

/** Suuuuuper work in progress options. The loadout view for a mech (tech here can mostly be reused for pilot)
 * TODO:
 * - Weapon mods
 * - .... system mods :)
 * - Ref validation (you shouldn't be able to equip another mechs items, etc)
 */
export function mech_loadout(options: HelperOptions): string {
  const collapse: CollapseRegistry = {};

  const loadout_path = `system.loadout`;
  return `
    <div class="flexcol">
        ${all_weapon_mount_view(loadout_path, options, collapse)}
        ${all_system_view(loadout_path, options, collapse)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let pilot: LancerPILOT;
  if (options.hash.value) {
    pilot = options.hash.value;
  } else {
    let existing =
      options.hash["value"] ??
      resolve_helper_dotpath<SystemTemplates.ResolvedAsyncUuidRef<LancerPILOT> | null>(options, data_path, null);
    if (!existing || existing.status == "missing")
      return simple_ref_slot(data_path, [EntryType.PILOT], "uuid-ref", options);
    if (existing.status == "async") return "<span> Do not yet support ";
    pilot = existing.value;
  }

  return `<div class="pilot-summary">
    <img class="ref set pilot click-open" 
         ${ref_params(pilot, data_path)} 
         data-mode="uuid-ref"
         data-accept-types="pilot"
         style="height: 100%" src="${pilot.img}"/>
    <div class="license-level">
      <span>LL${pilot.system.level}</span>
    </div>
</div>`;
}

/**
 * Builds HTML for a frame reference. Either an empty ref to give a drop target, or a preview
 * with traits and core system.
 * @param actor       Actor the ref belongs to.
 * @param frame_slot_path  Path to the frame slot's location in actor data.
 * @param helper      Standard helper options.
 * @return            HTML for the frame reference, typically for inclusion in a mech sheet.
 */
export function mech_frame_refview(actor: LancerActor, frame_slot_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<SystemTemplates.ResolvedEmbeddedRef<LancerFRAME> | null>(
    options,
    frame_slot_path,
    null
  );
  if (!frame || frame.status == "missing")
    return simple_ref_slot(frame_slot_path, [EntryType.FRAME], "embed-ref", options);

  return `
    <div class="card mech-frame ${ref_params(frame.value)}">
      <span class="lancer-header submajor clipped-top">
       ${frame.value.name}
      </span>
      <div class="wraprow double">
        <div class="frame-traits flexcol">
          ${frameTraits(actor, frame.value)}
        </div>
        ${inc_if(buildCoreSysHTML(actor, frame.value.system.core_system), frame.value.system.core_system)}
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
function buildCoreSysHTML(actor: LancerActor, core: LancerFRAME["system"]["core_system"]): string {
  let tags: string | undefined;
  tags = compact_tag_list("", core.tags, false);

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  // Generate core passive HTML only if it has one
  let passive = "";
  if (core.passive_effect !== "" || core.passive_actions.length > 0 || core.passive_bonuses.length > 0) {
    passive = `<div class="frame-passive">${frame_passive(core)}</div>`;
  }

  return `<div class="core-wrapper frame-coresys clipped-top" style="padding: 0;">
    <div class="lancer-title coresys-title clipped-top">
      <span>${core.name}</span> // CORE
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

function frameTraits(actor: LancerActor, frame: LancerFRAME): string {
  return frame.system.traits
    .map((t, i) => {
      return buildFrameTrait(actor, t, i);
    })
    .join("");
}

function buildFrameTrait(actor: LancerActor, trait: LancerFRAME["system"]["traits"][0], index: number): string {
  let actionHTML = trait.actions
    .map((a, i) => {
      return buildActionHTML(a, { full: true, num: i });
    })
    .join("");

  let depHTML = "TODO deployables"; /* trait.deployables
    .map((d, i) => {
      return d.status == "resolved" ? buildDeployableHTML(d.value, true, i) : "";
    })
    .join("");*/

  let macroData: LancerMacroData = {
    title: trait.name,
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`,
    fn: "prepareFrameTraitMacro",
    args: [actor.uuid, index],
  };

  return `<div class="frame-trait clipped-top">
    <div class="lancer-header submajor frame-trait-header" style="display: flex">
      <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
      <span class="minor grow">${trait.name}</span>
    </div>
    <div class="lancer-body">
      <div class="effect-text">${trait.description}</div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
    </div>
  </div>`;
}

function frame_active(actor: LancerActor, core: LancerFRAME["system"]["core_system"]): string {
  // So we have a CoreSystem with all the traits of an action inside itself as Active and Passive...
  // And then it has whole other arrays for its actions
  // :pain:

  let actionHTML = core.active_actions
    .map((a: ActionData, i: number | undefined) => {
      return buildActionHTML(a, { full: true, num: i });
    })
    .join("");

  let depHTML = "TODO - DEPLOYABLES"; /*core.deployables
    .map((d, i) => {
      return d.status == "resolved" ? buildDeployableHTML(d.value, true, i) : "";
    })
    .join("");*/

  // Should find a better way to do this...
  let coreMacroData: LancerMacroData = {
    title: `${actor.name} | CORE POWER`,
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`,
    fn: "prepareCoreActiveMacro",
    args: [actor.uuid],
  };

  return `
  <div class="core-active-wrapper clipped-top">
    <span class="lancer-header submajor">
      ${core.active_name} // ACTIVE
    </span>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.active_effect ?? ""}
      </div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
      ${buildChipHTML(core.activation, { icon: ChipIcons.Core, fullData: coreMacroData })}
    </div>
  </div>
  `;
}

function frame_passive(core: LancerFRAME["system"]["core_system"]): string {
  let actionHTML = core.passive_actions
    .map((a: ActionData, i: number | undefined) => {
      return buildActionHTML(a, { full: true, num: i });
    })
    .join("");

  return `
  <div class="core-active-wrapper clipped-top">
    <span class="lancer-header submajor">
      ${core.passive_name ?? ""} // PASSIVE
    </span>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.passive_effect ?? ""}
      </div>
      ${actionHTML ?? ""}
    </div>
  </div>
  `;
}
