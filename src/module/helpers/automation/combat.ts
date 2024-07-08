import { LancerCombat } from "../../combat/lancer-combat";
import { modAction } from "../../action/action-tracker";
import { LancerActor } from "../../actor/lancer-actor";
import { ActionTrackFlow } from "../../flows/action-track";
import { getActionTrackerOptions, getAutomationOptions } from "../../settings";
import { LANCER } from "../../config";

const lp = LANCER.log_prefix;

export async function handleCombatUpdate(...[combat, changed]: Parameters<Hooks.UpdateDocument<typeof Combat>>) {
  if (game.user?.isGM) {
    if (!("turn" in changed) && changed.round !== 1) return;
    if (game.combats!.get(combat.id!)?.combatants.contents.length == 0) return;

    if (getAutomationOptions().enabled) {
      // TODO: Update foundryvtt typings.
      const nextActor = lookup(combat, (combat.current as any).combatantId);
      const prevActor = lookup(combat, (combat.previous as any).combatantId);

      // Handle end-of-turn for previous combatant.
      if (prevActor) {
        processEndTurn(prevActor);
      }

      // Handle refreshing for next combatant.
      if (nextActor) {
        processStartTurn(nextActor);
      }
    }
  }
}

function processStartTurn(actor: LancerActor) {
  console.log(`${lp} Processing start-of-turn combat automation for ${actor.name}`);

  const automation = getAutomationOptions();

  // Handle NPC feature recharge
  // @ts-expect-error v10 types
  if (automation.enabled && automation.npc_recharge && actor.is_npc() && game.users?.activeGM?.isSelf) {
    actor.beginRechargeFlow();
  }

  // Refresh actions.
  modAction(actor, false);

  // Refresh reactions on new turn.
  refreshReactions(game.combat);

  // Print chat messages.
  if (getActionTrackerOptions().printMessages) {
    new ActionTrackFlow(actor, { start: true }).begin();
  }
}

function processEndTurn(actor: LancerActor) {
  console.log(`${lp} Processing end-of-turn combat automation for ${actor.name}`);

  // Dump extra actions.
  modAction(actor, true);

  // Handle Burn
  if (actor.system.burn > 0) {
    actor.beginBurnFlow("BURN :: ENG");
  }

  // Print chat messages.
  if (getActionTrackerOptions().printMessages) {
    new ActionTrackFlow(actor, { start: false }).begin();
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
