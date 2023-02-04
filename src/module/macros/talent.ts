// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerTalentMacroData } from "../interfaces";
import { renderMacroTemplate } from "./_render";
import { getMacroSpeaker } from "./_util";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

/**
 * Generic macro preparer for a talent
 * Given an actor and item, will prepare data for the macro then roll it.
 * @param actorID The actor id to speak as
 * @param itemUUID The item id that is being rolled
 * @param rank The rank of the talent to roll
 */
export async function prepareTalentMacro(actorID: string, itemUUID: string, rank: number) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(actorID);
  if (!actor) return;

  const item = LancerItem.fromUuidSync(itemUUID);
  if (!item || !item.is_talent()) return;

  let talData: LancerTalentMacroData = {
    talent: item.system,
    rank: rank,
  };

  await rollTalentMacro(actor, talData);
}

export async function rollTalentMacro(actor: LancerActor, data: LancerTalentMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.talent.name,
    rank: data.talent.ranks[data.rank],
    lvl: data.rank,
  };
  const template = `systems/${game.system.id}/templates/chat/talent-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}
