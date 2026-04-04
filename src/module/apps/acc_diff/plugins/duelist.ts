import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { AccDiffWindowType, WeaponSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { AbstractTalent } from "./abstractTalents";

//Automated
export default class Duelist_1 extends AbstractTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Partisan", "-");
  slug: string = slugify("Partisan", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  lid: string = "t_duelist";
  talentRank: number = 1;
  humanLabel: string = "Partisan";
  quickReference: string = "+1";
  tooltip: string = "Gain +1 Accuracy on the first melee attack you make with a Main Melee weapon on your turn.";

  //AccDiffHudPlugin requirements
  static get codec(): AccDiffHudPluginCodec<Duelist_1, unknown, unknown> {
    return enclass(this.schemaCodec, Duelist_1);
  }

  //We care about individual targets, so we do both
  static perUnknownTarget(): Duelist_1 {
    let ret = new Duelist_1();
    return ret;
  }
  static perTarget(item: Token): Duelist_1 {
    return Duelist_1.perUnknownTarget();
  }

  isVisible(data: AccDiffHudData): boolean {
    //This talent does not apply to tech attacks
    if (data.windowType === AccDiffWindowType.Tech) return false;

    return true;
  }

  //The unique logic of the talent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (data.targets.length > 0 && !target) return;

    if (data.windowType === AccDiffWindowType.Basic) return;

    if (data.weapon.weaponType !== WeaponType.Melee) return;
    if (data.weapon.mount !== WeaponSize.Main) return;

    const currentTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id);
    if (!currentTurn) return;

    //I don't think you get a choice of whether to use the talent now or later
    const partisanUsed = currentTurn.actions.find(action => {
      if (action.weapon.weaponType !== WeaponType.Melee) return false;
      if (action.weapon.mount !== WeaponSize.Main) return false;

      return true;
    });
    if (partisanUsed !== undefined) return;

    this.active = true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }
}
