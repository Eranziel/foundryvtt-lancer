import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { DamageRollFlow } from "./damage";
import { StatRollFlow } from "./stat";
import { LancerFlowState } from "./interfaces";
import { DamageType } from "../enums";
import { DamageHudData } from "../apps/damage";

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
      damage: data?.damage ?? [{ type: DamageType.Burn, val: "1" }],
      configurable: data?.configurable !== undefined ? data.configurable : true,
      add_burn: false, // Burn ticks don't increase the burn
      tags: [], // Burn ticks don't have tags
      ap: true, // Burn ticks are always AP
      paracausal: false,
      half_damage: false,
      overkill: false, // Burn ticks aren't overkill
      reliable: false, // Burn ticks aren't reliable
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

async function initBurnCheckData(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  state.data.amount = state.actor.system.burn;
  state.data.damage = [{ type: DamageType.Burn, val: state.actor.system.burn.toString() }];
  // Burn tick damage is always self-targeted, so construct a "hit" result for the actor
  const tokens = state.actor.getActiveTokens();
  if (!tokens || !tokens.length) {
    ui.notifications?.error("Burn flow requires the actor to have a token in the scene");
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
    paracausal: true, // Burn ticks do not apply resistance
    halfDamage: false,
    starting: { damage: state.data.damage, bonusDamage: [] },
  });
  state.data.damage_results = [];
  state.data.crit_damage_results = [];
  state.data.targets = [];
  return true;
}

async function rollBurnCheck(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  const rollFlow = new StatRollFlow(state.actor, { title: "BURN :: ENG", path: "system.eng" });
  const success = await rollFlow.begin();
  state.data.check_total = rollFlow.state.data?.result?.roll.total;
  return success && state.data.check_total !== undefined && state.data.check_total !== null;
}

async function checkBurnResult(state: FlowState<LancerFlowState.BurnCheckData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  if (!state.data.check_total) throw new TypeError(`Burn check hasn't been rolled yet!`);
  if (state.data.check_total >= 10) {
    state.data.title = `BURN CLEARED!`;
    state.data.icon = "mdi mdi-fire-extinguisher";
    await state.actor.update({ "system.burn": 0 });
    return true;
  } else {
    const rollDamagesStep = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("rollNormalDamage");
    if (!rollDamagesStep || typeof rollDamagesStep !== "function")
      throw new TypeError(`Couldn't get rollDamagesStep flow step!`);
    return await rollDamagesStep(state);
  }
}
