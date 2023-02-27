// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor, LancerNPC } from "../actor/lancer-actor";
import { AccDiffData, AccDiffDataSerialized } from "../helpers/acc_diff";
import { encodeMacroData } from "./encode";
import { resolveItemOrActor } from "./util";
import { renderMacroTemplate } from "./_render";
import { attackRolls, checkTargets } from "./attack";
import { SystemTemplates } from "../system-template";
import { LancerMacro } from "./interfaces";
import { openSlidingHud } from "../helpers/slidinghud";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export async function prepareTechMacro(docUUID: string | LancerActor | LancerItem) {
  // Determine provided doc
  let { item, actor } = await resolveItemOrActor(docUUID);
  if (!actor) return;

  let mData: Partial<LancerMacro.AttackRoll>;
  let acc_diff: AccDiffData;
  if (actor && !item) {
    // If we weren't passed an item assume generic "basic tech attack" roll
    // TODO: make an actual flow to this that lets people pick an action/invade/item

    if (!(actor.is_mech() || actor.is_npc())) {
      ui.notifications!.error(`Error rolling tech attack macro (not a valid tech attacker).`);
      return;
    }
    let acc = actor.is_mech() && actor.system.loadout.frame?.value?.system.lid == "mf_goblin" ? 1 : 0;
    acc_diff = AccDiffData.fromParams(actor, [], "BASIC TECH", Array.from(game.user!.targets), acc);
    mData = {
      docUUID: actor.uuid,
      title: "BASIC TECH",
      flat_bonus: actor.system.tech_attack,
      tags: [],
      attack_type: "Quick Tech",
    };
  } else if (item) {
    // Get the item
    if (item.is_npc_feature()) {
      let tier_index: number = (item.system.tier_override || (item.actor as LancerNPC).system.tier) - 1;

      let sys = item.system as SystemTemplates.NPC.TechData;
      let acc = sys.accuracy[tier_index] ?? 0;
      acc_diff = AccDiffData.fromParams(item, item.getTags() ?? [], item.name!, Array.from(game.user!.targets), acc);
      mData = {
        docUUID: item.uuid,
        title: item.name!,
        attack_type: sys.tech_type,
        flat_bonus: sys.attack_bonus[tier_index] ?? 0,
        tags: sys.tags.map(t => t.save()),
        effect: sys.effect,
      };
    } else {
      ui.notifications!.error(
        `Error rolling tech attack macro - not the appropriate way of invoking this type of item, probably`
      );
      return;
    }
    console.log(`${lp} Tech Attack Macro Item:`, item, mData);
  } else {
    return;
  }

  // Summon prompt
  acc_diff = await openSlidingHud("attack", acc_diff);
  mData.acc_diff = acc_diff.toObject();
  await rollTechMacro(mData as LancerMacro.AttackRoll);
}

export async function rollTechMacro(data: LancerMacro.AttackRoll, reroll: boolean = false) {
  // Get actor
  let { actor } = await resolveItemOrActor(data.docUUID);
  if (!actor) return;

  // Populate and possibly regenerate ADD if reroll
  let add = AccDiffData.fromObject(data.acc_diff);
  if (reroll) {
    // Re-prompt
    add.replaceTargets(Array.from(game!.user!.targets));
    add = await openSlidingHud("attack", add);
    data.acc_diff = add.toObject();
  }

  let rerollInvocation: LancerMacro.Invocation = {
    title: "RollMacro",
    fn: "rollTechMacro",
    args: [data, true],
  };

  let atkRolls = attackRolls(data.flat_bonus, add);
  if (!atkRolls) return;

  const { attacks, hits } = await checkTargets(atkRolls, true); // true = all tech attacks are "smart"

  // Output
  const templateData = {
    title: data.title,
    attacks: attacks,
    hits: hits,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
    rerollMacroData: encodeMacroData(rerollInvocation),
  };

  const template = `systems/${game.system.id}/templates/chat/tech-attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData);
}
