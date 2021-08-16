import type { HelperOptions } from "handlebars";
import { EntryType, funcs, Mech, Npc, Pilot } from "machine-mind";
import { ext_helper_hash, inc_if, resolve_helper_dotpath, selected, std_num_input, std_x_of_y } from "./commons";
import { simple_mm_ref } from "./refs";
import { encodeMacroData } from "../macros";
import type { ActionType } from "../action";
import { LANCER } from "../config";
// ---------------------------------------
// Some simple stat editing thingies

// Shows an X / MAX clipped card
export function stat_edit_card_max(
  title: string,
  icon: string,
  data_path: string,
  max_path: string,
  options: HelperOptions
): string {
  let data_val = resolve_helper_dotpath(options, data_path, 0);
  let max_val = resolve_helper_dotpath(options, max_path, 0);
  return `
    <div class="card clipped">
      <div class="lancer-header ">
        <i class="${icon} i--m header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      ${std_x_of_y(data_path, data_val, max_val, "lancer-stat")}
    </div>
    `;
}

// Shows an X clipped card
export function stat_edit_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  return `
    <div class="card clipped">
      <div class="lancer-header ">
        <i class="${icon} i--m header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      ${std_num_input(data_path, ext_helper_hash(options, { classes: "lancer-stat" }))}
    </div>
    `;
}

// Shows a readonly value clipped card
export function stat_view_card(
  title: string,
  icon: string,
  data_path: string,
  options: HelperOptions & { rollable?: boolean }
): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  let macro_button: string | undefined;
  let macroData = encodeMacroData({
    command: `game.lancer.prepareStatMacro("${options.data.root.data._id}","${data_path}");`,
    title: title,
  });
  if (options.rollable)
    macro_button = `<a class="i--dark i--sm lancer-macro" data-macro="${macroData}"><i class="fas fa-dice-d20"></i></a>`;
  return `
    <div class="card clipped">
      <div class="lancer-header ">
        ${inc_if(`<i class="${icon} i--m i--light header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      <div class="flexrow ${macro_button ? "stat-macro-container" : ""}">
      ${macro_button ? macro_button : ""}
        <span class="lancer-stat major" data-path="${data_path}">${data_val}</span>
        ${macro_button ? "<div></div>" : ""}
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
  let data_val = resolve_helper_dotpath(options, data_path);
  return `        
    <div class="compact-stat">
        <i class="${icon} i--m i--dark"></i>
        <span class="lancer-stat minor">${data_val}</span>
    </div>
    `;
}

// Shows a compact editable value
export function compact_stat_edit(icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  let max_html = ``;
  if (max_path) {
    let max_val = resolve_helper_dotpath(options, max_path);
    max_html = `<span class="minor" style="max-width: min-content;" > / </span>
    <span class="lancer-stat minor">${max_val}</span>`;
  }
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          ${std_num_input(data_path, ext_helper_hash(options, { classes: "lancer-stat minor" }))}
          ${max_html}
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(data_path: string, options: HelperOptions) {
  return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      ${std_num_input(data_path, ext_helper_hash(options, { classes: "lancer-stat minor", default: 0 }))}
      <button class="mod-plus-button" type="button">+</button>
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
  let button = "";
  let macroData = encodeMacroData({
    command: `game.lancer.prepareStatMacro("${options.data.root.data._id}","${data_path}");`,
    title: title,
  });
  if (roller)
    button = `<a class="lancer-macro i--dark i--sm" data-macro="${macroData}"><i class="fas fa-dice-d20"></i></a>`;
  return `<div class="card clipped stat-container">
      <div class="lancer-header ">
        <i class="${icon} i--m i--light header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      <div class="flexrow">
        ${button}
        ${clicker_num_input(data_path, options)}
      </div>
    </div>
  `;
}

export function action_button(
  title: string,
  data_path: string,
  action: ActionType,
  options: HelperOptions & { rollable?: boolean }
): string {
  let action_val = resolve_helper_dotpath(options, data_path);
  let active: boolean;
  if (action == "move") {
    active = (action_val as number) > 0;
    title = `${title} (${action_val})`;
  } else {
    active = action_val as boolean;
  }

  let enabled = false;
  if (game.user?.isGM || game.settings.get(LANCER.sys_name, LANCER.setting_action_manager_players)) {
    enabled = true;
  }

  return `
    <button class="lancer-action-button${active ? ` active activation-${action}` : ""}${
    enabled ? ` enabled` : ""
  }" data-action="${action}" data-val="${action_val}">
      ${title}
    </button>
    `;
}

export function npc_clicker_stat_card(title: string, data_path: string, options: HelperOptions): string {
  let data_val_arr: number[] = resolve_helper_dotpath(options, data_path) ?? [];
  let tier_clickers: string[] = [];
  let tier = 1;

  // Reset button

  // Make a clicker for every tier
  for (let val of data_val_arr) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${data_path}.${tier - 1}`, options)}
      </div>`);
    tier++;
  }
  return `
    <div class="card clipped">
      <div class="flexrow lancer-header major">
        <span class="lancer-header major ">${title}</span>
        <a class="gen-control" data-path="${data_path}" data-action="set" data-action-value="(struct)npc_stat_array"><i class="fas fa-redo"></i></a>
      </div>
      ${tier_clickers.join("")}
    </div>`;
}

/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param overcharge_path Path to current overcharge level, from 0 to 3
 */
export function overcharge_button(overcharge_path: string, options: HelperOptions): string {
  const overcharge_sequence = ["1", "1d3", "1d6", "1d6 + 4"];

  let index = resolve_helper_dotpath(options, overcharge_path) as number;
  index = funcs.bound_int(index, 0, overcharge_sequence.length - 1);
  let over_val = overcharge_sequence[index];
  return `
    <div class="flexcol card clipped">
      <div class="lancer-header clipped-top flexrow">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class="overcharge-container">
        <a class="overcharge-macro macroable i--dark i--sm" data-action="roll-macro"><i class="fas fa-dice-d20"></i></a>
        <a class="overcharge-text">${over_val}</a>
        <a class="overcharge-reset mdi mdi-restore"></a>
      </div>
    </div>`;
}

/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier_path: string, helper: HelperOptions) {
  let tier: number = resolve_helper_dotpath(helper, tier_path) ?? 1;
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

// Create a div with flags for dropping native pilots/mechs/npcs
export function deployer_slot(data_path: string, options: HelperOptions): string {
  // get the existing
  let existing = resolve_helper_dotpath<Pilot | Mech | Npc | null>(options, data_path, null);
  return simple_mm_ref([EntryType.PILOT, EntryType.MECH, EntryType.NPC], existing, "No Deployer", data_path, true);
}
