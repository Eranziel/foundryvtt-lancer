import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { LancerToken } from "../../../token";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";

export default class Vanguard_1 implements AccDiffHudCheckboxPluginData {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Handshake Etiquette", "-");
  slug: string = slugify("Handshake Etiquette", "-");
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Handshake Etiquette (+1)";
  tooltip: string = "Gain +1 Accuracy when using CQB weapons to attack targets within Range 3.";

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
  static get codec(): AccDiffHudPluginCodec<Vanguard_1, unknown, unknown> {
    return enclass(this.schemaCodec, Vanguard_1);
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
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.handshake(data, target);
    this.visible = true;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Vanguard_1 {
    let ret = new Vanguard_1();
    return ret;
  }

  //The unique logic of the talent
  handshake(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    // Talent only applies to CQB
    if (data.weapon.weaponType !== WeaponType.CQB) return false;

    const range = 3;
    let areTargetsNearby = data
      .lancerActor!.getActiveTokens()[0]
      .areTargetsInRange(range, (o: QuadtreeObject<LancerToken>, distance: number) => {
        //If not the target, invalid
        if (o.t !== target?.target) return false;

        //If not in range, invalid
        if (distance > range) return false;

        return true;
      });
    return areTargetsNearby;
  }
}
