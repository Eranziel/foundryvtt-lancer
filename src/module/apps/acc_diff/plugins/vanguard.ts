import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { LancerToken } from "../../../token";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";

// An important distinction not made clear here
// The gunslinger.ts way of finding if an action triggering this talent happened this turn
// Will not work the same for damage talents.
// AccDiff talents are called before history is appended, Damage talents after
// See nuclearCavalier.ts for example of what I mean

//Automated
//A lot of common talent boilerplate is contained in SampleTalent
export default class Vanguard_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Handshake Etiquette", "-");
  slug: string = slugify("Handshake Etiquette", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Handshake Etiquette";
  quickReference: string = "+1";
  tooltip: string = "Gain +1 Accuracy when using CQB weapons to attack targets within Range 3.";

  //AccDiffHudPlugin requirements
  //the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Vanguard_1, unknown, unknown> {
    return enclass(this.schemaCodec, Vanguard_1);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Vanguard_1 {
    let ret = new Vanguard_1();
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

  //Returns true by default if not defined
  //Defined in SampleTalent
  get visible(): boolean {
    //This talent does not apply to tech attacks
    if (this.data?.base.tech) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
