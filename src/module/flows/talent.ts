// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import { Flow, type FlowState, type PostFlowHook, type PreFlowHook, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { printGenericCard } from "./text";

const lp = LANCER.log_prefix;

export function registerTalentSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("printTalentCard", printTalentCard);
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      "lancer.preFlow.TalentFlow": PreFlowHook<TalentFlow>;
      "lancer.postFlow.TalentFlow": PostFlowHook<TalentFlow>;
    }
  }
}

export class TalentFlow extends Flow<LancerFlowState.TalentUseData> {
  static override steps = ["printTalentCard"];

  constructor(uuid: string | LancerItem, data: Partial<LancerFlowState.TalentUseData>) {
    const state: LancerFlowState.TalentUseData = {
      title: data?.title ?? "",
      rank: data?.rank ?? { name: "", description: "" },
      lvl: data?.lvl ?? 0,
    };
    if (!state.title && uuid instanceof LancerItem) state.title = uuid.name!;

    super(uuid, state);
  }

  override get steps(): string[] {
    return TalentFlow.steps;
  }

  override callAllPreFlowHooks(): void {
    Hooks.callAll("lancer.preFlow.TalentFlow", this);
  }

  override callAllPostFlowHooks(success: boolean): void {
    Hooks.callAll("lancer.postFlow.TalentFlow", this, success);
  }
}

/**
 * Simple wrapper for printGenericCard to override the HBS template used
 * @param state Flow state to print
 * @returns true if successful
 */
export function printTalentCard(state: FlowState<LancerFlowState.TalentUseData>): Promise<boolean> {
  return printGenericCard(state, { template: `systems/${game.system.id}/templates/chat/talent-card.hbs` });
}
