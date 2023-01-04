// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { LancerReactionMacroData } from "../interfaces";
import { renderMacroTemplate } from "./_render";

const lp = LANCER.log_prefix;

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param actor {Actor} Actor to roll as. Assumes properly prepared item.
 * @param data {LancerReactionMacroData} Reaction macro data to render.
 */
export function rollReactionMacro(actor: LancerActor, data: LancerReactionMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/${game.system.id}/templates/chat/reaction-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}
