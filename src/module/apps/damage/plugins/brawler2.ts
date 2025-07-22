import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { SampleTalent } from "./sampleTalent";
import { DamageHudData, DamageHudTarget } from "../data";
import { isTech } from "../../../util/misc";

//Manual Checkbox
export default class Brawler_2 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Sledgehammer", "-");
  slug: string = slugify("Sledgehammer", "-");
  humanLabel: string = "Sledgehammer";
  quickReference: string = "2d6+2";
  tooltip: string = "Your Improvised Attacks gain Knockback 2 and deal 2d6+2 Kinetic damage.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Brawler_2, unknown, unknown> {
    return enclass(this.schemaCodec, Brawler_2);
  }

  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Brawler_2 {
    let ret = new Brawler_2();
    return ret;
  }

  modifyDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonus_damage.slice();

    damageSlice.push({ type: DamageType.Kinetic, val: "2d6+2" });
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
