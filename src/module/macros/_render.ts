// Import TypeScript modules
import type { LancerActor } from "../actor/lancer-actor";
import { uuid4 } from "../helpers/collapse";

/**
 *
 */
// TODO: Indexed types for templates
export async function renderMacroTemplate(
  actor: LancerActor | undefined,
  template: string,
  templateData: any,
  flags?: any
) {
  const cardUUID = uuid4();
  templateData._uuid = cardUUID;

  const html = await renderTemplate(template, templateData);

  // Schlorp up all the rolls into a mega-roll so DSN sees the stuff to throw
  // on screen
  const aggregate: Roll[] = [];
  if (templateData.roll) {
    aggregate.push(templateData.roll);
  }
  if ((templateData.attacks?.length ?? 0) > 0) {
    aggregate.push(...templateData.attacks.map((a: { roll: Roll }) => a.roll));
  }
  if ((templateData.crit_damages?.length ?? 0) > 0) {
    aggregate.push(...templateData.crit_damages.map((d: { roll: Roll }) => d.roll));
  } else if ((templateData.damages?.length ?? 0) > 0) {
    aggregate.push(...templateData.damages.map((d: { roll: Roll }) => d.roll));
  }
  const roll = Roll.fromTerms([PoolTerm.fromRolls(aggregate)]);

  return renderMacroHTML(actor, html, roll, flags);
}

export async function renderMacroHTML(
  actor: LancerActor | undefined,
  html: HTMLElement | string,
  roll?: Roll,
  flags?: any
) {
  const rollMode = game.settings.get("core", "rollMode");
  const whisper_roll = rollMode !== "roll" ? ChatMessage.getWhisperRecipients("GM").filter(u => u.active) : undefined;
  let chat_data = {
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.IC,
    roll: roll,
    speaker: {
      actor: actor,
      token: actor?.token,
      alias: !!actor?.token ? actor.token.name : null,
    },
    content: html,
    whisper: roll ? whisper_roll : [],
    flags: flags ? { lancer: flags } : undefined,
  };
  if (!roll) delete chat_data.roll;
  // @ts-ignore This is fine
  const cm = await ChatMessage.create(chat_data);
  cm?.render();
  return Promise.resolve();
}
