import { modAction } from "../../action/action-tracker";
import { LancerActor } from "../../actor/lancer-actor";
import { LancerCombat } from "../../combat/lancer-combat";
import { LANCER } from "../../config";
import { ActionTrackFlow } from "../../flows/action-track";
import { userOwnsActor } from "../../util/misc";

const lp = LANCER.log_prefix;

export async function handleCombatUpdate(...[combat, changed]: Parameters<Hooks.UpdateDocument<typeof Combat>>) {
  if (game.user?.isGM) {
    // @ts-expect-error changed has wrong type
    if (!("turn" in changed) && changed.round !== 1) return;
    if (game.combats!.get(combat.id!)?.combatants.contents.length == 0) return;

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

function processStartTurn(actor: LancerActor) {
  console.log(`${lp} Processing start-of-turn combat automation for ${actor.name}`);

  const automation = game.settings.get(game.system.id, LANCER.setting_automation);

  // Handle NPC feature recharge
  if (automation.npc_recharge && actor.is_npc() && game.users?.activeGM?.isSelf) {
    actor.beginRechargeFlow();
  }

  // Refresh actions.
  modAction(actor, false);

  // Refresh reactions on new turn.
  refreshReactions(game.combat);

  // Print chat messages.
  if (game.settings.get(game.system.id, LANCER.setting_actionTracker).printMessages) {
    new ActionTrackFlow(actor, { start: true }).begin();
  }
}

function processEndTurn(actor: LancerActor) {
  console.log(`${lp} Processing end-of-turn combat automation for ${actor.name}`);

  // Dump extra actions.
  modAction(actor, true);

  // Handle Burn
  if (actor.system.burn > 0) {
    // Since this code only runs for the GM, check whether we should get the burn prompt or forward it to a player.
    if (userOwnsActor(actor)) {
      actor.beginBurnFlow();
    } else {
      game.socket?.emit(`system.${game.system.id}`, {
        action: "burnCheck",
        data: { actorUuid: actor.uuid },
      });
    }
  }

  // Print chat messages.
  if (game.settings.get(game.system.id, LANCER.setting_actionTracker).printMessages) {
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

export function disableLancerInitiative() {
  if (!game.user?.isGM || !game.modules.get("lancer-initiative")?.active) return;

  // Disable the module
  console.log(`${lp} Disabling Lancer Initiative module`);
  const mods = game.settings.get("core", "moduleConfiguration");
  mods["lancer-initiative"] = false;
  game.settings.set("core", "moduleConfiguration", mods);

  // Show a dialog to let the user know what happened
  const text = `
  <p>The <b>Lancer Initiative</b> module is intended for use in non-Lancer systems to use Lancer-style
  initiative. Since all of its functionality is already included in the system, enabling the module
  can cause issues. <b>The module has been disabled.</b></p>
  <p>The page must now be refreshed for the module change to take effect.</p>`;
  new Dialog(
    {
      title: `Lancer Initiative Module is not Needed`,
      content: text,
      buttons: {
        ok: { label: "Refresh", callback: () => window.location.reload() },
      },
      default: "No",
    },
    {
      width: 350,
    }
  ).render(true);
}
