import { LancerActor } from "../actor/lancer-actor";
import { AccDiffHudData } from "../apps/acc_diff";
import { LancerCombatant } from "./lancer-combat";

//Could record movement here?
type Action = {
  acc_diff: AccDiffHudData;
};

type Turn = {
  combatant: LancerCombatant;
  actions: Action[];
};

type Round = {
  turns: Turn[];
};

export class LancerCombatHistory {
  rounds: Round[];
  constructor(rounds?: Round[]) {
    this.rounds = rounds ? rounds : [];
  }

  newRound() {
    this.rounds.push({ turns: [] });
  }
  undoRound() {
    this.rounds.pop();
  }

  newTurn(combatant: LancerCombatant | undefined) {
    if (combatant === undefined) return;

    this.rounds[this.rounds.length - 1].turns.push({
      combatant,
      actions: [],
    });
  }
  undoTurn(combatant: LancerCombatant | undefined) {
    if (combatant === undefined) return;

    this.rounds[this.rounds.length - 1].turns = this.rounds[this.rounds.length - 1].turns.filter((turn: Turn) => {
      return turn.combatant.actorId !== combatant.actorId;
    });
  }
}
