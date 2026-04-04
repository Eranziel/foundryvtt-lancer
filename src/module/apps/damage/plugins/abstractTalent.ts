import * as t from "io-ts";
import { DamageHudData, DamageHudTarget } from "../data";
import { isTalentAvailable } from "../../../util/misc";
import { LANCER } from "../../../config";

//See ./src/module/apps/acc_diff/plugins/vanguard.ts and this file for an example of how to implement a new talent
export class AbstractTalent {
  //Plugin state
  active: boolean = false;
  manuallySet: boolean = false;
  data?: DamageHudData;

  //AccDiffHudPlugin requirements
  //These need to be initialized by the extending plugin
  slug: string = "i-was-not-initialized";
  lid: string = "i_was_not_initialized";
  talentRank: number = 0;

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
    this.manuallySet = true;
  }
  // this talent is only visible when the owner has talent
  visible = false;
  disabled = false;

  //Dehydrated requirements
  hydrate(data: DamageHudData, target?: DamageHudTarget) {
    //This might be called after the window initially pops up
    //We need to check for that and not set it to anything again
    //Would not be needed with a better way
    if (this.manuallySet) return;

    //Check if talent did not init the stuff it needed to init
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

    //Figure out whether we are in a situation where this talent is visible and then if we should start active
    if (this.visible) {
      this.talent(data, target);
    }
  }

  //If it's not initialized, set this.active to false
  talent(data: DamageHudData, target?: DamageHudTarget) {
    this.active = false;
  }
  //Certain conditions may prevent talent from appearing, like wrong windowType
  isVisible(data: DamageHudData): boolean {
    return true;
  }
}
