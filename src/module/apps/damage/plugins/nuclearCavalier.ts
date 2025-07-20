import * as t from "io-ts";
// import { enclass } from "../serde";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "../../damage";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { SampleTalent } from "./sampleTalent";

export default class Nuke_1 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Aggressive Heat Bleed", "-");
  slug: string = slugify("Aggressive Heat Bleed", "-");
  humanLabel: string = "Aggressive Heat Bleed (+2)";
  tooltip: string = "The first attack roll you make on your turn while in the Danger Zone deals +2 Heat on a hit.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Nuke_1, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_1);
  }

  concatDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonus_damage.slice();

    damageSlice.push({ type: DamageType.Heat, val: "2" });
    return {
      damage: damageSlice,
      bonus_damage: bonusDamageSlice,
    };
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Nuke_1 {
    let ret = new Nuke_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget): boolean {
    if (!data.lancerActor?.is_mech()) return false;

    const heat = data.lancerActor.system.heat;
    if (!(heat.value >= heat.max / 2)) return false;

    return true;
  }
}
