import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import type { UUIDRef } from "../source-template";
import { Flow, type FlowState, type Step } from "./flow";
import { DamageRollFlow } from "./damage";
import { StatRollFlow } from "./stat";
import { LancerFlowState } from "./interfaces";
import { DamageType } from "../enums";
import { DamageHudData } from "../apps/damage";

export function registerInfectSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initInfectCheckData", initInfectCheckData);
  flowSteps.set("rollInfectCheck", rollInfectCheck);
  flowSteps.set("checkInfectResult", checkInfectResult);
}

export class InfectFlow extends DamageRollFlow {
  static steps = ["initInfectCheckData", "rollInfectCheck", "checkInfectResult", "printDamageCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.InfectCheckData>) {
    const state: LancerFlowState.InfectCheckData = {
      type: "damage",
      title: data?.title ?? "Infect Damage",
      icon: "cci cci-infect",
      amount: data?.amount ?? 0,
      damage: data?.damage ?? [{ type: DamageType.Infect, val: "1" }],
      configurable: data?.configurable !== undefined ? data.configurable : true,
      add_infect: false, // Infect ticks don't increase the infect
      tags: [], // Infect ticks don't have tags
      ap: true, // Infect ticks are always AP
      paracausal: false,
      half_damage: false,
      overkill: false, // Infect ticks aren't overkill
      reliable: false, // Infect ticks aren't reliable
      hit_results: [],
      has_normal_hit: true, // Set this to true to make it do a normal damage roll
      has_crit_hit: false, // Don't do a crit damage roll
      damage_results: [],
      crit_damage_results: [],
      damage_total: 0,
      crit_total: 0,
      targets: data?.targets ?? [],
    };

    super(uuid, state);
  }
}

async function initInfectCheckData(state: FlowState<LancerFlowState.InfectCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Infect flow state missing!`);
  state.data.amount = state.actor.system.infect;
  state.data.damage = [{ type: DamageType.Infect, val: state.actor.system.infect.toString() }];
  // Infect tick damage is always self-targeted, so construct a "hit" result for the actor
  const tokens = state.actor.getActiveTokens();
  if (!tokens || !tokens.length) {
    ui.notifications?.error("Infect flow requires the actor to have a token in the scene");
    return false;
  }
  const target = tokens[0];
  state.data.hit_results = [{ target: target, total: "10", usedLockOn: false, hit: true, crit: false }];
  state.data.damage_hud_data = DamageHudData.fromParams(state.actor, {
    tags: [],
    title: state.data.title,
    targets: [target],
    hitResults: state.data.hit_results,
    ap: false,
    paracausal: true, // Infect ticks do not apply resistance
    halfDamage: false,
    starting: { damage: state.data.damage, bonusDamage: [] },
  });
  state.data.damage_results = [];
  state.data.crit_damage_results = [];
  state.data.targets = [];
  return true;
}

async function rollInfectCheck(state: FlowState<LancerFlowState.InfectCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Infect flow state missing!`);
  const rollFlow = new StatRollFlow(state.actor, { title: "INFECT :: SYS", path: "system.sys" });
  const success = await rollFlow.begin();
  state.data.check_total = rollFlow.state.data?.result?.roll.total;
  if (game.dice3d) {
    // Get the newest message
    const msg = game.messages?.contents[game.messages?.contents.length - 1];
    // Wait for the DSN animation to finish
    if (msg) await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
  }
  return success && state.data.check_total !== undefined && state.data.check_total !== null;
}

async function checkInfectResult(state: FlowState<LancerFlowState.InfectCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Infect flow state missing!`);
  if (!state.data.check_total) throw new TypeError(`Infect check hasn't been rolled yet!`);
  if (state.data.check_total >= 10) {
    state.data.title = `INFECT CLEARED!`;
    state.data.icon = "mdi mdi-fire-extinguisher";
    await state.actor.update({ "system.infect": 0 });
    return true;
  } else {
    const rollDamagesStep = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("rollNormalDamage");
    if (!rollDamagesStep || typeof rollDamagesStep !== "function")
      throw new TypeError(`Couldn't get rollDamagesStep flow step!`);
    return await rollDamagesStep(state);
  }
}
