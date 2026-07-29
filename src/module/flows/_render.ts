// Import TypeScript modules
import { nanoid } from "nanoid";
import type { LancerActor } from "../actor/lancer-actor";

/**
 *
 */
// TODO: Indexed types for templates
export async function renderTemplateStep(actor: LancerActor, template: string, templateData: any, flags?: any) {
  templateData._uuid = nanoid();

  const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

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
  let chat_data = {
    // `type` is the ChatMessage document subtype; the presentation style lives on
    // `style`. Passing a CHAT_MESSAGE_STYLES value as `type` fails validation in v14.
    style: CONST.CHAT_MESSAGE_STYLES.IC,
    rolls,
    speaker: {
      actor: actor,
      token: actor?.token,
      alias: !!actor?.token ? actor.token.name : null,
    },
    content: html,
    flavor: "",
    flags: flags ? { lancer: flags } : undefined,
  };

  const rollMode = game.settings.get("core", "rollMode");
  // v14 replaced the legacy CONST.DICE_ROLL_MODES values ("blindroll", "gmroll", ...) with the
  // CONFIG.ChatMessage.modes keys ("blind", "gm", ...). Accept both: which form the setting hands
  // back is not something we can rely on.
  const ROLL_MODE_KEYS: Record<string, string> = {
    blind: "blind",
    blindroll: "blind",
    gm: "gm",
    gmroll: "gm",
    self: "self",
    selfroll: "self",
  };
  // Take the label from CONFIG rather than from CHAT.RollBlind / CHAT.RollPrivate / CHAT.RollSelf.
  // v14 no longer ships those keys, so localizing them returned the key itself and the card showed
  // "CHAT.RollBlind" where the mode name belonged.
  // fvtt-types has no v14 release, so `modes` is missing from its CONFIG.ChatMessage definition.
  // Describe just the part we read; drop the cast once the types catch up.
  const chatModes = (CONFIG.ChatMessage as unknown as { modes?: Record<string, { label: string }> }).modes;
  const modeKey = ROLL_MODE_KEYS[String(rollMode)];
  const modeLabel = modeKey ? chatModes?.[modeKey]?.label : undefined;
  if (modeLabel) chat_data.flavor = game.i18n.localize(modeLabel);
  // Respect the chat visibility setting
  // NOTE: v14 renames this to ChatMessage.applyMode; applyRollMode still works in v14
  // (deprecated, removed in v15). Switch once fvtt-types ships v14 definitions.
  ChatMessage.applyRollMode(chat_data, rollMode);

  if (!rolls) delete chat_data.rolls;
  const cm = await ChatMessage.implementation.create(chat_data);
  cm?.render();
}
