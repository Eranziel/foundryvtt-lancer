import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { SampleTalent } from "./sampleTalent";
import { DamageHudData, DamageHudTarget } from "../data";
import { isTech } from "../../../util/misc";

//Manual checkbox
export default class Juggernaut_2 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Kinetic Mass Transfer", "-");
  slug: string = slugify("Kinetic Mass Transfer", "-");
  humanLabel: string = "Kinetic Mass Transfer";
  quickReference: string = "1d6";
  tooltip: string =
    "1/round, if you Ram a target into an obstruction large enough to stop their movement, your target takes 1d6 kinetic damage.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Juggernaut_2, unknown, unknown> {
    return enclass(this.schemaCodec, Juggernaut_2);
  }

  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Juggernaut_2 {
    let ret = new Juggernaut_2();
    return ret;
  }

  modifyDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonus_damage.slice();

    damageSlice.push({ type: DamageType.Kinetic, val: "1d6" });
    return {
      damage: damageSlice,
      bonus_damage: bonusDamageSlice,
    };
  }

  isVisible(data: DamageHudData, target?: DamageHudTarget): boolean {
    //This talent does not apply to tech attacks
    if (isTech(data.lancerItem ?? null, data.title)) return false;

    return true;
  }
}
