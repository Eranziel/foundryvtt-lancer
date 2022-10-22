// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerOverchargeMacroData } from "../interfaces";
import { encodeMacroData } from "./_encode";
import { getMacroSpeaker } from "./_util";
import { renderMacroTemplate } from "./_render";

const lp = LANCER.log_prefix;

export function encodeOverchargeMacroData(actor_id: string): string {
  return encodeMacroData({
    title: "OVERCHARGE",
    fn: "prepareOverchargeMacro",
    args: [actor_id],
    iconPath: `systems/${game.system.id}/assets/icons/macro-icons/overcharge.svg`,
  });
}

export async function prepareOverchargeMacro(a: string) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  // Validate that we're overcharging a mech
  if (!actor.is_mech()) {
    ui.notifications!.warn(`Only mechs can overcharge!`);
    return;
  }

  // And here too... we should probably revisit our type definitions...
  let rollText = actor.getOverchargeRoll();
  if (!rollText) {
    ui.notifications!.warn(`Error in getting overcharge roll...`);
    return;
  }

  // Prep data
  let roll = await new Roll(rollText).evaluate({ async: true });

  let mData: LancerOverchargeMacroData = {
    level: actor.system.overcharge,
    roll: roll,
  };

  // Assume we can always increment overcharge here...
  let changes: any = {}; // TODO: cool types on stuff like this?
  changes["data.overcharge"] = Math.min(actor.system.overcharge + 1, 3);

  // Only increase heat if we haven't disabled it
  if (getAutomationOptions().overcharge_heat) {
    changes["data.heat"] = actor.system.heat.value + roll.total!;
  }

  await actor.update(changes);

  return rollOverchargeMacro(actor, mData);
}

async function rollOverchargeMacro(actor: LancerActor, data: LancerOverchargeMacroData) {
  if (!actor) return Promise.resolve();

  const roll_tt = await data.roll.getTooltip();

  // Construct the template
  const templateData = {
    actorName: actor.name,
    roll: data.roll,
    level: data.level,
    roll_tooltip: roll_tt,
  };
  const template = `systems/${game.system.id}/templates/chat/overcharge-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}
