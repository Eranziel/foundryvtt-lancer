import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { isTalentAvailable } from "../../../util/misc";
import { LANCER } from "../../../config";

//See ./vanguard.ts and this file for an example of how to implement a new talent
export class AbstractTalent {
  //Plugin state
  active: boolean = false;
  reminderActive: boolean = false;
  data?: AccDiffHudData;

  //AccDiffHudPlugin requirements
  //There is most likely a way to do this in TS. If you know, tell me so I can do it right
  //@ts-expect-error pinkie promise we will init it
  slug: string;
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  static isTalent: true;

  static get schema() {
    return {
      active: t.boolean,
      reminderActive: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  get raw() {
    return {
      active: this.active,
      reminderActive: this.reminderActive,
    };
  }

  //CheckboxUI requirements
  uiElement: "checkbox" = "checkbox";
  //Doesn't matter as of time of writing I don't think
  rollPrecedence = 0; // higher numbers happen earlier

  get uiState(): boolean {
    return this.accBonus !== 0;
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
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    //Property 'talents' does not exist on type 'AutomationOptions'
    //It does tho ?
    //If the setting is off, do not proceed
    const talentsActive = game.settings.get(game.system.id, LANCER.setting_automation).talents;
    if (!talentsActive) return;

    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a situation the talent applies
    console.log(`${LANCER.log_prefix} ${this.slug} is hydrated`);

    this.data = data;

    if (this.visible) {
      this.talent(data, target);
    }
    this.reminderActive = this.talentReminder(data, target);
  }

  //Unless it's defined, we never assume talent is on
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    this.active = false;
  }
  talentReminder(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return false;
  }

  //RollModifier
  get accBonus(): number {
    return 0;
  }
}

// See hunter.ts for an example implementation
export class AbstractCardReminder {
  //Plugin state
  active: boolean = false;
  reminderActive: boolean = false;
  data?: AccDiffHudData;

  //AccDiffHudPlugin requirements
  //There is most likely a way to do this in TS. If you know, tell me so I can do it right
  //@ts-expect-error pinkie promise we will init it
  slug: string;
  //Not actually used, should probably change plugin.d.ts
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  static isTalent: true;

  static get schema() {
    return {
      active: t.boolean,
      reminderActive: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  get raw() {
    return {
      active: this.active,
      reminderActive: this.reminderActive,
    };
  }

  //NoUI requirement
  uiElement: "none" = "none";

  //RollModifier requirements
  readonly accBonus = 0;
  //Doesn't matter as of time of writing I don't think
  rollPrecedence = 0; // higher numbers happen earlier

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    //Property 'talents' does not exist on type 'AutomationOptions'
    //It does tho ?
    //If the setting is off, do not proceed
    const talentsActive = game.settings.get(game.system.id, LANCER.setting_automation).talents;
    if (!talentsActive) return;

    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    console.log(`${LANCER.log_prefix} ${this.slug} is hydrated`);
    //Figure out whether we are in a situation the talent applies
    this.talent(data, target);
    this.reminderActive = this.talentReminder(data, target);
    this.data = data;
  }

  //Unless it's defined, we never assume talent is on
  talent(data: AccDiffHudData, target?: AccDiffHudTarget) {
    this.active = false;
  }
  talentReminder(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return false;
  }
}
