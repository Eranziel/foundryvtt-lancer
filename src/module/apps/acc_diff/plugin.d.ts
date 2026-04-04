import { LancerItem } from "../../item/lancer-item";
import { LancerActor } from "../../actor/lancer-actor";
import type { AccDiffHudBase, AccDiffHudData, AccDiffHudTarget, AccDiffHudWeapon } from "./data.svelte";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * and a set of freestanding constructors to apply it to different contexts (per roll, per target, etc.)

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

declare interface CheckboxUI {
  uiElement: "checkbox"; // = "checkbox";
  slug: string;
  humanLabel: string;
  get uiState(): boolean;
  set uiState(data: boolean); //: this;
  get disabled(): boolean;
  get visible(): boolean;
}

declare interface NoUI {
  uiElement: "none"; // = "none";
}

type UIBehaviour = CheckboxUI | NoUI;

declare interface RollModifier {
  category: "acc" | "diff";
  modifyRoll(roll: string): string;
  get rollPrecedence(): number; // higher numbers happen earlier
  hydrate?(data: AccDiffHudData, target?: AccDiffHudTarget): void;
}

export type AccDiffHudPluginData = UIBehaviour & RollModifier;
export type AccDiffHudCheckboxPluginData = CheckboxUI & RollModifier;
export type AccDiffHudNoUIPluginData = NoUI & RollModifier;

/**
 * A plugin alters the baseline behaviour of a roll made using the AccDiffHud.
 * Plugins should define either `perRoll` OR both of `perUnknownTarget` and `perTarget`. The presence of these
 * functions determines which scopes the plugin's modifications are applied to.
 *
 * **Caution:** If `perRoll` AND either of `perUnknownTarget` and `perTarget` are defined, then `modifyRoll` will
 * be called from both contexts - all rolls and per-target rolls.
 */
declare interface AccDiffHudPlugin<Data extends AccDiffHudPluginData> {
  /**
   * Unique identifier for a given plugin.
   */
  slug: string;
  /**
   * Category specifies whether the plugin applies to the accuracy or difficulty calculation for a roll.
   */
  category: "acc" | "diff";
  /**
   * A "perRoll" plugin applies to all rolls (that is, all targets), like weapon seeking.
   * @param item (Optional) The item or actor that is making the roll.
   */
  perRoll?(item?: LancerItem | LancerActor): Data;
  /**
   * A "perUnknownTarget" applies whenever the user opens the roll dialog without a target.
   */
  perUnknownTarget?(): Data;
  /**
   * A "perTarget" plugin applies individually to every single target.
   * @param token The token targeted by this roll.
   */
  perTarget?(token: Token.Implementation): Data;
}

// TODO: is this type still needed, or could we export AccDiffHudPlugin instead?
// export type Data<T> = T extends AccDiffHudPlugin<infer D> ? D : never;
