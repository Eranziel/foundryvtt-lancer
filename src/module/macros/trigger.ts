// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerStatMacroData } from "../interfaces";
import { rollStatMacro } from "./stat";

const lp = LANCER.log_prefix;

export async function rollTriggerMacro(actor: LancerActor, data: LancerStatMacroData) {
  return await rollStatMacro(actor, data);
}
