import { LancerActor } from "../actor/lancer-actor";
import { LancerCombat } from "../combat/lancer-combat";
import { LancerCombatHistory } from "../combat/lancer-combat-history";
import { LANCER } from "../config";
import { NpcFeatureType } from "../enums";
import { LancerItem } from "../item/lancer-item";
import { slugify } from "./lid";

/**
 * Watches for exact changes in its payload, detected by monitoring changes int its payload is stringified to JSON
 */
export class ChangeWatchHelper {
  // The previous value, and it stringified
  prior_value: any = null;
  prior_string = "";

  // The current value, and it stringified
  curr_value: any = null;
  curr_string = "";

  // Whether a call to setValue changed the value.
  isDirty: boolean = false;

  // Clears dirty
  public clean() {
    this.isDirty = true;
  }

  /**
   * Set the value, returning true (and marking self as "dirty") if its different from our initial value
   * Initial call will never mark dirty bit
   * @param to
   */
  public setValue(to: any): boolean {
    // Propagate if not first, flag otherwise
    let first = false;
    if (!this.curr_string) {
      first = true;
    } else {
      this.prior_value = this.curr_value;
      this.prior_string = this.curr_string;
    }

    // Compute new
    this.curr_value = to;
    this.curr_string = JSON.stringify(to);

    // If first, initial mimic
    if (first) {
      this.prior_string = this.curr_string;
      this.prior_value = this.curr_value;
    }

    // Test change
    if (!first && !this.isDirty) {
      this.isDirty = this.curr_string != this.prior_string;
    }
    return this.isDirty;
  }
}

export function fixCCFormula(formula: string) {
  return formula.replaceAll("{ll}", "@level").replaceAll("{grit}", "@grit");
}

/**
 * Synchronously evaluates a roll in a version safe way
 * @param formula A dice formula
 * @param data Data to provide the dice formula, accessible via @
 * @returns The roll total
 */
export function rollEvalSync(formula: string, data?: any): number {
  let roll = new Roll(formula, data);
  try {
    // Then do the v12 version
    roll.evaluateSync();
  } catch (e) {
    return 0;
  }
  return roll.total!;
}

export type TokenScrollTextOptions = {
  tokenId?: string;
  content?: string;
  style?: {
    anchor?: 0 | 1 | 2 | 3 | 4;
    direction?: 0 | 1 | 2 | 3 | 4;
    duration?: number;
    fontSize?: number;
    fill?: string | number | Array<string> | Array<number>;
    stroke?: number;
    strokeThickness?: number;
    jitter?: number;
  };
};

/**
 * Utility function to check if the user owns an actor. for a GM this will only return true if there is no currently
 * connected player which has ownership of this actor. This is useful for determining if the GM should receive a prompt
 * for some action on behalf of that actor (structure, burn check, etc...).
 * @param actor The actor to check ownership of
 * @returns True if the user owns the actor, false otherwise
 */
export function userOwnsActor(actor: LancerActor): boolean {
  return (
    actor.isOwner &&
    !(game.users?.players.some(u => u.active && actor.testUserPermission(u, "OWNER")) && game.user?.isGM)
  );
}

export async function tokenScrollText(
  { tokenId = "", content = "", style = {} }: TokenScrollTextOptions = {},
  push = false
) {
  // Populate default style
  style = {
    anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
    direction: CONST.TEXT_ANCHOR_POINTS.TOP,
    fontSize: 28,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 4,
    jitter: 0.25,
    ...style,
  };
  if (push) {
    game.socket?.emit(`system.${game.system.id}`, {
      action: "scrollText",
      data: { tokenId, content, style },
    });
  }
  const token = canvas.tokens?.get(tokenId);
  if (!token) return;
  // If this client does not have floating numbers enabled, don't show them.
  if (!(await game.settings.get(game.system.id, LANCER.setting_floating_damage_numbers))) return;
  // @ts-expect-error v11 types
  await canvas.interface.createScrollingText(token.center, content, style);
}

//Used to check actor may use talent
//Perhaps should be LancerPILOT method
export function isTalentAvailable(actor: LancerActor | undefined, lid: string, talentRank: number): boolean {
  if (!actor?.is_mech() || !actor.system.pilot?.value?.is_pilot()) return false;

  let talents = actor.system.pilot.value.items.filter(i => i.is_talent());

  //Go through the slugs of all the available talent ranks
  for (const talent of talents) {
    if (!talent.is_talent()) continue;
    let rank_num = talent.system!.curr_rank;
    for (let i = 0; i < rank_num; i++) {
      if (talent.system.lid == lid && talent.system.curr_rank >= talentRank) return true;
    }
  }

  return false;
}

export function getHistory(): LancerCombatHistory | null {
  const serializedHistory = game.combat?.flags.lancer?.history;
  return serializedHistory ? new LancerCombatHistory(serializedHistory.rounds) : null;
}

// Should use AccDiffHudData.windowType
export function isTech(lancerItem: LancerItem | null, title: string) {
  if (!lancerItem) return title.toLowerCase() === "tech attack";
  if (lancerItem.is_mech_weapon()) return false;
  if (lancerItem.is_pilot_weapon()) return false;
  if (lancerItem.is_npc_feature() && lancerItem.system.type === NpcFeatureType.Weapon) return false;
  return true;
}
