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
  //These need to be initialized by the extending plugin
  slug: string = "i-was-not-initialized";
  lid: string = "i_was_not_initialized";
  talentRank: number = 0;

  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";

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
  rollPrecedence = 0; // higher numbers happen earlier

  get uiState(): boolean {
    return this.accBonus !== 0;
  }
  set uiState(data: boolean) {
    this.active = data;
    console.log("BEING SET, active = " + this.active);
    document.dispatchEvent(new Event("pluginUpdate"));
  }
  // this talent is only visible when the owner has talent
  visible = false;
  disabled = false;

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (this.slug === "i-was-not-initialized" || this.lid === "i_was_not_initialized" || this.talentRank == 0) {
      console.error(`${LANCER.log_prefix} slug/lid/talentRank were not initialized from AbstractTalent`);
    }

    //Property 'talents' does not exist on type 'AutomationOptions'
    //It does tho ?
    //If the setting is off, do not proceed
    const talentsActive = game.settings.get(game.system.id, LANCER.setting_automation).talents;
    if (!talentsActive) return;

    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.lid, this.talentRank)) return;

    this.visible = this.isVisible(data);
    this.data = data;

    //Figure out whether we are in a situation the talent applies
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
  //Certain conditions may prevent talent from appearing, like wrong windowType
  isVisible(data: AccDiffHudData): boolean {
    return true;
  }

  //RollModifier Requirements
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
  //These need to be initialized by the extending plugin
  slug: string = "i-was-not-initialized";
  lid: string = "i_was_not_initialized";
  talentRank: number = 0;
  //Not actually used, should probably change plugin.d.ts
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";

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
  rollPrecedence = 0; // higher numbers happen earlier

  //Dehydrated requirements
  hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (this.slug === "i-was-not-initialized" || this.lid === "i_was_not_initialized" || this.talentRank == 0) {
      console.error(`${LANCER.log_prefix} slug/lid/talentRank were not initialized from AbstractCardReminder`);
    }

    //Property 'talents' does not exist on type 'AutomationOptions'
    //It does tho ?
    //If the setting is off, do not proceed
    const talentsActive = game.settings.get(game.system.id, LANCER.setting_automation).talents;
    if (!talentsActive) return;

    // Check if actor has talent
    if (!isTalentAvailable(data.lancerActor, this.lid, this.talentRank)) return;

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
