// Import TypeScript modules
import { LANCER } from "../config.js";
import { LancerActor } from "../actor/lancer-actor.js";
import { renderMacroTemplate } from "./_render.js";
import type { LancerMacro } from "./interfaces.js";
import { resolveItemOrActor } from "./util.js";

const lp = LANCER.log_prefix;

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param data Reaction macro data to render.
 */
export function rollReactionMacro(data: LancerMacro.ReactionRoll) {
  let { actor } = resolveItemOrActor(data.docUUID);
  if (!actor) return;

  const template = `systems/${game.system.id}/templates/chat/reaction-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}
