import { LancerActor } from "../../actor/lancer-actor";

export interface StructStressData {
  title: string;
  kind: "structure" | "stress";
  lancerActor?: LancerActor;
}
