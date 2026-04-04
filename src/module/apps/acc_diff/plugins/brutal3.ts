import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { AbstractTalent } from "./abstractTalents";
import { getHistory } from "../../../util/misc";
import { HistoryHitResult } from "../../../combat/lancer-combat-history";
//Automated

//Is this laggy?
function getMisses(actorId?: string | null): HistoryHitResult[] {
  if (!actorId) return [];

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
export default class Brutal_3 extends AbstractTalent implements AccDiffHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Relentless", "-");
  slug: string = slugify("Relentless", "-");
  static kind: "hase" | "attack" = "attack";
  kind: "hase" | "attack" = "attack";
  lid: string = "t_brutal";
  talentRank: number = 3;
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

  //We care about individual targets, so we do both
  static perUnknownTarget(): Brutal_3 {
    let ret = new Brutal_3();
    return ret;
  }
  static perTarget(item: Token): Brutal_3 {
    return Brutal_3.perUnknownTarget();
  }

  //The unique logic of the talent
  //Name defined from SampleTalent
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (data.targets.length > 0 && !target) return;

    //We enable the checkbox if there has been at least one miss
    this.active = getMisses(data.lancerActor?.id).length > 0;
  }

  //RollModifier Requirements
  //Modify accuracy
  get accBonus(): number {
    return this.active ? getMisses(this.data?.lancerActor?.id).length : 0;
  }
}
