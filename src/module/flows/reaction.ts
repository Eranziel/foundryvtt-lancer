// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";
import { resolveItemOrActor } from "./util";

const lp = LANCER.log_prefix;

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param data Reaction macro data to render.
 */
export function rollReactionMacro(data: LancerFlowState.ReactionRollData) {
  // let { actor } = resolveItemOrActor(data.docUUID);
  let actor;
  if (!actor) return;

  const template = `systems/${game.system.id}/templates/chat/reaction-card.hbs`;
  return renderTemplateStep(actor, template, data);
}
