// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerStatMacroData } from "../interfaces";
import { resolve_dotpath } from "../helpers/commons";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { getMacroSpeaker } from "./util"
import { renderMacroTemplate } from "./render"
import { rollTechMacro } from "./tech"


const lp = LANCER.log_prefix;

export async function prepareStatMacro(a: string, statKey: string, rerollData?: AccDiffDataSerialized) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  const statPath = statKey.split(".");

  let mm_ent = await actor.data.data.derived.mm_promise;

  let bonus: number = resolve_dotpath(mm_ent, statKey.substr(3));

  let mData: LancerStatMacroData = {
    title: statPath[statPath.length - 1].toUpperCase(),
    bonus: bonus,
  };
  if (mData.title === "TECHATTACK") {
    let partialMacroData = {
      title: "Reroll stat macro",
      fn: "prepareStatMacro",
      args: [a, statKey],
    };
    rollTechMacro(
      actor,
      { acc: 0, action: "Quick", t_atk: bonus, effect: "", tags: [], title: "" },
      partialMacroData,
      rerollData
    );
  } else {
    rollStatMacro(actor, mData).then();
  }
}

// Rollers

export async function rollStatMacro(actor: LancerActor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let { AccDiffData } = await import("../helpers/acc_diff");
  let initialData = AccDiffData.fromParams(actor, undefined, data.title);

  let promptedData;
  try {
    let { open } = await import("../helpers/slidinghud");
    promptedData = await open("hase", initialData);
  } catch (_e) {
    return;
  }

  let acc: number = promptedData.base.total;

  // Do the roll
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  let roll = await new Roll(`1d20+${data.bonus || 0}${acc_str}`).evaluate({ async: true });

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: data.title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/${game.system.id}/templates/chat/stat-roll-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}
