import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

// Helper function for resolving an ambiguous uuid argument
export async function resolveItemOrActor(provided: string | LancerActor | LancerItem): Promise<{
  actor: LancerActor | null;
  item: LancerItem | null;
}> {
  if (typeof provided == "string") {
    provided = (await fromUuid(provided)) as LancerActor | LancerItem;
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
