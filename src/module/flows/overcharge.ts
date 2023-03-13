// Import TypeScript modules
import { getAutomationOptions } from "../settings";
import { LancerActor, LancerMECH } from "../actor/lancer-actor";
import { encodeMacroData } from "./encode";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";

export function encodeOverchargeMacroData(actor_uuid: string): string {
  return encodeMacroData({
    title: "OVERCHARGE",
    fn: "prepareOverchargeMacro",
    args: [actor_uuid],
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/overcharge.svg`,
  });
}

export async function prepareOverchargeMacro(actor: LancerActor | string) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  // Validate that we're overcharging a mech
  if (!actor.is_mech()) {
    ui.notifications!.warn(`Only mechs can overcharge!`);
    return;
  }

  let rollText = actor.strussHelper.getOverchargeRoll()!;

  let mData: LancerFlowState.OverchargeRollData = {
    level: actor.system.overcharge,
    roll: rollText,
  };

  // Assume we can always increment overcharge here...
  await actor.update({
    "system.overcharge": Math.min(actor.system.overcharge + 1, actor.system.overcharge_sequence.length - 1),
  });

  return rollOverchargeMacro(actor, mData);
}

async function rollOverchargeMacro(actor: LancerActor, data: LancerFlowState.OverchargeRollData) {
  if (!actor) return;

  // Prep data
  let roll = await new Roll(data.roll).evaluate({ async: true });
  const roll_tt = await roll.getTooltip();

  // Only increase heat if we haven't disabled it
  if (getAutomationOptions().overcharge_heat) {
    await actor.update({ "system.heat.value": (actor as LancerMECH).system.heat.value + roll.total! });
  }

  // Construct the template
  const templateData = {
    actorName: actor.name,
    roll: data.roll,
    level: data.level,
    roll_tooltip: roll_tt,
  };
  const template = `systems/${game.system.id}/templates/chat/overcharge-card.hbs`;
  return renderTemplateStep(actor, template, templateData);
}
