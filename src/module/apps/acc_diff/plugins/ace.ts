import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { AbstractTalent } from "./abstractTalents";
import { LancerItem } from "../../../item/lancer-item";
import { LancerActor } from "../../../actor/lancer-actor";
import { AccDiffWindowType, HASE } from "../../../enums";
//Automated

//A lot of common talent boilerplate is contained in SampleTalent
export default class Ace_1 extends AbstractTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  static slug: string = slugify("Acrobatics", "-");
  slug: string = slugify("Acrobatics", "-");
  static kind: "hase" | "attack" = "hase";
  kind: "hase" | "attack" = "hase";
  lid: string = "t_ace";
  talentRank: number = 1;
  humanLabel: string = "Acrobatics";
  quickReference: string = "+1";
  tooltip: string = "While flying, you make all Agility checks and saves with +1 Accuracy.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Ace_1, unknown, unknown> {
    return enclass(this.schemaCodec, Ace_1);
  }

  static perRoll(item?: LancerItem | LancerActor): Ace_1 {
    let ret = new Ace_1();
    return ret;
  }

  isVisible(data: AccDiffHudData): boolean {
    return data.windowType === AccDiffWindowType.Agility;
  }
  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (!data.lancerActor?.system.statuses.flying) return;

    this.active = true;
  }

  //RollModifier Requirements
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
