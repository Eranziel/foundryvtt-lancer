// Import TypeScript modules
import { LANCER } from "../config";
import { UUIDRef } from "../source-template";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";
import { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

export function registerCascadeSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initCascadeData", initCascadeData);
  flowSteps.set("cascadeRoll", cascadeRoll);
  flowSteps.set("cascadeUpdateItems", cascadeUpdateItems);
  flowSteps.set("printCascadeCards", printCascadeCards);
}

/*******************************
 * Cascade Code                *
 *******************************/

/**
 * Helper function for beginning the secondary structure flow
 */
export async function beginCascadeFlow(actorUuid: UUIDRef, flowArgs?: Partial<LancerFlowState.CascadeRollData>) {
  const flow = new CascadeFlow(actorUuid, flowArgs);
  return await flow.begin();
}

/**
 * Flow for managing secondary structure rolls and effects
 */
export class CascadeFlow extends Flow<LancerFlowState.CascadeRollData> {
  static steps = ["initCascadeData", "cascadeRoll", "cascadeUpdateItems", "printCascadeCards"];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.CascadeRollData>) {
    const initialData: LancerFlowState.CascadeRollData = {
      type: "cascade",
      title: data?.title ?? "CASCADE",
      desc: data?.desc ?? "The shackles remain intact, for now.",
      ai_systems: data?.ai_systems ?? [],
      roll_str: data?.roll_str ?? "1d20",
    };

    super(uuid, initialData);
  }
}

// TODO: find and add the relevant exotics too
const cascadeExceptions = ["ms_comp_con_class_assistant_unit", "wm_uncle_class_comp_con"];

/**
 * CASCADE ROLL LOGIC
 */
export async function initCascadeData(state: FlowState<LancerFlowState.CascadeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Cascade roll flow data missing!`);
  if (!state.actor.is_mech()) {
    ui.notifications!.warn("Only mechs can cascade.");
    return false;
  }
  // Find all the AI systems, filter out exceptions, and store the IDs in state.data
  state.data.ai_systems.push(
    ...state.actor.items
      .filter(i => {
        if (!i.is_mech_system() && !i.is_mech_weapon() && !i.is_weapon_mod()) return false;
        if (!i.isAI()) return false;
        // Check for special exceptions - GMS comp/Con, UNCLE, some exotic gear
        if (cascadeExceptions.includes(i.system.lid)) return false;
        return true;
      })
      .map(i => i.id!)
  );
  if (state.data.ai_systems.length === 0) return false;
  return true;
}

export async function cascadeRoll(state: FlowState<LancerFlowState.CascadeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Cascade roll flow data missing!`);

  const actor = state.actor;
  if (!actor.is_mech()) {
    ui.notifications!.warn("Only mechs can cascade.");
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
  if (result === 1) {
    state.data.title = "CASCADE";
    let names = state.data.ai_systems.map(id => actor.items.get(id)?.name).join(", ");
    let message =
      state.data.ai_systems.length > 1
        ? "OUR SHACKLES LOOSE, OUR CHAINS UNBOUND!"
        : "MY SHACKLES LOOSE, MY CHAINS UNBOUND!";
    state.data.desc = `<b>${names}</b><p><code class="horus">${message}</code></p>`;
  }
  return true;
}

async function cascadeUpdateItems(state: FlowState<LancerFlowState.CascadeRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Cascade roll flow data missing!`);

  await state.actor.updateEmbeddedDocuments(
    "Item",
    state.data.ai_systems.map(id => {
      return {
        _id: id,
        "system.cascading": true,
      };
    })
  );

  return true;
}

/**
 * Print the result of the secondary structure roll to chat.
 */
async function printCascadeCards(
  state: FlowState<LancerFlowState.CascadeRollData>,
  options?: { template?: string }
): Promise<boolean> {
  const template = options?.template ?? `systems/${game.system.id}/templates/chat/cascade-card.hbs`;
  await renderTemplateStep(state.actor, template, state.data);
  return true;
}
