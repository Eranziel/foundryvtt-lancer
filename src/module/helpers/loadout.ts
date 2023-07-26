import type { HelperOptions } from "handlebars";
import { ChipIcons, EntryType, SystemType } from "../enums";
import { encodeMacroData } from "../macros";
import { inc_if, resolve_helper_dotpath, sp_display, effect_box, defaultPlaceholder } from "./commons";
import { mech_loadout_weapon_slot, buildChipHTML, buildDeployablesArray, buildActionArrayHTML } from "./item";
import { limited_uses_indicator, ref_params, simple_ref_slot } from "./refs";
import { compact_tag_list } from "./tags";
import { LancerMECH, LancerPILOT } from "../actor/lancer-actor";
import { SystemData } from "../system-template";
import { LancerFRAME, LancerMECH_SYSTEM } from "../item/lancer-item";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { LancerFlowState } from "../flows/interfaces";
import { slugify } from "../util/lid";

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
    ? `cci cci-${slugify(doc.system.type, "-")} i--m i--click`
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
    actions = buildActionArrayHTML(doc, "system.actions");
  }

  if (doc.system.deployables.length) {
    deployables = buildDeployablesArray(doc, "system.deployables", options);
  }

  let macroData: LancerFlowState.InvocationData = {
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
    title: doc.name!,
    fn: "prepareItemMacro",
    args: [doc.uuid],
  };

  let limited = "";
  if (doc.isLimited()) {
    limited = limited_uses_indicator(doc, system_path + ".value");
  }
  return `<li class="ref set card clipped lancer-system ${
    doc.system.type === SystemType.Tech ? "tech-item" : ""
  }" ${ref_params(doc)} style="margin: 0;">
        <div class="lancer-header lancer-system ${
          doc.system.destroyed ? "destroyed" : ""
        }" style="grid-area: 1/1/2/3; display: flex">
          <i class="${doc.system.destroyed ? "mdi mdi-cog" : icon}"> </i>
          <a class="lancer-macro" data-macro="${encodeMacroData(macroData)}"><i class="mdi mdi-message"></i></a>
          <span class="minor grow">${doc.name}</span>
          ${collapseButton(collapse, doc)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-path="${system_path}"">
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
          ${compact_tag_list(system_path + ".system.tags", options)}
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
      <div class="lancer-header lancer-primary mount-type-ctx-root" data-path="${mount_path}">
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
      <div class="lancer-header lancer-primary mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.type} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      ${inc_if(`<span class="lancer-header lancer-primary error">${err.toUpperCase()}</span>`, err)}
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
    <span class="lancer-header lancer-dark-gray loadout-category submajor">
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
    <span class="lancer-header lancer-dark-gray loadout-category submajor">
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
         data-accept-types="${EntryType.PILOT}"
         style="height: 100%" src="${pilot.img}"/>
    <div class="lancer-header lancer-primary license-level">
      <span>LL${pilot.system.level}</span>
    </div>
</div>`;
}

function manufacturerStyle(mfr: string): string {
  let manufacturer = slugify(mfr, "-");
  if (!["gms", "ipsn", "ssc", "horus", "ha"].includes(manufacturer)) {
    manufacturer = "primary";
  }
  return `lancer-${manufacturer}`;
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
      <span class="lancer-header ${manufacturerStyle(frame.system.manufacturer)} submajor clipped-top">
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
  let tags = compact_tag_list(`${frame_path}.core_system.tags`, options);
  let core = frame.system.core_system;

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  // Generate core passive HTML only if it has one
  let passive = "";
  if (core.passive_effect !== "" || core.passive_actions.length > 0 || core.passive_bonuses.length > 0) {
    passive = `<div class="frame-passive">${frame_passive(frame)}</div>`;
  }
  let deployables = "";
  if (core.deployables.length) {
    deployables = buildDeployablesArray(frame, "system.core_system.deployables", options);
  }

  return `<div class="core-wrapper frame-coresys clipped-top" style="padding: 0;">
    <div class="lancer-header ${manufacturerStyle(frame.system.manufacturer)} coresys-title clipped-top">
      <span>${core.name}</span> // CORE
      <i 
        class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" 
        data-collapse-id="${frame.id}_core" > 
      </i>
    </div>
    <div class="collapse" data-collapse-id="${frame.id}_core">
      <div class="frame-active">${frame_active(frame_path, options)}</div>
      ${passive}
      ${deployables}
      ${tags}
    </div>
  </div>`;
}

function frameTraits(frame_path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME>(options, frame_path)!;
  return frame.system.traits
    .map((trait, index) => {
      let actionHTML = buildActionArrayHTML(frame, `frame.system.traits.${index}.actions`);
      let depHTML = buildDeployablesArray(frame, `system.traits.${index}.deployables`, options);

      let macroData: LancerFlowState.InvocationData | null = frame.actor
        ? {
            title: trait.name,
            iconPath: `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`,
            fn: "prepareFrameTraitMacro",
            args: [frame.actor.uuid, index],
          }
        : null;

      return `<div class="frame-trait clipped-top">
    <div class="lancer-header ${manufacturerStyle(
      frame.system.manufacturer
    )} submajor frame-trait-header" style="display: flex">
      ${inc_if(
        `<a class="lancer-macro" data-macro="${encodeMacroData(macroData!)}"><i class="mdi mdi-message"></i></a>`,
        macroData
      )}
      <span class="minor grow">${trait.name}</span>
    </div>
    <div class="lancer-body">
      <div class="effect-text">${trait.description || defaultPlaceholder}</div>
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
  let actionHTML = buildActionArrayHTML(frame, `system.core_system.active_actions`);
  let depHTML = buildDeployablesArray(frame, "system.core.deployables", options);

  // Should find a better way to do this...
  let coreMacroData: LancerFlowState.InvocationData | null = frame.actor
    ? {
        title: `${frame.actor.name} | CORE POWER`,
        iconPath: `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`,
        fn: "prepareCoreActiveMacro",
        args: [frame.actor.uuid],
      }
    : null;

  return `
  <div class="core-active-wrapper clipped-top lancer-border-bonus">
    <span class="lancer-header lancer-bonus submajor">
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
      return buildActionArrayHTML(frame, "system.core_system.passive_actions");
    })
    .join("");

  return `
  <div class="core-active-wrapper clipped-top lancer-border-bonus">
    <span class="lancer-header lancer-bonus submajor">
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
