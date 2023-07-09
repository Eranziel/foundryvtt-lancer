// Import TypeScript modules
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { getAutomationOptions } from "../settings";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { LancerActor } from "../actor/lancer-actor";
import { encodeMacroData } from "../macros";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

/**
 * StructureFlow manages all the steps necessary for the initial structure rolls and outcomes.
 */
export class StructureFlow extends Flow<LancerFlowState.StructureRollData> {
  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StructureRollData>) {
    const initialData: LancerFlowState.StructureRollData = {
      reroll_data: data?.reroll_data,
      primary_roll_result: data?.primary_roll_result || -1,
      secondary_roll_result: data?.secondary_roll_result || -1,
      remStruct: data?.remStruct || 0,
      primary_roll: data?.primary_roll || new Roll(``),
      primary_roll_title: data?.primary_roll_title || "",
      primary_roll_desc: data?.primary_roll_desc || "",
      primary_roll_tooltip: data?.primary_roll_tooltip || "",
      secondary_roll_title: data?.secondary_roll_title || "",
      secondary_roll_text: data?.secondary_roll_text || "",
    };

    super("StructureFlow", uuid, initialData);

    this.steps.set("preStructureRollChecks", preStructureRollChecks);
    this.steps.set("rollStructureTable", rollStructureTable);
    this.steps.set("noStructureRemaining", noStructureRemaining);
    this.steps.set("structureMultipleChecks", structureMultipleChecks);
    this.steps.set("structureHullCheck", structureHullCheck);
    this.steps.set("secondaryStructureRollCheck", secondaryStructureRollCheck);
    this.steps.set("structureRemaining", structureRemaining);
  }
}

/**
 * Helper function for beginning structure flows
 *
 * @param actor
 * @param flowArgs
 * @returns
 */
export async function beginStructureFlow(actor: string, flowArgs: {}) {
  const flow = new StructureFlow(actor, flowArgs);
  return await flow.begin();
}

/**
 * Performs initial checks and verifications that should be made BEFORE rolling for structure.
 *
 * @param actor   - Actor or ID of actor to structure
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function preStructureRollChecks(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);
  const actor = state.actor;

  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only Mechs and NPCs can take struct damage");
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
      return false;
    }
  }

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
          return "Roll a HULL check. On a success, your mech is @Compendium[world.status.STUNNED] until the end of your next turn. On a failure, your mech is destroyed.";
        case 1:
          return "Your mech is destroyed.";
        default:
          return "Your mech is @Compendium[world.status.STUNNED] until the end of your next turn.";
      }
    case 2:
    case 3:
    case 4:
      return "Parts of your mech are torn off by the damage. Roll 1d6. On a 1–3, all weapons on one mount of your choice are destroyed; on a 4–6, a system of your choice is destroyed. LIMITED systems and weapons that are out of charges are not valid choices. If there are no valid choices remaining, it becomes the other result. If there are no valid systems or weapons remaining, this result becomes a DIRECT HIT instead.";
    case 5:
    case 6:
      return "Emergency systems kick in and stabilize your mech, but it’s @Compendium[world.status.IMPAIRED] until the end of your next turn.";
  }
  return "";
}

/**
 * Perform roll on structure table
 */
export async function rollStructureTable(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  if ((state.data?.reroll_data?.structure ?? actor.system.structure.value) >= actor.system.structure.max) {
    ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
    return false;
  }

  let struct_lost = state.data?.reroll_data?.structure ?? actor.system.structure.value;
  let damage = actor.system.structure.max - struct_lost;
  let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });

  if (roll.total === undefined) return false;

  state.data.primary_roll = roll;
  state.data.primary_roll_result = roll.total;
  state.data.remStruct = struct_lost;
  state.data.primary_roll_tooltip = await state.data.primary_roll.getTooltip();

  let result = state.data.primary_roll_result;
  state.data.primary_roll_title = structTableTitles[result];
  state.data.primary_roll_desc = structTableDescriptions(result, state.data.remStruct);

  return true;
}

/**
 * Handle logic for when a mech has no structure remaining.
 */
export async function noStructureRemaining(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  if (state.data.remStruct > 0) {
    return true;
  }

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "no remaining structure" logic.');
    return false;
  }

  // You ded
  let title = structTableTitles[0];
  let text = structTableDescriptions(0, 0);
  let templateData = {
    val: actor.system.structure.value,
    max: actor.system.structure.max,
    title: title,
    text: text,
  };

  printStructureCard(actor, templateData);
  return false;
}

/**
 * Handle logic for when a mech has structure remaining.
 */
export async function structureRemaining(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  readyAndPrintCommonStructureCard(state, "");
  return true;
}

/**
 * Handle logic for when a mech has structure remaining.
 */
export async function structureMultipleChecks(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "multiple structure check" logic.');
    return false;
  }

  // Crushing hits
  let one_count = (state.data.primary_roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    let rerollMacroData = encodeMacroData({
      title: "Structure Damage",
      fn: "beginStructureFlow",
      args: [actor.uuid!, { structure: state.data.remStruct }],
    });

    readyAndPrintStructureCard(
      state.actor,
      state.data.primary_roll_tooltip,
      structTableTitles[0],
      "Multiple Ones",
      structTableDescriptions(state.data.primary_roll_result, 1),
      state.data.primary_roll,
      "",
      rerollMacroData
    );

    return false;
  }

  return true;
}

/**
 * Handle logic for when a mech needs to perform a hull check after the initial structure roll
 * @param state
 * @returns
 */
export async function structureHullCheck(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  if (state.data.primary_roll_result === 1 && state.data.remStruct === 2) {
    let macroData = encodeMacroData({
      title: "Hull",
      fn: "prepareStatMacro",
      args: [actor.uuid, "system.hull"],
    });

    let secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Hull</button>`;
    readyAndPrintCommonStructureCard(state, secondaryRoll);
    return false;
  }
  return true;
}

/**
 * Handle logic for when a structure roll leads to the secondary structure roll
 */
export async function secondaryStructureRollCheck(
  state: FlowState<LancerFlowState.StructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  if (state.data.primary_roll_result >= 2 && state.data.primary_roll_result <= 4) {
    state.data.secondary_roll_check = true;
    let macroData = encodeMacroData({
      // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
      // Since we can't change prepareTextMacro too much or break everyone's macros
      title: "Roll for Destruction",
      fn: "beginSecondaryStructureFlow",
      args: [state.actor.uuid!, state],
    });

    let secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Destroy</a></button>`;
    readyAndPrintCommonStructureCard(state, secondaryRoll);
    return false;
  }

  return true;
}

/**
 *  Prepare data and print the common structure template.
 */
function readyAndPrintCommonStructureCard(
  state: FlowState<LancerFlowState.StructureRollData>,
  secondaryRoll: string
): boolean {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);
  let rerollMacroData = encodeMacroData({
    title: "Structure Damage",
    fn: "beginStructureFlow",
    args: [state.actor.uuid!, { reroll_data: { structure: state.data.remStruct } }],
  });
  return readyAndPrintStructureCard(
    state.actor,
    state.data.primary_roll_tooltip,
    state.data.primary_roll_title,
    state.data.primary_roll_result.toString(),
    state.data.primary_roll_desc,
    state.data.primary_roll,
    secondaryRoll,
    rerollMacroData
  );
}

/**
 * Helper functions for preparing important data points
 */
function readyAndPrintStructureCard(
  actor: LancerActor,
  tooltip: string,
  title: string,
  rollTotal: string,
  description: string,
  roll: Roll,
  secondaryRoll: string,
  rerollMacroData: string
): boolean {
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  let templateData = {
    val: actor.system.structure.value,
    max: actor.system.structure.max,
    tt: tooltip,
    title: title,
    total: rollTotal,
    text: description,
    roll: roll,
    secondaryRoll: secondaryRoll,
    rerollMacroData: rerollMacroData,
  };

  printStructureCard(actor, templateData);
  return true;
}

/**
 * Helper function for printing out structure cards
 */
async function printStructureCard(actor: LancerActor, templateData: {}) {
  const template = `systems/${game.system.id}/templates/chat/structure-card.hbs`;
  await renderTemplateStep(actor, template, templateData);
}

/*******************************
 * Secondary Structure Code    *
 *******************************/

/**
 * Helper function for beginning the secondary structure flow
 */
export async function beginSecondaryStructureFlow(actor: string, flowArgs: {}) {
  const flow = new SecondaryStructureFlow(actor, flowArgs);
  return await flow.begin();
}

/**
 * Flow for managing secondary structure rolls and effects
 */
export class SecondaryStructureFlow extends Flow<LancerFlowState.StructureRollData> {
  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StructureRollData>) {
    const initialData: LancerFlowState.StructureRollData = {
      reroll_data: data?.reroll_data,
      primary_roll_result: data?.primary_roll_result || -1,
      secondary_roll_result: data?.secondary_roll_result || -1,
      remStruct: data?.remStruct || 0,
      primary_roll: data?.primary_roll || new Roll(``),
      primary_roll_title: data?.primary_roll_title || "",
      primary_roll_desc: data?.primary_roll_desc || "",
      primary_roll_tooltip: data?.primary_roll_tooltip || "",
      secondary_roll_title: data?.secondary_roll_title || "",
      secondary_roll_text: data?.secondary_roll_text || "",
    };

    super("SecondaryStructureFlow", uuid, initialData);

    this.steps.set("secondaryStructureRoll", secondaryStructureRoll);
  }
}

/**
 * SECONDARY STRUCTURE ROLL LOGIC
 */
export async function secondaryStructureRoll(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  // @ts-ignore
  let roll = new Roll("1d6").evaluate({ async: false });
  let result = roll.total!;
  if (result <= 3) {
    state.data.secondary_roll_title = "Weapon Destruction";
    state.data.secondary_roll_text = "On a 1–3, all weapons on one mount of your choice are destroyed";
  } else {
    state.data.secondary_roll_title = "System Destruction";
    state.data.secondary_roll_text = "On a 4–6, a system of your choice is destroyed";
  }

  let templateData = {
    title: state.data.secondary_roll_title,
    total: state.data.secondary_roll_result,
    roll: roll,
    text: state.data.secondary_roll_text,
  };

  printSecondaryStructureCard(actor, templateData);
  return true;
}

/**
 * Helper function to print the secondary structure card
 */
async function printSecondaryStructureCard(actor: LancerActor, templateData: {}) {
  const template = `systems/${game.system.id}/templates/chat/structure-secondary-card.hbs`;
  await renderTemplateStep(actor, template, templateData);
}
