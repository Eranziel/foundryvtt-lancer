import { AppliedDamage } from "../actor/damage-calc";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { Damage } from "../models/bits/damage";
import { UUIDRef } from "../source-template";
import { LancerToken } from "../token";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

type DamageFlag = {
  damageResults: LancerFlowState.DamageResult[];
  critDamageResults: LancerFlowState.DamageResult[];
  // TODO: AP and paracausal flags
  ap: boolean;
  paracausal: boolean;
  targetsApplied: Record<string, boolean>;
};

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
  const damageData: DamageFlag = {
    damageResults: state.data.damage_results,
    critDamageResults: state.data.crit_damage_results,
    // TODO: AP and paracausal flags
    ap: false,
    paracausal: false,
    targetsApplied: state.data.targets.reduce((acc: Record<string, boolean>, t) => {
      const uuid = t.actor?.uuid || t.token?.actor?.uuid || null;
      if (!uuid) return acc;
      // We need to replace the dots in the UUID, otherwise Foundry will expand it into a nested object
      acc[uuid.replaceAll(".", "_")] = false;
      return acc;
    }, {}),
  };
  const flags = {
    damageData,
  };
  await renderTemplateStep(state.actor, template, state.data, flags);
  return true;
}

// ======== Chat button handler ==========
export async function applyDamage(event: JQuery.ClickEvent) {
  const chatMessageElement = event.currentTarget.closest(".chat-message.message");
  if (!chatMessageElement) {
    ui.notifications?.error("Damage application button not in chat message");
    return;
  }
  const chatMessage = game.messages?.get(chatMessageElement.dataset.messageId);
  // @ts-expect-error v10 types
  const damageData = chatMessage?.flags.lancer?.damageData as DamageFlag;
  if (!chatMessage || !damageData) {
    ui.notifications?.error("Damage application button has no damage data available");
    return;
  }
  const data = event.currentTarget.dataset;
  if (!data.target) {
    ui.notifications?.error("No target for damage application");
    return;
  }
  let multiple: number;
  try {
    multiple = parseFloat(data.multiple || 1);
  } catch (err) {
    ui.notifications?.error("Data multiplaction factor is not a number!");
    return;
  }
  // Replace underscores with dots to turn it back into a valid UUID
  const targetFlagKey = data.target.replaceAll(".", "_");
  if (damageData.targetsApplied[targetFlagKey]) {
    ui.notifications?.warn("Damage has already been applied to this target");
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

  // Apply the damage
  await actor.damageCalc(
    new AppliedDamage(
      damageData.damageResults.map(dr => new Damage({ type: dr.d_type, val: (dr.roll.total || 0).toString() }))
    ),
    { multiple, addBurn: false }
  );

  // Update the flags on the chat message to indicate the damage has been applied
  damageData.targetsApplied[targetFlagKey] = true;
  await chatMessage.setFlag("lancer", "damageData", damageData);
}
