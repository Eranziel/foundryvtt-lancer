import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageType } from "../../../enums";
import { AbstractTalent } from "./abstractTalent";
import { DamageHudData, TotalDamage } from "../data";
import { LancerActor } from "../../../actor/lancer-actor";
import { LancerItem } from "../../../item/lancer-item";

//Manual checkbox
export default class Juggernaut_2 extends AbstractTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Kinetic Mass Transfer", "-");
  slug: string = slugify("Kinetic Mass Transfer", "-");
  lid: string = "t_juggernaut";
  talentRank: number = 2;
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
  static perRoll(item?: LancerItem | LancerActor): Juggernaut_2 {
    let ret = new Juggernaut_2();
    return ret;
  }

  modifyDamages(damages: TotalDamage): TotalDamage {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonusDamage.slice();

    damageSlice.push({ type: DamageType.Kinetic, val: "1d6" });
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
