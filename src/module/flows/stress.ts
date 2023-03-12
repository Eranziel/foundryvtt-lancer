// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { getAutomationOptions } from "../settings";

const lp = LANCER.log_prefix;

/**
 * Performs a roll on the overheat table for the given actor
 * @param actor   - Actor or ID of actor to overheat
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function prepareOverheatMacro(
  actor: string | LancerActor,
  reroll_data?: { stress: number }
): Promise<void> {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can overheat");
    return;
  }

  if (getAutomationOptions().structure && !reroll_data) {
    if (actor.system.heat.value <= actor.system.heat.max) {
      ui.notifications!.info("Token heat is within heat cap.");
      return;
    }
    const { openSlidingHud: open } = await import("../helpers/slidinghud");
    try {
      await open("stress", { stat: "stress", title: "Overheating", lancerActor: actor });
    } catch (_e) {
      return;
    }
  }

  // Hand it off to the actor to overheat
  await actor.strussHelper.overheat(reroll_data);
}
