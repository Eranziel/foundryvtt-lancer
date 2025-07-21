import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { FittingSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { SampleTalent } from "./sampleTalents";

export default class Duelist_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Partisan", "-");
  slug: string = slugify("Partisan", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Partisan";
  quickReference: string = "+1";
  tooltip: string = "Gain +1 Accuracy on the first melee attack you make with a Main Melee weapon on your turn.";

  //AccDiffHudPlugin requirements
  static get codec(): AccDiffHudPluginCodec<Duelist_1, unknown, unknown> {
    return enclass(this.schemaCodec, Duelist_1);
  }

  //perTarget because we have to know where the token is
  static perTarget(item: Token): Duelist_1 {
    let ret = new Duelist_1();
    return ret;
  }

  //The unique logic of the talent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    if (data.weapon.weaponType !== WeaponType.Melee) return false;
    if (data.weapon.mount !== FittingSize.Main) return false;

    const actionsThisTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id)?.actions;
    //I don't think you get a choice of whether to use the talent now or later
    const partisanUsed = actionsThisTurn?.find(action => {
      if (action.weapon.weaponType !== WeaponType.Melee) return false;
      if (action.weapon.mount !== FittingSize.Main) return false;

      return true;
    });
    if (partisanUsed !== undefined) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
