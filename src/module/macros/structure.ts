// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { getAutomationOptions } from "../settings";
import { getMacroSpeaker } from "./_util";
import { prepareTextMacro } from "./text";

const lp = LANCER.log_prefix;

/**
 * Performs a roll on the structure table for the given actor
 * @param a           - Actor or ID of actor to structure
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function prepareStructureMacro(
  a: string | LancerActor,
  reroll_data?: { structure: number }
): Promise<void> {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can take struct damage");
    return;
  }

  if (getAutomationOptions().structure && !reroll_data) {
    // @ts-expect-error Should be fixed with v10 types
    const mech = await actor.system.derived.mm_promise;
    if (mech.CurrentHP > 0) {
      ui.notifications!.info("Token has hp remaining. No need to roll structure.");
      return;
    }
    const { open } = await import("../helpers/slidinghud");
    try {
      await open("struct", { stat: "structure", title: "Structure Damage", lancerActor: actor });
    } catch (_e) {
      return;
    }
  }

  // Hand it off to the actor to structure
  await actor.structure(reroll_data);
}

export function prepareStructureSecondaryRollMacro(registryId: string) {
  // @ts-ignore
  let roll = new Roll("1d6").evaluate({ async: false });
  let result = roll.total!;
  if (result <= 3) {
    prepareTextMacro(
      registryId,
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
      registryId,
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
