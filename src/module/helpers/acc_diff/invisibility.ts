import * as t from 'io-ts';
import { LancerActor, LancerActorType } from "../../actor/lancer-actor";
import { AccDiffPlugin, AccDiffPluginData, AccDiffPluginCodec } from './plugin';
import { AccDiffData, AccDiffTarget } from './index';
import { enclass } from './serde';

// why not just a boolean?
// we want to try and capture the intent for the reroll, not just the state
// if the user clicks to force invisible, then clicks it again
// we want to interpret that as changing their mind, instead of forcing _visibility_
export enum InvisibilityEnum {
  ForceVisibility = -1,
  NoForce = 0,
  ForceInvisibility = 1,
}

export class Invisibility implements AccDiffPluginData {
  data: InvisibilityEnum;
  token?: Token;

  constructor(ser: t.TypeOf<typeof invisibilityCodec>) {
    this.data = ser;
  }
  get raw(): t.TypeOf<typeof invisibilityCodec> {
    return this.data;
  }

  static perUnknownTarget(): Invisibility {
    return new Invisibility(InvisibilityEnum.NoForce);
  }

  static perTarget(item: Token): Invisibility {
    let ret = Invisibility.perUnknownTarget();
    ret.token = item;
    return ret;
  }

  get tokenInvisible(): boolean {
    if (!this.token) { return false; }
    let actor = (this.token.actor as LancerActor<LancerActorType>);
    return !!actor.data.effects.find(eff => eff.data.flags.core.statusId == "invisible");
  }

  uiElement: "checkbox" = "checkbox";
  slug: string = "invisibility";
  static slug: string = "invisibility";
  humanLabel: string = "Invisible (*)";
  // uiState = "treat this target as invisible"
  get uiState() {
    if (this.data == InvisibilityEnum.NoForce) {
      return this.tokenInvisible;
    } else {
      return !!(this.data + 1);
    }
  }
  // setting invisibility to true or false when the token isn't that is interpreted as a force
  // setting invisibility to whatever the token is is interpreted as no force
  set uiState(newState: boolean) {
    let tki = this.tokenInvisible;
    if (tki == newState) {
      this.data = InvisibilityEnum.NoForce;
    } else if (newState) {
      this.data = InvisibilityEnum.ForceInvisibility;
    } else {
      this.data = InvisibilityEnum.ForceVisibility;
    }
  }

  get disabled() { return false; }
  get visible() { return true; }

  modifyRoll(roll: string): string {
    if (this.uiState) {
      return `1d2even[👻] * (${roll})`;
    } else {
      return roll;
    }
  }

  hydrate(_d: AccDiffData, t?: AccDiffTarget) {
    if (t) { this.token = t.target; }
  }

  static get codec() {
    return invisibilityCodec;
  }
}

const _klass: AccDiffPlugin<Invisibility> = Invisibility; // to get type errors

export const invisibilityCodec: AccDiffPluginCodec<Invisibility, InvisibilityEnum, unknown> = enclass(
  t.union([t.literal(-1), t.literal(0), t.literal(1)]),
  Invisibility
)
