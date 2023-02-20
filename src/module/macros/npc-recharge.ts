// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerActor } from "../actor/lancer-actor";
import { getMacroSpeaker } from "./_util";
import { renderMacroTemplate } from "./_render";
import { LancerNPC_FEATURE } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export async function prepareChargeMacro(actorUUID: string | LancerActor) {
  // Determine which Actor to speak as
  let npc = getMacroSpeaker(actorUUID);
  if (!npc || !npc.is_npc()) return;

  const feats = npc.itemTypes.npc_feature as LancerNPC_FEATURE[];
  if (!feats.length) return;

  // Make recharge roll.
  const roll = await new Roll("1d6").evaluate({ async: true });
  const roll_tt = await roll.getTooltip();
  // Iterate over each system with recharge, if val of tag is lower or equal to roll, set to charged.

  let changed: { name: string; target: string | null | number | undefined; charged: boolean }[] = [];
  for (let feat of feats) {
    if (!feat.system.charged) {
      const recharge = feat.system.tags.find(tag => tag.is_recharge);
      if (recharge && recharge.num_val && recharge.num_val <= (roll.total ?? 0)) {
        await feat.update({ "system.charged": true });
      }
      if (recharge) {
        changed.push({ name: feat.name!, target: recharge.num_val, charged: feat.system.charged });
      }
    }
  }

  // Skip chat if no changes found.
  if (changed.length === 0) return;

  // Render template.
  const templateData = {
    actorName: npc.name,
    roll: roll,
    roll_tooltip: roll_tt,
    changed: changed,
  };
  const template = `systems/${game.system.id}/templates/chat/charge-card.hbs`;
  return renderMacroTemplate(npc, template, templateData);
}
