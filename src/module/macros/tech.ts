// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor, LancerMECH, LancerNPC } from "../actor/lancer-actor";
import type { LancerMacroData, LancerTechMacroData } from "../interfaces";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { encodeMacroData } from "./_encode";
import { getMacroSpeaker } from "./_util";
import { renderMacroTemplate } from "./_render";
import { attackRolls, checkTargets } from "./attack";
import { SystemTemplates } from "../system-template";

const lp = LANCER.log_prefix;

export async function prepareTechMacro(
  actorUUID: string | null,
  techItemUUID: string,
  rerollData?: AccDiffDataSerialized
) {
  // Determine which Actor to speak as
  let actor: LancerActor | null | undefined = actorUUID
    ? ((await fromUuid(actorUUID)) as LancerActor)
    : getMacroSpeaker();
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

  if (!techItemUUID) {
    // if we weren't passed an item assume generic "basic tech attack" roll
    // TODO: make an actual flow to this that lets people pick an action/invade/item
    mData.action = "Quick";
    mData.title = "BASIC";

    if (actor.is_mech() || actor.is_npc()) {
      mData.t_atk = actor.system.tech_attack; // TODO: make extra sure we populate this for npcs
    } else {
      ui.notifications!.error(`Error rolling tech attack macro (not a valid tech attacker).`);
      return Promise.resolve();
    }
  } else {
    // Get the item
    const item = actor.items.get(techItemUUID);
    if (!item) {
      return ui.notifications!.error(
        `Error preparing tech attack macro - could not find Item ${techItemUUID} owned by Actor ${actorUUID}! Did you add the Item to the token, instead of the source Actor?`
      );
    } else if (!item.isOwned) {
      return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
    }

    mData.title = item.name!;

    if (item.is_mech_system()) {
      mData.t_atk = (item.actor as LancerMECH).system.tech_attack;
      mData.tags = item.system.tags;
      mData.effect = item.system.effect;
    } else if (item.is_npc_feature()) {
      let tier_index: number = (item.system.tier_override || (item.actor as LancerNPC).system.tier) - 1;

      let sys = item.system as SystemTemplates.NPC.TechData;
      mData.t_atk = sys.attack_bonus[tier_index] ?? 0;
      mData.acc = sys.accuracy[tier_index] ?? 0;
      mData.tags = sys.tags;
      mData.effect = sys.effect;
      mData.action = sys.tech_type;
    } else {
      ui.notifications!.error(`Error rolling tech attack macro`);
      return Promise.resolve();
    }
    console.log(`${lp} Tech Attack Macro Item:`, item, mData);
  }

  let partialMacroData = {
    title: "Reroll tech attack",
    fn: "prepareTechMacro",
    args: [actorUUID, techItemUUID],
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
