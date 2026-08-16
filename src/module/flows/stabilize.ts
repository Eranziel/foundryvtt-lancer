// Import TypeScript modules
import { LANCER } from "../config";
import { StabOptions1, StabOptions2 } from "../enums";
import { printGenericCard } from "./text";
import { LancerActor } from "../actor/lancer-actor";
import { Flow, type FlowState, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import type { UUIDRef } from "../source-template";

const lp = LANCER.log_prefix;

export function registerStabilizeSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initializeStabilize", initializeStabilize);
  flowSteps.set("renderStabilizePrompt", renderStabilizePrompt);
  flowSteps.set("applyStabilizeUpdates", applyStabilizeUpdates);
  flowSteps.set("printStabilizeResult", printStabilizeResult);
}

export class StabilizeFlow extends Flow<LancerFlowState.StabilizeData> {
  static steps = ["initializeStabilize", "renderStabilizePrompt", "applyStabilizeUpdates", "printStabilizeResult"];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StabilizeData>) {
    const initialData: LancerFlowState.StabilizeData = {
      title: data?.title || "",
      description: "",
      option1: data?.option1 || StabOptions1.Cool,
      option2: data?.option2 || StabOptions2.Reload,
    };
    super(uuid, initialData);
  }
}

async function initializeStabilize(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  state.data.title =
    state.data.title || game.i18n.format("lancer.stabilize.has-stabilized", { name: state.actor.name?.capitalize() });
  return true;
}

async function renderStabilizePrompt(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  const actor = state.actor;
  let template = await renderTemplate(`systems/${game.system.id}/templates/window/promptStabilize.hbs`, {});

  let submit: boolean | null = null;

  submit = await new Promise<boolean>((resolve, _reject) => {
    new Dialog({
      title: `${game.i18n.localize("lancer.stabilize.title")} - ${actor.name!}`,
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("lancer.stabilize.submit"),
          callback: async dlg => {
            // Typeguard the flow data again
            if (!state.data) return;
            state.data.option1 = <StabOptions1>$(dlg).find(".stabilize-options-1:checked").first().val();
            state.data.option2 = <StabOptions2>$(dlg).find(".stabilize-options-2:checked").first().val();
            resolve(true);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("lancer.stabilize.cancel"),
          callback: async () => resolve(false),
        },
      },
      default: "submit",
      close: () => resolve(false),
    }).render(true);
  });
  return submit ?? false;
}

async function applyStabilizeUpdates(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  let option1text = "";
  let option2text = "";
  state.data.description = "";
  switch (state.data.option1) {
    case StabOptions1.Cool:
      option1text = game.i18n.localize("lancer.stabilize.cool-desc");
      break;
    case StabOptions1.Repair:
      if (state.actor.is_mech() && (state.actor.system.repairs?.value ?? 0) <= 0) {
        ui.notifications!.warn(game.i18n.localize("lancer.stabilize.no-repairs"));
        return false;
      } else {
        option1text = game.i18n.localize("lancer.stabilize.spent-repair");
      }
      break;
  }
  switch (state.data.option2) {
    case StabOptions2.ClearBurn:
      option2text = game.i18n.localize("lancer.stabilize.cleared-burn");
      break;
    case StabOptions2.ClearOwnCond:
      option2text = game.i18n.localize("lancer.stabilize.cleared-own-cond");
      break;
    case StabOptions2.ClearOtherCond:
      option2text = game.i18n.localize("lancer.stabilize.cleared-ally-cond");
      break;
    case StabOptions2.Reload:
      option2text = `${game.i18n.localize("lancer.stabilize.reloaded")}<ul>`;
      for (const change of state.actor.loadoutHelper.reloadableItems()) {
        if (change.name && change["system.loaded"] === true) {
          option2text = option2text.concat(`<li>${change.name}</li>`);
        }
      }
      option2text = option2text.concat("</ul>");
      break;
  }
  state.data.description = `<ul><li>${option1text}</li><li>${option2text}</li></ul>`;
  await state.actor.strussHelper.stabilize(state.data.option1, state.data.option2);
  return true;
}

async function printStabilizeResult(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  printGenericCard(state);
  return true;
}
