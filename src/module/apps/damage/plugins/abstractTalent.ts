import * as t from "io-ts";
import { DamageHudData, DamageHudTarget } from "../data";
import { isTalentAvailable } from "../../../util/misc";
import { LANCER } from "../../../config";

//See ./src/module/apps/acc_diff/plugins/vanguard.ts and this file for an example of how to implement a new talent
export class AbstractTalent {
  //Plugin state
  active: boolean = false;
  data?: DamageHudData;

  //AccDiffHudPlugin requirements
  //There is most likely a way to do this in TS. If you know, tell me so I can do it right
  //@ts-expect-error pinkie promise we will init it
  slug: string;
  //@ts-expect-error pinkie promise we will init it
  lid: string;
  //@ts-expect-error pinkie promise we will init it
  talentRank: number;
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  static kind: "damage" = "damage";
  kind: "damage" = "damage";

  static get schema() {
    return {
      active: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
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
  get visible() {
    //Default to true because it should make it easier to catch related bugs
    return true;
  }
  disabled = false;

  //Dehydrated requirements
  hydrate(data: DamageHudData, target?: DamageHudTarget) {
    //Property 'talents' does not exist on type 'AutomationOptions'
    //It does tho ?
    //If the setting is off, do not proceed
    const talentsActive = game.settings.get(game.system.id, LANCER.setting_automation).talents;
    if (!talentsActive) return;

    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.lid, this.talentRank)) return;

    this.data = data;

    console.log(`${LANCER.log_prefix} ${this.slug} is hydrated`);
    //Figure out whether we are in a situation where this talent is visible and then if we should start active
    if (this.visible) {
      this.talent(data, target);
    }
  }

  //If it's not initialized, set this.active to false
  talent(data: DamageHudData, target?: DamageHudTarget) {
    this.active = false;
  }
}
