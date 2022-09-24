// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { TagInstance } from "machine-mind";
import { getMacroSpeaker } from "./_util";
import { renderMacroTemplate } from "./_render";

const lp = LANCER.log_prefix;

export async function prepareChargeMacro(a: string | LancerActor) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor || !actor.is_npc()) return;
  // @ts-expect-error Should be fixed with v10 types
  const npc = actor.system.derived.mm;
  const feats = npc?.Features;
  if (!feats) return;

  // Make recharge roll.
  const roll = await new Roll("1d6").evaluate({ async: true });
  const roll_tt = await roll.getTooltip();
  // Iterate over each system with recharge, if val of tag is lower or equal to roll, set to charged.

  let changed: { name: string; target: string | null | number | undefined; charged: boolean }[] = [];
  // @ts-expect-error Should be fixed with v10 types
  feats.forEach(feat => {
    if (!feat.Charged) {
      const recharge = feat.Tags.find((tag: TagInstance) => tag.Tag.LID === "tg_recharge");
      if (recharge && recharge.Value && recharge.Value <= (roll.total ?? 0)) {
        feat.Charged = true;
        feat.writeback();
      }
      changed.push({ name: feat.Name, target: recharge?.Value, charged: feat.Charged });
    }
  });

  // Skip chat if no changes found.
  if (changed.length === 0) return;

  // Render template.
  const templateData = {
    actorName: actor.name,
    roll: roll,
    roll_tooltip: roll_tt,
    changed: changed,
  };
  const template = `systems/${game.system.id}/templates/chat/charge-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}
