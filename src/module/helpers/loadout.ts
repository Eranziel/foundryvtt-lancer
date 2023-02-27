import type { HelperOptions } from "handlebars";
import { ChipIcons, EntryType, SystemType } from "../enums";
import { encodeMacroData } from "../macros";
import { inc_if, resolve_helper_dotpath, array_path_edit, sp_display, effect_box } from "./commons";
import {
  mech_loadout_weapon_slot,
  buildActionHTML,
  buildDeployableHTML,
  buildChipHTML,
  buildDeployablesArray,
  buildActionArrayHTML,
} from "./item";
import { item_preview, limited_uses_indicator, ref_params, simple_ref_slot } from "./refs";
import { compact_tag_list } from "./tags";
import { LancerActor, LancerDEPLOYABLE, LancerMECH, LancerPILOT } from "../actor/lancer-actor";
import { SystemData, SystemTemplates } from "../system-template";
import { LancerCORE_BONUS, LancerFRAME, LancerMECH_SYSTEM } from "../item/lancer-item";
import { ActionData } from "../models/bits/action";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { LancerMacro } from "../macros/interfaces";

// A drag-drop slot for a system mount.
export function mech_system_view(system_path: string, options: HelperOptions): string {
  let collapse = resolve_helper_dotpath<CollapseRegistry>(options, "collapse");
  let doc = resolve_helper_dotpath<LancerMECH_SYSTEM>(options, system_path);
  if (!doc) return ""; // Hide our shame

  let icon: string;
  let sp: string;
  let desc: string | undefined;
  let actions: string | undefined;
  let deployables: string | undefined;
  let eff: string | undefined;

  const icon_types = [SystemType.Deployable, SystemType.Drone, SystemType.Mod, SystemType.System, SystemType.Tech];
  icon = icon_types.includes(doc.system.type)
    ? `cci cci-${doc.system.type.toLowerCase()} i--m i--click`
    : `cci cci-system i--m i--click`;

  sp = sp_display(doc.system.sp ?? 0);

  if (doc.system.description && doc.system.description !== "No description") {
    desc = `<div class="desc-text" style="padding: 5px">
          ${doc.system.description}
        </div>`;
  }

  if (doc.system.effect) {
    eff = effect_box("EFFECT", doc.system.effect);
  }

  if (doc.system.actions.length) {
    actions = buildActionHTML(doc, "system.actions");
  }

  if (doc.system.deployables.length) {
    deployables = buildDeployablesArray(doc, "system.deployables", options);
  }

  let macroData: LancerMacro.Invocation = {
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
    title: doc.name!,
    fn: "prepareItemMacro",
    args: [doc.uuid],
  };

  let limited = "";
  if (doc.isLimited()) {
    limited = limited_uses_indicator(doc, system_path + ".value");
  }
  return `<li class="ref set card clipped mech-system item ${
    doc.system.type === SystemType.Tech ? "tech-item" : ""
  }" ${ref_params(doc)} style="margin: 0;">
        <div class="lancer-header ${doc.system.destroyed ? "destroyed" : ""}" style="grid-area: 1/1/2/3; display: flex">
          <i class="${doc.system.destroyed ? "mdi mdi-cog" : icon}"> </i>
          <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
          <span class="minor grow">${doc.name}</span>
          ${collapseButton(collapse, doc)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${doc.type}" data-path="${system_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div class="collapse" ${collapseParam(collapse, doc, true)} style="padding: 0.5em">
          <div class="flexrow">
            ${sp}
            <div class="uses-wrapper">
              ${limited}
            </div>
          </div>
<!--          ${desc ? desc : ""}-->
          ${eff ? eff : ""}
          ${actions ? actions : ""}
          ${deployables ? deployables : ""}
          ${compact_tag_list(system_path + ".system.tags", doc.system.tags, false)}
        </div>
        </li>`;
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weapon_mount(mount_path: string, options: HelperOptions): string {
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
    mech_loadout_weapon_slot(
      `${mount_path}.slots.${index}.weapon.value`,
      `${mount_path}.slots.${index}.mod.value`,
      slot.size,
      options
    )
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
function all_weapon_mount_view(loadout_path: string, options: HelperOptions) {
  let loadout = resolve_helper_dotpath(options, loadout_path) as SystemData.Mech["loadout"];
  const weapon_mounts = loadout.weapon_mounts.map((_wep, index) =>
    weapon_mount(`${loadout_path}.weapon_mounts.${index}`, options)
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
function all_system_view(loadout_path: string, options: HelperOptions) {
  let loadout = resolve_helper_dotpath(options, loadout_path) as LancerMECH["system"]["loadout"];
  const system_views = loadout.systems.map((_sys, index) =>
    mech_system_view(`${loadout_path}.systems.${index}.value`, options)
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

/** The loadout view for a mech
 * - Weapon mods
 * - .... system mods :)
 */
export function mech_loadout(options: HelperOptions): string {
  const loadout_path = `system.loadout`;
  return `
    <div class="flexcol">
        ${all_weapon_mount_view(loadout_path, options)}
        ${all_system_view(loadout_path, options)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let pilot: LancerPILOT;
  if (options.hash.value) {
    pilot = options.hash.value;
  } else {
    pilot = resolve_helper_dotpath<LancerPILOT | null>(options, data_path)!;
    if (!pilot) {
      return simple_ref_slot(data_path, [EntryType.PILOT], options);
    }
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
 * @param frame_path  Path to the frame location
 * @param options      Standard helper options.
 * @return            HTML for the frame reference, typically for inclusion in a mech sheet.
 */
export function frameView(frame_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME | null>(options, frame_path);
  if (!frame) return simple_ref_slot(frame_path, [EntryType.FRAME], options);

  return `
    <div class="card mech-frame ${ref_params(frame)}">
      <span class="lancer-header submajor clipped-top">
       ${frame.name}
      </span>
      <div class="wraprow double">
        <div class="frame-traits flexcol">
          ${frameTraits(frame_path, options)}
        </div>
        ${inc_if(buildCoreSysHTML(frame_path, options), frame.system.core_system)}
      </div>
    </div>
    `;
}

/**
 * Builds HTML for a mech's core system.
 * @param frame   The frame
 * @return        HTML for the core system, typically for inclusion in a mech sheet.
 */
function buildCoreSysHTML(frame_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME>(options, frame_path)!;
  let tags: string | undefined;
  let core = frame.system.core_system;
  tags = compact_tag_list("", core.tags, false);

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  // Generate core passive HTML only if it has one
  let passive = "";
  if (core.passive_effect !== "" || core.passive_actions.length > 0 || core.passive_bonuses.length > 0) {
    passive = `<div class="frame-passive">${frame_passive(frame)}</div>`;
  }

  return `<div class="core-wrapper frame-coresys clipped-top" style="padding: 0;">
    <div class="lancer-title coresys-title clipped-top">
      <span>${core.name}</span> // CORE
      <i 
        class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" 
        data-collapse-id="${frame.id}_core" > 
      </i>
    </div>
    <div class="collapse" data-collapse-id="${frame.id}_core">
      <div class="frame-active">${frame_active(frame_path, options)}</div>
      ${passive}
      ${tags ? tags : ""}
    </div>
  </div>`;
}

function frameTraits(frame_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME>(options, frame_path)!;
  return frame.system.traits
    .map((trait, index) => {
      let actionHTML = buildActionArrayHTML(frame, `frame.system.traits.${index}.actions`);
      let depHTML = buildDeployablesArray(frame, `system.traits.${index}.deployables`, options);

      let macroData: LancerMacro.Invocation | null = frame.actor
        ? {
            title: trait.name,
            iconPath: `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`,
            fn: "prepareFrameTraitMacro",
            args: [frame.actor.uuid, index],
          }
        : null;

      return `<div class="frame-trait clipped-top">
    <div class="lancer-header submajor frame-trait-header" style="display: flex">
      ${inc_if(
        `<a class="lancer-macro" data-macro="${encodeMacroData(macroData!)}"><i class="mdi mdi-message"></i></a>`,
        macroData
      )}
      <span class="minor grow">${trait.name}</span>
    </div>
    <div class="lancer-body">
      <div class="effect-text">${trait.description}</div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
    </div>
  </div>`;
    })
    .join("");
}

function frame_active(frame_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME>(options, frame_path)!;
  let core = frame.system.core_system;
  let actionHTML = core.active_actions.map((_, i) =>
    buildActionHTML(frame, `system.active_actions.${i}`, { full: true })
  );

  let depHTML = buildDeployablesArray(frame, "system.core.deployables", options);

  // Should find a better way to do this...
  let coreMacroData: LancerMacro.Invocation | null = frame.actor
    ? {
        title: `${frame.actor.name} | CORE POWER`,
        iconPath: `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`,
        fn: "prepareCoreActiveMacro",
        args: [frame.actor.uuid],
      }
    : null;

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

function frame_passive(frame: LancerFRAME): string {
  let core = frame.system.core_system;
  let actionHTML = core.passive_actions
    .map((_, i) => {
      return buildActionHTML(frame, "system.core_system.passive_actions", { full: true });
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
