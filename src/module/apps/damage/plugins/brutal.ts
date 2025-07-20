import * as t from "io-ts";
// import { enclass } from "../serde";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "..";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { dice } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/_module.mjs";
import { DamageHudHitResult } from "../data";
import { DamageData } from "../../../models/bits/damage";
import { SampleTalent } from "./sampleTalent";

export default class Brutal_1 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Predator", "-");
  slug: string = slugify("Predator", "-");
  humanLabel: string = "Predator (*)";
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
  concatDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    return damages;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  // static perUnknownTarget(): Brutal_1 {
  //   let ret = new Brutal_1();
  //   return ret;
  // }

  static perTarget(item: Token): Brutal_1 {
    let ret = new Brutal_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget): boolean {
    if (target?.hitResult.base !== "20") return false;

    return true;
  }
}
