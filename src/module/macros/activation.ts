// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import type { LancerMacroData, LancerTechMacroData } from "../interfaces";
import { ActivationType, EntryType } from "machine-mind";
import { is_limited, is_tagged } from "machine-mind/dist/funcs";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { buildActionHTML, buildDeployableHTML } from "../helpers/item";
import { ActivationOptions } from "../enums";
import { encodeMacroData } from "./_encode";
import { getMacroSpeaker } from "./_util";
import { renderMacroHTML } from "./_render";
import { rollTechMacro } from "./tech";

const lp = LANCER.log_prefix;

export function encodeActivationMacroData(actor: any, item: any): string {
  return encodeMacroData({
    title: "?",
    fn: "prepareActivationMacro",
    args: [actor, item],
  });
}

/**
 * Dispatch wrapper for the "action chips" on the bottom of many items, traits, systems, and so on.
 * @param a       {string}                    Actor to roll as.
 * @param i       {string}                    Item to use.
 * @param type    {ActivationOptions}         Options for how to perform the activation
 * @param index   {number}                    ?
 * @param rerollData {AccDiffDataSerialized}  saved accdiff data for rerolls
 */
export async function prepareActivationMacro(
  a: string,
  i: string,
  type: ActivationOptions,
  index: number,
  rerollData?: AccDiffDataSerialized
) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  // Get the item
  let item: LancerItem | undefined;
  item = actor.items.get(i);
  if (!item && actor.is_mech()) {
    // @ts-expect-error Should be fixed with v10 types
    let pilot = game.actors!.get(actor.system.pilot?.id ?? "");
    item = pilot?.items.get(i);
  }

  if (!item || (!actor.is_mech() && !actor.is_pilot())) {
    return ui.notifications!.error(
      `Error preparing tech attack macro - could not find Item ${i} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
    );
  } else if (!item.isOwned) {
    return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
  } else if (!item.is_mech_system() && !item.is_npc_feature() && !item.is_talent()) {
    return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not a System or Feature!`);
  }

  // TODO: alter these generic functions to handle non mm items
  if (getAutomationOptions().limited_loading && is_tagged(item) && is_limited(item) && item.system.uses <= 0) {
    ui.notifications!.error(`Error using item--you have no uses left!`);
    return;
  }

  // TODO--handle NPC Activations
  if (item.is_npc_feature()) return;

  switch (type) {
    case ActivationOptions.ACTION:
      switch (item.Actions[index].Activation) {
        case ActivationType.FullTech:
        case ActivationType.Invade:
        case ActivationType.QuickTech:
          let partialMacroData = {
            title: "Reroll activation",
            fn: "prepareActivationMacro",
            args: [a, i, type, index],
          };
          await _prepareTechActionMacro(actor, item, index, partialMacroData, rerollData);
          break;
        default:
          await _prepareTextActionMacro(actor, item, index);
      }
      break;
    case ActivationOptions.DEPLOYABLE:
      await _prepareDeployableMacro(actor, item, index);
  }

  // Wait until the end to deduct a use so we're sure it completed succesfully
  if (getAutomationOptions().limited_loading && is_tagged(item) && is_limited(item)) {
    item.Uses = item.Uses - 1;
    await item.writeback();
  }

  return;
}

async function _prepareTextActionMacro(
  actor: LancerActor,
  item: LancerItem, // TODO: more specific types // Talent | MechSystem | NpcFeature,
  index: number
) {
  // Support this later...
  // TODO: pilot gear and NPC features
  if (!item.is_mech_system() && !item.is_talent() && !item.is_npc_feature()) return;

  let action = item.data.data.actions[index];
  let tags = item.is_mech_system() ? item.data.data.tags : [];
  await renderMacroHTML(actor, buildActionHTML(action, { full: true, tags: tags }));
}

async function _prepareTechActionMacro(
  actor: LancerActor, // TODO - restrict to mech or pilot
  item: LancerItem, // TODO: more specific types // Talent | MechSystem | NpcFeature,
  index: number,
  partialMacroData: LancerMacroData,
  rerollData?: AccDiffDataSerialized
) {
  // Support this later...
  // TODO: pilot gear and NPC features
  if (!item.is_mech_system() && !item.is_talent() && !item.is_npc_feature()) return;
  if (!actor.is_mech() && !actor.is_npc()) return;

  let action = item.data.data.actions[index];

  let mData: LancerTechMacroData = {
    title: action.Name,
    t_atk: actor.is_mech() ? actor.data.data.tech_attack : 0,
    acc: 0,
    action: action.Name.toUpperCase(),
    effect: action.Detail,
    tags: item.is_mech_system() ? item.data.data.tags : [],
  };

  /*
  if (item.is_npc_feature()) {
    const tData = item.system as RegNpcTechData;
    let tier: number;
    if (item.actor === null) {
      tier = actor.system.tier_num - 1;
    } else {
      tier = item.actor.system.tier_num - 1;
    }
    mData.t_atk =
      tData.attack_bonus && tData.attack_bonus.length 6> tier ? tData.attack_bonus[tier] : 0;
    mData.acc = tData.accuracy && tData.accuracy.length > tier ? tData.accuracy[tier] : 0;
    mData.tags = await SerUtil.process_tags(new FoundryReg(), new OpCtx(), tData.tags);
    mData.detail = tData.effect ? tData.effect : "";
  } */

  await rollTechMacro(actor, mData, partialMacroData, rerollData);
}

async function _prepareDeployableMacro(
  actor: LancerActor, // TODO: Mech | Pilot | Npc,
  item: LancerItem, // TODO: Talent | MechSystem | NpcFeature,
  index: number
) {
  // Support this later...
  // TODO: pilot gear (and NPC features later?)
  if (!item.is_mech_system() && !item.is_talent()) return;

  /* TODO
  let dep = item.data.data.deployables[index];

  await renderMacroHTML(actor.flags.orig_doc, buildDeployableHTML(dep, true));
  */
}
