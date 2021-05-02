import { LANCER } from "../../config";
import { prepareChargeMacro } from "../../macros";

export async function handleCombatUpdate(combat: any, changed: any) {
  //if (combat.round === 0 || changed?.round === 0) return;
  if (!("turn" in changed) && changed.round !== 1) return;
  if ((game.combats.get(combat.id).data as any).combatants.length == 0) return;

  if (game.settings.get(LANCER.sys_name, LANCER.setting_automation)) {
    const nextTurnIndex = changed.turn;
    if (combat.turns[nextTurnIndex]) {
      const nextToken = canvas.tokens.get(combat.turns[nextTurnIndex].tokenId);
      if (nextToken) {
        prepareChargeMacro(nextToken.actor._id);
        console.log(`Processing combat automation for ${nextToken.actor._id}`);
      }
    }
  }
}
