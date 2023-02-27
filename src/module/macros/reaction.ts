// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { renderMacroTemplate } from "./_render";
import { LancerMacro } from "./interfaces";

const lp = LANCER.log_prefix;

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param data Reaction macro data to render.
 */
export function rollReactionMacro(data: LancerMacro.ReactionRoll) {
  let actor = LancerActor.fromUuidSync(data.docUUID);

  const template = `systems/${game.system.id}/templates/chat/reaction-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}
