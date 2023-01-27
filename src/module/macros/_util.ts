import { LANCER } from "../config";
import type { LancerItem } from "../item/lancer-item";
import { LancerActor } from "../actor/lancer-actor";

const lp = LANCER.log_prefix;

/**
 * Get an actor to use for a macro. If an id is passed and the return is
 * `undefined` a warning notification will be displayed.
 * @param provActor - The Actor to search for. If an id, try to search for the
 *               appropriate actor to use, if an Actor document, use that doc.
 */
export function getMacroSpeaker(provActor?: string | LancerActor): LancerActor | undefined {
  // If we have an actor already, we're gtg
  if (provActor instanceof Actor) return provActor;

  let actor: LancerActor | undefined;
  if (provActor) {
    actor = game.actors!.get(provActor, { strict: false });
    if (actor) return actor;
    actor = game.actors!.tokens[provActor!];
    if (actor) return actor;
    // @ts-expect-error
    actor = fromUuidSync(provActor);
    if (actor) return actor;
  }

  // As a fallback, ask the system
  const speaker = ChatMessage.getSpeaker();
  if (speaker.token && Object.keys(game.actors!.tokens).includes(speaker.token)) {
    actor = game.actors!.tokens[speaker.token];
    if (actor) return actor;
  }

  console.log("Couldn't resolve:", provActor);
  ui.notifications!.warn(`Failed to find Actor for macro. Do you need to select a token?`);

  return actor;
}
