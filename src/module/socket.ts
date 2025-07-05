import { LancerActor } from "./actor/lancer-actor";
import { tokenScrollText, TokenScrollTextOptions, userOwnsActor } from "./util/misc";

function socketScrollText(msg: { action: string; data: Partial<TokenScrollTextOptions> }) {
  tokenScrollText(msg.data);
}

async function socketBurnCheck(msg: { action: string; data: { actorUuid: string } }) {
  const actor = await LancerActor.fromUuid(msg.data.actorUuid);
  if (actor && userOwnsActor(actor)) {
    actor.beginBurnFlow();
  }
}

export default function handleSocketMessage(msg: { action: string; data: any }) {
  switch (msg.action) {
    case "scrollText":
      socketScrollText(msg);
      break;
    case "burnCheck":
      socketBurnCheck(msg);
      break;
    default:
      console.warn(`Lancer | Unhandled socket message action: ${msg.action}`);
      break;
  }
}
