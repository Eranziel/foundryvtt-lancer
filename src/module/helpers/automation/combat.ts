import type { LancerGame } from "../../lancer-game";
import { prepareChargeMacro } from "../../macros";
import { getAutomationOptions } from "../../settings";

export async function handleCombatUpdate(...[combat, changed]: Parameters<Hooks.UpdateDocument<typeof Combat>>) {
  //if (combat.round === 0 || changed?.round === 0) return;
  if (!("turn" in changed) && changed.round !== 1) return;
  if (game.combats!.get(combat.id!)?.data?.combatants.contents.length == 0) return;

  const auto = getAutomationOptions();
  if (auto.enabled) {
    const nextTurnIndex = changed.turn;
    const turnIndex = combat.current.turn!;
    if (combat.turns[nextTurnIndex]) {
      const nextToken = combat.turns[nextTurnIndex].token;
      const prevToken = combat.turns[turnIndex].token;

      // Handle next turn.
      if (nextToken) {
        console.log(`Processing combat automation for ${nextToken.actor!.id}`);

        // Handle NPC charges.
        prepareChargeMacro(nextToken.actor!);

        // Refresh actions.
        console.log(`Next up! Refreshing [${nextToken.actor!.data.name}]!`);
        (<LancerGame>game).action_manager?.modAction(nextToken.actor!, false);
      }

      // Handle end-of-turn.
      if (prevToken) {
        // Dump extra actions.
        console.log(
          `Turn over! [${prevToken.actor!.data.name}] ended turn with ${JSON.stringify(
            prevToken.actor!.data.data.action_tracker
          )}`
        );
        (<LancerGame>game).action_manager?.modAction(prevToken.actor!, true);
      }
    }
  }
}
