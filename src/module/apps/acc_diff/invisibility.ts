import * as t from "io-ts";
import { LancerActor } from "../../actor/lancer-actor";
import { AccDiffHudPlugin, AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { AccDiffHudData, AccDiffHudTarget } from "./index";
import { enclass } from "./serde";

// you don't need to explicitly type the serialized data,
// but if you do then io-ts codecs can do strong checks at runtime

// so for invisibility: why not persist just a boolean?
// we want to try and capture the intent for the reroll, not just the state
// if the user clicks to force invisible, then clicks it again
// we want to interpret that as changing their mind, instead of forcing _visibility_
export enum InvisibilityEnum {
  ForceVisibility = -1,
  NoForce = 0,
  ForceInvisibility = 1,
}

export default class Invisibility implements AccDiffHudCheckboxPluginData {
  data: InvisibilityEnum;
  token?: Token;

  // these methods are for easy class codecs via `enclass`
  constructor(ser: InvisibilityEnum) {
    this.data = ser;
  }
  get raw(): InvisibilityEnum {
    return this.data;
  }

  // as you may have guessed, the codec just stores the enum
  static get codec(): AccDiffHudPluginCodec<Invisibility, InvisibilityEnum, unknown> {
    return enclass(t.union([t.literal(-1), t.literal(0), t.literal(1)]), Invisibility);
  }

  // store a reference to the current token when rehydrated
  hydrate(_d: AccDiffHudData, t?: AccDiffHudTarget) {
    if (t) {
      this.token = t.target;
    }
  }

  // invisibility operates on the target level, whether we know the target or not
  static perUnknownTarget(): Invisibility {
    return new Invisibility(InvisibilityEnum.NoForce);
  }
  static perTarget(item: Token): Invisibility {
    let ret = Invisibility.perUnknownTarget();
    ret.token = item;
    return ret;
  }

  // assume targets aren't invisible if we don't know about them
  // otherwise, go get the status effects and check them
  private get tokenInvisible(): boolean {
    if (!this.token) {
      return false;
    }
    return !!this.token.actor?.system.statuses.invisible;
  }

  // UI behaviour
  uiElement: "checkbox" = "checkbox";
  slug: string = "invisibility";
  static slug: string = "invisibility";
  humanLabel: string = "Invisible (*)";

  // our uiState is whether we're treating the current target as invisible
  get uiState() {
    if (this.data == InvisibilityEnum.NoForce) {
      return this.tokenInvisible;
    } else {
      return !!(this.data + 1);
    }
  }
  // toggling invisibility to what the token isn't is interpreted as a force
  // toggling invisibility to whatever the token is is interpreted as not wanting to force
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

  // no behaviour here — invisibility can always be seen and toggled
  readonly visible = true;
  readonly disabled = false;

  // the effect to have on the roll
  // 1d2even resolves to either 0 or 1 successes, so multiplying works great
  modifyRoll(roll: string): string {
    if (this.uiState) {
      return `{${roll}} * (1dc[👻 invisibility])`;
    } else {
      return roll;
    }
  }

  readonly rollPrecedence = -9999; // after _everything_
}

// to check whether the static methods match the interface
const _klass: AccDiffHudPlugin<Invisibility> = Invisibility;
