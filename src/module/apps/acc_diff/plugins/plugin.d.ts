import type * as t from "io-ts";
import { LancerItem } from "../../../item/lancer-item";
import { LancerActor } from "../../../actor/lancer-actor";

import type { AccDiffData, AccDiffHudData, AccDiffHudTarget } from "../index";
import { isTalentAvailable } from "../../../util/misc";
import { TalentEffect } from "../../../flows/interfaces";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * a codec to serialize it,
// * and a bunch of freestanding constructors

// If it has been two weeks since talents were pulled into main and and I did not write docs
// on how to make more talents, yell at me on discord (@histidinedwarf)

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

declare interface CheckboxUI {
  uiElement: "checkbox" = "checkbox";
  slug: string;
  humanLabel: string; //Human name of rank and talent
  quickReference: string; //small string in () to tell damage
  tooltip?: string;
  get uiState(): boolean;
  set uiState(data: boolean): this;
  get disabled(): boolean;
  get visible(): boolean;
}

declare interface NoUI {
  uiElement: "none" = "none";
}

type UIBehaviour = CheckboxUI | NoUI;

declare interface RollModifier {
  category?: "acc" | "diff" | "talentWindow";
  modifyRoll?(roll: string): string;
  get accBonus(): number;
  get rollPrecedence(): number; // higher numbers happen earlier
}

declare interface Dehydrated {
  // the codec handles all serializable data,
  // but we might want to pick up data from the environment too
  // all perTarget codecs get the target as well
  hydrate(data: AccDiffData, target?: AccDiffTarget);
}

export type AccDiffHudPluginData = UIBehaviour & RollModifier & Dehydrated;
export type AccDiffHudCheckboxPluginData = CheckboxUI & RollModifier & Dehydrated;
export type AccDiffHudNoUIPluginData = NoUI & RollModifier & Dehydrated;

export type AccDiffHudPluginCodec<C extends AccDiffHudPluginData, O, I> = Codec<C, O, I>;

declare interface AccDiffHudPlugin<Data extends AccDiffHudPluginData> {
  slug: string;
  category: "acc" | "diff" | "talentWindow";
  kind: "hase" | "attack";
  // Text for reminding about the talent if it applies. Especially if it's not automated. See hunter.ts
  talentEffect?: TalentEffect;
  // If true and the setting for talent automation is off, this plugin won't be registered
  isTalent: boolean;
  // the codec lets us know how to persist whatever data you need for rerolls
  codec: AccDiffHudPluginCodec<Data, O, I>;

  // these constructors handle creating the initial data for a plugin
  // the presence of these three constructors also indicates what scopes the plugin lives in
  // a "perRoll" plugin applies to all rolls, like weapon seeking
  // a "perTarget" plugin applies individually to every single target
  // a "perUnknownTarget" applies whenever the user opens the roll dialog without a target
  // so every roll has perRoll + exactly one of perTarget and perUnknownTarget
  perRoll?(item?: LancerItem | LancerActor): Data;
  perUnknownTarget?(): Data;
  perTarget?(item: Token): Data;
  // usually you want to implement either perRoll OR both of the other two
  // if you implement perRoll AND either or both of the other two, `rollModifier`
  // will be called twice on the same roll, so watch out for that
}

export type Data<T> = T extends AccDiffHudPlugin<infer D> ? D : never;
