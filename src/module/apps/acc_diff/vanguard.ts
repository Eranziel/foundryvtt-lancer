//Funcs:
//plugin fields
//CheckboxUI fields
//Codec
//perTarget()
// get uiState(): boolean;
// set uiState(data: boolean): this;
// get disabled(): boolean;
// get visible(): boolean;
//hydrate
// category: "acc" | "diff";
// modifyRoll(roll: string): string;
// get rollPrecedence(): number; // higher numbers happen earlier

import * as t from "io-ts";
import { AccDiffHudData, AccDiffHudTalents, AccDiffHudTarget } from "./data";
import { AccDiffHudCheckboxPluginData, AccDiffHudPluginCodec } from "./plugin";
import { enclass } from "./serde";
import { LancerToken } from "../../token";
import { WeaponType } from "../../enums";

export default class Vanguard_1 implements AccDiffHudCheckboxPluginData {
  //Plugin state
  target: AccDiffHudTarget | null = null;
  talents: AccDiffHudTalents | null = null;
  active: boolean = false;

  //Shared type requirements
  static slug: string = "handshake-etiquette";
  slug: string = "handshake-etiquette";
  static category: "acc" | "diff" | "talentWindow" = "talentWindow";
  category: "acc" | "diff" | "talentWindow" = "talentWindow";
  humanLabel: string = "Handshake Etiquette (+1)";

  //AccDiffHudPlugin requirements
  static get schema() {
    return {
      target: t.union([AccDiffHudTarget.codec, t.null]),
      talents: t.union([AccDiffHudTalents.codec, t.null]),
      active: t.boolean,
    };
  }
  static get schemaCodec() {
    return t.type(this.schema);
  }
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): AccDiffHudPluginCodec<Vanguard_1, unknown, unknown> {
    return enclass(this.schemaCodec, Vanguard_1);
  }
  get raw() {
    return {
      target: this.target,
      talents: this.talents,
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
  //this talent is always visible but disabled unless conditions are satisfied
  readonly visible = true;
  disabled = true;

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
    this.talents = data.talents;
    this.target = target || null;

    //Figure out whether we are in a Handshake Etiquette situation
    this.active = this.handshake(data, target);
    this.disabled = !this.active;
  }

  //perTarget because we have to know where the token is
  static perTarget(item: Token): Vanguard_1 {
    let ret = new Vanguard_1();
    return ret;
  }

  //The unique logic of the talent
  handshake(data: AccDiffHudData, target?: AccDiffHudTarget) {
    if (data.weapon.weaponType !== WeaponType.CQB) {
      return false;
    }

    // only players can benefit from talent
    if (!data.lancerActor!.is_mech()) {
      return false;
    }

    let token: LancerToken = data.lancerActor!.getActiveTokens()[0];

    // Rough bounding box in which the hexes/squares will be searched
    const aabb = new PIXI.Rectangle(
      token.bounds.x - 2 * canvas.grid!.sizeX,
      token.bounds.y - 2 * canvas.grid!.sizeY,
      token.bounds.height + 4 * canvas.grid!.sizeX,
      token.bounds.width + 4 * canvas.grid!.sizeY
    );

    const inRangeTargets: Set<LancerToken> = canvas.tokens!.quadtree!.getObjects(aabb, {
      // @ts-expect-error Quadtree not set specific enough in types
      collisionTest: (o: QuadtreeObject<LancerToken>) => {
        //Ignore non-target tokens
        if (o.t !== target?.target) return false;

        //Not sure if the 0.1 is necessary?
        const range = 3 + 0.1;
        return o.t.document.computeRange(token.document) <= range;
      },
    }) as any;
    return inRangeTargets.size >= 1;
  }
}
