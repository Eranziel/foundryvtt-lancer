// Import TypeScript modules
import { nanoid } from "nanoid";
import type { LancerActor } from "../actor/lancer-actor";

/**
 *
 */
// TODO: Indexed types for templates
export async function renderTemplateStep(actor: LancerActor, template: string, templateData: any, flags?: any) {
  templateData._uuid = nanoid();

  const html = await renderTemplate(template, templateData);

  // Schlorp up all the rolls into a mega-roll so DSN sees the stuff to throw
  // on screen
  const aggregate: Roll[] = [];
  if (templateData.roll) {
    aggregate.push(templateData.roll);
  }
  if (templateData.result) {
    aggregate.push(templateData.result.roll);
  }
  if ((templateData.attack_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.attack_results.map((a: { roll: Roll }) => a.roll));
  }
  if ((templateData.crit_damage_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.crit_damage_results.map((d: { roll: Roll }) => d.roll));
  } else if ((templateData.damage_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.damage_results.map((d: { roll: Roll }) => d.roll));
  }
  if (templateData.self_heat_result) {
    aggregate.push(templateData.self_heat_result.roll);
  }
  return createChatMessageStep(actor, html, aggregate, flags);
}

export async function createChatMessageStep(
  actor: LancerActor,
  html: HTMLElement | string,
  rolls?: Roll | Roll[],
  flags?: any
) {
  if (rolls && !Array.isArray(rolls)) rolls = [rolls];
  const rollMode = game.settings.get("core", "rollMode");
  const whisper_roll = rollMode !== "roll" ? ChatMessage.getWhisperRecipients("GM").filter(u => u.active) : undefined;
  let chat_data = {
    // @ts-expect-error v12
    type: CONST.CHAT_MESSAGE_STYLES.IC,
    rolls,
    speaker: {
      actor: actor,
      token: actor?.token,
      alias: !!actor?.token ? actor.token.name : null,
    },
    content: html,
    whisper: rolls ? whisper_roll : [],
    flags: flags ? { lancer: flags } : undefined,
  };
  if (!rolls) delete chat_data.rolls;
  // @ts-expect-error types, possibly switch to getDocumentClass() in the future
  const cm = await ChatMessage.implementation.create(chat_data);
  cm?.render();
}
