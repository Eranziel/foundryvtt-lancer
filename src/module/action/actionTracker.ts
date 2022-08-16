/**
 * Module class for moderation of actor action data.
 */

import { ActionData, ActionType } from ".";
import { LancerActor } from "../actor/lancer-actor";

export const _defaultActionData = (target: Actor) => {
  return {
    protocol: true,
    move: getSpeed(target),
    full: true,
    quick: true,
    reaction: true,
  } as ActionData;
};
export const _endTurnActionData = () => {
  return {
    protocol: false,
    move: 0,
    full: false,
    quick: false,
    reaction: true,
  } as ActionData;
};

/**
 * Get proxy for ease of migration when we change over to MM data backing.
 * @returns actions map.
 */
export function getActions(actor: LancerActor): ActionData | undefined {
  // @ts-expect-error Should be fixed with v10 types
  return actor.system.action_tracker ? { ...actor.system.action_tracker } : undefined;
}
/**
 * Set proxy for ease of migration when we change over to MM data backing.
 */
export async function updateActions(actor: LancerActor, actions: ActionData) {
  await actor.update({ "data.action_tracker": actions });
  // this.token?.update({ "flags.lancer.actions": actions });
}

/**
 * Spends an action or triggers end turn effect (empty all actions).
 * @param actor actor to modify.
 * @param spend whether to refresh or spend an action.
 * @param type specific action to spend, or undefined for end-turn behavior.
 */
export async function modAction(actor: LancerActor, spend: boolean, type?: ActionType) {
  // @ts-expect-error Should be fixed with v10 types
  let actions = { ...actor.system.action_tracker };
  if (actions) {
    switch (type) {
      case "move": // TODO: replace with tooltip for movement counting.
        actions.move = spend ? 0 : getSpeed(actor);
        break;
      case "free": // Never disabled
        actions.free = true;
        break;
      case "quick":
        if (spend) {
          actions.full ? (actions.full = false) : (actions.quick = false);
        } else {
          actions.quick = true;
        }
        break;
      case "full":
        if (spend) {
          actions.full = false;
          actions.quick = false;
        } else {
          actions.full = true;
        }
        break;
      case "protocol":
        actions.protocol = !spend;
        break;
      case "reaction":
        actions.reaction = !spend;
        break;

      case undefined:
        actions = spend ? _endTurnActionData() : _defaultActionData(actor);
    }

    // When any action is spent, disable protocol.
    if (spend) {
      actions.protocol = false;
    }
    await updateActions(actor, actions);
  }
}
export async function toggleAction(actor: LancerActor, type: ActionType) {
  let actions = getActions(actor);
  if (actions) {
    if (actions[type]) {
      await modAction(actor, true, type);
    } else {
      await modAction(actor, false, type);
    }
  }
}

function getSpeed(actor: Actor) {
  // @ts-expect-error Should be fixed with v10 types
  return actor.system?.derived?.speed || 4;
}
