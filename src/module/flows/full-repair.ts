// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { renderTemplateStep } from "./_render";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";
import { UUIDRef } from "../source-template";

const lp = LANCER.log_prefix;

export function registerFullRepairSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("displayFullRepairDialog", displayFullRepairDialog);
  flowSteps.set("executeFullRepair", executeFullRepair);
}

export class FullRepairFlow extends Flow<LancerFlowState.TextRollData> {
  name = "FullRepairFlow";
  steps = ["displayFullRepairDialog", "executeFullRepair"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.TextRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.TextRollData = {
      title: data?.title || "",
      description: data?.description || "",
      tags: data?.tags || [],
    };

    super(uuid, initialData);
  }
}

export async function displayFullRepairDialog(state: FlowState<LancerFlowState.TextRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Full Repair flow state missing!`);

  return new Promise<boolean>((resolve, reject) => {
    new Dialog({
      title: `FULL REPAIR - ${state.actor.name}`,
      content: `<h3>Are you sure you want to fully repair the ${state.actor?.type} "${state.actor?.name}"?`,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Yes",
          callback: async _dlg => {
            // Gotta typeguard the actor again
            if (!state.actor) {
              return reject();
            }
            resolve(true);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "No",
          callback: async () => resolve(false),
        },
      },
      default: "submit",
      close: () => resolve(false),
    }).render(true);
  });
}

export async function executeFullRepair(state: FlowState<LancerFlowState.TextRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Full Repair flow state missing!`);

  const template = `systems/${game.system.id}/templates/chat/generic-card.hbs`;
  const flags = {};
  let data = {
    title: state.data.title,
    description: state.data.description,
    tags: state.data.tags,
  };
  await state.actor.loadoutHelper.fullRepair();
  data.title = "FULL REPAIR";
  data.description = `Notice: ${state.actor.name} has been fully repaired.`;
  await renderTemplateStep(state.actor, template, data, flags);

  return true;
}
