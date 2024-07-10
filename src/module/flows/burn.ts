import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { DamageRollFlow } from "./damage";
import { StatRollFlow } from "./stat";
import { LancerFlowState } from "./interfaces";
import { DamageType } from "../enums";
import { LancerToken } from "../token";

export function registerBurnSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initBurnCheckData", initBurnCheckData);
  flowSteps.set("rollBurnCheck", rollBurnCheck);
  flowSteps.set("checkBurnResult", checkBurnResult);
}

export class BurnFlow extends DamageRollFlow {
  static steps = ["initBurnCheckData", "rollBurnCheck", "checkBurnResult", "printDamageCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.BurnCheckData>) {
    const state: LancerFlowState.BurnCheckData = {
      type: "damage",
      title: data?.title ?? "Burn Damage",
      icon: "cci cci-burn",
      amount: data?.amount ?? 0,
      damage_by_type: data?.damage_by_type ?? [{ type: DamageType.Burn, val: "1" }],
      configurable: data?.configurable !== undefined ? data.configurable : true,
      overkill: data?.overkill ?? false,
      attack_results: data?.attack_results ?? [],
      damage_results: data?.damage_results ?? [],
      crit_damage_results: data?.crit_damage_results ?? [],
      damage_total: 0,
      crit_total: 0,
      targets: data?.targets ?? [],
    };

    super(uuid, state);
  }
}

async function initBurnCheckData(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  state.data.amount = state.actor.system.burn;
  state.data.damage_by_type = [{ type: DamageType.Burn, val: state.actor.system.burn.toString() }];
  state.data.attack_results = [];
  state.data.damage_results = [];
  state.data.crit_damage_results = [];
  // Burn tick damage is always self-targeted
  state.data.targets = [
    {
      name: state.actor.name!,
      img: state.actor.img!,
      actor: state.actor,
    },
  ];
  return true;
}

async function rollBurnCheck(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  const rollFlow = new StatRollFlow(state.actor, { title: "BURN :: ENG", path: "system.eng" });
  const result = await rollFlow.begin();
  state.data.result = rollFlow.state.data?.result;
  return result && !!state.data.result;
}

async function checkBurnResult(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  if (!state.data.result?.roll.total) throw new TypeError(`Burn check hasn't been rolled yet!`);
  const result = state.data.result.roll.total;
  if (result >= 10) {
    state.data.title = `BURN CLEARED!`;
    state.data.icon = "mdi mdi-shield";
    await state.actor.update({ "system.burn": 0 });
  } else {
    // state.data.message = `<b>${state.actor.system.burn}</b> <i class="cci cci-burn i--m damage--burn"></i> damage taken`;
    // await state.actor.update({ "system.hp.value": state.actor.system.hp.value - state.actor.system.burn });
    const rollDamageStep = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("rollDamage");
    if (!rollDamageStep || typeof rollDamageStep !== "function")
      throw new TypeError(`Couldn't get rollDamage flow step!`);
    return await rollDamageStep(state);
  }
  return true;
}
