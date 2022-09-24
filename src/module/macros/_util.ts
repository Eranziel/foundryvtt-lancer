import { LANCER } from "../config";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";

const lp = LANCER.log_prefix;

/**
 * Get an actor to use for a macro. If an id is passed and the return is
 * `undefined` a warning notification will be displayed.
 * @param a_id - The Actor to search for. If an id, try to search for the
 *               appropriate actor to use, if an Actor document, use that doc.
 */
export function getMacroSpeaker(a_id?: string | LancerActor): LancerActor | undefined {
  // If we have an actor already, we're gtg
  if (a_id instanceof Actor) return a_id;
  // Determine which Actor to speak as
  const speaker = ChatMessage.getSpeaker();
  // console.log(`${lp} Macro speaker`, speaker);
  let actor: LancerActor | undefined;
  // console.log(game.actors!.tokens);
  if (speaker.token && Object.keys(game.actors!.tokens).includes(speaker.token)) {
    actor = game.actors!.tokens[speaker.token];
  }
  if (!actor) {
    actor = game.actors!.get(speaker.actor!, { strict: false });
  }
  if (!actor || (a_id && actor.id !== a_id)) {
    actor = game.actors!.get(a_id!);
  }
  if (!actor || (a_id && actor.id !== a_id)) {
    actor = game.actors!.tokens[a_id!];
  }
  if (!actor && a_id !== undefined) {
    ui.notifications!.warn(`Failed to find Actor for macro. Do you need to select a token?`);
  }
  return actor;
}

export function ownedItemFromString(i: string, actor: LancerActor): LancerItem | null {
  // Get the item
  let item = actor.items.get(i);
  if (!item && actor.is_mech()) {
    // @ts-expect-error Should be fixed with v10 types
    let pilot = game.actors!.get(actor.system.pilot?.id ?? "");
    item = pilot?.items.get(i);
  }

  if (!item) {
    ui.notifications!.error(`Error preparing macro: could not find Item ${i} owned by Actor ${actor.name}.`);
    return null;
  } else if (!item.isOwned) {
    ui.notifications!.error(`Error preparing macro: ${item.name} is not owned by an Actor.`);
    return null;
  }

  return item;
}
