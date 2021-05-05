import { LancerActor } from "../actor/lancer-actor";

export type ActionData = {
  protocol: boolean;
  move: number;
  full: boolean;
  quick: boolean;
  reaction: boolean;
  free: true;
};

export type ActionType = keyof ActionData;
