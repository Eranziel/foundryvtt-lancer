import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";

//Automated
//A lot of common talent boilerplate is contained in SampleTalent
export default class Pankrati_1 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Veni", "-");
  slug: string = slugify("Veni", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Veni";
  quickReference: string = "+1";
  tooltip: string = "You gain +1 Accuracy to melee attacks against Immobilized or Slowed targets.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Pankrati_1, unknown, unknown> {
    return enclass(this.schemaCodec, Pankrati_1);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Pankrati_1 {
    let ret = new Pankrati_1();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    if (data.weapon.weaponType !== WeaponType.Melee) return false;

    const statuses = target?.target.actor?.system.statuses;

    if (statuses === undefined) return false;
    //slow is different from slowed??
    //@ts-expect-error from console.log I can tell slow is there, works for now
    if (statuses.immobilized || statuses.slowed || statuses.slow) return true; //We return here <-----

    return false;
  }

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
