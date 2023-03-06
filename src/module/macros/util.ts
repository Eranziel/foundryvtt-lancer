import { LANCER } from "../config.js";
import { LancerActor } from "../actor/lancer-actor.js";
import { LancerItem } from "../item/lancer-item.js";

const lp = LANCER.log_prefix;

// Helper function for resolving an ambiguous uuid argument
export function resolveItemOrActor(provided: string | LancerActor | LancerItem): {
  actor: LancerActor | null;
  item: LancerItem | null;
} {
  if (typeof provided == "string") {
    provided = fromUuidSync(provided) as LancerActor | LancerItem;
  }
  if (provided instanceof TokenDocument) {
    // @ts-ignore Infinite recursion for some reason
    provided = provided.actor;
  }
  if (provided instanceof LancerActor) {
    return {
      actor: provided,
      item: null,
    };
  } else if (provided instanceof LancerItem) {
    return {
      actor: provided.actor,
      item: provided,
    };
  } else {
    return {
      actor: null,
      item: null,
    };
  }
}
