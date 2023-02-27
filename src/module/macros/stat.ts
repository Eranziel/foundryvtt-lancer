// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { resolve_dotpath } from "../helpers/commons";
import { renderMacroTemplate } from "./_render";
import { LancerMacro } from "./interfaces";
import { LancerItem, LancerSKILL } from "../item/lancer-item";
import { resolveItemOrActor } from "./util";
import { AccDiffData } from "../helpers/acc_diff";
import { openSlidingHud } from "../helpers/slidinghud";

const lp = LANCER.log_prefix;

export async function prepareStatMacro(actor: string | LancerActor, statKey: string) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  const statPath = statKey.split(".");

  let bonus = resolve_dotpath(actor, statKey) as number;
  let acc_diff = AccDiffData.fromParams(actor, undefined, statPath[statPath.length - 1].toUpperCase());
  acc_diff = await openSlidingHud("hase", acc_diff);

  let mData: LancerMacro.StatRoll = {
    title: statPath[statPath.length - 1].toUpperCase(),
    docUUID: actor.uuid,
    bonus,
    acc_diff: acc_diff.toObject(),
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
  let acc_diff = AccDiffData.fromParams(item, undefined, item.name!);
  acc_diff = await openSlidingHud("hase", acc_diff);
  let skillData: LancerMacro.StatRoll = {
    title: item.name!,
    bonus: (item as LancerSKILL).system.curr_rank * 2,
    docUUID: item.uuid,
    acc_diff: acc_diff.toObject(),
  };
  await rollStatMacro(skillData);
}

// Rollers

export async function rollStatMacro(data: LancerMacro.StatRoll) {
  let { actor } = await resolveItemOrActor(data.docUUID);
  if (!actor) return;

  // Get accuracy/difficulty with a prompt
  let acc_diff = AccDiffData.fromObject(data.acc_diff);

  // Do the roll
  let acc_str = acc_diff.base.total != 0 ? ` + ${acc_diff.base.total}d6kh1` : "";
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
