import * as t from "io-ts";
import { LancerItem } from "../../item/lancer-item";
import { LancerActor } from "../../actor/lancer-actor";

import type { AccDiffData, AccDiffTarget } from "./index";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * a codec to serialize it,
// * and a bunch of freestanding constructors

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

export interface CheckboxUI {
  uiElement: "checkbox";
  slug: string;
  humanLabel: string;
  get uiState(): boolean;
  set uiState(data: boolean);
  get disabled(): boolean;
  get visible(): boolean;
}

export interface NoUI {
  uiElement: "none";
}

type UIBehaviour = CheckboxUI | NoUI;

export interface RollModifier {
  modifyRoll(roll: string): string;
  get rollPrecedence(): number; // higher numbers happen earlier
}

export interface Dehydrated {
  // the codec handles all serializable data,
  // but we might want to pick up data from the environment too
  // all perTarget codecs get the target as well
  hydrate(data: AccDiffData, target?: AccDiffTarget): void;
}

export type AccDiffPluginData = UIBehaviour & RollModifier & Dehydrated;
export type AccDiffCheckboxPluginData = CheckboxUI & RollModifier & Dehydrated;
export type AccDiffNoUIPluginData = NoUI & RollModifier & Dehydrated;

export type AccDiffPluginCodec<C extends AccDiffPluginData, O, I> = t.Type<C, O, I>;

export interface AccDiffPlugin<Data extends AccDiffPluginData, O, I> {
  slug: string;
  // the codec lets us know how to persist whatever data you need for rerolls
  codec: AccDiffPluginCodec<Data, O, I>;
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

export type Data<T> = T extends AccDiffPlugin<infer D, any, any> ? D : never;
