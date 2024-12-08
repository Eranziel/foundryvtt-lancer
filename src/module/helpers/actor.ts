import type { HelperOptions } from "handlebars";
import { type ActionType } from "../action";
import { actionIcon } from "../action/action-tracker";
import type { LancerActor, LancerMECH, LancerNPC, LancerPILOT } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { EntryType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { extendHelper, inc_if, resolveHelperDotpath, selected, std_num_input, std_x_of_y } from "./commons";
import { ref_params, simple_ref_slot } from "./refs";

// ---------------------------------------
// Some simple stat editing thingies

interface ButtonOverrides {
  icon?: string;
  classes?: string;
  tooltip?: string;
}

function _flowButton(button_class: string, html_data: string, overrides: ButtonOverrides = {}): string {
  const tooltip = overrides.tooltip ? `data-tooltip="${overrides.tooltip}"` : "";
  return `<a class="${button_class} lancer-button ${overrides.classes ?? ""}" ${html_data} ${tooltip}>
    <i class="fas ${overrides.icon ?? "fa-dice-d20"} i--dark i--s"></i>
  </a>`;
}

function _statFlowButton(uuid: string, path: string, overrides: ButtonOverrides = {}): string {
  const data = `data-uuid="${uuid}" data-path="${path}" data-flow-args="${""}"`;
  return _flowButton("roll-stat", data, overrides);
}

function _basicFlowButton(uuid: string, type = "BasicAttack", overrides: ButtonOverrides = {}): string {
  const data = `data-uuid="${uuid}" data-flow-type="${type}"`;
  return _flowButton("lancer-flow-button", data, overrides);
}

export function getActorUUID(options: HelperOptions): string | null {
  // Determine whether this is an unlinked token, so we can encode the correct id for the macro.
  const rActor = options.data.root.actor as LancerActor | undefined;
  return rActor?.uuid ?? null;
}

// Shows an X / MAX clipped card
export function stat_edit_card_max(
  title: string,
  icon: string,
  data_path: string,
  max_path: string,
  options: HelperOptions
): string {
  let data_val = resolveHelperDotpath(options, data_path, 0);
  let max_val = resolveHelperDotpath(options, max_path, 0);
  return `
    <div class="stat-card card clipped">
      <div class="lancer-header lancer-primary ">
        <i class="${icon} i--m i--light header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      ${std_x_of_y(data_path, data_val, max_val, "lancer-stat")}
    </div>
    `;
}

// Shows an X clipped card
export function stat_edit_card(
  title: string,
  icon: string,
  data_path: string,
  options: HelperOptions & { rollable?: boolean }
): string {
  let flowButton: string = "";
  if (options.rollable) {
    if (data_path === "system.burn") {
      flowButton = _basicFlowButton(getActorUUID(options)!, "Burn", {
        icon: "cci cci-burn",
        tooltip: "Roll a burn check and generate damage",
      });
    }
  }
  return `
    <div class="card clipped">
      <div class="lancer-header lancer-primary ">
        <i class="${icon} i--m i--light header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      <div class="${flowButton ? "stat-flow-container" : "flexrow flex-center"}">
        ${flowButton}
        ${std_num_input(data_path, extendHelper(options, { classes: "lancer-stat" }))}
      </div>
    </div>
    `;
}

export function stat_edit_rollable_card(
  title: string,
  icon: string,
  data_path: string,
  options: HelperOptions
): string {
  return stat_edit_card(title, icon, data_path, { ...options, rollable: true });
}

// Shows a readonly value clipped card
export function stat_view_card(
  title: string,
  icon: string,
  data_path: string,
  options: HelperOptions & { rollable?: boolean }
): string {
  let dataVal = resolveHelperDotpath(options, data_path);
  let leftFlowButton: string = "";
  let rightFlowButton: string = "";
  if (options.rollable) {
    leftFlowButton = _statFlowButton(getActorUUID(options)!, data_path);
    if (data_path === "system.grit" || data_path === "system.tier") {
      rightFlowButton = _basicFlowButton(getActorUUID(options)!, "BasicAttack", {
        icon: "cci cci-weapon",
        tooltip: "Roll a basic attack",
      });
    }
  }
  return `
    <div class="stat-card card clipped">
      <div class="lancer-header lancer-primary ">
        ${inc_if(`<i class="${icon} i--m i--light header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      <div class="${leftFlowButton || rightFlowButton ? "stat-flow-container" : "flexrow flex-center"}">
        ${leftFlowButton}
        <span class="lancer-stat major" data-path="${data_path}">${dataVal}</span>
        ${rightFlowButton}
      </div>
    </div>
    `;
}

// Show a readonly rollable clipped card
export function stat_rollable_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  return stat_view_card(title, icon, data_path, { ...options, rollable: true });
}

// Shows a compact readonly value
export function compact_stat_view(icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolveHelperDotpath(options, data_path);
  return `        
    <div class="compact-stat">
        <i class="${icon} i--m i--dark"></i>
        <span class="lancer-stat minor">${data_val}</span>
    </div>
    `;
}

// Shows a compact editable value
export function compact_stat_edit(icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolveHelperDotpath(options, data_path);
  let max_html = ``;
  if (max_path) {
    let max_val = resolveHelperDotpath(options, max_path);
    max_html = `<span class="lancer-stat minor" style="max-width: min-content;" > / </span>
    <span class="lancer-stat minor">${max_val}</span>`;
  }
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          ${std_num_input(data_path, extendHelper(options, { classes: "lancer-stat minor" }))}
          ${max_html}
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(data_path: string, options: HelperOptions) {
  return `<div class="flexrow arrow-input-container">
      <button class="clicker-minus-button input-update" type="button">‒</button>
      ${std_num_input(data_path, extendHelper(options, { classes: "lancer-stat minor", default: 0 }))}
      <button class="clicker-plus-button input-update" type="button">+</button>
    </div>`;
}

// The above, in card form
export function clicker_stat_card(
  title: string,
  icon: string,
  data_path: string,
  roller: boolean,
  options: HelperOptions
): string {
  let uuid = getActorUUID(options) ?? "unknown";
  let statButton = "";
  let attackButton = "<div></div>";
  if (roller) {
    statButton = `<a class="roll-stat lancer-button" data-uuid="${uuid}" data-path="${data_path}"><i class="fas fa-dice-d20 i--dark i--s"></i></a>`;
    if (data_path === "system.grit" || data_path === "system.tier") {
      attackButton = _basicFlowButton(uuid, "BasicAttack", { icon: "cci cci-weapon" });
    }
  }
  return `<div class="card clipped stat-container">
      <div class="lancer-header lancer-primary ">
        <i class="${icon} i--m i--light header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      <div class="flexrow">
        ${statButton}
        ${clicker_num_input(data_path, options)}
        ${attackButton}
      </div>
    </div>
  `;
}

export function bond_answer_selector(pilot: LancerPILOT, index: number): string {
  const bond = pilot.system.bond;
  const currentAnswer = pilot.system.bond_state.answers[index];
  if (!bond || index > bond.system.questions.length - 1) return "";
  let options = "";
  bond.system.questions[index].options.forEach(answer => {
    options += `<option value="${answer}" ${currentAnswer === answer ? "selected" : ""}>${answer}</option>\n`;
  });
  return `<select class="bond-question-select" name="system.bond_state.answers.${index}" data-type="String">
    ${options}
  </select>`;
}

export function bond_minor_ideal_selector(pilot: LancerPILOT): string {
  const bond = pilot.system.bond;
  const current_ideal = pilot.system.bond_state.minor_ideal;
  let options = "";
  bond?.system.minor_ideals.forEach(ideal => {
    options += `<option value="${ideal}" ${current_ideal === ideal ? "selected" : ""}>${ideal}</option>\n`;
  });
  return `<select class="bond-ideal-select" name="system.bond_state.minor_ideal" data-type="String">
    ${options}
  </select>`;
}

export function action_button(
  title: string,
  data_path: string,
  action: ActionType,
  options: HelperOptions & { rollable?: boolean }
): string {
  let action_val = resolveHelperDotpath(options, data_path);
  let active: boolean;
  if (action == "move") {
    active = (action_val as number) > 0;
    title = `${title} (${action_val})`;
  } else {
    active = action_val as boolean;
  }

  let enabled = false;
  if (game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers) {
    enabled = true;
  }

  const icon = `<i class="${actionIcon(action)} i--m"></i>`;

  return `
    <button
      class="lancer-action-button lancer-button${enabled ? " enabled" : ""}${active ? ` active lancer-${action}` : ""}"
      data-action="${action}"
      data-val="${action_val}"
  >
    ${icon}
    ${title}
  </button>`;
}

// Suitable for any macros that take a single argument: the actor uuid
export function actor_flow_button(
  title: string,
  type: string,
  options: HelperOptions & { rollable?: boolean }
): string {
  let args = JSON.stringify({});
  let mIcon;
  const BasicFlowType = LancerFlowState.BasicFlowType;
  switch (type) {
    case BasicFlowType.FullRepair:
      mIcon = "cci-repair";
      break;
    case BasicFlowType.Stabilize:
      mIcon = "cci-marker";
      break;
    case BasicFlowType.Overheat:
      mIcon = "cci-heat";
      break;
    case BasicFlowType.Structure:
      mIcon = "cci-condition-shredded";
      break;
    case BasicFlowType.BasicAttack:
      mIcon = "cci-weapon";
      break;
    case BasicFlowType.Damage:
      mIcon = "cci-large-beam";
      break;
    case BasicFlowType.TechAttack:
      mIcon = "cci-tech-quick";
      break;
  }

  return `
      <button type="button" class="lancer-flow-button lancer-button lancer-secondary" data-flow-type="${type}" data-flow-args=${args}>
        <i class="cci ${mIcon} i--m"></i> ${title}
      </button>
    `;
}

export function tech_flow_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let uuid = getActorUUID(options) ?? "unknown";
  let data_val = resolveHelperDotpath(options, data_path);

  return `
    <div class="stat-card card clipped">
      <div class="lancer-header lancer-primary">
        ${inc_if(`<i class="${icon} i--m i--light header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      <div class="stat-flow-container">
        ${_basicFlowButton(uuid, "TechAttack", { icon: "cci cci-tech-quick" })}
        <span class="lancer-stat major" data-path="${data_path}">${data_val}</span>
      </div>
    </div>
    `;
}

export function npc_stat_block_clicker_card(
  title: string,
  data_base_path: string,
  key: string,
  options: HelperOptions
): string {
  let stat_blocks: Array<Record<string, number>> = resolveHelperDotpath(options, data_base_path) ?? [];
  let tier_clickers: string[] = [];

  // Make a clicker for every tier
  for (let tier = 1; tier <= stat_blocks.length; tier++) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${data_base_path}.${tier - 1}.${key}`, options)}
      </div>`);
  }
  return `
    <div class="card clipped">
      <div class="flexrow lancer-header lancer-primary major">
        ${title}
      </div>
      ${tier_clickers.join("")}
    </div>`;
}

// Simpler case of above. Seem damage for a use case
export function npc_stat_array_clicker_card(title: string, path: string, options: HelperOptions): string {
  let stats = resolveHelperDotpath<number[]>(options, path) ?? [];
  let tier_clickers: string[] = [];

  // Make a clicker for every tier
  for (let tier = 1; tier <= stats.length; tier++) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${path}.${tier - 1}`, options)}
      </div>`);
  }
  return `
    <div class="card clipped">
      <div class="flexrow lancer-header major">
        ${title}
      </div>
      ${tier_clickers.join("")}
    </div>`;
}

/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param actor Reference to the actor
 * @param overcharge_path Path to current overcharge level, from 0 to 3
 * @param options Options object to pass to resolveHelperDotpath
 */
export function overchargeButton(actor: LancerMECH, overcharge_path: string, options: HelperOptions): string {
  const sequence = actor.system.overcharge_sequence.split(",");

  let index = resolveHelperDotpath(options, overcharge_path) as number;
  index = Math.max(0, Math.min(sequence.length - 1, index));
  let overchargeValue = sequence[index];
  let flowButton = _basicFlowButton(actor.uuid, "Overcharge");
  return `
    <div class="flexcol card clipped">
      <div class="lancer-header lancer-primary clipped-top flexrow">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class="overcharge-container">
        ${flowButton}
        <a class="overcharge-text">${overchargeValue}</a>
        <a class="overcharge-reset mdi mdi-restore"></a>
      </div>
    </div>`;
}

/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier_path: string, options: HelperOptions) {
  let tier = resolveHelperDotpath<number>(options, tier_path) ?? 1;
  let tiers: string[] = [1, 2, 3].map(
    tier_option => `
    <option value="${tier_option}" ${selected(tier_option === tier)}>TIER ${tier_option}</option>
  `
  );
  let template = `<select class="tier-control" name="npctier">
    ${tiers.join("")}
  </select>`;
  return template;
}

export function is_combatant(actor: LancerActor) {
  const combat = game.combat;
  if (combat) {
    return combat.combatants.find(comb => comb.actor?.uuid == actor.uuid);
  }
}

// Create a div with flags for dropping native pilots/mechs/npcs
export function deployer_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolveHelperDotpath<LancerPILOT | LancerMECH | LancerNPC | null>(options, data_path, null);
  if (!existing) {
    return simple_ref_slot(data_path, [EntryType.PILOT, EntryType.MECH, EntryType.NPC], options);
  }

  // Generate commons
  return `
    <div class="card clipped ${existing.type} ref set click-open" ${ref_params(existing)}>
      <div class="compact-deployer medium flexrow" >
        <span class="img-bar" style="background-image: url(${existing.img});"> </span>
        <div class="major modifier-name i--light">${existing.type.toUpperCase()} ${existing.name}</div>
      </div>
    </div>`;
}
