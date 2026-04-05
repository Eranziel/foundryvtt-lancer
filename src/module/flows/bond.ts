import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { PowerData } from "../models/bits/power";
import type { UUIDRef } from "../source-template";
import { renderTemplateStep } from "./_render";
import { Flow, type FlowState, type PostFlowHook, type PreFlowHook, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

export function registerBondPowerSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initPowerData", initPowerData);
  flowSteps.set("updatePowerUses", updatePowerUses);
  flowSteps.set("printPowerCard", printPowerCard);
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      "lancer.preFlow.BondPowerFlow": PreFlowHook<BondPowerFlow>;
      "lancer.postFlow.BondPowerFlow": PostFlowHook<BondPowerFlow>;
    }
  }
}

export class BondPowerFlow extends Flow<LancerFlowState.BondPowerUseData> {
  static steps = ["initPowerData", "updatePowerUses", "printPowerCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.BondPowerUseData>) {
    // Can't just check !data?.powerIndex because it could be 0
    if (
      data?.powerIndex === undefined ||
      data?.powerIndex === null ||
      typeof data?.powerIndex != "number" ||
      data?.powerIndex < 0
    ) {
      throw new Error(`Bond Power Flow requires a valid power index to be provided in data!`);
    }
    const initialData: LancerFlowState.BondPowerUseData = {
      title: data?.title ?? "",
      powerIndex: data?.powerIndex,
      description: data?.description ?? "",
    };

    super(uuid, initialData);
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

  override callAllPreFlowHooks(): void {
    Hooks.callAll("lancer.preFlow.BondPowerFlow", this);
  }

  override callAllPostFlowHooks(success: boolean): void {
    Hooks.callAll("lancer.postFlow.BondPowerFlow", this, success);
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
  if (state.item && game.settings.get(game.system.id, LANCER.setting_automation).limited_loading) {
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
