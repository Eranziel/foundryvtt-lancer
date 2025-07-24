import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";
import { LancerItem } from "../../../item/lancer-item";
import { LancerActor } from "../../../actor/lancer-actor";
import { getHistory } from "../../../util/misc";

//Automated
//A lot of common talent boilerplate is contained in SampleTalent
export class CombinedArms_2 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //AccDiffHudPlugin requirements
  static slug: string = slugify("CQB-Trained", "-");
  slug: string = slugify("CQB-Trained", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "CQB-Trained";
  quickReference: string = "*";
  tooltip: string = "You don’t gain Difficulty from being Engaged.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<CombinedArms_2, unknown, unknown> {
    return enclass(this.schemaCodec, CombinedArms_2);
  }

  //perTarget because we have to know where the token is
  static perRoll(item?: LancerItem | LancerActor): CombinedArms_2 {
    let ret = new CombinedArms_2();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    if (!data.weapon.engaged && !data.lancerActor?.system.statuses.engaged) return false;
    if (data.weapon.weaponType === WeaponType.Melee) return false;
    return true;
  }

  get visible(): boolean {
    //This talent does not apply to tech attacks
    if (this.data?.base.tech) return false;

    return true;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    //How to mimic not gaining difficulty from Engaged?
    //Just add 1 Accuracy, duh
    if (this.active) {
      return this.data?.weapon.engaged ? 1 : 0;
    }
    return 0;
  }
}

function findLastHitWeaponType(actorId: string | null): WeaponType | undefined {
  const history = getHistory();
  if (history === undefined) return undefined;

  //Getting all actions is kind of a waste
  const actions = history
    .getAllActions(actorId)
    .filter(action => {
      for (const hit_result of action.hit_results) {
        if (hit_result.hit) return true;
      }
    })
    .reverse();
  for (const action of actions) {
    if (action.weapon.weaponType !== null) return action.weapon.weaponType;
  }
  return;
}

//Automated
//A lot of common talent boilerplate is contained in SampleTalent
export class CombinedArms_3 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Storm of Violence", "-");
  slug: string = slugify("Storm of Violence", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Storm of Violence";
  quickReference: string = "+1";
  tooltip: string =
    "Whenever you hit a character with a melee attack, you gain +1 Accuracy on your next ranged attack against them; and, whenever you hit a character with a ranged attack, you gain +1 Accuracy on your next melee attack against them. This effect doesn’t stack.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<CombinedArms_3, unknown, unknown> {
    return enclass(this.schemaCodec, CombinedArms_3);
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): CombinedArms_3 {
    let ret = new CombinedArms_3();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    const currentType = data.weapon.weaponType;
    if (currentType === null) return false;

    if (data.lancerActor?.id === undefined) return false;

    const lastWeaponType = findLastHitWeaponType(data.lancerActor.id);
    if (lastWeaponType === undefined) return false;
    if (lastWeaponType === currentType) return false;

    return true;
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
