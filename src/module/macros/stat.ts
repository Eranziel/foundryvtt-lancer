// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { resolve_dotpath } from "../helpers/commons";
import { renderMacroTemplate } from "./_render";
import { LancerMacro } from "./interfaces";
import { LancerItem, LancerSKILL } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export async function prepareStatMacro(actor: string | LancerActor, statKey: string) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  const statPath = statKey.split(".");

  let bonus = resolve_dotpath(actor, statKey) as number;

  let mData: LancerMacro.StatRoll = {
    title: statPath[statPath.length - 1].toUpperCase(),
    docUUID: actor.uuid,
    bonus,
  };

  rollStatMacro(mData);
}

/**
 * Generic macro preparer for a skill
 * @param item The item id that is being rolled
 */
export async function prepareSkillMacro(item: string | LancerItem) {
  // Determine which Actor to speak as
  item = LancerItem.fromUuidSync(item);
  let skillData: LancerMacro.StatRoll = {
    title: item.name!,
    bonus: (item as LancerSKILL).system.curr_rank * 2,
    docUUID: item.uuid,
  };
  await rollStatMacro(skillData);
}

// Rollers

export async function rollStatMacro(data: LancerMacro.StatRoll) {
  let actor = LancerActor.fromUuidSync(data.docUUID, "Failed to roll stat macro");

  // Get accuracy/difficulty with a prompt
  let { AccDiffData } = await import("../helpers/acc_diff");
  let initialData = AccDiffData.fromParams(actor, undefined, data.title);

  let promptedData;
  try {
    let { openSlidingHud: open } = await import("../helpers/slidinghud");
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
