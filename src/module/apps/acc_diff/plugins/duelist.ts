import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../serde";
import { FittingSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { getHistory, isTalentAvailable } from "../../../util/misc";

export default class Duelist_1 implements AccDiffHudCheckboxPluginData {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Partisan", "-");
  slug: string = slugify("Partisan", "-");
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Partisan (+1)";
  tooltip: string = "Gain +1 Accuracy on the first melee attack you make with a Main Melee weapon on your turn.";

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
  static get codec(): AccDiffHudPluginCodec<Duelist_1, unknown, unknown> {
    return enclass(this.schemaCodec, Duelist_1);
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
    this.active = this.partisan(data, target);
    this.visible = true;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Duelist_1 {
    let ret = new Duelist_1();
    return ret;
  }

  //The unique logic of the talent
  partisan(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (data.weapon.weaponType !== WeaponType.Melee) return false;
    if (data.weapon.mount !== FittingSize.Main) return false;

    const actionsThisTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id)?.actions;
    console.log(actionsThisTurn);
    //I don't think you get a choice of whether to use the talent now or later
    const duelistUsed = actionsThisTurn?.find(action => {
      if (action.weapon.weaponType !== WeaponType.Melee) return false;
      if (action.weapon.mount !== FittingSize.Main) return false;

      return true;
    });
    console.log(duelistUsed);
    if (duelistUsed !== undefined) return false;

    return true;
  }
}
