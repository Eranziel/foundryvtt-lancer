// Import TypeScript modules
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { getAutomationOptions } from "../settings";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { LancerActor } from "../actor/lancer-actor";
import { getAutomationOptions } from "../settings";
import { prepareTextMacro } from "./text";
import { lancerDiceRoll } from "../helpers/commons";
import { encodeMacroData } from "../macros";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

/**
 * StructureFlow manages all the steps necessary for the initial structure rolls and outcomes.
 */
export class StructureFlow extends Flow<LancerFlowState.StructureRollData> {
  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StructureRollData>) {
    const initialData: LancerFlowState.StructureRollData = {
      primary_roll: data?.primary_roll,
      secondary_roll: data?.secondary_roll,
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

  if (getAutomationOptions().structure && !state.data?.primary_roll?.reroll_data) {
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

  if (!state.data?.primary_roll?.reroll_data) {
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

  if (
    (state.data?.primary_roll?.reroll_data?.structure ?? actor.system.structure.value) >= actor.system.structure.max
  ) {
    ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
    return false;
  }

  let remStruct = state.data?.primary_roll?.reroll_data?.structure ?? actor.system.structure.value;
  let damage = actor.system.structure.max - remStruct;
  let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
  let result = roll.total;
  if (result === undefined) return false;

  state.data.primary_roll = {
    roll: roll,
    result: result,
    remStruct: remStruct,
    tooltip: await roll.getTooltip(),
    title: structTableTitles[result],
    desc: structTableDescriptions(result, remStruct),
  };

  return true;
}

/**
 * Handle logic for when a mech has no structure remaining.
 */
export async function noStructureRemaining(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data || !state.data.primary_roll) throw new TypeError(`Structure roll data flow state missing!`);

  if (state.data.primary_roll.remStruct > 0) {
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
  if (!state.data.primary_roll) throw new TypeError(`Primary structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "multiple structure check" logic.');
    return false;
  }

  // Crushing hits
  let one_count = (state.data.primary_roll.roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    let rerollMacroData = encodeMacroData({
      title: "Structure Damage",
      fn: "beginStructureFlow",
      args: [actor.uuid!, { structure: state.data.primary_roll.remStruct }],
    });

    readyAndPrintStructureCard(
      state.actor,
      state.data.primary_roll.tooltip,
      structTableTitles[0],
      "Multiple Ones",
      structTableDescriptions(state.data.primary_roll.result, 1),
      state.data.primary_roll.roll,
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
  if (!state.data.primary_roll) throw new TypeError(`Primary structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  if (state.data.primary_roll.result === 1 && state.data.primary_roll.remStruct === 2) {
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
  if (!state.data || !state.data.primary_roll) throw new TypeError(`Structure roll data flow state missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  if (state.data.primary_roll.result >= 2 && state.data.primary_roll.result <= 4) {
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
  if (!state.data || !state.data.primary_roll) throw new TypeError(`Structure roll data flow state missing!`);
  let rerollMacroData = encodeMacroData({
    title: "Structure Damage",
    fn: "beginStructureFlow",
    args: [state.actor.uuid!, { primary_roll: { reroll_data: { structure: state.data.primary_roll.remStruct } } }],
  });
  return readyAndPrintStructureCard(
    state.actor,
    state.data.primary_roll.tooltip,
    state.data.primary_roll.title,
    state.data.primary_roll.result.toString(),
    state.data.primary_roll.desc,
    state.data.primary_roll.roll,
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
      primary_roll: data?.primary_roll,
      secondary_roll: data?.secondary_roll,
    };

    super("SecondaryStructureFlow", uuid, initialData);

    this.steps.set("secondaryStructureRoll", secondaryStructureRoll);
  }
}

/**
 * SECONDARY STRUCTURE ROLL LOGIC
 */
export async function secondaryStructureRoll(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Secondary structure roll data flow state missing!`);

  const actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  // @ts-ignore
  let roll = new Roll("1d6").evaluate({ async: false });
  let result = roll.total!;
  let title = "";
  let desc = "";
  if (result <= 3) {
    title = "Weapon Destruction";
    desc = "On a 1–3, all weapons on one mount of your choice are destroyed";
  } else {
    title = "System Destruction";
    desc = "On a 4–6, a system of your choice is destroyed";
  }

  let secondary_roll = {
    title: title,
    desc: desc,
    roll: roll,
    tooltip: desc,
    result: result,
  };

  state.data.secondary_roll = secondary_roll;

  let templateData = {
    title: title,
    total: result,
    roll: roll,
    text: desc,
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
