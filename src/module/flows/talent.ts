// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import { Flow, type FlowState, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { printGenericCard } from "./text";
import type { LocaleFlag } from "../util/localization/llp-cards";
import { createTranslationRef } from "../util/localization/llp-map";

const lp = LANCER.log_prefix;

export function registerTalentSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("printTalentCard", printTalentCard);
}

export class TalentFlow extends Flow<LancerFlowState.TalentUseData> {
  static steps = ["printTalentCard"];

  constructor(uuid: string | LancerItem, data: Partial<LancerFlowState.TalentUseData>) {
    const state: LancerFlowState.TalentUseData = {
      title: data?.title ?? "",
      rank: data?.rank ?? { name: "", description: "" },
      lvl: data?.lvl ?? 0,
    };
    if (!state.title && uuid instanceof LancerItem) state.title = uuid.name!;

    super(uuid, state);
  }
}

/**
 * Simple wrapper for printGenericCard to override the HBS template used
 * @param state Flow state to print
 * @returns true if successful
 */
export function printTalentCard(state: FlowState<LancerFlowState.TalentUseData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Activation flow state missing!`);
  const rankPath = `system.ranks.${state.data.lvl}`;
  const title = createTranslationRef(state.item, "name", "name");
  title.format = {
    key: "lancer.chatCard.title.talent.label",
    data: {
      title: null,
      lvl: String(Number(state.data.lvl) + 1),
    },
  };

  const flags: { localeData: LocaleFlag } = {
    localeData: {
      lid: state.item?.system.lid || "",
      fields: {
        title,
        rankName: createTranslationRef(state.data.rank, "name", `${rankPath}.name`),
        description: createTranslationRef(state.data.rank, "description", `${rankPath}.description`),
      },
    },
  };
  return printGenericCard(state, { template: `systems/${game.system.id}/templates/chat/talent-card.hbs` }, flags);
}
