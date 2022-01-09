import { LANCER } from "../config";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import type {
  LancerMacroData,
} from "../interfaces";

const lp = LANCER.log_prefix;

// TODO: wrap this in a helper function
export const encodedMacroWhitelist = [
  "prepareActivationMacro",
  "prepareEncodedAttackMacro",
  "prepareTechMacro",
  "prepareStatMacro",
  "prepareItemMacro",
  "prepareCoreActiveMacro",
  "prepareFrameTraitMacro",
  "prepareOverchargeMacro",
  "prepareStructureSecondaryRollMacro",
  "prepareOverheatMacro",
  "prepareStructureMacro",
];

export function encodeMacroData(data: LancerMacroData): string {
  return window.btoa(encodeURI(JSON.stringify(data)));
}

export async function runEncodedMacro(el: HTMLElement | LancerMacroData) {
  console.log(el);
  let data: LancerMacroData | null = null;

  if (el instanceof HTMLElement) {
    let encoded = el.attributes.getNamedItem("data-macro")?.nodeValue;
    if (!encoded) {
      console.warn("No macro data available");
      return;
    }

    data = JSON.parse(decodeURI(window.atob(encoded))) as LancerMacroData;
  } else {
    data = el as LancerMacroData;
  }

  if (encodedMacroWhitelist.indexOf(data.fn) < 0) {
    console.error("Attempting to call unwhitelisted function via encoded macro: " + data.fn);
    return;
  }

  let fn = game.lancer[data.fn];
  return (fn as Function).apply(null, data.args);
}

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
    let pilot = game.actors!.get(actor.data.data.pilot?.id ?? "");
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
