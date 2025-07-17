import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "../serde";
import { LancerToken } from "../../../token";
import { WeaponType } from "../../../enums";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";
import { LancerCombatant } from "../../../combat/lancer-combat";

export default class Brawler_1 implements AccDiffHudCheckboxPluginData {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  //Alternatively could use lid and rank_num
  static slug: string = slugify("Hold and Lock", "-");
  slug: string = slugify("Hold and Lock", "-");
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Hold and Lock (+1)";
  tooltip: string = "You gain +1 Accuracy on all melee attacks against targets YOU are Grappling.";

  //AccDiffHudPlugin requirements
  static get schema() {
    return {
      active: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Brawler_1, unknown, unknown> {
    return enclass(this.schemaCodec, Brawler_1);
  }
  get raw() {
    return {
      active: this.active,
    };
  }

  //CheckboxUI requirements
  uiElement: "checkbox" = "checkbox";
  //Doesn't matter as of time of writing I don't think
  rollPrecedence = 0; // higher numbers happen earlier

  get uiState(): boolean {
    return this.active;
  }
  set uiState(data: boolean) {
    this.active = data;
    console.log("BEING SET, active = " + this.active);
  }
  // this talent is only visible when the owner has talent
  // only enabled if conditions are satisfied
  visible = false;
  disabled = false;

  //RollModifier requirements
  //We do nothing to modify the roll
  modifyRoll(roll: string): string {
    return roll;
  }
  //Modify accuracy
  get accBonus(): number {
    return this.active ? 1 : 0;
  }

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.holdAndLock(data, target);
    this.visible = true;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perTarget(item: Token): Brawler_1 {
    console.log(item.combatant?.combat);
    // console.log(item.combatant?.combat?.getFlag(game.system.id, "history"));
    // console.log(foundry.utils.getProperty(item.actor?.getRollData() ?? {}, "history"));

    let ret = new Brawler_1();
    return ret;
  }

  //The unique logic of the talent
  holdAndLock(data: AccDiffHudData, target?: AccDiffHudTarget) {
    // Talent only applies to grappled targets
    // A brawler targeting somebody that isn't grappled by themselves still benefits.
    // Not aware of how it can be avoided, short of detecting other tokens nearby and
    // then not enabling the option by default. (or something elaborate)
    if (!target?.target.actor?.system.statuses.grappled) return false;

    if (data.weapon.weaponType !== WeaponType.Melee) return false;

    return true;
  }
}
