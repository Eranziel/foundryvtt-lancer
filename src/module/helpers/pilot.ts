import type { HelperOptions } from "handlebars";
import { LancerCORE_BONUS, LancerSKILL, LancerTALENT } from "../item/lancer-item";
import { encodeMacroData } from "../macros";
import { LancerFlowState } from "../flows/interfaces";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { resolve_helper_dotpath } from "./commons";
import { buildActionArrayHTML } from "./item";
import { ref_params } from "./refs";

export function talent_view(talent_path: string, options: HelperOptions) {
  let collapse = resolve_helper_dotpath<CollapseRegistry>(options, "collapse");
  let talent = resolve_helper_dotpath<LancerTALENT>(options, talent_path);
  if (!talent) return "";
  let retStr = `<li class="card clipped talent-compact ref set" ${ref_params(talent)}>
        <div class="lancer-talent-header medium clipped-top" style="grid-area: 1/1/2/4">
          <i class="cci cci-talent i--m"></i>
          <span class="major">${talent.name}</span>
          ${collapseButton(collapse, talent)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${talent.type}" data-path="${talent_path}"">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
      <ul class="collapse" ${collapseParam(collapse, talent, true)} style="grid-area: 2/1/3/3">`;

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

    retStr += `<li class="talent-rank-compact card clipped" style="padding: 5px">
        <a class="cci cci-rank-${i + 1} i--l i--dark talent-macro lancer-macro" data-macro="${encodeMacroData(
      macroData
    )}" style="grid-area: 1/1/2/2"></a>
        <span class="major" style="grid-area: 1/2/2/3">${talent.system.ranks[i]?.name}</span>
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
        <div class="lancer-trigger-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-skill i--m i--dark"> </i>
          <span class="major modifier-name">${skill.name}</span>
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${skill.type}" data-path="${skill_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <a class="flexrow skill-macro" style="grid-area: 2/1/3/2;">
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
      <li class="card clipped ref set" ${ref_params(coreBonus)}>
        <div class="lancer-corebonus-header medium clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-corebonus i--m i--dark"> </i>
          <span class="major modifier-name">${coreBonus.name}</span>
          ${collapseButton(collapse, coreBonus)}
          <div class="ref-controls">
            <a class="lancer-context-menu" data-context-menu="${coreBonus.type}" data-path="${item_path}">
              <i class="fas fa-ellipsis-v"></i>
            </a>
          </div>
        </div>
        <div class="collapse" ${collapseParam(collapse, coreBonus, true)}>
          <div class="desc-text" style="grid-area: 2/2/3/3">${coreBonus.system.description}</div>
          <div style="grid-area: 2/3/3/4">${coreBonus.system.effect}</div>
        </div>
      </li>`;
}
