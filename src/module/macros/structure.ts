// Import TypeScript modules
import { LANCER } from "../config.js";
import { LancerActor } from "../actor/lancer-actor.js";
import { getAutomationOptions } from "../settings.js";
import { prepareTextMacro } from "./text.js";
import { openSlidingHud } from "../helpers/slidinghud/index.js";

const lp = LANCER.log_prefix;

/**
 * Performs a roll on the structure table for the given actor
 * @param actor   - Actor or ID of actor to structure
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function prepareStructureMacro(
  actor: string | LancerActor,
  reroll_data?: { structure: number }
): Promise<void> {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can take struct damage");
    return;
  }

  if (getAutomationOptions().structure && !reroll_data) {
    if (actor.system.hp.value > 0) {
      ui.notifications!.info("Token has hp remaining. No need to roll structure.");
      return;
    }
    try {
      await openSlidingHud("struct", { stat: "structure", title: "Structure Damage", lancerActor: actor });
    } catch (_e) {
      return;
    }
  }

  // Hand it off to the actor to structure
  await actor.strussHelper.structure(reroll_data);
}

export function prepareStructureSecondaryRollMacro(actor: string | LancerActor) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  // @ts-ignore
  let roll = new Roll("1d6").evaluate({ async: false });
  let result = roll.total!;
  if (result <= 3) {
    prepareTextMacro(
      actor,
      "Destroy Weapons",
      `
<div class="dice-roll lancer-dice-roll">
  <div class="dice-result">
    <div class="dice-formula lancer-dice-formula flexrow">
      <span style="text-align: left; margin-left: 5px;">${roll.formula}</span>
      <span class="dice-total lancer-dice-total major">${result}</span>
    </div>
  </div>
</div>
<span>On a 1–3, all weapons on one mount of your choice are destroyed</span>`
    );
  } else {
    prepareTextMacro(
      actor,
      "Destroy Systems",
      `
<div class="dice-roll lancer-dice-roll">
  <div class="dice-result">
    <div class="dice-formula lancer-dice-formula flexrow">
      <span style="text-align: left; margin-left: 5px;">${roll.formula}</span>
      <span class="dice-total lancer-dice-total major">${result}</span>
    </div>
  </div>
</div>
<span>On a 4–6, a system of your choice is destroyed</span>`
    );
  }
}
