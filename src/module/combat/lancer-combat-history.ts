import { AccDiffHudBase, AccDiffHudData, AccDiffHudPluginData, Cover } from "../apps/acc_diff";
import { FittingSize, WeaponType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { BoundedNum } from "../source-template";
import { LancerCombatant } from "./lancer-combat";

type HistoryWeapon = {
  mount: FittingSize | null;
  weaponType: WeaponType | null;
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
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

export type HistoryHitResult = {
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
  type: string;
  hit_results: HistoryHitResult[];
  //Both of these are as of the beginning of the action
  hp?: BoundedNum;
  heat?: BoundedNum;
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
    data: LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.StatRollData,
    acc_diff: AccDiffHudData
  ): HistoryAction {
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

    const newWeapon = {
      accurate: acc_diff.weapon.accurate,
      inaccurate: acc_diff.weapon.inaccurate,
      seeking: acc_diff.weapon.seeking,
      engaged: acc_diff.weapon.engaged,
      mount: acc_diff.weapon.mount,
      weaponType: acc_diff.weapon.weaponType,
      // same with ...acc_diff.weapon
    };

    let newHitResults: HistoryHitResult[] = [];
    if (data.type !== "stat") {
      newHitResults = data?.hit_results.map(result => {
        return {
          total: parseInt(result.total), //Can it be float?
          usedLockOn: result.usedLockOn,
          hit: result.hit,
          crit: result.crit,
        };
      });
    }

    const actor = acc_diff.lancerActor;
    const hp = actor?.system.hp;
    let heat: BoundedNum = {
      min: 0,
      max: 0,
      value: 0,
    };
    if (actor?.hasHeatcap()) {
      heat = actor?.system.heat;
    }

    return {
      weapon: newWeapon,
      targets: newTargets,
      base: acc_diff?.base,
      type: data.type,
      hit_results: newHitResults,
      hp,
      heat,
    };
  }
  newAction(data: LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.StatRollData) {
    if (data.acc_diff === undefined) {
      console.error("MISSING ACC DIFF!!!!");
      return;
    }

    const actorId = data.acc_diff.lancerActor?.id;
    const action = this.dataToAction(data, data.acc_diff);

    if (typeof actorId !== "string") return;

    for (let turn of this.currentRound.turns) {
      if (turn.combatant.actorId !== actorId) continue;

      turn.actions.push(action);
      break;
    }
  }

  getAllActions(actorId: string | null): HistoryAction[] {
    let actions = [];
    for (const round of this.rounds) {
      for (const turn of round.turns) {
        if (turn.combatant.actorId !== actorId) continue;
        for (const action of turn.actions) {
          actions.push(action);
        }
      }
    }

    return actions;
  }
}
