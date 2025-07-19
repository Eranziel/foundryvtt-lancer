import * as t from "io-ts";
// import { enclass } from "../serde";
import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { isTalentAvailable } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "../../damage";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";

export default class Nuke_1 implements DamageHudCheckboxPluginData {
  //Plugin state
  active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Aggressive Heat Bleed", "-");
  slug: string = slugify("Aggressive Heat Bleed", "-");
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Aggressive Heat Bleed (+2)";
  tooltip: string = "The first attack roll you make on your turn while in the Danger Zone deals +2 Heat on a hit.";

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
  static get codec(): DamageHudPluginCodec<Nuke_1, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_1);
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
  concatDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonus_damage.slice();

    damageSlice.push({ type: DamageType.Heat, val: "2" });
    return {
      damage: damageSlice,
      bonus_damage: bonusDamageSlice,
    };
  }

  //Dehydrated requirements
  hydrate(data: DamageHudData, target?: DamageHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.heatbleed(data, target);
    this.visible = true;
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Nuke_1 {
    let ret = new Nuke_1();
    return ret;
  }
  // static perTarget(item: Token): Nuke_1 {
  //   let ret = Nuke_1.perUnknownTarget();
  //   return ret;
  // }

  //The unique logic of the talent
  heatbleed(data: DamageHudData, target?: DamageHudTarget): boolean {
    if (!data.lancerActor?.is_mech()) return false;

    const heat = data.lancerActor.system.heat;
    if (!(heat.value >= heat.max / 2)) return false;

    return true;
  }
}
