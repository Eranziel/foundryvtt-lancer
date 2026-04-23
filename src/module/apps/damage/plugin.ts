import { LancerItem } from "../../item/lancer-item";
import { LancerActor } from "../../actor/lancer-actor";

import type { DamageHudData, DamageHudTarget } from "./data.svelte";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * and a bunch of freestanding constructors

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

// TODO: move CheckboxUI through RollModifier to a common file
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

type UIBehaviour = CheckboxUI | NoUI;

declare interface RollModifier {
  modifyRoll(roll: string): string;
  get rollPrecedence(): number; // higher numbers happen earlier
  hydrate(data: DamageHudData, target?: DamageHudTarget): void;
}

export type DamageHudPluginData = UIBehaviour & RollModifier;
export type DamageHudCheckboxPluginData = CheckboxUI & RollModifier;
export type DamageHudNoUIPluginData = NoUI & RollModifier;

export interface DamageHudPlugin<Data extends DamageHudPluginData> {
  slug: string;
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

export type Data<T> = T extends DamageHudPlugin<infer D> ? D : never;
