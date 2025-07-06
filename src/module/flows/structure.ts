// Import TypeScript modules
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { userOwnsActor } from "../util/misc";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { DamageRollFlow } from "./damage";
import { DamageType } from "../enums";

const lp = LANCER.log_prefix;

export function registerStructureSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("preStructureRollChecks", preStructureRollChecks);
  flowSteps.set("rollStructureTable", rollStructureTable);
  flowSteps.set("noStructureRemaining", noStructureRemaining);
  flowSteps.set("checkStructureMultipleOnes", checkStructureMultipleOnes);
  flowSteps.set("structureInsertDismembermentButton", structureInsertDismembermentButton);
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
    "structureInsertDismembermentButton",
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

  if (game.settings.get(game.system.id, LANCER.setting_automation).structure && !state.data?.reroll_data) {
    if (actor.system.hp.value > 0) {
      ui.notifications!.info("Token has hp remaining. No need to roll structure.");
      return false;
    }
    const { openSlidingHud: open } = await import("../apps/slidinghud");
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
  "lancer.tables.structure.title.crushing",
  "lancer.tables.structure.title.direct",
  "lancer.tables.structure.title.trauma",
  "lancer.tables.structure.title.trauma",
  "lancer.tables.structure.title.trauma",
  "lancer.tables.structure.title.glancing",
  "lancer.tables.structure.title.glancing",
];

// Monstrosity structure table titles
// Ⓒ Massif Press. Used with permission
const monstrosityTableTitles = [
  "lancer.tables.structureMonstrosity.title.fatal",
  "lancer.tables.structureMonstrosity.title.direct",
  "lancer.tables.structureMonstrosity.title.dismember",
  "lancer.tables.structureMonstrosity.title.powerful",
  "lancer.tables.structureMonstrosity.title.powerful",
  "lancer.tables.structureMonstrosity.title.glancing",
  "lancer.tables.structureMonstrosity.title.glancing",
];

// Table of structure table descriptions
function structTableDescriptions(roll: number, remStruct: number): string {
  switch (roll) {
    // Used for multiple ones
    case 0:
      return "lancer.tables.structure.description.crushing";
    case 1:
      switch (remStruct) {
        case 2:
          return "lancer.tables.structure.description.direct.2";
        case 1:
        case 0:
          return "lancer.tables.structure.description.direct.1";
        default:
          return "lancer.tables.structure.description.direct.3plus";
      }
    case 2:
    case 3:
    case 4:
      return "lancer.tables.structure.description.trauma";
    case 5:
    case 6:
      return "lancer.tables.structure.descriptions.glancing";
  }
  return "";
}

// Monstrosity structure table descriptions
// Ⓒ Massif Press. Used with permission
function monstrosityTableDescriptions(roll: number, remStruct: number): string {
  switch (roll) {
    // Multiple 1s
    case 0:
      return "lancer.tables.structureMonstrosity.description.fatal";
    case 1:
      if (remStruct >= 3) {
        return "lancer.tables.structureMonstrosity.description.direct.3plus";
      } else if (remStruct === 2) {
        return "lancer.tables.structureMonstrosity.description.direct.2";
      } else {
        return "lancer.tables.structureMonstrosity.description.direct.1";
      }
    case 2:
      return "lancer.tables.structureMonstrosity.description.dismember";
    case 3:
    case 4:
      return "lancer.tables.structureMonstrosity.description.powerful";
    case 5:
    case 6:
      return "lancer.tables.structureMonstrosity.description.glancing";
  }
  return "";
}

// Helper to check if an actor is a Monstrosity by looking for the Unique Physiology trait
function hasUniquePhysiology(actor: LancerActor): boolean {
  return actor.is_npc() && actor.itemTypes.npc_feature.some(i => i.system.lid === "npcf_unique_physiology_monstrosity");
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
  let roll: Roll = await new Roll(formula).evaluate();

  let result = roll.total;
  if (result === undefined) return false;

  // If the result indicates the mech should be destroyed, set the remaining structure to 0.
  // Also subtract the hp which was added in the preStructureRollChecks step.
  if (result === 0 || (result === 1 && remStruct <= 1)) {
    await actor.update({
      "system.hp.value": actor.system.hp.value - actor.system.hp.max,
      "system.structure.value": 0,
    });
  }

  // Check if this is a Monstrosity
  const isMonstrosity = hasUniquePhysiology(actor);

  state.data = {
    type: "structure",
    title: isMonstrosity ? monstrosityTableTitles[result] : structTableTitles[result],
    desc: isMonstrosity ? monstrosityTableDescriptions(result, remStruct) : structTableDescriptions(result, remStruct),
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

  // Check if this is a Monstrosity
  const isMonstrosity = hasUniquePhysiology(actor);

  // You ded. Print the card and stop the flow.
  const printCard = (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get("printStructureCard");
  if (!printCard) throw new TypeError(`printStructureCard flow step missing!`);
  if (typeof printCard !== "function") throw new TypeError(`printStructureCard flow step is not a function.`);
  state.data.title = isMonstrosity ? monstrosityTableTitles[0] : structTableTitles[0];
  state.data.desc = isMonstrosity ? monstrosityTableDescriptions(0, 0) : structTableDescriptions(0, 0);
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

  let roll = state.data.result?.roll;
  if (!roll) throw new TypeError(`Structure check hasn't been rolled yet!`);
  // @ts-expect-error v10 types
  if (roll.terms[0].rolls?.length > 1) {
    // This was rolled multiple times - it should be an NPC with the legendary trait
    // Find the selected roll - the one which wasn't discarded - and check whether it has multiple ones.
    const chosenIndex = (roll.terms as foundry.dice.terms.Die[])[0].results.findIndex(r => !r.discarded);
    // @ts-expect-error v10 types
    roll = (roll.terms as Die[])[0].rolls[chosenIndex] || roll;
  }
  if (!roll) throw new TypeError(`Structure check hasn't been rolled yet!`);

  // Check if this is a Monstrosity
  const isMonstrosity = hasUniquePhysiology(actor);

  // Crushing hits
  let one_count = (roll.terms as foundry.dice.terms.Die[])[0].results.filter(v => v.result === 1).length;
  if (one_count > 1) {
    if (isMonstrosity) {
      state.data.title = monstrosityTableTitles[0];
      state.data.desc = monstrosityTableDescriptions(roll.total ?? 1, 1);
    } else {
      state.data.title = structTableTitles[0];
      state.data.desc = structTableDescriptions(roll.total ?? 1, 1);
    }
    state.data.title = game.i18n.localize(state.data.title);
    state.data.desc = game.i18n.localize(state.data.desc);
    await actor.update({
      "system.hp.value": actor.system.hp.value - actor.system.hp.max,
      "system.structure.value": 0,
    });
  }

  return true;
}

/**
 * Check whether a Monstrosity Dismemberment roll is needed, and construct the button if so.
 * @param state
 * @returns
 */
export async function structureInsertDismembermentButton(
  state: FlowState<LancerFlowState.PrimaryStructureRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Structure roll flow data missing!`);

  let actor = state.actor;
  if (!actor.is_mech() && !actor.is_npc()) {
    ui.notifications!.warn("Only npcs and mechs can roll structure.");
    return false;
  }

  // Only for Monstrosity NPCs
  if (!hasUniquePhysiology(actor)) return true;

  // Only if the result is Dismemberment
  const result = state.data.result?.roll.total;
  if (result !== 2) return true;

  state.data.embedButtons = state.data.embedButtons || [];
  state.data.embedButtons.push(`<a
    class="flow-button lancer-button"
    data-flow-type="dismembermentDamage"
    data-actor-id="${actor.uuid}"
  >
    <i class="compcon-icon kinetic i--sm"></i> ROLL DAMAGE
  </a>`);
  return true;
}

/**
 * Begin the Monstrosity Dismemberment damage flow for a given actor.
 * This is called from the structure flow chat button and triggers a damage roll.
 * @param actor LancerActor instance (should be a Monstrosity NPC)
 */
export async function beginDismembermentDamageFlow(actor: LancerActor) {
  if (!actor) {
    ui.notifications?.error("No actor found for dismemberment damage button.");
    return;
  }

  const tokens = actor.getActiveTokens();
  const damageData = [{ type: DamageType.Kinetic, val: "1d6" }];
  const hit_results = [
    {
      target: tokens[0],
      total: "0",
      usedLockOn: false,
      hit: true,
      crit: false,
    },
  ];

  const flow = new DamageRollFlow(actor, {
    title: game.i18n.localize("lancer.tables.structureMonstrosity.title.dismember"),
    damage: damageData,
    configurable: false,
    add_burn: false,
    tags: [],
    hit_results,
    has_normal_hit: true,
    has_crit_hit: false,
  });
  await flow.begin();
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

  // Do not show the secondary roll button for Monstrosity/Unique Physiology
  if (hasUniquePhysiology(actor)) return true;

  const result = state.data.result?.roll.total;
  if (!result) throw new TypeError(`Structure check hasn't been rolled yet!`);
  if (!hasUniquePhysiology(state.actor) && result >= 2 && result <= 4) {
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

  state.data.title = game.i18n.localize(state.data.title);
  state.data.desc = game.i18n.localize(state.data.desc);

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
export function triggerStrussFlow(actor: LancerActor, changed: unknown) {
  if (!actor.is_mech() && !actor.is_npc()) return;
  // Check for overheating / structure
  if (
    game.settings.get(game.system.id, LANCER.setting_automation).structure &&
    userOwnsActor(actor) &&
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
