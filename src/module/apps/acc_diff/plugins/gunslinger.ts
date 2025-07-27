import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { AccDiffWindowType, FittingSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { AbstractTalent } from "./abstractTalents";

//Automated
export default class Gunslinger_1 extends AbstractTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Opening Argument", "-");
  slug: string = slugify("Opening Argument", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  lid: string = "t_gunslinger";
  talentRank: number = 1;
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

  //We care about individual targets, so we do both
  static perUnknownTarget(): Gunslinger_1 {
    let ret = new Gunslinger_1();
    return ret;
  }
  static perTarget(item: Token): Gunslinger_1 {
    return Gunslinger_1.perUnknownTarget();
  }

  //The unique logic of the talent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (data.targets.length > 0 && target === undefined) return;

    if (data.windowType === AccDiffWindowType.Basic) return;

    // Talent only applies to Ranged
    if (data.weapon.weaponType === WeaponType.Melee) return;
    if (data.weapon.mount !== FittingSize.Auxiliary) return;

    const actionsThisTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id)?.actions;
    //I don't think you get a choice of whether to use the talent now or later
    const talentUsed = actionsThisTurn?.find(action => {
      if (action.weapon.weaponType === WeaponType.Melee) return false;
      if (action.weapon.mount !== FittingSize.Auxiliary) return false;

      return true;
    });
    if (talentUsed !== undefined) return;

    this.active = true;
  }

  get visible(): boolean {
    //This talent does not apply to tech attacks
    if (this.data?.windowType === AccDiffWindowType.Tech) return false;

    return true;
  }
}
