import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudNoUIPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { FittingSize, WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleCardReminder, SampleTalent } from "./sampleTalents";
import { getHistory } from "../../../util/misc";
import { TalentEffect } from "../../../flows/interfaces";

// I'm aware that writing the effect after the attack is late.
// I still think this will help users keep track of the talents.
// The GM can also let them backtrack if they forgot.
export default class Hunter_1 extends SampleCardReminder implements AccDiffHudNoUIPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Lunge", "-");
  slug: string = slugify("Lunge", "-");
  get talentEffect(): TalentEffect | undefined {
    if (!this.active) return;
    return {
      title: "Lunge",
      text: "1/round, when you attack with an Auxiliary melee weapon, you may fly up to 3 spaces directly towards the targeted character before the attack. This movement ignores engagement and doesn’t provoke reactions.",
    };
  }

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Hunter_1, unknown, unknown> {
    return enclass(this.schemaCodec, Hunter_1);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Hunter_1 {
    let ret = new Hunter_1();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    // Talent only applies to first Melee Auxillary this turn
    // We won't remind after the first one this turn
    if (data.weapon.weaponType !== WeaponType.Melee) return false;
    if (data.weapon.mount !== FittingSize.Auxiliary) return false;

    const actionsThisTurn = getHistory()?.getCurrentTurn(data.lancerActor?.id)?.actions;
    const talentUsed = actionsThisTurn?.find(action => {
      if (action.weapon.weaponType !== WeaponType.Melee) return false;
      if (action.weapon.mount !== FittingSize.Auxiliary) return false;

      return true;
    });
    if (talentUsed !== undefined) return false;

    return true;
  }
}
