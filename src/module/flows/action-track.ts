import { ActionTrackingData } from "../action";
import { getActions } from "../action/action-tracker";
import { LancerActor } from "../actor/lancer-actor";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { printGenericCard } from "./text";

export function registerActionTrackSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("checkActions", checkActions);
  flowSteps.set("printActionTrackCard", printActionTrackCard);
}

export class ActionTrackFlow extends Flow<LancerFlowState.ActionTrackData> {
  static steps = ["checkActions", "printActionTrackCard"];

  constructor(uuid: LancerActor, data?: Partial<LancerFlowState.ActionTrackData>) {
    const initialData: LancerFlowState.ActionTrackData = {
      title: data?.title ?? "",
      description: data?.description ?? "",
      start: data?.start ?? true,
    };

    super(uuid, initialData);
  }
}

async function checkActions(state: FlowState<LancerFlowState.ActionTrackData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Action track flow state data missing!`);
  const actor = state.actor;
  const actions = getActions(actor);
  if (!actions) return false;

  if (state.data.start) {
    state.data.title = `${actor.name} is starting their turn`;
  } else {
    state.data.title = `${actor.name} is ending their turn`;
    state.data.description += condensedActionBadgeHTML(actions);
  }

  return true;
}

async function printActionTrackCard(state: FlowState<LancerFlowState.ActionTrackData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Action track flow state data missing!`);
  printGenericCard(state, { template: `systems/${game.system.id}/templates/chat/action-track-card.hbs` });
  return true;
}

function condensedActionBadgeHTML(actions: ActionTrackingData) {
  function constructButton(action: string, active: boolean) {
    let mIcon;
    switch (action) {
      case "protocol":
        mIcon = "cci cci-protocol";
        break;
      case "move":
        mIcon = "mdi mdi-arrow-right-bold-hexagon-outline";
        break;
      case "full":
        mIcon = "mdi mdi-hexagon-slice-6";
        break;
      case "quick":
        mIcon = "mdi mdi-hexagon-slice-3";
        break;
      case "reaction":
        mIcon = "cci cci-reaction";
        break;
    }

    return `
    <button class="lancer-action-badge${active ? ` lancer-${action}` : ""}">
      <i class="${mIcon} i--m white--text"></i>
    </button>`;
  }

  let buttons = "";
  const actionsToPrint = ["protocol", "move", "full", "quick", "reaction"];
  for (const [action, val] of Object.entries(actions)) {
    if (!actionsToPrint.includes(action)) continue;
    let active: boolean = !!val;
    buttons += constructButton(action, active);
  }
  return `${buttons}`;
}
