import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { LancerToken } from "../../../token";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";
import { LancerItem } from "../../../item/lancer-item";
import { LancerActor } from "../../../actor/lancer-actor";
import { isTalentAvailable } from "../../../util/misc";
import { LANCER } from "../../../config";

//A lot of common talent boilerplate is contained in SampleTalent
export class CombinedArms_2 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //AccDiffHudPlugin requirements
  static slug: string = slugify("CQB-Trained", "-");
  slug: string = slugify("CQB-Trained", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "CQB-Trained (*)";
  tooltip: string = "You don’t gain Difficulty from being Engaged.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<CombinedArms_2, unknown, unknown> {
    return enclass(this.schemaCodec, CombinedArms_2);
  }

  //perTarget because we have to know where the token is
  static perRoll(item?: LancerItem | LancerActor): CombinedArms_2 {
    let ret = new CombinedArms_2();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    if (!data.weapon.engaged && !data.lancerActor?.system.statuses.engaged) return false;
    if (data.weapon.weaponType === WeaponType.Melee) return false;
    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    //How to mimic not gaining difficulty from Engaged?
    //Just add 1 Accuracy, duh
    if (this.active) {
      return this.acc_diff?.weapon.engaged ? 1 : 0;
    }
    return 0;
  }
}

//A lot of common talent boilerplate is contained in SampleTalent
export class CombinedArms_3 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Handshake Etiquette", "-");
  slug: string = slugify("Handshake Etiquette", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Handshake Etiquette (+1)";
  tooltip: string = "Gain +1 Accuracy when using CQB weapons to attack targets within Range 3.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<CombinedArms_3, unknown, unknown> {
    return enclass(this.schemaCodec, CombinedArms_3);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): CombinedArms_3 {
    let ret = new CombinedArms_3();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
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

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
