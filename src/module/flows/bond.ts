import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { SourceData, UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { getAutomationOptions } from "../settings";
import { PowerData } from "../models/bits/power";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

export function registerBondPowerSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initPowerData", initPowerData);
  flowSteps.set("updatePowerUses", updatePowerUses);
  flowSteps.set("printPowerCard", printPowerCard);
}

export class BondPowerFlow extends Flow<LancerFlowState.BondPowerUseData> {
  steps = ["initPowerData", "updatePowerUses", "printPowerCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.BondPowerUseData>) {
    if (!data?.powerIndex || typeof data?.powerIndex != "number" || data?.powerIndex < 0) {
      throw new Error(`Bond Power Flow requires a valid power index to be provided in data!`);
    }
    const initialData: LancerFlowState.BondPowerUseData = {
      title: data?.title ?? "",
      powerIndex: data?.powerIndex,
      description: data?.description ?? "",
    };

    super("BondPowerFlow", uuid, initialData);
  }

  async begin(data?: LancerFlowState.BondPowerUseData): Promise<boolean> {
    if (!this.state.item || !this.state.item.is_bond()) {
      console.log(`${lp} BondPowerFlow aborted - no bond item provided!`);
      return false;
    }
    if (
      (!this.state.data ||
        this.state.data.powerIndex < 0 ||
        this.state.data.powerIndex >= this.state.item.system.powers.length) &&
      (!data || data.powerIndex < 0 || data.powerIndex >= this.state.item.system.powers.length)
    ) {
      console.log(`${lp} BondPowerFlow aborted - invalid power index provided!`);
      return false;
    }
    return await super.begin(data);
  }
}

export async function initPowerData(
  state: FlowState<LancerFlowState.BondPowerUseData>,
  options?: { name?: string; powerIndex?: number; description?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Bond Power flow state missing!`);
  if (!state.item || !state.item.is_bond()) throw new TypeError(`Bond Power flow item is not a bond!`);
  // If this step is overriding the power index, reinitialize the title and effect
  state.data.powerIndex = options?.powerIndex ?? state.data.powerIndex;
  const power: PowerData = state.item.system.powers[state.data.powerIndex];
  // Prefer the options override, then the power data, then the existing state data
  state.data.title = options?.name || power.name || state.data.title;
  state.data.description = options?.description || power.description || state.data.description;
  return true;
}

export async function updatePowerUses(
  state: FlowState<LancerFlowState.BondPowerUseData>,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Bond Power flow state missing!`);
  if (!state.item || !state.item.is_bond()) throw new TypeError(`Bond Power flow item is not a bond!`);
  if (state.item && getAutomationOptions().limited_loading) {
    const power: PowerData = state.item.system.powers[state.data.powerIndex];
    if (power.uses) {
      let item_changes = { [`system.powers.${state.data.powerIndex}.uses.value`]: power.uses.value - 1 };
      await state.item.update(item_changes);
    }
  }
  return true;
}

export async function printPowerCard(
  state: FlowState<LancerFlowState.BondPowerUseData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Bond Power flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/generic-card.hbs`;
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}
