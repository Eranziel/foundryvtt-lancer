// Import TypeScript modules
import { LANCER } from "../config";
import { SourceData, UUIDRef } from "../source-template";
import { getAutomationOptions } from "../settings";
import { prepareTextMacro } from "./text";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { LancerItem } from "../item/lancer-item";
import { LancerActor, LancerNPC } from "../actor/lancer-actor";
import { encodeMacroData, renderMacroTemplate } from "../macros";

const lp = LANCER.log_prefix;

export class StructureFlow extends Flow<LancerFlowState.StructureRollData> {
  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StructureRollData>) {
    const initialData: LancerFlowState.StructureRollData = {
      reroll_data: data?.reroll_data,
      primary_roll_result: data?.primary_roll_result || -1,
      secondary_roll_result: data?.secondary_roll_result || -1,
      remStruct: data?.remStruct || 0,
    };

    super("StructureFlow", uuid, initialData);

    this.steps.set("structureChecks", structureChecks);
    this.steps.set("rollStructureTable", rollStructureTable);
    this.steps.set("noStructureRemaining", noStructureRemaining);
    this.steps.set("structureRemaining", structureRemaining);
    this.steps.set("prepareStructureSecondaryRollMacro", prepareStructureSecondaryRollMacro);
  }
}

/**
 * Performs initial checks and verifications that should be made BEFORE rolling for structure.
 *
 * @param actor   - Actor or ID of actor to structure
 * @param reroll_data - Data to use if rerolling. Setting this also supresses the dialog.
 */
export async function structureChecks(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
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

// Table of descriptions
function structTableDescriptions(roll: number, remStruct: number) {
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
}

// Table of titles
const structTableTitles = [
  "Crushing Hit",
  "Direct Hit",
  "System Trauma",
  "System Trauma",
  "System Trauma",
  "Glancing Blow",
  "Glancing Blow",
];

/**
 * Perform roll on structure table
 * @param state
 * @returns
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

  let remStruct = state.data?.reroll_data?.structure ?? actor.system.structure.value;
  console.log("rollStructureTable internal remStruct: ", remStruct);
  let templateData = {};

  state.data.remStruct = remStruct;
  console.log("rollStructureTable state remStruct: ", state.data.remStruct);
  return true;
}

/**
 * Handle logic for when a mech has no structure remaining.
 * @param state
 * @returns
 */
export async function noStructureRemaining(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  if (state.data.remStruct > 0) {
    console.log("there's remaining structure, exiting");
    return true;
  }

  var actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "no remaining structure" logic.');
    return false;
  }

  // You ded
  let title = structTableTitles[0];
  let text = structTableDescriptions(0, 0);
  var templateData = {
    val: actor.system.structure.value,
    max: actor.system.structure.max,
    title: title,
    text: text,
  };

  const template = `systems/${game.system.id}/templates/chat/structure-card.hbs`;
  await renderMacroTemplate(actor, template, templateData);

  return false;
}

/**
 * Handle logic for when a mech has structure remaining.
 * @param state
 * @returns
 */
export async function structureRemaining(state: FlowState<LancerFlowState.StructureRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  var actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn('Only npcs and mechs can work with "remaining structure" logic.');
    return false;
  }

  console.log("structureRemaining remStruct: ", state.data.remStruct);
  let damage = actor.system.structure.max - state.data.remStruct;

  let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
  let result = roll.total;
  if (result === undefined) return false;

  // save roll result in state
  state.data.primary_roll_result = result;

  let tt = await roll.getTooltip();
  let title = structTableTitles[result];
  let text = structTableDescriptions(result, state.data.remStruct);
  let total = result.toString();

  let secondaryRoll = "";

  // Crushing hits
  let one_count = (roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    text = structTableDescriptions(result, 1);
    title = structTableTitles[0];
    total = "Multiple Ones";
  } else {
    if (result === 1 && state.data.remStruct === 2) {
      let macroData = encodeMacroData({
        title: "Hull",
        fn: "prepareStatMacro",
        args: [actor.uuid, "system.hull"],
      });

      secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Hull</button>`;
    } else if (result >= 2 && result <= 4) {
      state.data.secondary_roll_check = true;
      let macroData = encodeMacroData({
        // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
        // Since we can't change prepareTextMacro too much or break everyone's macros
        title: "Roll for Destruction",
        fn: "prepareStructureSecondaryRollMacro",
        args: [state],
      });

      secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Destroy</a></button>`;
    }
  }
  var templateData = {
    val: actor.system.structure.value,
    max: actor.system.structure.max,
    tt: tt,
    title: title,
    total: total,
    text: text,
    roll: roll,
    secondaryRoll: secondaryRoll,
    rerollMacroData: encodeMacroData({
      title: "Structure Damage",
      fn: "prepareStructureMacro",
      args: [actor.uuid!, { structure: state.data.remStruct }],
    }),
  };

  const template = `systems/${game.system.id}/templates/chat/structure-card.hbs`;
  await renderMacroTemplate(actor, template, templateData);
  return true;
}

/**
 * SECONDARY STRUCTURE ROLL LOGIC
 * @param state
 * @returns
 */
export async function prepareStructureSecondaryRollMacro(
  state: FlowState<LancerFlowState.StructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll data flow state missing!`);

  if (!state.data.secondary_roll_check) {
    return true;
  }
  // Determine which Actor to speak as
  const actor = state.actor;

  // @ts-ignore
  let roll = new Roll("1d6").evaluate({ async: false });
  let result = roll.total!;
  if (result <= 3) {
    prepareTextMacro(
      actor,
      "Destroy Weapons",
      `
<div class="dice-roll lancer-dice-roll">
  <div class="dice-result">
    <div class="dice-formula lancer-dice-formula flexrow">
      <span style="text-align: left; margin-left: 5px;">${roll.formula}</span>
      <span class="dice-total lancer-dice-total major">${result}</span>
    </div>
  </div>
</div>
<span>On a 1–3, all weapons on one mount of your choice are destroyed</span>`
    );
  } else {
    prepareTextMacro(
      actor,
      "Destroy Systems",
      `
<div class="dice-roll lancer-dice-roll">
  <div class="dice-result">
    <div class="dice-formula lancer-dice-formula flexrow">
      <span style="text-align: left; margin-left: 5px;">${roll.formula}</span>
      <span class="dice-total lancer-dice-total major">${result}</span>
    </div>
  </div>
</div>
<span>On a 4–6, a system of your choice is destroyed</span>`
    );
  }
  return true;
}
