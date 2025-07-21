import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { FittingSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { SampleTalent } from "./sampleTalents";

//Automated
export default class Gunslinger_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Opening Argument", "-");
  slug: string = slugify("Opening Argument", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Opening Argument";
  quickReference: string = "+1";
  tooltip: string = "Gain +1 Accuracy on the first attack roll you make with an Auxiliary ranged weapon on your turn.";

  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Gunslinger_1, unknown, unknown> {
    return enclass(this.schemaCodec, Gunslinger_1);
  }

  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Gunslinger_1 {
    let ret = new Gunslinger_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    // Talent only applies to Ranged
    if (data.weapon.weaponType === WeaponType.Melee) return false;
    if (data.weapon.mount !== FittingSize.Auxiliary) return false;

    const actionsThisTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id)?.actions;
    //I don't think you get a choice of whether to use the talent now or later
    const talentUsed = actionsThisTurn?.find(action => {
      if (action.weapon.weaponType === WeaponType.Melee) return false;
      if (action.weapon.mount !== FittingSize.Auxiliary) return false;

      return true;
    });
    if (talentUsed !== undefined) return false;

    return true;
  }
}
