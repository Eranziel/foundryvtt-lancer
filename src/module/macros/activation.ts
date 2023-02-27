// Import TypeScript modules
import { getAutomationOptions } from "../settings";
import { LancerItem } from "../item/lancer-item";
import type { LancerDEPLOYABLE } from "../actor/lancer-actor";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { buildActionHTML, buildDeployableHTML } from "../helpers/item";
import { ActivationOptions, ActivationType } from "../enums";
import { renderMacroHTML, renderMacroTemplate } from "./_render";
import { prepareTechMacro, rollTechMacro } from "./tech";
import { resolve_dotpath } from "../helpers/commons";
import { ActionData } from "../models/bits/action";
import { lookupOwnedDeployables } from "../util/lid";
import { LancerMacro } from "./interfaces";
import { prepareTextMacro } from "./text";

/**
 * Dispatch wrapper for the "action chips" on the bottom of many items, traits, systems, and so on.
 * @param item   {string}                    Item to use.
 * @param type   {ActivationOptions}         Options for how to perform the activation
 * @param path   {string}                    ?
 */
export async function prepareActivationMacro(item: string | LancerItem, type: ActivationOptions, path: string) {
  // Get the item
  item = LancerItem.fromUuidSync(item, "Error preparing tech attack macro");
  if (!item.actor) {
    return ui.notifications!.error(`Error rolling activation macro - ${item.name} is not owned by an Actor!`);
  }

  if (getAutomationOptions().limited_loading && item.isLimited() && item.system.uses.value <= 0) {
    ui.notifications!.error(`Error using item--you have no uses left!`);
    return;
  }

  if (type == ActivationOptions.ACTION) {
    let action = resolve_dotpath<ActionData>(item, path);
    if (action) {
      if (action.tech_attack || action.activation == ActivationType.Invade) {
        await prepareTechMacro(item.uuid, {
          action_path: path,
        });
      } else {
        await prepareTextMacro(item.actor, action.name ?? item.name, buildActionHTML(item, path));
      }
    } else {
      ui.notifications!.error(`Failed to resolve action ${path}`);
    }
  } else if (type == ActivationOptions.DEPLOYABLE) {
    await prepareDeployableMacro(item, path);
  }

  // Wait until the end to deduct a use so we're sure it completed succesfully
  if (getAutomationOptions().limited_loading && item.isLimited()) {
    await item.update({
      "system.uses": item.system.uses.value - 1,
    });
  }

  return;
}

async function prepareTechActionMacro(item: LancerItem, path: string) {
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
  prepareTechMacro(item.uuid);

  await rollTechMacro(mData);
}

async function prepareDeployableMacro(item: LancerItem, path: string) {
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
