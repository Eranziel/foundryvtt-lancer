import type { HelperOptions } from "handlebars";
import { EntryType, FittingSize, MountType, SystemType, WeaponSize } from "../enums";
import {
  inc_if,
  resolveHelperDotpath,
  spDisplay,
  effectBox,
  defaultPlaceholder,
  manufacturerStyle,
  activationStyle,
  activationIcon,
} from "./commons";
import { mechLoadoutWeaponSlot, buildDeployablesArrayHBS, buildDeployablesArray, buildActionArrayHTML } from "./item";
import { limitedUsesIndicator, ref_params, simple_ref_slot } from "./refs";
import { compactTagListHBS, compactTagList } from "./tags";
import { LancerMECH, LancerPILOT } from "../actor/lancer-actor";
import { SystemData } from "../system-template";
import { LancerFRAME, LancerMECH_SYSTEM } from "../item/lancer-item";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { lookupOwnedDeployables, slugify } from "../util/lid";

// Render the HTML for a mech system card.
export function mechSystemViewHBS(
  system_path: string,
  helperOptions: HelperOptions,
  options?: { nonInteractive?: boolean }
): string {
  let collapse = resolveHelperDotpath<CollapseRegistry>(helperOptions, "collapse");
  let doc = resolveHelperDotpath<LancerMECH_SYSTEM>(helperOptions, system_path);
  if (!doc) return ""; // Hide our shame
  return mechSystemView(doc, system_path, options);
}

export function mechSystemView(
  doc: LancerMECH_SYSTEM,
  system_path: string | null,
  options?: { div?: boolean; nonInteractive?: boolean; vertical?: boolean }
): string {
  system_path = system_path ?? `system.systems.${doc.uuid}`;
  let icon: string;
  let sp: string;
  let contextMenu: string;
  let actions: string | undefined;
  let deployables: string | undefined;
  let eff: string | undefined;

  const icon_types = [SystemType.Deployable, SystemType.Drone, SystemType.Mod, SystemType.System, SystemType.Tech];
  if (icon_types.includes(doc.system.type)) {
    if (doc.system.type === SystemType.Tech) {
      icon = `cci cci-${slugify(doc.system.type, "-")}-quick i--m`;
    } else {
      icon = `cci cci-${slugify(doc.system.type, "-")} i--m`;
    }
  } else {
    icon = `cci cci-system i--m`;
  }

  sp = spDisplay(doc.system.sp ?? 0);

  contextMenu = `<a class="lancer-context-menu" data-path="${system_path}"">
    <i class="fas fa-ellipsis-v"></i>
  </a>`;

  // if (doc.system.description && doc.system.description !== "No description") {
  //   desc = `<div class="desc-text" style="padding: 5px">
  //         ${doc.system.description}
  //       </div>`;
  // }

  if (doc.system.effect) {
    eff = effectBox("EFFECT", doc.system.effect, { flow: !options?.nonInteractive || false });
  }

  if (doc.system.actions.length) {
    actions = buildActionArrayHTML(doc, "system.actions", options);
  }

  if (doc.system.deployables.length && doc.actor) {
    const deployablesMap = lookupOwnedDeployables(doc.actor, doc.system.deployables);
    deployables = buildDeployablesArray(doc, deployablesMap, options);
  }

  let limited = "";
  if (doc.isLimited()) {
    limited = `<div class="uses-wrapper">${limitedUsesIndicator(doc, system_path + ".value", options)}</div>`;
  }
  return `<${options?.div ? "div" : "li"}
    class="ref set card clipped-top lancer-system lancer-border-system ${
      doc.system.type === SystemType.Tech ? "tech-item" : ""
    }"
    data-item-id="${doc.id}"
    ${ref_params(doc)}
    style="margin: 0.3em;"
  >
    <div class="lancer-header lancer-system ${
      doc.system.destroyed ? "destroyed" : ""
    }" style="grid-area: 1/1/2/3; display: flex">
      <i class="${doc.system.destroyed ? "mdi mdi-cog" : icon}"> </i>
      ${options?.nonInteractive ? "" : '<a class="chat-flow-button"><i class="mdi mdi-message"></i></a>'}
      <span class="minor grow">${doc.name}</span>
      ${options?.nonInteractive ? "" : collapseButton(null /*collapse*/, doc)}
      <div class="ref-controls">
        ${options?.nonInteractive ? "" : contextMenu}
      </div>
    </div>
    <div class="collapse" ${collapseParam(null /*collapse*/, doc, true)} style="padding: 0.5em">
      ${limited}
      ${eff ? eff : ""}
      ${actions ? actions : ""}
      ${deployables ? deployables : ""}
      <div class="${options?.vertical ? "flexcol" : "flexrow"}">
        ${sp}
        ${compactTagList(doc.system.tags, system_path + ".system.tags", {
          editable: !(options?.nonInteractive ?? false),
        })}
      </div>
    </div>
  </${options?.div ? "div" : "li"}>`;
}

// A drag-drop slot for a weapon mount. TODO: delete button, clear button
function weaponMount(mount_path: string, options: HelperOptions): string {
  let mech = resolveHelperDotpath(options, "actor") as LancerMECH;
  let mount = resolveHelperDotpath(options, mount_path) as SystemData.Mech["loadout"]["weapon_mounts"][0];

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
    mechLoadoutWeaponSlot(
      `${mount_path}.slots.${index}.weapon.value`,
      `${mount_path}.slots.${index}.mod.value`,
      slot.size,
      options
    )
  );
  // Add an empty aux slot for flex mounts with 1 aux
  if (
    mount.type === "Flex" &&
    mount.slots.length === 1 &&
    mount.slots[0].weapon?.value?.system.size === WeaponSize.Aux
  ) {
    slots.push(
      mechLoadoutWeaponSlot(
        `${mount_path}.slots.1.weapon.value`,
        `${mount_path}.slots.1.mod.value`,
        FittingSize.Auxiliary,
        options
      )
    );
  }
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
function allWeaponMountView(loadout_path: string, options: HelperOptions) {
  let loadout = resolveHelperDotpath(options, loadout_path) as SystemData.Mech["loadout"];
  const weapon_mounts = loadout.weapon_mounts.map((_wep, index) =>
    weaponMount(`${loadout_path}.weapon_mounts.${index}`, options)
  );

  return `
    <div class="lancer-header lancer-dark-gray loadout-category submajor">
      <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="weapons"></i>   
      <span>MOUNTED WEAPONS</span>
      <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.weapon_mounts" data-action-value="(struct)wep_mount"></a>
      <a class="reset-all-weapon-mounts-button fas fa-redo" data-path="${loadout_path}.weapon_mounts"></a>
    </div>
    <div class="wraprow double collapse" data-collapse-id="weapons" style="margin-bottom: 0.75em">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all systems mounted on a mech loadout
function allMechSystemsView(loadout_path: string, options: HelperOptions) {
  let loadout = resolveHelperDotpath(options, loadout_path) as LancerMECH["system"]["loadout"];
  const system_views = loadout.systems.map((_sys, index) =>
    mechSystemViewHBS(`${loadout_path}.systems.${index}.value`, options)
  );

  // Archiving add button: <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>

  return `
    <div class="lancer-header lancer-dark-gray loadout-category submajor">
      <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="systems"></i>    
      <span>MOUNTED SYSTEMS</span>
      <span style="flex-grow: 0">
        <i class="cci cci-system-point i--m"></i>
        ${loadout.sp.value} / ${loadout.sp.max} SP USED
      </span>
    </div>
    <div class="flexcol collapse" data-collapse-id="systems">
      ${system_views.join("")}
    </div>
    `;
}

/** The loadout view for a mech
 * - Weapon mods
 * - .... system mods :)
 */
export function mechLoadout(options: HelperOptions): string {
  const loadout_path = `system.loadout`;
  return `
    <div class="flexcol">
        ${allWeaponMountView(loadout_path, options)}
        ${allMechSystemsView(loadout_path, options)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilotSlot(data_path: string, options: HelperOptions): string {
  // get the existing
  let pilot: LancerPILOT;
  if (options.hash.value) {
    pilot = options.hash.value;
  } else {
    pilot = resolveHelperDotpath<LancerPILOT | null>(options, data_path)!;
    if (!pilot) {
      return simple_ref_slot(data_path, [EntryType.PILOT], options);
    }
  }

  return `<div class="pilot-summary">
    <img class="ref set pilot click-open" 
         ${ref_params(pilot, data_path)} 
         data-accept-types="${EntryType.PILOT}"
         style="height: 100%" src="${pilot.img || "systems/lancer/assets/icons/pilot.svg"}"/>
    <div class="lancer-header lancer-primary license-level">
      <span>LL${pilot.system?.level || `[--]`}</span>
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
export function frameView(frame_path: string, core_energy: number, options: HelperOptions): string {
  let frame = resolveHelperDotpath<LancerFRAME | null>(options, frame_path);
  if (!frame) return simple_ref_slot(frame_path, [EntryType.FRAME], options);

  return `
    <div class="card mech-frame ${ref_params(frame)}">
      <span class="lancer-header ${manufacturerStyle(frame.system.manufacturer)} submajor clipped-top">
        ${frame.system.manufacturer} ${frame.name}
      </span>
      <div class="wraprow double">
        <div class="frame-traits flexcol">
          ${frameTraits(frame_path, options)}
        </div>
        ${frame.system.core_system ? buildCoreSysHTML(frame_path, core_energy, options) : ""}
      </div>
    </div>
    `;
}

/**
 * Builds HTML for a mech's core system.
 * @param frame   The frame
 * @return        HTML for the core system, typically for inclusion in a mech sheet.
 */
function buildCoreSysHTML(frame_path: string, core_energy: number, options: HelperOptions): string {
  let frame = resolveHelperDotpath<LancerFRAME>(options, frame_path)!;
  let tags = compactTagListHBS(`${frame_path}.core_system.tags`, options);
  let core = frame.system.core_system;

  // Removing desc temporarily because of space constraints
  // <div class="frame-core-desc">${core.Description ? core.Description : ""}</div>

  // Generate core passive HTML only if it has one
  let passive = "";
  if (core.passive_effect !== "" || core.passive_actions.length > 0 || core.passive_bonuses.length > 0) {
    passive = `<div class="frame-passive">${framePassive(frame)}</div>`;
  }
  let deployables = "";
  if (core.deployables.length) {
    deployables = buildDeployablesArrayHBS(frame, "system.core_system.deployables", options, { vertical: true });
  }
  const mfrBorder = manufacturerStyle(frame.system.manufacturer, true);
  const mfrStyle = manufacturerStyle(frame.system.manufacturer);

  return `<div class="core-wrapper ${mfrBorder} frame-coresys card clipped-top" style="padding: 0;">
    <div class="lancer-header ${mfrStyle} coresys-title">
      <span>${core.name}</span><span> // </span><span>CORE</span>
      <i 
        class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" 
        data-collapse-id="${frame.id}_core" > 
      </i>
    </div>
    <div class="collapse" data-collapse-id="${frame.id}_core">
      <div class="frame-active">${frameActive(frame_path, core_energy, options)}</div>
      ${passive}
      ${deployables}
      ${tags}
    </div>
  </div>`;
}

function frameTraits(frame_path: string, options: HelperOptions): string {
  let frame = resolveHelperDotpath<LancerFRAME>(options, frame_path)!;
  return frame.system.traits
    .map((trait, index) => {
      let actionHTML = buildActionArrayHTML(frame, `system.traits.${index}.actions`);
      let depHTML = buildDeployablesArrayHBS(frame, `system.traits.${index}.deployables`, options, { vertical: true });
      return `<div class="frame-trait clipped-top">
    <div
      class="lancer-header ${manufacturerStyle(frame.system.manufacturer)} submajor frame-trait-header"
    >
      <a class="chat-flow-button" data-uuid="${frame.uuid}" data-type="trait" data-index="${index}">
        <i class="mdi mdi-message"></i>
      </a>
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

function frameActive(frame_path: string, core_energy: number, options: HelperOptions): string {
  const frame = resolveHelperDotpath<LancerFRAME>(options, frame_path)!;
  const core = frame.system.core_system;
  const activeName = core.active_actions.length ? core.active_actions[0].name : core.name;
  const actionHTML = buildActionArrayHTML(frame, `system.core_system.active_actions`, {
    hideChip: core.active_actions.length <= 1,
  });
  const depHTML = buildDeployablesArrayHBS(frame, "system.core.deployables", options, { vertical: true });

  // If core energy is spent, "gray out" the core active
  const theme = core_energy ? manufacturerStyle(frame.system.manufacturer) : "lancer-light-gray";
  const activationClass = `activation-${slugify(core.activation, "-")}`;
  const activationThemeClass = core_energy ? activationStyle(core.activation) : "lancer-light-gray";

  return `
  <div class="core-active-wrapper clipped-top lancer-border-bonus">
    <div class="lancer-header ${theme} clipped-top submajor">
      <div class="grow">
        <span>${core.active_name}</span><span> // </span><span>ACTIVE</span>
      </div>
    </div>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.active_effect ?? ""}
      </div>
      ${actionHTML ? actionHTML : ""}
      ${depHTML ? depHTML : ""}
      <div class="core-active-activate">
        <a
          class="activation-chip activation-flow lancer-button ${activationClass} ${activationThemeClass}"
          data-uuid="${frame.uuid}" data-path="system.core_system"
        >
          <i class="cci cci-corebonus i--l"></i>
          <b class="active-name">${activeName.toUpperCase()}</b>
          <i class="${activationIcon(core.activation)} i--l"></i>
        </a>
      </div>
    </div>
  </div>
  `;
}

function framePassive(frame: LancerFRAME): string {
  let core = frame.system.core_system;
  let actionHTML = buildActionArrayHTML(frame, "system.core_system.passive_actions");

  return `
  <div class="core-passive-wrapper clipped-top lancer-border-bonus">
    <div class="lancer-header ${manufacturerStyle(frame.system.manufacturer)} clipped-top submajor">
      <a class="chat-flow-button" data-uuid="${frame.uuid}" data-type="passive">
        <i class="mdi mdi-message"></i>
      </a>
      <div class="grow">
        <span>${core.passive_name ?? ""}</span><span> // </span><span>PASSIVE</span>
      </div>
    </div>
    <div class="lancer-body">
      <div class="effect-text">
        ${core.passive_effect ?? ""}
      </div>
      ${actionHTML ?? ""}
    </div>
  </div>
  `;
}
