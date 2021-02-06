import { NpcFeature } from "machine-mind";
import { ActivationType } from "../enums";
import {
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  show_damage_array,
  show_range_array,
} from "../helpers/item";
import { compact_tag, compact_tag_list } from "../helpers/tags";

export const EffectIcons = {
  Generic: "systems/lancer/assets/icons/generic_item.svg",
  Basic: "systems/lancer/assets/icons/generic_item.svg",
  Charge: "systems/lancer/assets/icons/mine.svg",
  Deployable: "systems/lancer/assets/icons/deployable.svg",
  AI: "systems/lancer/assets/icons/mech_system.svg",
  Protocol: "systems/lancer/assets/icons/protocol.svg",
  Reaction: "systems/lancer/assets/icons/reaction.svg",
  Tech: "systems/lancer/assets/icons/tech_quick.svg",
  Drone: "systems/lancer/assets/icons/drone.svg",
  Bonus: "systems/lancer/assets/icons/shape_polygon_plus.svg",
  Offensive: "systems/lancer/assets/icons/sword_array.svg",
  Profile: "systems/lancer/assets/icons/weapon_profile.svg",
};

/* ------------------------------------ */
/* Handlebars Helpers                   */
/* ------------------------------------ */

export function action_type_icon(a_type: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = "";
  if (a === ActivationType.Full.toLowerCase()) {
    html += `<i class="cci cci-activation-full i--m"></i>`;
  } else if (a === ActivationType.Quick.toLowerCase()) {
    html += `<i class="cci cci-activation-quick i--m"></i>`;
  } else if (a === ActivationType.Reaction.toLowerCase()) {
    html += `<i class="cci cci-reaction i--m"></i>`;
  } else if (a === ActivationType.Protocol.toLowerCase()) {
    html += `<i class="cci cci-protocol i--m"></i>`;
  }
  return html;
}

/**
 * Handlebars helper for effect action type
 */
export function action_type_selector(a_type: string, data_target: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';
  html += action_type_icon(a_type);
  html += `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${ActivationType.None}" ${
    a === ActivationType.None.toLowerCase() ? "selected" : ""
  }>NONE</option>
    <option value="${ActivationType.Full}" ${
    a === ActivationType.Full.toLowerCase() ? "selected" : ""
  }>FULL</option>
    <option value="${ActivationType.Quick}" ${
    a === ActivationType.Quick.toLowerCase() ? "selected" : ""
  }>QUICK</option>
    <option value="${ActivationType.Reaction}" ${
    a === ActivationType.Reaction.toLowerCase() ? "selected" : ""
  }>REACTION</option>
    <option value="${ActivationType.Protocol}" ${
    a === ActivationType.Protocol.toLowerCase() ? "selected" : ""
  }>PROTOCOL</option>
    <option value="${ActivationType.Passive}" ${
    a === ActivationType.Passive.toLowerCase() ? "selected" : ""
  }>PASSIVE</option>
    <option value="${ActivationType.Other}" ${
    a === ActivationType.Other.toLowerCase() ? "selected" : ""
  }>OTHER</option>
  </select>
  </div>`;
  return html;
}

/**
 * Handlebars helper for charge type selector
 */
/*
export function charge_type_selector(c_type: string, data_target: string) {
  const c = c_type ? c_type.toLowerCase() : ChargeType.Grenade.toLowerCase();
  return `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${ChargeType.Grenade}" ${
    c === ChargeType.Grenade.toLowerCase() ? "selected" : ""
  }>GRENADE</option>
    <option value="${ChargeType.Mine}" ${
    c === ChargeType.Mine.toLowerCase() ? "selected" : ""
  }>MINE</option>
  </select>`;
}

// export const charge_effect_editable = ``;

export function effect_preview(effect: EffectData) {
  let _effect = effect as any;
  let html = ``;
  if (_effect.abilities) {
    html += `<div class="flexcol effect-preview" style="padding: 5px">`;
  }
  if (effect.effect_type === EffectType.Basic || effect.effect_type === EffectType.Generic) {
    html += basic_effect_preview(effect as BasicEffectData);
  } else if (effect.effect_type === EffectType.AI) {
    html += ai_effect_preview(effect as AIEffectData);
  } else if (effect.effect_type === EffectType.Bonus) {
    html += bonus_effect_preview(effect as BasicEffectData);
  } else if (effect.effect_type === EffectType.Charge) {
    html += charge_effect_preview(effect as ChargeEffectData);
  } else if (effect.effect_type === EffectType.Deployable) {
    html += deployable_effect_preview(effect as DeployableEffectData);
  } else if (effect.effect_type === EffectType.Drone) {
    html += drone_effect_preview(effect as DroneEffectData);
  } else if (effect.effect_type === EffectType.Offensive) {
    html += offensive_effect_preview(effect as OffensiveEffectData);
  } else if (effect.effect_type === EffectType.Profile) {
    html += profile_effect_preview(effect as ProfileEffectData);
  } else if (effect.effect_type === EffectType.Protocol) {
    html += protocol_effect_preview(effect as ProtocolEffectData);
  } else if (effect.effect_type === EffectType.Reaction) {
    html += reaction_effect_preview(effect as ReactionEffectData);
  } else if (effect.effect_type === EffectType.Tech) {
    html += tech_effect_preview(effect as TechEffectData);
  }
  if (_effect.abilities) {
    _effect.abilities.forEach((ability: EffectData) => {
      html += effect_preview(ability);
    });
    html += `</div>`;
  }
  return html;
}

export const generic_effect_preview = `<div class="flexcol effect-text" style="padding: 5px">
  <div class="medium effect-title">EFFECT</div>
  <div class="effect-text">{{{effect}}}</div>
</div>`;

export function effect_tag_row(tags: TagData[] | undefined) {
  let html = ``;
  if (tags && Array.isArray(tags)) {
    html += `<div class="compact-tag-row">`;
    tags.forEach(tag => {
      html += renderCompactTag(tag);
    });
    html += `</div>`;
  }
  return html;
}

export function standard_effect_preview(effect: EffectData, title?: string) {
  let _effect = effect as any;
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">${title ? title : "EFFECT"}`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div>`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  if (_effect.detail) {
    // not on all types
    html += `<div class="effect-text">${_effect.detail}</div>`;
  }
  html += effect_tag_row(effect.tags);
  html += `</div>`;
  return html;
}

export function basic_effect_preview(effect: BasicEffectData) {
  return standard_effect_preview(effect);
}

export function ai_effect_preview(effect: AIEffectData) {
  return standard_effect_preview(effect);
}

export function bonus_effect_preview(effect: BonusEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">EFFECT`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div>`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  html += `<div class="flexrow" style="max-width: max-content;">`;
  // Render icon and number for each bonus
  if (effect.size) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-size-1 i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">+${effect.size} SIZE</span>
    </div>`;
  }
  if (effect.hp) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="mdi mdi-heart-outline i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">+${effect.hp} HP</span>
    </div>`;
  }
  if (effect.armor) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="mdi mdi-shield-outline i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">+${effect.armor} ARM</span>
    </div>`;
  }
  if (effect.evasion) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-evasion i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">+${effect.evasion} EVA</span>
    </div>`;
  }
  if (effect.edef) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-edef i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">+${effect.edef} E-DEF</span>
    </div>`;
  }
  html += `</div><div class="effect-text">${effect.detail}</div></div>`;
  return html;
}

export function charge_effect_preview(effect: ChargeEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">CHARGE EFFECT`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div>`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  html += `<div class="effect-text" style="padding: 5px">
    <span class="minor" style="float: left">Expend a charge for one of the following effects:</span>
    <br>`;
  if (effect.charges && Array.isArray(effect.charges)) {
    effect.charges.forEach(charge => {
      html += `<div class="flexcol sub-effect-box">
        <div class="flexrow charge-header">
          <span class="minor" style="max-width: max-content; min-width: max-content; margin-right: 30px;">${charge.name}</span>`;
      if (charge.range) {
        charge.range.forEach(rng => {
          html += `<div class="compact-range"><i class="cci cci-${rng.type.toLowerCase()} i--m i--dark"></i><span class="medium">${
            rng.val
          }</span></div>`;
        });
        if (charge.damage && charge.damage.length > 0) {
          html += ` // `;
        }
      }
      if (charge.damage) {
        charge.damage.forEach(dmg => {
          html += `<div class="compact-damage"><i class="cci cci-${dmg.type.toLowerCase()} i--m damage--${dmg.type.toLowerCase()}"></i><span class="medium">${
            dmg.val
          }</span></div>`;
        });
      }
      html += ` </div>
        <span>${charge.detail}</span>
      </div>`;
    });
  }
  html += `</div></div>`;
  return html;
}

export function deployable_effect_preview(effect: DeployableEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">DEPLOYABLE EFFECT`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div><div class="sub-effect-box">`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  html += `<div class="flexrow" style="max-width: max-content;">
    <div class="flexrow compact-stat lancer-effect-stat">`;
  if (effect.size) {
    const size_icon = `<i class="cci cci-size-${
      effect.size < 1 ? "half" : effect.size
    } i--m i--dark"></i>`;
    if (effect.count) {
      for (let i = 0; i < effect.count; i++) {
        html += size_icon;
      }
    } else {
      html += size_icon;
    }
  }
  html += `</div>`;
  if (effect.hp) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="mdi mdi-heart-outline i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.hp} HP</span>
    </div>`;
  }
  if (effect.heat) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-heat i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.heat} HEAT</span>
    </div>`;
  }
  if (effect.evasion) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-evasion i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.evasion} EVA</span>
    </div>`;
  }
  if (effect.edef) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-edef i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.edef} E-DEF</span>
    </div>`;
  }
  html += `</div><div class="effect-text">${effect.detail}</div>`;
  html += effect_tag_row(effect.tags);
  html += `</div></div>`;
  return html;
}

export function drone_effect_preview(effect: DroneEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">DRONE EFFECT`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div><div class="sub-effect-box">`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  html += `<div class="flexrow" style="max-width: max-content;">`;
  if (effect.size) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-size-${effect.size < 1 ? "half" : effect.size} i--m i--dark"></i>
    </div>`;
  }
  if (effect.hp) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="mdi mdi-heart-outline i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.hp} HP</span>
    </div>`;
  }
  if (effect.armor) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="mdi mdi-shield-outline i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.armor} ARMOR</span>
    </div>`;
  }
  if (effect.heat) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-heat i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.heat} HEAT</span>
    </div>`;
  }
  if (effect.evasion) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-evasion i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.evasion} EVA</span>
    </div>`;
  }
  if (effect.edef) {
    html += `<div class="flexrow compact-stat lancer-effect-stat">
      <i class="cci cci-edef i--m i--dark"></i>
      <span class="minor effect-stat" style="min-width: fit-content;">${effect.edef} E-DEF</span>
    </div>`;
  }
  html += `</div>`;
  html += `<div class="effect-text">${effect.detail}</div>`;
  html += effect_tag_row(effect.tags);
  html += `</div></div>`;
  return html;
}

export function offensive_effect_preview(effect: OffensiveEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">WEAPON EFFECT`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div>`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  if (effect.attack) {
    html += `<div class="flexcol effect-text">
      <div class="medium" style="max-width: max-content; min-width: max-content;">ON ATTACK</div>
      <div class="effect-text">${effect.attack}</div>
    </div>`;
  }
  if (effect.hit) {
    html += `<div class="flexcol effect-text">
      <div class="medium" style="max-width: max-content; min-width: max-content;">ON HIT</div>
      <div class="effect-text">${effect.hit}</div>
    </div>`;
  }
  if (effect.critical) {
    html += `<div class="flexcol effect-text">
      <div class="medium" style="max-width: max-content; min-width: max-content;">ON CRITICAL</div>
      <div class="effect-text">${effect.critical}</div>
    </div>`;
  }
  if (effect.detail) {
    html += `<div class="effect-text">${effect.detail}</div>`;
  }
  html += effect_tag_row(effect.tags);
  html += `</div>`;
  return html;
}

export function profile_effect_preview(effect: ProfileEffectData) {
  let html = `<div class="flexcol sub-effect-box">
    <div class="flexcol effect-text" style="padding: 5px">
      <div class="medium effect-title">WEAPON PROFILE`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div>`;
  if (effect.name) {
    html += `<div class="minor effect-text" style="padding: 5px">${effect.name}</div>`;
  }
  html += `<div class="flexrow" style="align-items: center">`;
  if (effect.range) {
    effect.range.forEach(rng => {
      html += `<div class="compact-range"><i class="cci cci-${rng.type.toLowerCase()} i--m i--dark"></i><span class="medium">${
        rng.val
      }</span></div>`;
    });
    if (effect.damage) {
      html += ` // `;
    }
  }
  if (effect.damage) {
    effect.damage.forEach(dmg => {
      html += `<div class="compact-damage"><i class="cci cci-${dmg.type.toLowerCase()} i--m damage--${dmg.type.toLowerCase()}"></i><span class="medium">${
        dmg.val
      }</span></div>`;
    });
  }
  html += `</div>`;
  html += `<div class="effect-text">${effect.detail}</div></div>`;
  html += effect_tag_row(effect.tags);
  html += `</div>`;
  return html;
}

export function protocol_effect_preview(effect: ProtocolEffectData) {
  return `<div class="sub-effect-box">${standard_effect_preview(effect, "PROTOCOL")}</div>`;
}

export function reaction_effect_preview(effect: ReactionEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">REACTION`;
  if (effect.activation) {
    html += ` // ${effect.activation.toUpperCase()}`;
  }
  html += `</div><div class="minor effect-text" style="padding: 5px">`;
  if (effect.name) {
    html += `${effect.name}`;
  }
  if (effect.frequency) {
    html += ` // ${effect.frequency}`;
  }
  html += `</div>`;
  if (effect.init) {
    html += `<div class="flexcol effect-text">
      <div class="medium" style="max-width: max-content; min-width: max-content;">INIT</div>
      <div class="effect-text">${effect.init}</div>
    </div>`;
  }
  if (effect.trigger) {
    html += `<div class="flexcol effect-text">
      <div class="medium">TRIGGER</div>
      <div class="effect-text">${effect.trigger}</div>
    </div>`;
  }
  html += `<div class="flexcol effect-text">
    <div class="medium">EFFECT</div>
    <div class="flexrow effect-text">${effect.detail}</div>
  </div>`;
  html += effect_tag_row(effect.tags);
  html += `</div>`;
  return html;
}

export function invade_option_preview(effect: InvadeOptionData, set: string) {
  let html = `<div class="flexcol sub-effect-box" style="padding: 5px">
    <div class="medium effect-title">${effect.name} // ${set.toUpperCase()}</div>`;
  if (effect.detail) {
    html += `<div class="effect-text">${effect.detail}</div>`;
  }
  html += `</div>`;
  return html;
}

export function tech_effect_preview(effect: TechEffectData) {
  let html = `<div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">${
      effect.option_set ? effect.option_set.toUpperCase() : "TECH EFFECT"
    } // ${effect.activation.toUpperCase()} TECH</div>
    <div class="medium effect-title">${effect.name ? effect.name : ""}</div>`;
  if (effect.detail) {
    html += `<div class="effect-text">${effect.detail}</div>`;
  }
  if (effect.options) {
    html += `<div class="flexcol">`;
    if (effect.option_set) {
      if (effect.option_set.toLowerCase() === "invade") {
        html += `<div class="effect-text">Gain the following Invade options:</div>`;
      } else if (effect.option_set.toLowerCase() === "quick tech") {
        html += `<div class="effect-text">Gain the following Quick Tech options:</div>`;
      } else if (effect.option_set.toLowerCase() === "full tech") {
        html += `<div class="effect-text">Gain the following Full Tech options:</div>`;
      }
    }
    effect.options.forEach(option => {
      html += invade_option_preview(
        option,
        effect.option_set ? effect.option_set.toUpperCase() : ""
      );
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}
*/

// Common to all feature previews. Auto-omits on empty body
function npc_feature_effect_box(title: string, text: string): string {
  if (text) {
    return `
      <span class="medium flexrow">${title}</span>
      <div class="effect-text" style="padding: 5px">${text}</div>
      `;
  } else {
    return "";
  }
}

function npc_feature_scaffold(npc_feature: NpcFeature, body: string, delete_button: string) {
  return `
  <div class="flexcol">
    <div class="flexrow lancer-${npc_feature.FeatureType.toLowerCase()}-header  clipped-top">
      <i class="cci cci-reaction i--m i--light"> </i>
      <a class="macroable item-macro"><i class="mdi mdi-message"></i></a>
      <span class="minor grow">${npc_feature.Name}</span>
      ${delete_button}
    </div>
    ${body}
  </div>`;
}

export function npc_reaction_effect_preview(npc_feature: NpcFeature, delete_button: string) {
  return npc_feature_scaffold(
    npc_feature,
    `<div class="flexcol" style="margin: 10px;">
      ${npc_feature_effect_box("TRIGGER", npc_feature.Trigger)}
      ${npc_feature_effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(npc_feature.Tags)}
    </div>`,
    delete_button
  );
}

function npc_system_trait_effect_preview(npc_feature: NpcFeature, delete_button: string) {
  return npc_feature_scaffold(
    npc_feature,
    `<div class="flexcol" style="margin: 10px;">
      ${npc_feature_effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(npc_feature.Tags)}
    </div>`,
    delete_button
  );
}

export function npc_system_effect_preview(npc_feature: NpcFeature, delete_button: string = "") {
  return npc_system_trait_effect_preview(npc_feature, delete_button);
}

export function npc_trait_effect_preview(npc_feature: NpcFeature, delete_button: string = "") {
  return npc_system_trait_effect_preview(npc_feature, delete_button);
}

export function npc_tech_effect_preview(
  npc_feature: NpcFeature,
  tier: number,
  delete_button: string = ""
) {
  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-tech"><i class="fas fa-dice-d20 i--m i--dark"></i></a>`];

  if (npc_feature.AttackBonus[tier]) {
    subheader_items.push(npc_attack_bonus_preview(npc_feature.AttackBonus[tier]));
  }
  if (npc_feature.Accuracy[tier]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier]));
  }

  return npc_feature_scaffold(
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow">
        ${subheader_items.join(sep)}
      </div>
      <div class="flexcol" style="padding: 0 10px;">
        ${npc_feature_effect_box("EFFECT", npc_feature.Effect)}
        ${compact_tag_list(npc_feature.Tags)}
      </div>
    </div>
    `,
    delete_button
  );
}

export function npc_weapon_effect_preview(
  npc_feature: NpcFeature,
  tier: number,
  delete_button: string = ""
) {
  let sep = `<hr class="vsep">`;
  let subheader_items = [`<a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>`];

  // Topline stuff
  if (npc_feature.AttackBonus[tier]) {
    subheader_items.push(npc_attack_bonus_preview(npc_feature.AttackBonus[tier]));
  }
  if (npc_feature.Accuracy[tier]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier]));
  }

  // Get the mid-body stuff. Real meat and potatos of a weapon
  if (npc_feature.Range.length) {
    subheader_items.push(show_range_array(npc_feature.Range));
  }
  if (npc_feature.Damage[tier] && npc_feature.Damage[tier].length) {
    subheader_items.push(show_damage_array(npc_feature.Damage[tier]));
  }

  return npc_feature_scaffold(
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow">
        ${subheader_items.join(sep)}
      </div>
      ${npc_feature_effect_box("ON HIT", npc_feature.OnHit)}
      ${npc_feature_effect_box("EFFECT", npc_feature.Effect)}
      ${compact_tag_list(npc_feature.Tags)}
    </div>
    `,
    delete_button
  );
}
