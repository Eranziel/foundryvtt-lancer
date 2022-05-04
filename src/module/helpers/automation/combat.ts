import { LancerCombat } from "lancer-initiative";
import { prepareChargeMacro } from "../../macros";
import { getAutomationOptions } from "../../settings";

export async function handleCombatUpdate(...[combat, changed]: Parameters<Hooks.UpdateDocument<typeof Combat>>) {
  //if (combat.round === 0 || changed?.round === 0) return;
  if (!("turn" in changed) && changed.round !== 1) return;
  if (game.combats!.get(combat.id!)?.data?.combatants.contents.length == 0) return;

  const auto = getAutomationOptions();
  if (auto.enabled) {
    // TODO: Update foundryvtt typings.
    const nextActor = lookup(combat, (combat.current as any).combatantId);
    const prevActor = lookup(combat, (combat.previous as any).combatantId);

    console.log(combat);

    // Handle refreshing for next combatant.
    if (nextActor) {
      console.log(`Processing combat automation for ${nextActor.name}`);

      // Handle NPC charges.
      prepareChargeMacro(nextActor);

      // Refresh actions.
      console.log(`Next up! Refreshing [${nextActor.data.name}]!`);
      game.action_manager?.modAction(nextActor, false);

      // Refresh reactions on new turn.
      refreshReactions(combat);
    }

    // Handle end-of-turn for previous combatant.
    if (prevActor) {
      // Dump extra actions.
      console.log(
        `Turn over! [${prevActor.data.name}] ended turn with ${JSON.stringify(
          prevActor.data.data.action_tracker
        )}`
      );
      game.action_manager?.modAction(prevActor, true);
    }

  }
}

function lookup(combat: LancerCombat, id: String | null) {
  if (id) {
    return combat.data.combatants.find(com => com.id === id)?.actor;
  } else return undefined;
}

function refreshReactions(combat: LancerCombat) {
  combat.data.combatants.map(comb => {
    if (comb.actor) {
      game.action_manager?.modAction(comb.actor, false, "reaction");
    }
  })
}