import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { LancerToken } from "../../../token";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";

export default class Brawler_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Hold and Lock", "-");
  slug: string = slugify("Hold and Lock", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Hold and Lock";
  quickReference: string = "+1";
  tooltip: string = "You gain +1 Accuracy on all melee attacks against targets YOU are Grappling.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Brawler_1, unknown, unknown> {
    return enclass(this.schemaCodec, Brawler_1);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Brawler_1 {
    let ret = new Brawler_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    // Talent only applies to grappled targets.
    // A brawler targeting somebody that isn't grappled by themselves still benefits.
    // Not aware of how it can be avoided, short of detecting other tokens nearby and
    // then not enabling the option by default. (or something elaborate)
    if (!target?.target.actor?.system.statuses.grappled) return false;

    if (data.weapon.weaponType !== WeaponType.Melee) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
