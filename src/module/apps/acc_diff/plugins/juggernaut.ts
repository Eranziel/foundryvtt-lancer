import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { isTech } from "../../../util/misc";

//Manual Checkbox
//A lot of common talent boilerplate is contained in SampleTalent
export default class Juggernaut_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Momentum", "-");
  slug: string = slugify("Momentum", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Momentum";
  quickReference: string = "+1";
  tooltip: string =
    "When you Boost, your next Ram before the start of your next turn gains +1 Accuracy and knocks your target back an additional 2 spaces.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Juggernaut_1, unknown, unknown> {
    return enclass(this.schemaCodec, Juggernaut_1);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Juggernaut_1 {
    let ret = new Juggernaut_1();
    return ret;
  }

  isVisible(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    //This talent does not apply to tech attacks
    if (isTech(data.lancerItem ?? null, data.title)) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
