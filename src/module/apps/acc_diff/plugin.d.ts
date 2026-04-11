import type * as t from "io-ts";
import { LancerItem } from "../../item/lancer-item";
import { LancerActor } from "../../actor/lancer-actor";
import type { AccDiffHudData, AccDiffHudTarget } from "./index";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * a codec to serialize it,
// * and a bunch of freestanding constructors

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

declare interface CheckboxUI {
  uiElement: "checkbox";
  slug: string;
  humanLabel: string;
  get uiState(): boolean;
  set uiState(data: boolean);
  get disabled(): boolean;
  get visible(): boolean;
}

declare interface NoUI {
  uiElement: "none";
}

declare interface RollModifier {
  category: "acc" | "diff";
  modifyRoll(roll: string): string;
  get rollPrecedence(): number; // higher numbers happen earlier
}

declare interface Dehydrated {
  // the codec handles all serializable data,
  // but we might want to pick up data from the environment too
  // all perTarget codecs get the target as well
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget): void;
}

export type AccDiffHudCheckboxPluginData = CheckboxUI & RollModifier & Dehydrated;
export type AccDiffHudNoUIPluginData = NoUI & RollModifier & Dehydrated;
export type AccDiffHudPluginData = AccDiffHudCheckboxPluginData | AccDiffHudNoUIPluginData;

export type AccDiffHudPluginCodec<Data extends AccDiffHudPluginData, Out = Data, In = unknown> = t.Type<Data, Out, In>;

declare interface AccDiffHudPlugin<Data extends AccDiffHudPluginData, Out = Data, In = unknown> {
  slug: string;
  category: "acc" | "diff";
  // the codec lets us know how to persist whatever data you need for rerolls
  codec: AccDiffHudPluginCodec<Data, Out, In>;
  // these constructors handle creating the initial data for a plugin
  // the presence of these three constructors also indicates what scopes the plugin lives in
  // a "perRoll" plugin applies to all rolls, like weapon seeking
  // a "perTarget" plugin applies individually to every single target
  // a "perUnknownTarget" applies whenever the user opens the roll dialog without a target
  // so every roll has perRoll + exactly one of perTarget and perUnknownTarget
  perRoll?(item?: LancerItem | LancerActor): Data;
  perUnknownTarget?(): Data;
  perTarget?(item: Token.Implementation): Data;
  // usually you want to implement either perRoll OR both of the other two
  // if you implement perRoll AND either or both of the other two, `rollModifier`
  // will be called twice on the same roll, so watch out for that
}

export type Data<T> = T extends AccDiffHudPlugin<infer D> ? D : never;
