// Import TypeScript modules
import { getAutomationOptions } from "../settings";
import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { UUIDRef } from "../source-template";
import { LancerItem } from "../item/lancer-item";

export function registerOverchargeSteps(flowSteps: Map<string, any>) {
  flowSteps.set("initOverchargeData", initOverchargeData);
  flowSteps.set("rollOvercharge", rollOvercharge);
  flowSteps.set("updateOverchargeActor", updateOverchargeActor);
  flowSteps.set("printOverchargeCard", printOverchargeCard);
}

export class OverchargeFlow extends Flow<LancerFlowState.OverchargeRollData> {
  static steps = ["initOverchargeData", "rollOvercharge", "updateOverchargeActor", "printOverchargeCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.OverchargeRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.OverchargeRollData = {
      type: "overcharge",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      level: data?.level || 0,
    };

    super(uuid, initialData);
  }
}

async function initOverchargeData(state: FlowState<LancerFlowState.OverchargeRollData>, options?: { title?: string }) {
  if (!state.actor || !state.actor.is_mech()) throw new Error(`Only mechs can overcharge!`);
  if (!state.data) throw new Error(`Data not found for overcharge flow!`);

  state.data.title = options?.title || state.data.title || `${state.actor.name!.toUpperCase()} is OVERCHARGING`;
  state.data.roll_str = state.actor.strussHelper.getOverchargeRoll()!;
  state.data.level = Math.min(
    state.actor.system.overcharge + 1,
    state.actor.system.overcharge_sequence.split(",").length - 1
  );

  return state;
}

async function rollOvercharge(state: FlowState<LancerFlowState.OverchargeRollData>) {
  if (!state.actor || !state.actor.is_mech()) throw new Error(`Only mechs can overcharge!`);
  if (!state.data) throw new Error(`Data not found for overcharge flow!`);

  // This is really async despit the warning
  const roll = await new Roll(state.data.roll_str).evaluate();
  const tt = await roll.getTooltip();
  state.data.result = { roll, tt };
}

async function updateOverchargeActor(state: FlowState<LancerFlowState.OverchargeRollData>) {
  if (!state.actor || !state.actor.is_mech()) throw new Error(`Only mechs can overcharge!`);
  if (!state.data) throw new Error(`Data not found for overcharge flow!`);
  if (!state.data.result) throw new Error(`Overcharge hasn't been rolled yet!`);
  // Assume we can always increment overcharge here...
  await state.actor.update({
    "system.overcharge": state.data.level,
  });
  // Only increase heat if we haven't disabled it
  if (getAutomationOptions().overcharge_heat) {
    await state.actor.update({ "system.heat.value": state.actor.system.heat.value + state.data.result.roll.total! });
  }
}

async function printOverchargeCard(
  state: FlowState<LancerFlowState.OverchargeRollData>,
  options?: { template?: string }
) {
  if (!state.actor || !state.actor.is_mech()) throw new Error(`Only mechs can overcharge!`);
  if (!state.data) throw new Error(`Data not found for overcharge flow!`);

  const template = options?.template ?? `systems/${game.system.id}/templates/chat/overcharge-card.hbs`;
  return renderTemplateStep(state.actor, template, state.data);
}
