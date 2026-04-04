import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageType } from "../../../enums";
import { AbstractTalent } from "./abstractTalent";
import { DamageHudData, TotalDamage } from "../data";
import { LancerActor } from "../../../actor/lancer-actor";
import { LancerItem } from "../../../item/lancer-item";

//Manual Checkbox
export default class Brawler_2 extends AbstractTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Sledgehammer", "-");
  slug: string = slugify("Sledgehammer", "-");
  lid: string = "t_brawler";
  talentRank: number = 2;
  humanLabel: string = "Sledgehammer";
  quickReference: string = "2d6+2";
  tooltip: string = "Your Improvised Attacks gain Knockback 2 and deal 2d6+2 Kinetic damage.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Brawler_2, unknown, unknown> {
    return enclass(this.schemaCodec, Brawler_2);
  }

  //Perhaps don't initialize at all if talent not applicable?
  static perRoll(item?: LancerItem | LancerActor): Brawler_2 {
    let ret = new Brawler_2();
    return ret;
  }

  modifyDamages(damages: TotalDamage): TotalDamage {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonusDamage.slice();

    damageSlice.push({ type: DamageType.Kinetic, val: "2d6+2" });
    return {
      damage: damageSlice,
      bonusDamage: bonusDamageSlice,
    };
  }

  isVisible(data: DamageHudData): boolean {
    //This talent does not apply to tech attacks
    if (data.base.tech) return false;

    return true;
  }
}
