import type { HelperOptions } from "handlebars";
import { LancerCORE_BONUS, LancerSKILL, LancerTALENT } from "../item/lancer-item";
import { encodeMacroData } from "../macros";
import { LancerFlowState } from "../flows/interfaces";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { effect_box, resolve_helper_dotpath } from "./commons";
import { buildActionArrayHTML } from "./item";
import { ref_params } from "./refs";

export function talent_view(talent_path: string, options: HelperOptions) {
  let collapse = resolve_helper_dotpath<CollapseRegistry>(options, "collapse");
  let talent = resolve_helper_dotpath<LancerTALENT>(options, talent_path);
  if (!talent) return "";
  let retStr = `<li class="card clipped-top lancer-border-talent talent-compact ref set" ${ref_params(talent)}>
        <div class="lancer-header lancer-talent submajor" style="grid-area: 1/1/2/4">
          <i class="cci cci-talent i--m"></i>
          <div class="balancer"></div><div class="balancer"></div>
          <span class="major">${talent.name}</span>
          ${collapseButton(collapse, talent)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-path="${talent_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
      <ul class="collapse talent-ranks" ${collapseParam(collapse, talent, true)} style="grid-area: 2/1/3/3">`;

  for (var i = 0; i < talent.system.curr_rank; i++) {
    let talent_actions = "";

    if (talent.system.ranks[i].actions) {
      talent_actions = buildActionArrayHTML(talent, `system.ranks.${i}.actions`);
    }

    let macroData: LancerFlowState.InvocationData = {
      iconPath: `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`,
      title: talent.system.ranks[i]?.name,
      fn: "prepareTalentMacro",
      args: [talent.uuid, i],
    };

    let sepBorder = i < talent.system.curr_rank - 1 ? "lancer-border-talent talent-rank-sep-border" : "";

    retStr += `<li class="talent-rank-compact card clipped ${sepBorder}" style="padding: 5px;">
        <a class="talent-macro lancer-macro lancer-button lancer-talent" data-macro="${encodeMacroData(
          macroData
        )}" style="grid-area: 1/1/2/2; padding: 0;">
          <i class="cci cci-rank-${i + 1} i--l i--dark"></i>
        </a>
        <span class="major" style="grid-area: 1/1/2/3">${talent.system.ranks[i]?.name}</span>
        <div class="effect-text" style="grid-area: 2/1/3/3">
        ${talent.system.ranks[i]?.description}
        ${talent_actions}
        </div>
        </li>`;
  }

  retStr += `</ul>
      </li>`;

  return retStr;
}

export function skillView(skill_path: string, options: HelperOptions) {
  let skill = resolve_helper_dotpath<LancerSKILL>(options, skill_path);
  if (!skill) return "";
  return `
      <li class="card clipped skill-compact ref set" ${ref_params(skill)}>
        <div class="lancer-header lancer-trait medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-skill i--m i--dark"> </i>
          <span class="major modifier-name">${skill.name}</span>
          <div class="ref-controls">
            <a class="lancer-context-menu" data-path="${skill_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <a class="flexrow skill-macro lancer-button" style="grid-area: 2/1/3/2;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
          <div class="major roll-modifier" style="align-self: center">+${skill.system.curr_rank * 2}</div>
        </a>
        <div class="desc-text" style="grid-area: 2/2/3/3">${skill.system.description}</div>
      </li>`;
}

export function coreBonusView(item_path: string, options: HelperOptions) {
  let coreBonus = resolve_helper_dotpath<LancerCORE_BONUS>(options, item_path);
  let collapse = resolve_helper_dotpath<CollapseRegistry>(options, "collapse");
  if (!coreBonus) return "";
  return `
      <li class="card clipped-top lancer-border-bonus ref set" ${ref_params(coreBonus)}>
        <div class="lancer-header lancer-bonus medium" style="grid-area: 1/1/2/3">
          <i class="cci cci-corebonus i--m i--dark"> </i>
          <span class="major modifier-name">${coreBonus.name}</span>
          ${collapseButton(collapse, coreBonus)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-path="${item_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div class="collapse" ${collapseParam(collapse, coreBonus, true)} style="padding: 0.5em">
          <div class="desc-text" style="grid-area: 2/2/3/3">${coreBonus.system.description}</div>
          ${effect_box("Effect", coreBonus.system.effect)}
        </div>
      </li>`;
}
