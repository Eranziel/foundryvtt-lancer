import * as t from "io-ts";
// import { enclass } from "../serde";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "..";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { dice } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/_module.mjs";
import { DamageHudHitResult } from "../data";

export default class Brutal_1 implements DamageHudCheckboxPluginData {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Predator", "-");
  slug: string = slugify("Predator", "-");
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Predator (*)";
  tooltip: string =
    "When you roll a 20 on a die for any attack (sometimes called a ‘natural 20’) and critical hit, you deal the maximum possible damage and bonus damage.";

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
  static get codec(): DamageHudPluginCodec<Brutal_1, unknown, unknown> {
    return enclass(this.schemaCodec, Brutal_1);
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
    console.log("roll before: " + roll);
    if (!this.active) return roll;

    return roll
      .split(" ")
      .map(str => {
        //toLower just in case
        if (str.toLowerCase().indexOf("d") == -1) return str;

        const diceNum = parseInt(str.split("d")[0]);
        const diceVal = parseInt(str.split("d")[1].split("+")[0]);
        const flatBonus = parseInt(str.split("d")[1].split("+")[1]);
        return (diceNum * diceVal + flatBonus).toString();
      })
      .join(" ");
  }
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }

  //Dehydrated requirements
  hydrate(data: DamageHudData, target?: DamageHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.predator(data, target);
    this.visible = true;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Brutal_1 {
    let ret = new Brutal_1();
    return ret;
  }

  //The unique logic of the talent
  predator(data: DamageHudData, target?: DamageHudTarget) {
    if (target?.hitResult?.base !== "20") return false;

    return true;
  }
}
