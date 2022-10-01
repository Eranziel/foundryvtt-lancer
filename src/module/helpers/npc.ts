import type { HelperOptions } from "handlebars";
import { ActivationType, EntryType, NpcFeature, NpcFeatureType } from "machine-mind";
import { is_loading } from "machine-mind/dist/classes/mech/EquipUtil";
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

function npc_feature_scaffold(path: string, npc_feature: NpcFeature, body: string, options: HelperOptions) {
  let feature_class = `npc-${npc_feature.FeatureType.toLowerCase()}`;
  let icon = `cci-${npc_feature.FeatureType.toLowerCase()}`;
  if (npc_feature.FeatureType === NpcFeatureType.Tech) icon += "-quick";
  let macro_button = "";
  if (npc_feature.FeatureType !== NpcFeatureType.Weapon) {
    macro_button = `<a class="macroable item-macro"><i class="mdi mdi-message"></i></a>`;
  }
  return `
  <div class="valid ref card item ${feature_class}" ${ref_params(
    npc_feature.as_ref(),
    npc_feature.Flags.orig_doc.uuid
  )}>
    <div class="flexrow lancer-header clipped-top ${npc_feature.Destroyed ? "destroyed" : ""}">
      <i class="${npc_feature.Destroyed ? "mdi mdi-cog" : `cci ${icon} i--m i--light`}"> </i>
      ${macro_button}
      <span class="minor grow">${npc_feature.Name}</span>
      <a class="lancer-context-menu" data-context-menu="${EntryType.NPC_FEATURE}" data-path="${path}">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    ${body}
  </div>`;
}

export function npc_reaction_effect_preview(path: string, options: HelperOptions) {
  let npc_feature: NpcFeature = resolve_helper_dotpath(options, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${npc_feature.Tags.find(tag => tag.Tag.LID === "tg_recharge") ? charged_box(npc_feature.Charged, path) : ""}
      ${effect_box("TRIGGER", npc_feature.Trigger)}
      ${effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(path + ".Tags", npc_feature.Tags, false)}
    </div>`,
    options
  );
}

// The below 2 funcs just map to this one, because they all do the same thing
function npc_system_trait_effect_preview(path: string, options: HelperOptions) {
  let npc_feature: NpcFeature = resolve_helper_dotpath(options, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${npc_feature.Tags.find(tag => tag.Tag.LID === "tg_limited") ? limited_uses_indicator(npc_feature, path) : ""}
      ${npc_feature.Tags.find(tag => tag.Tag.LID === "tg_recharge") ? charged_box(npc_feature.Charged, path) : ""}
      ${effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(path + ".Tags", npc_feature.Tags, false)}
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
  let npc_feature: NpcFeature = resolve_helper_dotpath(options, path);

  // Get the tier (or default 1)
  let tier_index: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-tech"><i class="fas fa-dice-d20 i--m"></i></a>`];

  let attack_bonus = npc_feature.AttackBonus[tier_index];
  let from_sys = false;

  // If we didn't find one, retrieve. Maybe check for undefined as we want an explicit 0 to be a true 0? How to support this in UI?
  if (!attack_bonus) {
    resolve_helper_dotpath(options, "mm.Systems", 0, true); // A bit lazy. Expand this to cover more cases if needed
    from_sys = true;
  }
  if (attack_bonus) {
    subheader_items.push(npc_attack_bonus_preview(attack_bonus, from_sys ? "ATK (SYS)" : "ATTACK"));
  }

  // Accuracy much simpler. If we got it, we got it
  if (npc_feature.Accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier_index]));
  }

  if (npc_feature.Tags.find(tag => tag.Tag.LID === "tg_recharge")) {
    subheader_items.push(charged_box(npc_feature.Charged, path));
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
        ${effect_box("EFFECT", npc_feature.Effect)}
        ${compact_tag_list(path + ".Tags", npc_feature.Tags, false)}
      </div>
    </div>
    `,
    options
  );
}

export function npc_weapon_effect_preview(path: string, options: HelperOptions) {
  // Get the feature
  let npc_feature: NpcFeature = resolve_helper_dotpath(options, path);

  let loading: string | undefined;

  // Get the tier (or default 1)
  let tier_index: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-attack no-grow"><i class="fas fa-dice-d20 i--m i--dark"></i></a>`];

  // Weapon info

  // Topline stuff
  if (npc_feature.AttackBonus[tier_index]) {
    subheader_items.push(npc_attack_bonus_preview(npc_feature.AttackBonus[tier_index]));
  }
  if (npc_feature.Accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier_index]));
  }

  // Get the mid-body stuff. Real meat and potatos of a weapon
  if (npc_feature.Range.length) {
    subheader_items.push(show_range_array(npc_feature.Range, options));
  }
  if (npc_feature.Damage[tier_index] && npc_feature.Damage[tier_index].length) {
    subheader_items.push(show_damage_array(npc_feature.Damage[tier_index], options));
  }

  if (npc_feature.Tags.find(tag => tag.Tag.LID === "tg_recharge")) {
    subheader_items.push(charged_box(npc_feature.Charged, path));
  }

  if (is_loading(npc_feature)) subheader_items.push(loading_indicator(npc_feature.Loaded, path));

  return npc_feature_scaffold(
    path,
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow no-wrap">
        ${subheader_items.join(sep)}
      </div>
      <div>
        <span>${npc_feature.WepType ?? "Weapon"} // ${npc_feature.Origin.name} ${npc_feature.Origin.type} Feature</span>
      </div>
      ${effect_box("ON HIT", npc_feature.OnHit)}
      ${effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(path + ".Tags", npc_feature.Tags, false)}
    </div>
    `,
    options
  );
}
