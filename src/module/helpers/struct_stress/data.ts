import { LancerActor } from "../../actor/lancer-actor";

export interface StructStressData {
  title: string;
  stat: "structure" | "stress";
  lancerActor?: LancerActor;
}
