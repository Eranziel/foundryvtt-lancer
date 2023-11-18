// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { resolve_dotpath } from "../helpers/commons";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";
import { LancerItem, LancerSKILL } from "../item/lancer-item";
import { AccDiffData, AccDiffDataSerialized } from "../helpers/acc_diff";
import { openSlidingHud } from "../helpers/slidinghud";
import { UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";

const lp = LANCER.log_prefix;

export function registerStatSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initStatRollData", initStatRollData);
  flowSteps.set("showStatRollHUD", showStatRollHUD);
  flowSteps.set("rollCheck", rollCheck);
  flowSteps.set("printStatRollCard", printStatRollCard);
}

export class StatRollFlow extends Flow<LancerFlowState.StatRollData> {
  name = "StatRollFlow";
  steps = ["initStatRollData", "showStatRollHUD", "rollCheck", "printStatRollCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.StatRollData>) {
    const state: LancerFlowState.StatRollData = {
      type: "stat",
      title: data?.title ?? "",
      path: data?.path ?? "system.hull", // We need to pick some kind of default
      bonus: data?.bonus ?? 0,
      acc_diff: data?.acc_diff ?? undefined,
      roll_str: data?.roll_str ?? "1d20",
      effect: data?.effect ?? undefined,
    };
    if (!state.title && uuid instanceof LancerItem) state.title = uuid.name!;

    super(uuid, state);
  }
}

async function initStatRollData(
  state: FlowState<LancerFlowState.StatRollData>,
  options?: { title?: string; acc_diff?: AccDiffDataSerialized }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  // If we only have an actor, it's a HASE roll
  if (!state.item) {
    let pathParts = state.data.path.split(".");
    state.data.title = options?.title || state.data.title || pathParts[pathParts.length - 1].toUpperCase();
    state.data.bonus = resolve_dotpath(state.actor, state.data.path) as number;
    state.data.acc_diff =
      options?.acc_diff ?? AccDiffData.fromParams(state.actor, undefined, state.data.title).toObject();
    state.data.effect = undefined; // HASE rolls don't have effects
    return true;
  } else {
    // Otherwise, it's a pilot skill roll
    if (!state.item.is_skill()) throw new TypeError(`Invalid item for stat roll flow!`);
    if (!state.actor.is_pilot()) throw new TypeError(`Non-pilots can't roll skill triggers!`);
    state.data.title = options?.title || state.data.title || state.item.name!;
    state.data.path = "system.curr_rank";
    state.data.bonus = state.item.system.curr_rank * 2;
    state.data.acc_diff =
      options?.acc_diff ?? AccDiffData.fromParams(state.item, undefined, state.data.title).toObject();
    // I guess we don't show skill descriptions in the chat cards.
    // state.data.effect = state.item.system.description;
    return true;
  }
}

async function showStatRollHUD(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);

  // Get accuracy/difficulty with a prompt
  let acc_diff = AccDiffData.fromObject(state.data.acc_diff!);
  acc_diff = await openSlidingHud("hase", acc_diff);

  state.data.acc_diff = acc_diff.toObject();
  return true;
}

async function rollCheck(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  if (!state.data.acc_diff) throw new TypeError(`Stat roll acc/diff data missing!`);
  // Do the roll
  // let acc_str = state.data.acc_diff.base.total != 0 ? ` + ${acc_diff.base.total}d6kh1` : "";
  // let roll = await new Roll(`1d20+${data.bonus || 0}${acc_str}`).evaluate({ async: true });
  return true;
}

async function printStatRollCard(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  // TODO - print the card
  return true;
}

export async function prepareStatMacro(actor: string | LancerActor, statKey: string) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);

  const statPath = statKey.split(".");

  let bonus = resolve_dotpath(actor, statKey) as number;
  let acc_diff = AccDiffData.fromParams(actor, undefined, statPath[statPath.length - 1].toUpperCase());
  acc_diff = await openSlidingHud("hase", acc_diff);

  let mData: LancerFlowState.StatRollData = {
    type: "stat",
    path: statKey,
    title: statPath[statPath.length - 1].toUpperCase(),
    // docUUID: actor.uuid,
    bonus,
    acc_diff: acc_diff.toObject(),
    roll_str: "1d20",
  };

  rollStatMacro(mData);
}

/**
 * Generic macro preparer for a skill
 * @param item The item id that is being rolled
 */
export async function prepareSkillMacro(item: string | LancerItem) {
  // Determine which Actor to speak as
  item = LancerItem.fromUuidSync(item);
  let acc_diff = AccDiffData.fromParams(item, undefined, item.name!);
  acc_diff = await openSlidingHud("hase", acc_diff);
  let skillData: LancerFlowState.StatRollData = {
    type: "stat",
    path: "system.curr_rank",
    title: item.name!,
    bonus: (item as LancerSKILL).system.curr_rank * 2,
    // docUUID: item.uuid,
    acc_diff: acc_diff.toObject(),
    roll_str: "1d20",
  };
  await rollStatMacro(skillData);
}

// Rollers

export async function rollStatMacro(data: LancerFlowState.StatRollData) {
  // let { actor } = resolveItemOrActor(data.docUUID);
  let actor;
  if (!actor) return;

  // Get accuracy/difficulty with a prompt
  let acc_diff = AccDiffData.fromObject(data.acc_diff!);

  // Do the roll
  let acc_str = acc_diff.base.total != 0 ? ` + ${acc_diff.base.total}d6kh1` : "";
  let roll = await new Roll(`1d20+${data.bonus || 0}${acc_str}`).evaluate({ async: true });

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: data.title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/${game.system.id}/templates/chat/stat-roll-card.hbs`;
  return renderTemplateStep(actor, template, templateData);
}
