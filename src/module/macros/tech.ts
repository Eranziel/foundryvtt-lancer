// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerMacroData, LancerTechMacroData } from "../interfaces";
import type { NpcFeature } from "machine-mind";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { encodeMacroData } from "./_encode";
import { getMacroSpeaker } from "./_util";
import { renderMacroTemplate } from "./_render";
import { attackRolls, checkTargets } from "./attack";

const lp = LANCER.log_prefix;

export async function prepareTechMacro(a: string, t: string, rerollData?: AccDiffDataSerialized) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  let mData: LancerTechMacroData = {
    title: "",
    t_atk: 0,
    acc: 0,
    effect: "",
    tags: [],
    action: "",
  };
  let item: LancerItem | undefined;

  if (!t) {
    // if we weren't passed an item assume generic "basic tech attack" roll
    // TODO: make an actual flow to this that lets people pick an action/invade/item
    mData.action = "Quick";
    mData.title = "BASIC";

    if (actor.is_mech()) {
      // @ts-expect-error Should be fixed with v10 types
      const mm = await actor.system.derived.mm_promise;
      mData.t_atk = mm.TechAttack;
    } else if (actor.is_npc()) {
      // @ts-expect-error Should be fixed with v10 types
      const mm = await actor.system.derived.mm_promise;
      mData.t_atk = mm.Sys;
    } else {
      ui.notifications!.error(`Error rolling tech attack macro (not a valid tech attacker).`);
      return Promise.resolve();
    }
  } else {
    // Get the item
    const item = actor.items.get(t);
    if (!item) {
      return ui.notifications!.error(
        `Error preparing tech attack macro - could not find Item ${t} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
      );
    } else if (!item.isOwned) {
      return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
    }

    mData.title = item.name!;

    if (item.is_mech_system()) {
      debugger;
      /*
      const tData = item.system as LancerMechSystemData;
      mData.t_atk = (item.actor!.data as LancerPilotActorData).data.mech.tech_attack;
      mData.tags = tData.tags;
      mData.effect = ""; // TODO */
    } else if (item.is_npc_feature()) {
      // @ts-expect-error Should be fixed with v10 types
      const mm: NpcFeature = await item.system.derived.mm_promise;
      let tier_index: number = mm.TierOverride;
      if (!mm.TierOverride) {
        if (item.actor === null && actor.is_npc()) {
          // Use selected actor
          // @ts-expect-error Should be fixed with v10 types
          tier_index = actor.system.tier - 1;
        } else if (item.actor!.is_npc()) {
          // Use provided actor
          // @ts-expect-error Should be fixed with v10 types
          tier_index = item.actor.system.tier - 1;
        }
      } else {
        // Correct to be index
        tier_index -= 1;
      }

      mData.t_atk = mm.AttackBonus[tier_index] ?? 0;
      mData.acc = mm.Accuracy[tier_index] ?? 0;
      mData.tags = mm.Tags;
      mData.effect = mm.Effect;
      mData.action = mm.TechType;
    } else {
      ui.notifications!.error(`Error rolling tech attack macro`);
      return Promise.resolve();
    }
    console.log(`${lp} Tech Attack Macro Item:`, item, mData);
  }

  let partialMacroData = {
    title: "Reroll tech attack",
    fn: "prepareTechMacro",
    args: [a, t],
  };

  await rollTechMacro(actor, mData, partialMacroData, rerollData, item);
}

export async function rollTechMacro(
  actor: LancerActor,
  data: LancerTechMacroData,
  partialMacroData: LancerMacroData,
  rerollData?: AccDiffDataSerialized,
  item?: LancerItem
) {
  const targets = Array.from(game!.user!.targets);
  let { AccDiffData } = await import("../helpers/acc_diff");
  const initialData = rerollData
    ? AccDiffData.fromObject(rerollData, item ?? actor)
    : AccDiffData.fromParams(
        item ?? actor,
        data.tags,
        data.title,
        targets,
        data.acc > 0 ? [data.acc, 0] : [0, -data.acc]
      );

  let promptedData;
  try {
    let { open } = await import("../helpers/slidinghud");
    promptedData = await open("attack", initialData);
  } catch (_e) {
    return;
  }

  partialMacroData.args.push(promptedData.toObject());

  let atkRolls = attackRolls(data.t_atk, promptedData);
  if (!atkRolls) return;

  const { attacks, hits } = await checkTargets(atkRolls, true); // true = all tech attacks are "smart"

  // Output
  const templateData = {
    title: data.title,
    attacks: attacks,
    hits: hits,
    action: data.action,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
    rerollMacroData: encodeMacroData(partialMacroData),
  };

  const template = `systems/${game.system.id}/templates/chat/tech-attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData);
}
