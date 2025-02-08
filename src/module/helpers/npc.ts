import type { HelperOptions } from "handlebars";
import { ActivationType, NpcFeatureType } from "../enums";
import { LancerNPC_FEATURE } from "../item/lancer-item";
import { SystemTemplates } from "../system-template";
import { slugify } from "../util/lid";
import { effectBox, resolveHelperDotpath } from "./commons";
import { actionTypeIcon, npcAccuracyView, npcAttackBonusView, damageArrayView, rangeArrayView } from "./item";
import { chargedIndicator, limitedUsesIndicator, loadingIndicator, ref_params } from "./refs";
import { compactTagListHBS } from "./tags";

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
export function actionTypeSelector(a_type: string, data_target: string): string {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';
  html += actionTypeIcon(a_type);
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

function npcFeatureScaffold(
  path: string,
  npc_feature: LancerNPC_FEATURE,
  body: string,
  options: HelperOptions
): string {
  let feature_class = `lancer-${slugify(npc_feature.system.type, "-")}`;
  let icon = `cci-${slugify(npc_feature.system.type, "-")}`;
  if (npc_feature.system.type === NpcFeatureType.Tech) icon += "-quick";
  let macro_button = "";
  if (npc_feature.system.type !== NpcFeatureType.Weapon) {
    macro_button = `<a class="chat-flow-button"><i class="mdi mdi-message"></i></a>`;
  }
  return `
  <div class="set ref card ${feature_class}" data-item-id="${npc_feature.id}" ${ref_params(npc_feature)}>
    <div class="flexrow lancer-header clipped-top ${npc_feature.system.destroyed ? "destroyed" : ""}">
      <i class="${npc_feature.system.destroyed ? "mdi mdi-cog" : `cci ${icon} i--m i--light`}"> </i>
      ${macro_button}
      <span class="minor grow">${npc_feature.name}</span>
      <a class="lancer-context-menu" data-path="${path}" ${options.hash.isRef ? `data-uuid=${npc_feature.uuid}` : ""}>
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    ${body}
  </div>`;
}

export function npcReactionView(path: string, options: HelperOptions): string {
  let npcFeature =
    (options.hash["item"] as LancerNPC_FEATURE) ?? resolveHelperDotpath<LancerNPC_FEATURE>(options, path);
  if (!npcFeature) return "";
  options.hash["tags"] = npcFeature.system.tags;
  return npcFeatureScaffold(
    path,
    npcFeature,
    `<div class="flexcol lancer-body">
      ${npcFeature.system.tags.find(tag => tag.lid === "tg_limited") ? limitedUsesIndicator(npcFeature, path) : ""}
      ${npcFeature.system.tags.find(tag => tag.lid === "tg_recharge") ? chargedIndicator(npcFeature, path) : ""}
      ${effectBox("TRIGGER", (npcFeature.system as SystemTemplates.NPC.ReactionData).trigger, { flow: true })}
      ${effectBox("EFFECT", npcFeature.system.effect)}
      ${compactTagListHBS(path + ".system.tags", options)}
    </div>`,
    options
  );
}

// The below 2 funcs just map to this one, because they all do the same thing
export function npcSystemTraitView(path: string, options: HelperOptions): string {
  let npcFeature =
    (options.hash["item"] as LancerNPC_FEATURE) ?? resolveHelperDotpath<LancerNPC_FEATURE>(options, path);
  if (!npcFeature) return "";
  options.hash["tags"] = npcFeature.system.tags;
  return npcFeatureScaffold(
    path,
    npcFeature,
    `<div class="flexcol lancer-body">
      ${npcFeature.system.tags.find(tag => tag.lid === "tg_limited") ? limitedUsesIndicator(npcFeature, path) : ""}
      ${npcFeature.system.tags.find(tag => tag.lid === "tg_recharge") ? chargedIndicator(npcFeature, path) : ""}
      ${effectBox("EFFECT", npcFeature.system.effect, { flow: true })}
      ${compactTagListHBS(path + ".system.tags", options)}
    </div>`,
    options
  );
}

export function npcTechView(path: string, options: HelperOptions) {
  // Get the feature
  let npcFeature =
    (options.hash["item"] as LancerNPC_FEATURE) ?? resolveHelperDotpath<LancerNPC_FEATURE>(options, path);
  if (!npcFeature) return "";
  options.hash["tags"] = npcFeature.system.tags;
  let featureData = npcFeature.system as SystemTemplates.NPC.TechData;

  // Get the tier (or default 1)
  let tierIndex: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheaderItems = [];
  let subheader2Items = [];
  if (featureData.tech_attack) {
    subheaderItems.push(
      `<a class="roll-tech lancer-button" data-tooltip="Roll an attack with this system">
        <i class="fas fa-dice-d20 i--m"></i>
      </a>`
    );
  }

  if (featureData.tech_attack && featureData.attack_bonus && featureData.attack_bonus[tierIndex]) {
    subheaderItems.push(npcAttackBonusView(featureData.attack_bonus[tierIndex], "ATTACK"));
  }

  // Accuracy much simpler. If we got it, we got it
  if (featureData.tech_attack && featureData.accuracy && featureData.accuracy[tierIndex]) {
    subheaderItems.push(npcAccuracyView(featureData.accuracy[tierIndex]));
  }

  if (featureData.tags.find(tag => tag.is_recharge)) {
    subheaderItems.push(chargedIndicator(npcFeature, path));
  }

  if (npcFeature.system.tags.some(t => t.is_limited)) subheader2Items.push(limitedUsesIndicator(npcFeature, path));

  return npcFeatureScaffold(
    path,
    npcFeature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow">
        ${subheaderItems.join(sep)}
      </div>
      <div class="flexrow no-wrap">
        ${subheader2Items.join()}
      </div>
      <div class="flexcol" style="padding: 0 10px;">
        ${effectBox("EFFECT", featureData.effect, { flow: !featureData.tech_attack })}
        ${compactTagListHBS(path + ".system.tags", options)}
      </div>
    </div>
    `,
    options
  );
}

export function npcWeaponView(path: string, options: HelperOptions): string {
  // Get the feature
  let npcFeature =
    (options.hash["item"] as LancerNPC_FEATURE) ?? resolveHelperDotpath<LancerNPC_FEATURE>(options, path);
  if (!npcFeature || !npcFeature.is_weapon()) return "";
  options.hash["tags"] = npcFeature.system.tags;
  let featureData = npcFeature.system as SystemTemplates.NPC.WeaponData;

  // Get the tier (or default 1)
  let tierIndex: number = (options.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheaderItems = [
    `<a class="roll-attack lancer-button no-grow" data-tooltip="Roll an attack with this weapon">
      <i class="fas fa-dice-d20 i--m i--dark"></i>
    </a>`,
  ];
  let subheader2Items = [];

  // Weapon info

  // Topline stuff
  if (featureData.attack_bonus[tierIndex]) {
    subheaderItems.push(npcAttackBonusView(featureData.attack_bonus[tierIndex]));
  }
  if (featureData.accuracy[tierIndex]) {
    subheaderItems.push(npcAccuracyView(featureData.accuracy[tierIndex]));
  }

  // Get the mid-body stuff. Real meat and potatos of a weapon
  if (featureData.range.length) {
    subheaderItems.push(rangeArrayView(featureData.range, options));
  }
  if (featureData.damage[tierIndex] && featureData.damage[tierIndex].length) {
    subheaderItems.push(damageArrayView(featureData.damage[tierIndex], { ...options, rollable: true }));
  }

  // Bookkeeping stuff
  if (featureData.tags.find(t => t.is_recharge)) {
    subheader2Items.push(chargedIndicator(npcFeature, path));
  }
  if (npcFeature.system.tags.some(t => t.is_loading)) subheader2Items.push(loadingIndicator(npcFeature, path));
  if (npcFeature.system.tags.some(t => t.is_limited)) subheader2Items.push(limitedUsesIndicator(npcFeature, path));

  return npcFeatureScaffold(
    path,
    npcFeature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow no-wrap">
        ${subheaderItems.join(sep)}
      </div>
      <div class="flexrow no-wrap">
        ${subheader2Items.join()}
      </div>
      <div>
        <span>${featureData.weapon_type} // ${npcFeature.system.origin.name} ${
      npcFeature.system.origin.type
    } Feature</span>
      </div>
      ${effectBox("ON HIT", featureData.on_hit)}
      ${effectBox("EFFECT", featureData.effect)}
      ${compactTagListHBS(path + ".system.tags", options)}
    </div>
    `,
    options
  );
}
