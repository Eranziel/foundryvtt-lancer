import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTarget } from "../data";
import { isTalentAvailable } from "../../../util/misc";

//See ./vanguard.ts and this file for an example of how to implement a new talent
export class SampleTalent {
  //Plugin state
  active: boolean = false;
  reminderActive: boolean = false;

  //AccDiffHudPlugin requirements
  //There is most likely a way to do this in TS. If you know, tell me so I can do it right
  //@ts-expect-error pinkie promise we will init it
  slug: string;
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";

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
  visible = false;
  disabled = false;

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a situation the talent applies
    console.log(`${this.slug} is hydrated`);
    this.active = this.talent(data, target);
    this.reminderActive = this.talentReminder(data, target);
    this.visible = true;
  }

  //Unless it's defined, we always return false
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return false;
  }
  talentReminder(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return false;
  }
}

// See hunter.ts for an example implementation
export class SampleCardReminder {
  //Plugin state
  active: boolean = false;
  reminderActive: boolean = false;

  //AccDiffHudPlugin requirements
  //There is most likely a way to do this in TS. If you know, tell me so I can do it right
  //@ts-expect-error pinkie promise we will init it
  slug: string;
  //Not actually used, should probably change plugin.d.ts
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";

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

  //NoUI requirement
  uiElement: "none" = "none";

  //RollModifier requirements
  readonly accBonus = 0;
  //Doesn't matter as of time of writing I don't think
  rollPrecedence = 0; // higher numbers happen earlier

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.slug)) return;

    //Figure out whether we are in a situation the talent applies
    this.active = this.talent(data, target);
    this.reminderActive = this.talentReminder(data, target);
  }

  //Unless it's defined, we always return false
  talent(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return true;
  }
  talentReminder(data: AccDiffHudData, target?: AccDiffHudTarget): boolean {
    return false;
  }
}
