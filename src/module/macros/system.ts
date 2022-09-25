// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { buildSystemHTML } from "../helpers/item";
import type { MechSystem } from "machine-mind";
import { renderMacroHTML } from "./_render";

const lp = LANCER.log_prefix;

export async function rollSystemMacro(actor: LancerActor, data: MechSystem) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const html = buildSystemHTML(data);
  return renderMacroHTML(actor, html);
}
