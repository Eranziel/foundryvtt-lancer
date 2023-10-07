// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { buildActionHTML, buildDeployableHTML } from "../helpers/item";
import { ActivationOptions, ActivationType } from "../enums";
import { createChatMessageStep, renderTemplateStep } from "./_render";
import { resolve_dotpath } from "../helpers/commons";
import { ActionData } from "../models/bits/action";
import { lookupOwnedDeployables } from "../util/lid";
import { LancerFlowState } from "./interfaces";
import { prepareTextMacro } from "./text";
import { Flow, FlowState } from "./flow";
import { UUIDRef } from "../source-template";
import {
  applySelfHeat,
  checkItemCharged,
  checkItemDestroyed,
  checkItemLimited,
  updateItemAfterAction,
} from "./item-utils";

const lp = LANCER.log_prefix;

export class ActivationFlow extends Flow<LancerFlowState.ActionUseData> {
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.ActionUseData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.ActionUseData = {
      type: "action",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      acc: data?.acc || 0,
      action: data?.action || null,
      self_heat: data?.self_heat || undefined,
      detail: data?.detail || "",
      tags: data?.tags || [],
    };

    super("ActivationFlow", uuid, initialData);

    // TODO: if a system or action is not provided, prompt the user to select one?
    // Or would it be better to have a separate UI for that before the flow starts?
    this.steps.set("initActivationData", dummyStep);
    this.steps.set("checkItemDestroyed", checkItemDestroyed);
    this.steps.set("checkItemLimited", checkItemLimited);
    this.steps.set("checkItemCharged", checkItemCharged);
    // Does anything need to be done here?
    this.steps.set("applySelfHeat", applySelfHeat);
    this.steps.set("updateItemAfterAction", updateItemAfterAction);
    this.steps.set("printActionUseCard", dummyStep);
  }
}

export async function dummyStep(state: FlowState<LancerFlowState.ActionUseData>, options?: {}): Promise<boolean> {
  return true;
}

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
        // TODO: differentiate between tech attacks and invasions
        // TODO: insert the action name into the title
        await item.beginTechAttackFlow();
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

  let mData: LancerFlowState.AttackRollData = {
    title: action.name,
    // @ts-expect-error
    tech_attack: actor.system.tech_attack,
    acc: 0,
    action: action.name.toUpperCase(),
    effect: action.detail,
    tags: item.is_mech_system() ? item.system.tags : [],
  };
  console.log(`${lp} Tech Action - deprecate or refactor to use a flow`);
  // prepareTechMacro(item.uuid);

  // await rollTechMacro(mData);
}

async function prepareDeployableMacro(item: LancerItem, path: string) {
  let deployable_lid = resolve_dotpath<string>(item, path, "");
  let dep = lookupOwnedDeployables(item.actor!)[deployable_lid];
  if (dep) {
    // This is awful
    await createChatMessageStep(
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
