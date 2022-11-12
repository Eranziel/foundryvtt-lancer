import { LancerCombat } from "lancer-initiative";
import { modAction } from "../../action/actionTracker";
import { LancerActor } from "../../actor/lancer-actor";
import { prepareChargeMacro } from "../../macros";
import { prepareActionTrackMacro } from "../../macros/action-track";
import { getActionTrackerOptions, getAutomationOptions } from "../../settings";

export async function handleCombatUpdate(...[combat, changed]: Parameters<Hooks.UpdateDocument<typeof Combat>>) {
  if (game.user?.isGM) {
    if (!("turn" in changed) && changed.round !== 1) return;
    if (game.combats!.get(combat.id!)?.combatants.contents.length == 0) return;

    if (getAutomationOptions().enabled) {
      // TODO: Update foundryvtt typings.
      const nextActor = lookup(combat, (combat.current as any).combatantId);
      const prevActor = lookup(combat, (combat.previous as any).combatantId);

      // Handle refreshing for next combatant.
      if (nextActor) {
        processStartTurn(nextActor);
      }

      // Handle end-of-turn for previous combatant.
      if (prevActor) {
        processEndTurn(prevActor);
      }
    }
  }
}

function processStartTurn(actor: LancerActor) {
  console.log(`Processing start-of-turn combat automation for ${actor.name}`);

  // Handle NPC charges.
  prepareChargeMacro(actor);

  // Refresh actions.
  modAction(actor, false);

  // Refresh reactions on new turn.
  refreshReactions(game.combat);

  // Print chat messages.
  if (getActionTrackerOptions().printMessages) {
    prepareActionTrackMacro(actor.id!, true);
  }
}

function processEndTurn(actor: LancerActor) {
  console.log(`Processing end-of-turn combat automation for ${actor.name}`);

  // Dump extra actions.
  modAction(actor, true);

  // Print chat messages.
  if (getActionTrackerOptions().printMessages) {
    prepareActionTrackMacro(actor.id!, false);
  }
}

function lookup(combat: LancerCombat, id: String | null) {
  if (id) {
    return combat.combatants.find(com => com.id === id)?.actor;
  } else return undefined;
}

function refreshReactions(combat: LancerCombat | null) {
  if (combat) {
    combat.combatants.map(comb => {
      if (comb.actor) {
        modAction(comb.actor, false, "reaction");
      }
    });
  }
}
