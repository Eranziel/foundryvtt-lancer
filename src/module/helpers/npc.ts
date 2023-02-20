import type { HelperOptions } from "handlebars";
import { ActivationType, EntryType, NpcFeatureType } from "../enums";
import { LancerNPC_FEATURE } from "../item/lancer-item";
import { SystemData, SystemTemplates } from "../system-template";
import { charged_box, effect_box, resolve_helper_dotpath } from "./commons";
import {
  action_type_icon,
  loading_indicator,
  npc_accuracy_preview,
  npc_attack_bonus_preview,
  show_damage_array,
  show_range_array,
} from "./item";
import { limited_uses_indicator, ref_params } from "./refs";
import { compact_tag_list } from "./tags";

export const EffectIcons = {
  Generic: `systems/lancer/assets/icons/generic_item.svg`,
  Basic: `systems/lancer/assets/icons/generic_item.svg`,
  Charge: `systems/lancer/assets/icons/mine.svg`,
  Deployable: `systems/lancer/assets/icons/deployable.svg`,
  AI: `systems/lancer/assets/icons/mech_system.svg`,
  Protocol: `systems/lancer/assets/icons/protocol.svg`,
  Reaction: `systems/lancer/assets/icons/reaction.svg`,
  Tech: `systems/lancer/assets/icons/tech_quick.svg`,
  Drone: `systems/lancer/assets/icons/drone.svg`,
  Bonus: `systems/lancer/assets/icons/shape_polygon_plus.svg`,
  Offensive: `systems/lancer/assets/icons/sword_array.svg`,
  Profile: `systems/lancer/assets/icons/weapon_profile.svg`,
};

/* ------------------------------------ */
/* Handlebars Helpers                   */
/* ------------------------------------ */

/**
 * Handlebars helper for effect action type
 */
export function action_type_selector(a_type: string, data_target: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';
  html += action_type_icon(a_type);
  html += `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${ActivationType.None}" ${a === ActivationType.None.toLowerCase() ? "selected" : ""}>NONE</option>
    <option value="${ActivationType.Full}" ${a === ActivationType.Full.toLowerCase() ? "selected" : ""}>FULL</option>
    <option value="${ActivationType.Quick}" ${a === ActivationType.Quick.toLowerCase() ? "selected" : ""}>QUICK</option>
    <option value="${ActivationType.Reaction}" ${
    a === ActivationType.Reaction.toLowerCase() ? "selected" : ""
  }>REACTION</option>
    <option value="${ActivationType.Protocol}" ${
    a === ActivationType.Protocol.toLowerCase() ? "selected" : ""
  }>PROTOCOL</option>
    <option value="${ActivationType.Passive}" ${
    a === ActivationType.Passive.toLowerCase() ? "selected" : ""
  }>PASSIVE</option>
    <option value="${ActivationType.Other}" ${a === ActivationType.Other.toLowerCase() ? "selected" : ""}>OTHER</option>
  </select>
  </div>`;
  return html;
}

// TODO: Make this globally consistent
function del_button(path: string, options: HelperOptions): string {
  let trash_action = options.hash["trash-action"] ?? "delete";
  return `<a class="gen-control" data-action="${trash_action}" data-path="${path}"><i class="fas fa-trash"></i></a>`;
}

function npc_feature_scaffold(path: string, npc_feature: LancerNPC_FEATURE, body: string, options: HelperOptions) {
  let feature_class = `npc-${npc_feature.type.toLowerCase()}`;
  let icon = `cci-${npc_feature.type.toLowerCase()}`;
  if (npc_feature.system.type === NpcFeatureType.Tech) icon += "-quick";
  let macro_button = "";
  if (npc_feature.system.type !== NpcFeatureType.Weapon) {
    macro_button = `<a class="macroable item-macro"><i class="mdi mdi-message"></i></a>`;
  }
  return `
  <div class="valid ref card item ${feature_class}" ${ref_params(npc_feature)}>
    <div class="flexrow lancer-header clipped-top ${npc_feature.system.destroyed ? "destroyed" : ""}">
      <i class="${npc_feature.system.destroyed ? "mdi mdi-cog" : `cci ${icon} i--m i--light`}"> </i>
      ${macro_button}
      <span class="minor grow">${npc_feature.name}</span>
      <a class="lancer-context-menu" data-context-menu="${EntryType.NPC_FEATURE}" data-path="${path}">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    ${body}
  </div>`;
}

export function npc_reaction_effect_preview(path: string, options: HelperOptions) {
  let npc_feature: LancerNPC_FEATURE = resolve_helper_dotpath(options, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${
        npc_feature.system.tags.find(tag => tag.lid === "tg_recharge")
          ? charged_box(npc_feature.system.charged, path)
          : ""
      }
      ${effect_box("TRIGGER", (npc_feature.system as SystemTemplates.NPC.ReactionData).trigger)}
      ${effect_box("EFFECT", npc_feature.system.effect)}
      ${compact_tag_list(path + ".system.tags", npc_feature.system.tags, false)}
    </div>`,
    options
  );
}

// The below 2 funcs just map to this one, because they all do the same thing
function npc_system_trait_effect_preview(path: string, options: HelperOptions) {
  let npc_feature: LancerNPC_FEATURE = resolve_helper_dotpath(options, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${npc_feature.system.tags.find(tag => tag.lid === "tg_limited") ? limited_uses_indicator(npc_feature, path) : ""}
      ${
        npc_feature.system.tags.find(tag => tag.lid === "tg_recharge")
          ? charged_box(npc_feature.system.charged, path)
          : ""
      }
      ${effect_box("EFFECT", npc_feature.system.effect)}
      ${compact_tag_list(path + ".system.tags", npc_feature.system.tags, false)}
    </div>`,
    options
  );
}

export function npc_system_effect_preview(path: string, options: HelperOptions) {
  return npc_system_trait_effect_preview(path, options);
}

export function npc_trait_effect_preview(path: string, options: HelperOptions) {
  return npc_system_trait_effect_preview(path, options);
}

export function npc_tech_effect_preview(path: string, options: HelperOptions) {
  // Get the feature
  let npc_feature: LancerNPC_FEATURE = resolve_helper_dotpath(options, path);
  let feature_data = npc_feature.system as SystemTemplates.NPC.TechData;

  // Get the tier (or default 1)
  let tier_index: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-tech"><i class="fas fa-dice-d20 i--m"></i></a>`];

  let attack_bonus = feature_data.attack_bonus[tier_index];
  let from_sys = false;

  // If we didn't find one, retrieve. Maybe check for undefined as we want an explicit 0 to be a true 0? How to support this in UI?
  if (!attack_bonus) {
    resolve_helper_dotpath(options, "system.systems", 0, true); // A bit lazy. Expand this to cover more cases if needed
    from_sys = true;
  }
  if (attack_bonus) {
    subheader_items.push(npc_attack_bonus_preview(attack_bonus, from_sys ? "ATK (SYS)" : "ATTACK"));
  }

  // Accuracy much simpler. If we got it, we got it
  if (feature_data.accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(feature_data.accuracy[tier_index]));
  }

  if (feature_data.tags.find(tag => tag.is_recharge)) {
    subheader_items.push(charged_box(feature_data.charged, path));
  }

  return npc_feature_scaffold(
    path,
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow">
        ${subheader_items.join(sep)}
      </div>
      <div class="flexcol" style="padding: 0 10px;">
        ${effect_box("EFFECT", feature_data.effect)}
        ${compact_tag_list(path + ".system.tags", npc_feature.system.tags, false)}
      </div>
    </div>
    `,
    options
  );
}

export function npc_weapon_effect_preview(path: string, options: HelperOptions) {
  // Get the feature
  let npc_feature: LancerNPC_FEATURE = resolve_helper_dotpath(options, path);
  let feature_data = npc_feature.system as SystemTemplates.NPC.WeaponData;

  let loading: string | undefined;

  // Get the tier (or default 1)
  let tier_index: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-attack no-grow"><i class="fas fa-dice-d20 i--m i--dark"></i></a>`];

  // Weapon info

  // Topline stuff
  if (feature_data.attack_bonus[tier_index]) {
    subheader_items.push(npc_attack_bonus_preview(feature_data.attack_bonus[tier_index]));
  }
  if (feature_data.accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(feature_data.accuracy[tier_index]));
  }

  // Get the mid-body stuff. Real meat and potatos of a weapon
  if (feature_data.range.length) {
    subheader_items.push(show_range_array(feature_data.range, options));
  }
  if (feature_data.damage[tier_index] && feature_data.damage[tier_index].length) {
    subheader_items.push(show_damage_array(feature_data.damage[tier_index], options));
  }

  if (feature_data.tags.find(tag => tag.lid === "tg_recharge")) {
    subheader_items.push(charged_box(feature_data.charged, path));
  }

  if (npc_feature.system.tags.some(t => t.is_loading))
    subheader_items.push(loading_indicator(feature_data.loaded, path));

  return npc_feature_scaffold(
    path,
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow no-wrap">
        ${subheader_items.join(sep)}
      </div>
      <div>
        <span>${feature_data.type ?? "Weapon"} // ${npc_feature.system.origin.name} ${
      npc_feature.system.origin.type
    } Feature (TODO ORIGIN)</span>
      </div>
      ${effect_box("ON HIT", feature_data.on_hit)}
      ${effect_box("EFFECT", feature_data.effect)}
      ${compact_tag_list(path + ".system.tags", feature_data.tags, false)}
    </div>
    `,
    options
  );
  return "";
}
