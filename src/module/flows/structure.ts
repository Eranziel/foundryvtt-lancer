// Import TypeScript modules
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { getAutomationOptions } from "../settings";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";
import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

export function registerStructureSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("preStructureRollChecks", preStructureRollChecks);
  flowSteps.set("rollStructureTable", rollStructureTable);
  flowSteps.set("noStructureRemaining", noStructureRemaining);
  flowSteps.set("checkStructureMultipleOnes", checkStructureMultipleOnes);
  flowSteps.set("structureInsertHullCheckButton", structureInsertHullCheckButton);
  flowSteps.set("structureInsertSecondaryRollButton", structureInsertSecondaryRollButton);
  flowSteps.set("structureInsertCascadeRollButton", structureInsertCascadeRollButton);
  flowSteps.set("printStructureCard", printStructureCard);
  flowSteps.set("secondaryStructureRoll", secondaryStructureRoll);
  flowSteps.set("printSecondaryStructureCard", printSecondaryStructureCard);
}

/**
 * StructureFlow manages all the steps necessary for the initial structure rolls and outcomes.
 */
export class StructureFlow extends Flow<LancerFlowState.PrimaryStructureRollData> {
  static steps = [
    "preStructureRollChecks",
    "rollStructureTable",
    "noStructureRemaining",
    "checkStructureMultipleOnes",
    "structureInsertHullCheckButton",
    "structureInsertSecondaryRollButton",
    "structureInsertCascadeRollButton",
    "printStructureCard",
  ];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.PrimaryStructureRollData>) {
    const initialData: LancerFlowState.PrimaryStructureRollData = {
      type: "structure",
      title: data?.title ?? "",
      roll_str: data?.roll_str ?? "",
      desc: data?.desc ?? "",
      val: data?.val ?? -1,
      max: data?.max ?? -1,
      remStruct: data?.remStruct ?? 4,
    };

    super(uuid, initialData);
  }
}

/**
 * Performs initial checks and verifications that should be made BEFORE rolling for structure.
 *
 * @param actor   - Actor or ID of actor to structure
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function preStructureRollChecks(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);
  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can take structure damage");
    return false;
  }

  if (getAutomationOptions().structure && !state.data?.reroll_data) {
    if (actor.system.hp.value > 0) {
      ui.notifications!.info("Token has hp remaining. No need to roll structure.");
      return false;
    }
    const { openSlidingHud: open } = await import("../helpers/slidinghud");
    try {
      await open("struct", { stat: "structure", title: "Structure Damage", lancerActor: actor });
    } catch (_e) {
      // User hit cancel, abort the flow.
      return false;
    }
  }

  // After the hud is closed, update the actor's hp and structure.
  if (!state.data?.reroll_data) {
    let hp = actor.system.hp;
    let structure = actor.system.structure;
    if (hp.value < 1 && structure.value > 0) {
      await actor.update({
        "system.structure": structure.value - 1,
        "system.hp": hp.value + hp.max,
      });
    } else {
      return false;
    }
  }

  return true;
}

// Table of structure table titles
const structTableTitles = [
  "Crushing Hit",
  "Direct Hit",
  "System Trauma",
  "System Trauma",
  "System Trauma",
  "Glancing Blow",
  "Glancing Blow",
];

// Table of structure table descriptions
function structTableDescriptions(roll: number, remStruct: number): string {
  switch (roll) {
    // Used for multiple ones
    case 0:
      return "Your mech is damaged beyond repair – it is destroyed. You may still exit it as normal.";
    case 1:
      switch (remStruct) {
        case 2:
          return "Roll a HULL check. On a success, your mech is @Compendium[world.status-items.Stunned] until the end of your next turn. On a failure, your mech is destroyed.";
        case 1:
          return "Your mech is destroyed.";
        default:
          return "Your mech is @Compendium[world.status-items.Stunned] until the end of your next turn.";
      }
    case 2:
    case 3:
    case 4:
      return "Parts of your mech are torn off by the damage. Roll 1d6. On a 1–3, all weapons on one mount of your choice are destroyed; on a 4–6, a system of your choice is destroyed. LIMITED systems and weapons that are out of charges are not valid choices. If there are no valid choices remaining, it becomes the other result. If there are no valid systems or weapons remaining, this result becomes a DIRECT HIT instead.";
    case 5:
    case 6:
      return "Emergency systems kick in and stabilize your mech, but it’s @Compendium[world.status-items.Impaired] until the end of your next turn.";
  }
  return "";
}

/**
 * Perform roll on structure table
 */
export async function rollStructureTable(state: FlowState<LancerFlowState.PrimaryStructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);
  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  if ((state.data?.reroll_data?.structure ?? actor.system.structure.value) >= actor.system.structure.max) {
    ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
    return false;
  }

  let remStruct = state.data?.reroll_data?.structure ?? actor.system.structure.value;
  let damage = actor.system.structure.max - remStruct;
  let formula = `${damage}d6kl1`;
  // If it's an NPC with legendary, change the formula to roll twice and keep the best result.
  if (
    actor.is_npc() &&
    actor.items.some(i => ["npcf_legendary_ultra", "npcf_legendary_veteran"].includes(i.system.lid))
  ) {
    formula = `{${formula}, ${formula}}kh`;
  }
  // This is really async despit the warning
  let roll: Roll = await new Roll(formula).evaluate();

  let result = roll.total;
  if (result === undefined) return false;

  state.data = {
    type: "structure",
    title: structTableTitles[result],
    desc: structTableDescriptions(result, remStruct),
    remStruct: remStruct,
    val: actor.system.structure.value,
    max: actor.system.structure.max,
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
 * Handle logic for when a mech has no structure remaining.
 */
export async function noStructureRemaining(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  if (state.data.remStruct > 0) {
    // The mech is intact, we don't need to do anything in this step.
    return true;
  }

  // You ded. Print the card and stop the flow.
  const printCard = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("printStructureCard");
  if (!printCard) throw new TypeError(`printStructureCard flow step missing!`);
  if (typeof printCard !== "function") throw new TypeError(`printStructureCard flow step is not a function.`);
  state.data.title = structTableTitles[0];
  state.data.desc = structTableDescriptions(0, 0);
  state.data.result = undefined;
  // Subtract the hp which was added in the preStructureRollChecks step.
  await actor.update({ "system.hp.value": actor.system.hp.value - actor.system.hp.max });

  printCard(state);
  // This flow is finished now, so we return false to stop the flow.
  return false;
}

/**
 * Handle logic for multiple ones in the structure check.
 */
export async function checkStructureMultipleOnes(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  const roll = state.data.result?.roll;
  if (!roll) throw new TypeError(`Structure check hasn't been rolled yet!`);
  // Crushing hits
  let one_count = (roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    state.data.title = structTableTitles[0];
    state.data.desc = structTableDescriptions(roll.total ?? 1, 1);
    // Subtract the hp which was added in the preStructureRollChecks step.
    await actor.update({ "system.hp.value": actor.system.hp.value - actor.system.hp.max });
  }

  return true;
}

/**
 * Check whether a Hull check is needed, and construct the button if so.
 * @param state
 * @returns
 */
export async function structureInsertHullCheckButton(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  if (state.data.result?.roll.total === 1 && state.data.remStruct === 2) {
    // TODO: we'll want helper functions to generate embeddable flow buttons
    state.data.embedButtons = state.data.embedButtons || [];
    state.data.embedButtons.push(`<a
      class="flow-button lancer-button"
      data-flow-type="check"
      data-check-type="hull"
      data-actor-id="${actor.uuid}"
    >
      <i class="fas fa-dice-d20 i--sm"></i> HULL
    </a>`);
  }
  return true;
}

/**
 * Check whether a secondary roll is needed, and construct the button if so.
 */
export async function structureInsertSecondaryRollButton(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data || !state.data) throw new TypeError(`Structure roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  const result = state.data.result?.roll.total;
  if (!result) throw new TypeError(`Structure check hasn't been rolled yet!`);
  if (result >= 2 && result <= 4) {
    // TODO: we'll want helper functions to generate embeddable flow buttons
    state.data.embedButtons = state.data.embedButtons || [];
    state.data.embedButtons.push(`<a
      class="flow-button lancer-button"
      data-flow-type="secondaryStructure"
      data-actor-id="${actor.uuid}"
    >
      <i class="fas fa-dice-d6 i--sm"></i> TEAR OFF
    </a>`);
  }
  return true;
}

export async function structureInsertCascadeRollButton(
  state: FlowState<LancerFlowState.PrimaryStructureRollData> | FlowState<LancerFlowState.OverheatRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure/Overheat roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure/overheat.");
    return false;
  }

  // Check if the actor has any AI items
  const aiItems = actor.items.filter(item => item.isAI());
  if (!aiItems.length) return true;
  state.data.embedButtons = state.data.embedButtons || [];
  state.data.embedButtons.push(`<a
    class="flow-button lancer-button"
    data-flow-type="cascade"
    data-actor-id="${actor.uuid}"
  >
    <i class="fas fa-dice-d20 i--sm"></i> <span class="horus--subtle">CASCADE CHECK</span>
  </a>`);
  return true;
}

/**
 * Print the result of the structure check to chat
 */
async function printStructureCard(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/structure-card.hbs`;
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}

/*******************************
 * Secondary Structure Code    *
 *******************************/

/**
 * Helper function for beginning the secondary structure flow
 */
export async function beginSecondaryStructureFlow(
  actorUuid: UUIDRef,
  flowArgs?: Partial<LancerFlowState.SecondaryStructureRollData>
) {
  const flow = new SecondaryStructureFlow(actorUuid, flowArgs);
  return await flow.begin();
}

/**
 * Flow for managing secondary structure rolls and effects
 */
export class SecondaryStructureFlow extends Flow<LancerFlowState.SecondaryStructureRollData> {
  static steps = ["secondaryStructureRoll", "printSecondaryStructureCard"];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.SecondaryStructureRollData>) {
    const initialData: LancerFlowState.SecondaryStructureRollData = {
      type: "secondary_structure",
      title: data?.title ?? "Equipment Destruction",
      desc: data?.desc ?? "",
      roll_str: data?.roll_str ?? "1d6",
    };

    super(uuid, initialData);
  }
}

/**
 * SECONDARY STRUCTURE ROLL LOGIC
 */
export async function secondaryStructureRoll(
  state: FlowState<LancerFlowState.SecondaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Secondary Structure roll flow data missing!`);

  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  // This is really async despit the warning
  let roll = await new Roll(state.data.roll_str).evaluate();
  let result = roll.total!;
  state.data.result = {
    roll,
    tt: await roll.getTooltip(),
    total: result.toString(),
  };
  if (result <= 3) {
    state.data.title = "Weapon Destruction";
    state.data.desc = "On a 1–3, all weapons on one mount of your choice are destroyed";
  } else {
    state.data.title = "System Destruction";
    state.data.desc = "On a 4–6, a system of your choice is destroyed";
  }
  return true;
}

/**
 * Print the result of the secondary structure roll to chat.
 */
async function printSecondaryStructureCard(
  state: FlowState<LancerFlowState.SecondaryStructureRollData>,
  options?: { template?: string }
): Promise<boolean> {
  const template = options?.template ?? `systems/${game.system.id}/templates/chat/structure-secondary-card.hbs`;
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}

/**
 * This function should be attached to the actor update hook to trigger structure/stress flows
 */
export function triggerStrussFlow(actor: LancerActor, changed: DeepPartial<LancerActor["data"]>) {
  if (!actor.is_mech() && !actor.is_npc()) return;
  // Check for overheating / structure
  if (
    getAutomationOptions().structure &&
    actor.isOwner &&
    !(
      game.users?.players.reduce((a, u) => a || (u.active && actor.testUserPermission(u, "OWNER")), false) &&
      game.user?.isGM
    ) &&
    (actor.is_mech() || actor.is_npc())
  ) {
    const data = changed as any; // DeepPartial<RegMechData | RegNpcData>;
    if ((data.system?.heat?.value ?? 0) > actor.system.heat.max && actor.system.stress.value > 0) {
      actor.beginOverheatFlow();
    }
    if ((data.system?.hp?.value ?? 1) <= 0 && actor.system.structure.value > 0) {
      actor.beginStructureFlow();
    }
  }
}
