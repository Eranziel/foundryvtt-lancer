import { LancerActor } from "../../actor/lancer-actor.js";

export interface StructStressData {
  title: string;
  stat: "structure" | "stress";
  lancerActor?: LancerActor;
}
