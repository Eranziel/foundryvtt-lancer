import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudData, DamageHudTarget } from "..";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { AbstractTalent } from "./abstractTalent";
import { LancerActor } from "../../../actor/lancer-actor";
import { LancerItem } from "../../../item/lancer-item";

//Automated
export default class Brutal_1 extends AbstractTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Predator", "-");
  slug: string = slugify("Predator", "-");
  lid: string = "t_brutal";
  talentRank: number = 1;
  humanLabel: string = "Predator";
  quickReference: string = "*";
  tooltip: string =
    "When you roll a 20 on a die for any attack (sometimes called a ‘natural 20’) and critical hit, you deal the maximum possible damage and bonus damage.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Brutal_1, unknown, unknown> {
    return enclass(this.schemaCodec, Brutal_1);
  }

  //RollModifier requirements
  modifyRoll(roll: string): string {
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

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  // static perUnknownTarget(): Brutal_1 {
  //   let ret = new Brutal_1();
  //   return ret;
  // }

  static perRoll(item?: LancerItem | LancerActor): Brutal_1 {
    let ret = new Brutal_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget) {
    if (target?.hitResult.base !== "20") return;

    this.active = true;
  }
}

//Brutal_1 is in acc_diff
