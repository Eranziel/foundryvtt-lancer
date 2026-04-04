// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { resolveDotpath } from "../helpers/commons";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";
import { LancerItem } from "../item/lancer-item";
import { AccDiffHudData, AccDiffHudDataSerialized } from "../apps/acc_diff";
import { openSlidingHud } from "../apps/slidinghud";
import { UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { AccDiffWindowType } from "../enums";

const lp = LANCER.log_prefix;

export function registerStatSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initStatRollData", initStatRollData);
  flowSteps.set("showStatRollHUD", showStatRollHUD);
  flowSteps.set("rollCheck", rollCheck);
  flowSteps.set("printStatRollCard", printStatRollCard);
}

export class StatRollFlow extends Flow<LancerFlowState.StatRollData> {
  static steps = ["initStatRollData", "showStatRollHUD", "rollCheck", "printStatRollCard"];

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
  options?: { title?: string; acc_diff?: AccDiffHudDataSerialized }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  // If we only have an actor, it's a HASE roll
  if (!state.item) {
    let pathParts = state.data.path.split(".");
    const windowType = pathParts[pathParts.length - 1] as AccDiffWindowType;
    state.data.title = options?.title || state.data.title || pathParts[pathParts.length - 1].toUpperCase();
    state.data.bonus = resolveDotpath(state.actor, state.data.path) as number;
    state.data.acc_diff = options?.acc_diff
      ? AccDiffHudData.fromObject(options.acc_diff)
      : AccDiffHudData.fromParams(state.actor, windowType, undefined, state.data.title);
    state.data.effect = undefined; // HASE rolls don't have effects
    return true;
  } else {
    // Otherwise, it's a pilot skill roll
    if (!state.item.is_skill()) throw new TypeError(`Invalid item for stat roll flow!`);
    if (!state.actor.is_pilot()) throw new TypeError(`Non-pilots can't roll skill triggers!`);
    state.data.title = options?.title || state.data.title || state.item.name!;
    state.data.path = "system.curr_rank";
    state.data.bonus = state.item.system.curr_rank * 2;
    state.data.acc_diff = options?.acc_diff
      ? AccDiffHudData.fromObject(options.acc_diff)
      : AccDiffHudData.fromParams(state.actor, AccDiffWindowType.Skill, undefined, state.data.title);
    // I guess we don't show skill descriptions in the chat cards.
    // state.data.effect = state.item.system.description;
    return true;
  }
}

async function showStatRollHUD(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  try {
    state.data.acc_diff = await openSlidingHud("hase", state.data.acc_diff!);
  } catch (_e) {
    // User hit cancel, abort the flow
    return false;
  }
  const total_acc = state.data.acc_diff.base.total + state.data.acc_diff.weapon.total(0);
  let acc_str = total_acc != 0 ? ` + ${total_acc}d6kh1` : "";
  state.data.roll_str = `1d20+${state.data.bonus || 0}${acc_str}`;
  return true;
}

async function rollCheck(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  if (!state.data.acc_diff) throw new TypeError(`Stat roll acc/diff data missing!`);
  // Do the roll, this really is async despite the warning
  let roll = await new Roll(state.data.roll_str).evaluate();
  state.data.result = {
    roll,
    tt: await roll.getTooltip(),
  };
  return true;
}

async function printStatRollCard(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stat roll flow state missing!`);
  const template = `systems/${game.system.id}/templates/chat/stat-roll-card.hbs`;

  //Update history
  if (state.data.acc_diff !== undefined) {
    game.combat?.receiveHistoryAction(state.data);
  }

  await renderTemplateStep(state.actor, template, state.data);
  return true;
}
