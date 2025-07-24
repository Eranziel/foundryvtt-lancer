import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { SampleTalent } from "./sampleTalents";
import { LancerActor } from "../../../actor/lancer-actor";
import { LancerItem } from "../../../item/lancer-item";
import { getHistory } from "../../../util/misc";
import { HistoryHitResult } from "../../../combat/lancer-combat-history";
//Automated

//Is this laggy?
function getMisses(actorId?: string | null): HistoryHitResult[] {
  if (actorId === undefined) return [];

  const actions = getHistory()?.getAllActions(actorId) ?? [];

  let misses = [];
  for (const action of actions.reverse()) {
    for (const result of action.hit_results.reverse()) {
      if (result.hit) return misses;
      misses.push(result);
    }
  }

  return misses;
}

//A lot of common talent boilerplate is contained in SampleTalent
export default class Brutal_3 extends SampleTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Relentless", "-");
  slug: string = slugify("Relentless", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  humanLabel: string = "Relentless";
  get quickReference(): string {
    return "+" + this.accBonus;
  }
  tooltip: string =
    "When you make an attack roll and miss, your next attack roll gains +1 Accuracy. This effect stacks and persists until you hit.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Brutal_3, unknown, unknown> {
    return enclass(this.schemaCodec, Brutal_3);
  }

  //Perhaps don't initialize at all if talent not applicable?
  static perRoll(item?: LancerItem | LancerActor): Brutal_3 {
    let ret = new Brutal_3();
    return ret;
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    //We enable the checkbox if there has been at least one miss
    return getMisses(data.lancerActor?.id).length > 0;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? getMisses(this.data?.lancerActor?.id).length : 0;
  }
}
