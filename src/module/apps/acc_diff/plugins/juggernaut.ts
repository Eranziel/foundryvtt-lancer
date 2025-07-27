import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { AbstractTalent } from "./abstractTalents";
import { AccDiffWindowType } from "../../../enums";

//Manual Checkbox
//A lot of common talent boilerplate is contained in SampleTalent
export default class Juggernaut_1 extends AbstractTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Momentum", "-");
  slug: string = slugify("Momentum", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  lid: string = "t_juggernaut";
  talentRank: number = 1;
  humanLabel: string = "Momentum";
  quickReference: string = "+1";
  tooltip: string =
    "When you Boost, your next Ram before the start of your next turn gains +1 Accuracy and knocks your target back an additional 2 spaces.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Juggernaut_1, unknown, unknown> {
    return enclass(this.schemaCodec, Juggernaut_1);
  }

  //We don't care what the target is, it's manual
  static perUnknownTarget(): Juggernaut_1 {
    let ret = new Juggernaut_1();
    return ret;
  }

  get visible(): boolean {
    //This talent does not apply to tech attacks
    if (this.data?.windowType === AccDiffWindowType.Tech) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
