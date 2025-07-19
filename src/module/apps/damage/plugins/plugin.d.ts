import type * as t from "io-ts";
import { LancerItem } from "../../item/lancer-item";
import { LancerActor } from "../../actor/lancer-actor";

import type { DamageHudData } from "./index";

// Implementing a plugin means implementing
// * a data object that can compute its view behaviour,
// * a codec to serialize it,
// * and a bunch of freestanding constructors

// You don't _have_ to make the data object a class with static methods for the constructors
// but it's convenient

// TODO: move CheckboxUI through RollModifier to a common file
declare interface CheckboxUI {
  uiElement: "checkbox" = "checkbox";
  slug: string;
  humanLabel: string;
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
  modifyRoll(roll: string): string;
  //This has to be non-mutating to avoid recursion
  concatDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  };
  get rollPrecedence(): number; // higher numbers happen earlier
}

declare interface Dehydrated {
  // the codec handles all serializable data,
  // but we might want to pick up data from the environment too
  // all perTarget codecs get the target as well
  hydrate(data: DamageData, target?: DamageTarget);
}

export type DamageHudPluginData = UIBehaviour & RollModifier & Dehydrated;
export type DamageHudCheckboxPluginData = CheckboxUI & RollModifier & Dehydrated;
export type DamageHudNoUIPluginData = NoUI & RollModifier & Dehydrated;

export type DamageHudPluginCodec<C extends DamageHudPluginData, O, I> = Codec<C, O, I>;

declare interface DamageHudPlugin<Data extends DamageHudPluginData> {
  slug: string;
  // the codec lets us know how to persist whatever data you need for rerolls
  codec: DamageHudPluginCodec<Data, O, I>;
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

export type Data<T> = T extends DamageHudPlugin<infer D> ? D : never;

export class SampleTalent {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";

  //AccDiffHudPlugin requirements
  static get schema() {
    return {
      active: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<SampleTalent, unknown, unknown> {
    return enclass(this.schemaCodec, SampleTalent);
  }
  get raw() {
    return {
      active: this.active,
    };
  }

  //CheckboxUI requirements
  uiElement: "checkbox" = "checkbox";
  //Doesn't matter as of time of writing I don't think
  rollPrecedence = 0; // higher numbers happen earlier

  get uiState(): boolean {
    return this.active;
  }
  set uiState(data: boolean) {
    this.active = data;

    console.log("BEING SET, active = " + this.active);
  }
  // this talent is only visible when the owner has talent
  // only enabled if conditions are satisfied
  visible = false;
  disabled = false;

  //RollModifier requirements
  //We do nothing to modify the roll
  modifyRoll(roll: string): string {
    return roll;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): SampleTalent {
    let ret = new SampleTalent();
    return ret;
  }

  //Dehydrated requirements
  hydrate(data: DamageHudData, target?: DamageHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.talent(data, target);
    this.visible = true;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget): boolean;
}
