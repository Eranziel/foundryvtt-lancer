import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { LancerToken } from "../token";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

export function registerDamageSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("rollDamage", rollDamage);
  flowSteps.set("printDamageCard", printDamageCard);
}

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageRollFlow extends Flow<LancerFlowState.DamageRollData> {
  static steps = [
    "emptyStep",
    // this.constructor.steps.set("getDamages", dummyDamageStep);
    // this.constructor.steps.set("checkTargetImmunity", dummyDamageStep);
    // this.constructor.steps.set("checkTargetResist", dummyDamageStep);
    // this.constructor.steps.set("promptDamageConfig", dummyDamageStep); // Includes bonus damage config?
    // this.constructor.steps.set("rollDamages", dummyDamageStep);
    // this.constructor.steps.set("applyOverkill", dummyDamageStep);
    // this.constructor.steps.set("applyDamages", dummyDamageStep);
  ];
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: LancerFlowState.DamageRollData) {
    super(uuid, data);
  }
}

async function rollDamage(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // Roll each damage type
  for (const damage of state.data.damage_by_type) {
    const roll = await new Roll(damage.val).evaluate({ async: true });
    const tt = await roll.getTooltip();
    state.data.damage_results.push({ roll, tt, d_type: damage.type });
    state.data.damage_total += roll.total || 0;
  }
  // TODO: crit damage
  return true;
}

async function printDamageCard(
  state: FlowState<LancerFlowState.DamageRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/damage-card.hbs`;
  // const flags = {
  //   attackData: {
  //     origin: state.actor.id,
  //     targets: state.data.attack_rolls.targeted.map(t => {
  //       return { id: t.target.id, setConditions: !!t.usedLockOn ? { lockon: !t.usedLockOn } : undefined };
  //     }),
  //   },
  // };
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}

// ======== Chat button handler ==========
export async function applyDamage(event: JQuery.ClickEvent) {
  const data = event.currentTarget.dataset;
  if (!data.target) {
    ui.notifications?.error("No target for damage application");
    return;
  }
  if (!data.total) {
    ui.notifications?.error("No damage total for damage application");
    return;
  }
  let total, multiple: number;
  try {
    multiple = parseFloat(data.multiple || 1);
  } catch (err) {
    ui.notifications?.error("Data multiplaction factor is not a number!");
    return;
  }
  try {
    total = parseFloat(data.total || 0);
  } catch (err) {
    ui.notifications?.error("Data total is not a number!");
    return;
  }
  const target = await fromUuid(data.target);
  let actor: LancerActor | null = null;
  if (target instanceof LancerActor) actor = target;
  else if (target instanceof LancerToken) actor = target.actor;
  if (!actor) {
    ui.notifications?.error("Invalid target for damage application");
    return;
  }
  await actor.update({ "system.hp.value": actor.system.hp.value - multiple * total });
}
