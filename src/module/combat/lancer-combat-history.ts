import { LancerActor } from "../actor/lancer-actor";
import {
  AccDiffHudBase,
  AccDiffHudData,
  AccDiffHudPluginData,
  AccDiffHudTarget,
  AccDiffHudWeapon,
  Cover,
} from "../apps/acc_diff";
import { FittingSize, WeaponType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { LancerCombatant } from "./lancer-combat";

type HistoryWeapon = {
  mount: FittingSize;
  weaponType: WeaponType;
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
  plugins: { [k: string]: AccDiffHudPluginData };
};

//We redefine targets to avoid infinite recursion from token
type HistoryTarget = {
  target_id: string;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  consumeLockOn: boolean;
  prone: boolean;
  stunned: boolean;
};

type HistoryHitResult = {
  total: number;
  usedLockOn: boolean;
  hit: boolean;
  crit: boolean;
};

//Could record movement here?
type HistoryAction = {
  weapon: HistoryWeapon;
  targets: HistoryTarget[];
  base: AccDiffHudBase;
  hit_results: HistoryHitResult[];
};

type HistoryTurn = {
  combatant: LancerCombatant;
  actions: HistoryAction[];
};

type HistoryRound = {
  turns: HistoryTurn[];
};

export class LancerCombatHistory {
  rounds: HistoryRound[];
  constructor(rounds?: HistoryRound[]) {
    this.rounds = rounds ? rounds : [];
  }
  get currentRound(): HistoryRound {
    return this.rounds[this.rounds.length - 1];
  }
  getCurrentTurn(actorId: string | null | undefined): HistoryTurn | undefined {
    return this.currentRound.turns.find((turn: HistoryTurn) => {
      return turn.combatant.actorId === actorId;
    });
  }

  newRound() {
    this.rounds.push({ turns: [] });
  }
  undoRound() {
    this.rounds.pop();
  }

  newTurn(combatant: LancerCombatant | undefined) {
    if (combatant === undefined) return;

    this.currentRound.turns.push({
      combatant,
      actions: [],
    });
  }
  undoTurn(combatant: LancerCombatant | undefined) {
    if (combatant === undefined) return;

    this.currentRound.turns = this.currentRound.turns.filter((turn: HistoryTurn) => {
      return turn.combatant.actorId !== combatant.actorId;
    });
  }

  dataToAction(
    data: LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData,
    acc_diff: AccDiffHudData
  ): HistoryAction {
    const newWeapon = {
      ...acc_diff.weapon,
      mount: acc_diff.weapon.mount,
      weaponType: acc_diff.weapon.weaponType,
    };

    const newTargets: HistoryTarget[] = acc_diff.targets.map(target => {
      return {
        target_id: target.target.id,
        accuracy: target.accuracy,
        difficulty: target.difficulty,
        cover: target.cover,
        consumeLockOn: target.consumeLockOn,
        prone: target.prone,
        stunned: target.stunned,
        // ...target leads to recursion :(,
      };
    });

    const newHitResults: HistoryHitResult[] = data.hit_results.map(result => {
      return {
        total: parseInt(result.total), //Can it be float?
        usedLockOn: result.usedLockOn,
        hit: result.hit,
        crit: result.crit,
      };
    });

    return {
      weapon: newWeapon,
      targets: newTargets,
      base: acc_diff?.base,
      hit_results: newHitResults,
    };
  }
  newAction(data: LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData) {
    if (data.acc_diff === undefined) {
      console.error("MISSING ACC DIFF!!!!");
      return;
    }

    const actorId = data.acc_diff.lancerActor?.id;
    const action = this.dataToAction(data, data.acc_diff);

    if (typeof actorId !== "string") return;

    for (let turn of this.currentRound.turns) {
      console.log(`Actor ID: ${actorId}, Combatant Actor ID: ${turn.combatant.actorId}`);
      if (turn.combatant.actorId !== actorId) continue;

      turn.actions.push(action);
      break;
    }
  }
}
