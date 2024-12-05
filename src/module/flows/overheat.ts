// Import TypeScript modules
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

export function registerOverheatSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("preOverheatRollChecks", preOverheatRollChecks);
  flowSteps.set("rollOverheatTable", rollOverheatTable);
  flowSteps.set("noStressRemaining", noStressRemaining);
  flowSteps.set("checkOverheatMultipleOnes", checkOverheatMultipleOnes);
  flowSteps.set("overheatInsertEngCheckButton", overheatInsertEngCheckButton);
  flowSteps.set("printOverheatCard", printOverheatCard);
}

/**
 * OverheatFlow manages all the steps necessary for the initial overheat rolls and outcomes.
 */
export class OverheatFlow extends Flow<LancerFlowState.OverheatRollData> {
  static steps = [
    "preOverheatRollChecks",
    "rollOverheatTable",
    "noStressRemaining",
    "checkOverheatMultipleOnes",
    "overheatInsertEngCheckButton",
    "structureInsertCascadeRollButton",
    "printOverheatCard",
  ];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.OverheatRollData>) {
    const initialData: LancerFlowState.OverheatRollData = {
      type: "overheat",
      title: data?.title ?? "",
      roll_str: data?.roll_str ?? "",
      desc: data?.desc ?? "",
      val: data?.val ?? -1,
      max: data?.max ?? -1,
      remStress: data?.remStress ?? 4,
    };

    super(uuid, initialData);
  }
}

/**
 * Performs initial checks and verifications that should be made BEFORE rolling for overheat.
 *
 * @param actor   - Actor or ID of actor to overheat
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function preOverheatRollChecks(state: FlowState<LancerFlowState.OverheatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);
  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can take stress damage");
    return false;
  }

  if (game.settings.get(game.system.id, LANCER.setting_automation).structure && !state.data?.reroll_data) {
    if (actor.system.heat.value <= actor.system.heat.max) {
      ui.notifications!.info("Token is not at heat cap. No need to roll stress.");
      return false;
    }
    const { openSlidingHud: open } = await import("../apps/slidinghud");
    try {
      await open("stress", { stat: "stress", title: "Stress Damage", lancerActor: actor });
    } catch (_e) {
      // User hit cancel, abort the flow.
      return false;
    }
  }

  // After the hud is closed, update the actor's heat and stress.
  if (!state.data?.reroll_data) {
    let heat = actor.system.heat;
    let stress = actor.system.stress;
    if (heat.value > actor.system.heat.max && stress.value > 0) {
      // 1-stress NPCs never actually lose their stress, they just become exposed.
      if (actor.is_npc() && actor.system.stress.max === 1) return true;
      await actor.update({
        "system.stress": stress.value - 1,
        "system.heat": heat.value - actor.system.heat.max,
      });
    } else {
      return false;
    }
  }

  return true;
}

// Table of overheat table titles
const overheatTableTitles = [
  "Irreversible Meltdown",
  "Meltdown",
  "Destabilized Power Plant",
  "Destabilized Power Plant",
  "Destabilized Power Plant",
  "Emergency Shunt",
  "Emergency Shunt",
];

// Table of overheat table descriptions
function overheatTableDescriptions(roll: number, remStress: number): string {
  switch (roll) {
    // Used for multiple ones
    case 0:
      return "The reactor goes critical. your mech suffers a reactor meltdown at the end of your next turn.";
    case 1:
      switch (remStress) {
        case 2:
          return "Roll an ENGINEERING check. On a success, your mech is @Compendium[world.status-items.Exposed]. On a failure, it suffers a reactor meltdown after 1d6 of your turns (rolled by the GM). A reactor meltdown can be prevented by retrying the ENGINEERING check as a free action..";
        case 1:
          return "Your mech suffers a reactor meltdown at the end of your next turn.";
        default:
          return "Your mech becomes @Compendium[world.status-items.Exposed]";
      }
    case 2:
    case 3:
    case 4:
      return "The power plant becomes unstable, beginning to eject jets of plasma. Your mech becomes @Compendium[world.status-items.Exposed].";
    case 5:
    case 6:
      return "Your mech’s cooling systems manage to contain the increasing heat; however, your mech becomes @Compendium[world.status-items.Impaired] until the end of your next turn.";
  }
  return "";
}

/**
 * Perform roll on overheat table
 */
export async function rollOverheatTable(state: FlowState<LancerFlowState.OverheatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);
  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll overheat.");
    return false;
  }

  // Skip this step for 1-stress NPCs.
  if (actor.is_npc() && actor.system.stress.max === 1) {
    state.data = {
      type: "overheat",
      title: overheatTableTitles[3],
      desc: overheatTableDescriptions(3, 1),
      remStress: 1,
      val: actor.system.stress.value,
      max: actor.system.stress.max,
      roll_str: "3",
      result: undefined,
    };
    return true;
  }

  if ((state.data?.reroll_data?.stress ?? actor.system.stress.value) >= actor.system.stress.max) {
    ui.notifications!.info("The mech is at full Stress, no overheat check to roll.");
    return false;
  }

  let remStress = state.data?.reroll_data?.stress ?? actor.system.stress.value;
  let damage = actor.system.stress.max - remStress;
  let formula = `${damage}d6kl1`;
  // If it's an NPC with legendary, change the formula to roll twice and keep the best result.
  if (
    actor.is_npc() &&
    actor.items.some(i => ["npcf_legendary_ultra", "npcf_legendary_veteran"].includes(i.system.lid))
  ) {
    formula = `{${formula}, ${formula}}kh`;
  }
  let roll: Roll = await new Roll(formula).evaluate();

  let result = roll.total;
  if (result === undefined) return false;

  state.data = {
    type: "overheat",
    title: overheatTableTitles[result],
    desc: overheatTableDescriptions(result, remStress),
    remStress: remStress,
    val: actor.system.stress.value,
    max: actor.system.stress.max,
    roll_str: roll.formula,
    result: {
      roll: roll,
      tt: await roll.getTooltip(),
      total: (roll.total ?? 0).toString(),
    },
  };

  return true;
}

/**
 * Handle logic for when a mech has no stress remaining.
 */
export async function noStressRemaining(state: FlowState<LancerFlowState.OverheatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll overheat.");
    return false;
  }

  if (state.data.remStress > 0) {
    // The mech is intact, we don't need to do anything in this step if it's not a 1-stress NPC.
    if (!actor.is_npc() || actor.system.stress.max > 1) return true;
  }

  // You ded. Print the card and stop the flow.
  const printCard = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("printOverheatCard");
  if (!printCard) throw new TypeError(`printOverheatCard flow step missing!`);
  if (typeof printCard !== "function") throw new TypeError(`printOverheatCard flow step is not a function.`);

  if (actor.is_npc() && actor.system.stress.max == 1) {
    state.data.title = overheatTableTitles[3];
    state.data.desc = overheatTableDescriptions(3, 1);
    state.data.result = undefined;
  } else {
    state.data.title = overheatTableTitles[0];
    state.data.desc = overheatTableDescriptions(0, 0);
    state.data.result = undefined;
  }
  printCard(state);
  // This flow is finished now, so we return false to stop the flow.
  return false;
}

/**
 * Handle logic for multiple ones in the overheat check.
 */
export async function checkOverheatMultipleOnes(state: FlowState<LancerFlowState.OverheatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll overheat.");
    return false;
  }

  let roll = state.data.result?.roll;
  if (!roll) throw new TypeError(`Overheat check hasn't been rolled yet!`);
  // @ts-expect-error v10 types
  if (roll.terms[0].rolls?.length > 1) {
    // This was rolled multiple times - it should be an NPC with the legendary trait
    // Find the selected roll - the one which wasn't discarded - and check whether it has multiple ones.
    const chosenIndex = (roll.terms as foundry.dice.terms.Die[])[0].results.findIndex(r => !r.discarded);
    // @ts-expect-error v10 types
    roll = (roll.terms as Die[])[0].rolls[chosenIndex] || roll;
  }
  if (!roll) throw new TypeError(`Overheat check hasn't been rolled yet!`);

  // Irreversible Meltdowns
  let one_count = (roll.terms as foundry.dice.terms.Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    state.data.title = overheatTableTitles[0];
    state.data.desc = overheatTableDescriptions(roll.total ?? 1, 1);
  }

  return true;
}

/**
 * Check whether an ENGI check is needed, and construct the button if so.
 * @param state
 * @returns
 */
export async function overheatInsertEngCheckButton(
  state: FlowState<LancerFlowState.OverheatRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll overheat.");
    return false;
  }

  if (state.data.result?.roll.total === 1 && state.data.remStress === 2) {
    // TODO: we'll want helper functions to generate embeddable flow buttons
    state.data.embedButtons = state.data.embedButtons || [];
    state.data.embedButtons.push(`<a
      class="flow-button lancer-button"
      data-flow-type="check"
      data-check-type="engineering"
      data-actor-id="${actor.uuid}"
    >
      <i class="fas fa-dice-d20 i--sm"></i> ENGINEERING
    </a>`);
  }
  return true;
}

/**
 * Print the result of the overheat check to chat
 */
async function printOverheatCard(
  state: FlowState<LancerFlowState.OverheatRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Overheat roll flow data missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/overheat-card.hbs`;
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}
