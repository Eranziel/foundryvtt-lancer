import { HelperOptions } from "handlebars";
import { EntryType,funcs, Mech, Npc, Pilot, RegEntry  } from "machine-mind";
import { LancerItemType } from "../item/lancer-item";
import { ext_helper_hash, inc_if, resolve_helper_dotpath, selected, std_num_input, std_x_of_y } from "./commons";
import { ref_commons, simple_mm_ref } from "./refs";
// ---------------------------------------
// Some simple stat editing thingies

// Shows an X / MAX clipped card
export function stat_edit_card_max(title: string, icon: string, data_path: string, max_path: string, options: HelperOptions): string {
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
      ${std_num_input(data_path, ext_helper_hash(options, {classes: "lancer-stat lancer-invisible-input"}))}
    </div>
    `;
}

// Shows a readonly value clipped card
export function stat_view_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `
    <div class="card clipped">
      <div class="lancer-header ">
        ${inc_if(`<i class="${icon} i--m i--light header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      <span class="lancer-stat major">${data_val}</span>
    </div>
    `;
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
  let max_val = resolve_helper_dotpath(options, max_path);
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          ${std_num_input(data_path, ext_helper_hash(options, {classes: "lancer-stat minor"}))}
          <span class="minor" style="max-width: min-content;" > / </span>
          <span class="lancer-stat minor">${max_val}</span>
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(data_path: string, options: HelperOptions) {
    return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      ${std_num_input(data_path, ext_helper_hash(options, {classes: "lancer-stat minor", default: 0}))}
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
}

// The above, in card form
export function clicker_stat_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  return `<div class="card clipped">
      <div class="lancer-header ">
        <i class="${icon} i--m i--light header-icon"> </i>
        <span class="major">${title}</span>
      </div>
      ${clicker_num_input(data_path, options)}
    </div>
  `;
}

export function npc_clicker_stat_card(title: string, data_path: string, options: HelperOptions): string {
  let data_val_arr: number[] = resolve_helper_dotpath(options, data_path) ?? [];
  let tier_clickers: string[] = [];
  let tier = 1;

  // Reset button

  // Make a clicker for every tier
  for(let val of data_val_arr) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${data_path}.${tier-1}`, options)}
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
  index = funcs.bound_int(index, 0, overcharge_sequence.length - 1)
  let over_val = overcharge_sequence[index];
  return `
    <div class="card clipped flexcol">
      <div class="lancer-header ">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class=flexrow>
        <a class="overcharge-button">
          <i class="cci cci-overcharge i--dark i--sm"> </i>
        </a>
        <span>${over_val}</span>
      </div>
    </div>`;
}


/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier_path: string, helper: HelperOptions) {
  let tier: number = resolve_helper_dotpath(helper, tier_path) ?? 1;
  let tiers: string[] = [1, 2, 3].map(tier_option => `
    <option value="${tier_option}" ${selected(tier_option === tier)}>TIER ${tier_option}</option>
  `);
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

