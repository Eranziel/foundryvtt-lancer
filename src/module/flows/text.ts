// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";
import { Tag } from "../models/bits/tag";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";
import { UUIDRef } from "../source-template";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export function registerTextSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("printGenericCard", printGenericCard);
}

export class SimpleTextFlow extends Flow<LancerFlowState.TextRollData> {
  name = "TextFlow";
  steps = ["printGenericCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.TextRollData>) {
    const state: LancerFlowState.TextRollData = {
      title: data?.title ?? "",
      description: data?.description ?? "",
      tags: data?.tags ?? [],
    };
    if (!state.title && uuid instanceof LancerItem) state.title = uuid.name!;

    super(uuid, state);
  }
}

export async function printGenericCard(state: FlowState<any>, options?: { template?: string }): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  renderTemplateStep(
    state.actor,
    options?.template || `systems/${game.system.id}/templates/chat/generic-card.hbs`,
    state.data
  );
  return true;
}

/**
 * Given basic information, prepares a generic text-only macro to display descriptions etc
 * @param actor Actor or actor uuid to roll the macro as
 * @param title Data path to title of the macro
 * @param text  Data path to text to be displayed by the macro
 * @param tags  Can optionally pass through an array of tags to be rendered
 */
export function prepareTextMacro(
  actor: string | LancerActor,
  title: string,
  text: string,
  tags?: Tag[]
): Promise<void> {
  let mData: LancerFlowState.TextRollData = {
    // docUUID: actor instanceof LancerActor ? actor.uuid : actor,
    title,
    description: text,
    tags: tags,
  };

  return rollTextMacro(mData);
}

/**
 * Given prepared data, handles rolling of a generic text-only macro to display descriptions etc.
 * @param data {LancerTextMacroData} Prepared macro data.
 */
export async function rollTextMacro(data: LancerFlowState.TextRollData) {
  // let { actor } = resolveItemOrActor(data.docUUID);
  let actor;
  if (!actor) return;

  const template = `systems/${game.system.id}/templates/chat/generic-card.hbs`;
  return renderTemplateStep(actor, template, data);
}
