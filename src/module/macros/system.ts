// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { buildSystemHTML } from "../helpers/item";
import { renderMacroHTML } from "./_render";
import { LancerMECH_SYSTEM } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export async function rollSystemMacro(actor: LancerActor, data: LancerMECH_SYSTEM) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const html = buildSystemHTML(data);
  return renderMacroHTML(actor, html);
}
