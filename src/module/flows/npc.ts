import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";
import { LancerItem } from "../item/lancer-item";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";

export function registerNPCSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("findRechargeableSystems", findRechargeableSystems);
  flowSteps.set("rollRecharge", rollRecharge);
  flowSteps.set("applyRecharge", applyRecharge);
  flowSteps.set("printRechargeCard", printRechargeCard);
}

export class NPCRechargeFlow extends Flow<LancerFlowState.RechargeRollData> {
  static steps = ["findRechargeableSystems", "rollRecharge", "applyRecharge", "printRechargeCard"];

  constructor(uuid: LancerActor, data?: Partial<LancerFlowState.RechargeRollData>) {
    const initialData: LancerFlowState.RechargeRollData = {
      type: "recharge",
      title: data?.title ?? "",
      roll_str: data?.roll_str ?? "1d6",
      recharging_uuids: data?.recharging_uuids ?? [],
      charged: data?.charged ?? [],
    };

    super(uuid, initialData);
  }
}

async function findRechargeableSystems(state: FlowState<LancerFlowState.RechargeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Recharge flow state missing!`);
  if (!state.actor) throw new TypeError(`Recharge flow state actor missing!`);
  const actor = state.actor;
  // Skip this step if recharging_uuids was provided already, since this is a reroll etc...
  if (state.data.recharging_uuids.length >= 1) return true;
  for (let item of actor.items) {
    if (!item.is_npc_feature()) continue;
    if (item.system.charged) continue;
    if (item.isRecharge()) state.data.recharging_uuids.push(item.uuid);
  }
  if (state.data.recharging_uuids.length < 1) {
    // Nothing to do, so end here
    return false;
  }
  return true;
}

async function rollRecharge(state: FlowState<LancerFlowState.RechargeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Recharge flow state missing!`);
  // This is really async despit the warning
  const roll = await new Roll(state.data.roll_str).evaluate();
  const tt = await roll.getTooltip();
  state.data.result = { roll, tt };
  return true;
}

async function applyRecharge(state: FlowState<LancerFlowState.RechargeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Recharge flow state missing!`);
  if (!state.actor) throw new TypeError(`Recharge flow state actor missing!`);
  for (let uuid of state.data.recharging_uuids) {
    const item = await LancerItem.fromUuid(uuid);
    if (!item || item.parent !== state.actor || !item.is_npc_feature()) continue;
    const recharge = item.system.tags.find(tag => tag.is_recharge);
    if (recharge) {
      if (recharge.num_val && recharge.num_val <= (state.data.result?.roll.total ?? 0)) {
        await item.update({ "system.charged": true });
      }
      state.data.charged.push({ name: item.name!, target: recharge.num_val ?? 0, charged: item.system.charged });
    }
  }
  return true;
}

async function printRechargeCard(state: FlowState<LancerFlowState.RechargeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Recharge flow state missing!`);
  renderTemplateStep(state.actor, `systems/${game.system.id}/templates/chat/charge-card.hbs`, state.data);
  return true;
}
