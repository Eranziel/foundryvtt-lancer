import { LancerActor } from "../actor/lancer-actor";
import { Cover } from "../apps/acc_diff";
import { LANCER } from "../config";
import { WeaponSize, WeaponType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { BoundedNum } from "../source-template";
import { LancerCombatant } from "./lancer-combat";
import { LancerStatusEffects } from "../system-template";

//Whenever an AccDiff is submitted, history is appended

//Perhaps should be a type/class
function getStats(actor?: LancerActor | null): {
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
  statuses?: LancerStatusEffects;
} {
  if (!actor) return {};

  const heat = actor.hasHeatcap() ? actor.system.heat : undefined;
  const structure = actor.is_mech() || actor.is_npc() ? actor.system.structure : undefined;
  const stress = actor.is_mech() || actor.is_npc() ? actor.system.stress : undefined;
  const hp = actor.system.hp;
  const statuses = actor.system.statuses;

  return {
    hp,
    heat,
    structure,
    stress,
    statuses,
  };
}

//We redefine targets/base/weapon to avoid infinite recursion from token/plugins
type HistoryTarget = {
  targetId: string;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  consumeLockOn: boolean;
  prone: boolean;
  stunned: boolean;
  // As of the beginning of the action
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
  statuses?: LancerStatusEffects;
};

type HistoryWeapon = {
  mount: WeaponSize | null;
  weaponType: WeaponType | null;
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;
  engaged: boolean;
};

type HistoryBase = {
  grit: number;
  flatBonus: number;
  accuracy: number;
  difficulty: number;
  cover: Cover;
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
  base: HistoryBase;
  type: string;
  hit_results: HistoryHitResult[];
  // These are as of the beginning of the action
  // The action-taker's stats
  hp?: BoundedNum;
  heat?: BoundedNum;
  structure?: BoundedNum;
  stress?: BoundedNum;
  statuses?: LancerStatusEffects;
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
    if (this.rounds.length == 0) {
      console.error(`${LANCER.log_prefix} LancerCombatHistory.currentRound() called with no rounds`);
    }

    return this.rounds[this.rounds.length - 1] || { turns: [] };
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
    if (!combatant) return;

    this.currentRound.turns.push({
      combatant,
      actions: [],
    });
  }
  undoTurn(combatant: LancerCombatant | undefined) {
    if (!combatant) return;

    //If the combatant has multiple activations, this would remove all instances
    let lastActivationIdx = -1;
    this.currentRound.turns
      .slice()
      .reverse()
      .forEach((turn: HistoryTurn, idx: number) => {
        if (turn.combatant.id === combatant.id) lastActivationIdx = idx;
      });

    this.currentRound.turns = this.currentRound.turns.filter((_, idx: number) => {
      if (idx === lastActivationIdx) {
        return false;
      } else {
        return true;
      }
    });
  }

  dataToAction(
    data:
      | LancerFlowState.AttackRollData
      | LancerFlowState.WeaponRollData
      | LancerFlowState.StatRollData
      | LancerFlowState.TechAttackRollData
  ): HistoryAction {
    if (!data.acc_diff) throw new TypeError(`Accuracy/difficulty data missing!`);

    const acc_diff = data.acc_diff;

    const newTargets: HistoryTarget[] = acc_diff.targets.map(target => {
      const stats = getStats(target.target.actor);
      return {
        targetId: target.target.id,
        accuracy: target.accuracy,
        difficulty: target.difficulty,
        cover: target.cover,
        consumeLockOn: target.consumeLockOn,
        prone: target.prone,
        stunned: target.stunned,
        hp: stats.hp,
        heat: stats.heat,
        structure: stats.structure,
        stress: stats.stress,
        statuses: stats.statuses,
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

    const newBase = {
      grit: acc_diff.base.grit,
      flatBonus: acc_diff.base.flatBonus,
      accuracy: acc_diff.base.accuracy,
      difficulty: acc_diff.base.difficulty,
      cover: acc_diff.base.cover,
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

    const stats = getStats(acc_diff.lancerActor);
    return {
      weapon: newWeapon,
      targets: newTargets,
      base: newBase,
      type: data.type,
      hit_results: newHitResults,
      hp: stats.hp,
      heat: stats.heat,
      structure: stats.structure,
      stress: stats.stress,
      statuses: stats.statuses,
    };
  }
  newAction(
    data:
      | LancerFlowState.AttackRollData
      | LancerFlowState.WeaponRollData
      | LancerFlowState.StatRollData
      | LancerFlowState.TechAttackRollData
  ) {
    if (!data.acc_diff) {
      console.error(
        `${LANCER.log_prefix} Cannot serialize action to combat history. Accuracy/difficulty data missing!`
      );
      return;
    }

    const action = this.dataToAction(data);

    const actorId = data.acc_diff.lancerActor?.id;
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
