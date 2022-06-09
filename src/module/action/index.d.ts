import { LancerActor } from "../actor/lancer-actor";

export type ActionData = {
  protocol: boolean;
  move: number;
  full: boolean;
  quick: boolean;
  reaction: boolean;
  free: boolean;
};

export type ActionType = keyof ActionData;
