// Import TypeScript modules
import { getAutomationOptions } from "../settings";
import { LancerItem } from "../item/lancer-item";
import type { LancerDEPLOYABLE } from "../actor/lancer-actor";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { buildActionHTML, buildDeployableHTML } from "../helpers/item";
import { ActivationOptions, ActivationType } from "../enums";
import { renderMacroHTML, renderMacroTemplate } from "./_render";
import { rollTechMacro } from "./tech";
import { resolve_dotpath } from "../helpers/commons";
import { ActionData } from "../models/bits/action";
import { lookupOwnedDeployables } from "../util/lid";
import { LancerMacro } from "./interfaces";

/**
 * Dispatch wrapper for the "action chips" on the bottom of many items, traits, systems, and so on.
 * @param itemUUID       {string}                    Item to use.
 * @param type    {ActivationOptions}         Options for how to perform the activation
 * @param path   {string}                    ?
 * @param rerollData {AccDiffDataSerialized}  saved accdiff data for rerolls
 */
export async function prepareActivationMacro(
  itemUUID: string,
  type: ActivationOptions,
  path: string,
  rerollData?: AccDiffDataSerialized
) {
  // Get the item
  let item = LancerItem.fromUuidSync(itemUUID, "Error preparing tech attack macro");
  if (!item.actor) {
    return ui.notifications!.error(`Error rolling activation macro - ${item.name} is not owned by an Actor!`);
  }

  if (getAutomationOptions().limited_loading && item.isLimited() && item.system.uses.value <= 0) {
    ui.notifications!.error(`Error using item--you have no uses left!`);
    return;
  }

  switch (type) {
    case ActivationOptions.ACTION:
      let action = resolve_dotpath<ActionData>(item, path);
      if (action) {
        switch (action?.activation) {
          case ActivationType.FullTech:
          case ActivationType.Invade:
          case ActivationType.QuickTech:
            let partialMacroData = {
              title: "Reroll activation",
              fn: "prepareActivationMacro",
              args: [itemUUID, type, path],
            };
            await _prepareTechActionMacro(item, path, partialMacroData, rerollData);
            break;
          default:
            await _prepareTextActionMacro(item, path);
        }
      } else {
        ui.notifications!.error(`Failed to resolve action ${path}`);
      }
      break;
    case ActivationOptions.DEPLOYABLE:
      await _prepareDeployableMacro(item, path);
  }

  // Wait until the end to deduct a use so we're sure it completed succesfully
  if (getAutomationOptions().limited_loading && item.isLimited()) {
    await item.update({
      "system.uses": item.system.uses.value - 1,
    });
  }

  return;
}

async function _prepareTextActionMacro(item: LancerItem, path: string) {
  let actor = item.actor!;
  await renderMacroHTML(actor, buildActionHTML(item, path, { full: true }));
}

async function _prepareTechActionMacro(
  item: LancerItem,
  path: string,
  invocation: LancerMacro.Invocation,
  accDiff?: AccDiffDataSerialized
) {
  let actor = item.actor!;
  let action = resolve_dotpath<ActionData>(item, path)!;

  let mData: LancerMacro.AttackRoll = {
    title: action.name,
    // @ts-expect-error
    tech_attack: actor.system.tech_attack,
    acc: 0,
    action: action.name.toUpperCase(),
    effect: action.detail,
    tags: item.is_mech_system() ? item.system.tags : [],
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

  await rollTechMacro(mData);
}

async function _prepareDeployableMacro(item: LancerItem, path: string) {
  let deployable_lid = resolve_dotpath<string>(item, path);
  let dep = lookupOwnedDeployables(item.actor!).find(d => (d as LancerDEPLOYABLE).system.lid == deployable_lid);
  if (dep) {
    // This is awful
    await renderMacroHTML(
      item.actor!,
      buildDeployableHTML(
        dep,
        {
          item,
          path,
        },
        false
      )
    );
  } else {
    ui.notifications?.error("Failed to resolve deployable");
  }
}
