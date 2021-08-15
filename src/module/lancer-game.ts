import type { LancerActionManager } from "./action/actionManager";

export class LancerGame extends Game {
  // Create a lancer namespace
  lancer!: {
    finishedInit?: boolean;
  } & Record<string, unknown>;
  action_manager?: LancerActionManager;
}
