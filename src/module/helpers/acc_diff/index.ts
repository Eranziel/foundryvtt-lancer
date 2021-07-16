import { TagInstance } from "machine-mind";
import * as t from 'io-ts';

import { LancerActor, LancerActorType } from "../../actor/lancer-actor";
import ReactiveForm from '../reactive-form';
import { enclass, encode, decode } from './serde';


enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2
}
let coverSchema = t.union([t.literal(0), t.literal(1), t.literal(2)]);

// so normally you wouldn't keep the codecs with the classes like this
// the entire point of io-ts is that the co/dec logic is separable
// but here we want plugins to actually modify the codecs, so, sigh
class AccDiffWeapon {
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;

  static schema = {
    accurate: t.boolean,
    inaccurate: t.boolean,
    seeking: t.boolean,
  }

  static get schemaCodec() { return t.type(this.schema); }
  static get codec() { return enclass(this.schemaCodec, AccDiffWeapon) }

  constructor(obj: t.TypeOf<typeof AccDiffWeapon.schemaCodec>) {
    this.accurate = obj.accurate;
    this.inaccurate = obj.inaccurate;
    this.seeking = obj.seeking;
  }

  get raw() {
    return { accurate: this.accurate, inaccurate: this.inaccurate, seeking: this.seeking }
  }

  hydrate(_d: void) { }
}

class AccDiffBase {
  accuracy: number;
  difficulty: number;
  cover: Cover;
  #weapon!: AccDiffWeapon; // never use this class before calling hydrate

  static schema = {
    accuracy: t.number,
    difficulty: t.number,
    cover: coverSchema,
  }
  static get schemaCodec() { return t.type(this.schema); }
  static get codec() { return enclass(this.schemaCodec, AccDiffBase) }

  constructor(obj: t.TypeOf<typeof AccDiffBase.schemaCodec>) {
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
    // this.#weapon = weapon;
  }

  get raw() {
    return { accuracy: this.accuracy, difficulty: this.difficulty, cover: this.cover }
  }

  hydrate(weapon: AccDiffWeapon) {
    this.#weapon = weapon;
  }

  get total() {
    return this.accuracy - this.difficulty
      + (this.#weapon.accurate ? 1 : 0)
      - (this.#weapon.inaccurate ? 1 : 0)
      - (this.#weapon.seeking ? 0 : this.cover)
  }
}

// we _want_ to extend AccDiffBase
// but ... typescript checks type compatibility between _static_ methods
// and that + io-ts I think has the variance wrong
// so if you extend AccDiffBase it's trying to assign AccDiffBase to AccDiffTarget
class AccDiffTarget {
  target: Token;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  consumeLockOn: boolean;
  #weapon!: AccDiffWeapon; // never use this class before calling hydrate
  #base!: AccDiffBase; // never use this class before calling hydrate

  static schema = {
    target_id: t.string,
    accuracy: t.number,
    difficulty: t.number,
    cover: coverSchema,
    consumeLockOn: t.boolean,
  }

  static get schemaCodec() { return t.type(this.schema); }
  static get codec() { return enclass(this.schemaCodec, AccDiffTarget) }

  constructor(obj: t.TypeOf<typeof AccDiffTarget.schemaCodec>) {
    let target = canvas.scene.tokens.get(obj.target_id);
    if (!target) {
      ui.notifications.error("Trying to access tokens from a different scene!");
      throw new Error("Token not found");
    }

    this.target = target.object;
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
    this.consumeLockOn = obj.consumeLockOn;
    // this.#weapon = weapon;
    // this.#base = base;
  }

  get raw() {
    return {
      target_id: this.target.id,
      accuracy: this.accuracy,
      difficulty: this.difficulty,
      cover: this.cover,
      consumeLockOn: this.consumeLockOn
    }
  }

  hydrate(weapon: AccDiffWeapon, base: AccDiffBase) {
    this.#weapon = weapon;
    this.#base = base;
  }

  // as it turns out, we can't actually name the ActiveEffect type
  // it's fine, this is all we need here
  get usingLockOn(): null | { delete: () => void } {
    return (this.consumeLockOn && this.lockOnAvailable) || null;
  }

  get lockOnAvailable(): null | { delete: () => void } {
    let actor = (this.target.actor as LancerActor<LancerActorType>);
    return actor.data.effects.find(eff => eff.data.flags.core.statusId == "lockon");
  }

  get total() {
    let base = this.accuracy - this.difficulty
      + (this.#weapon.accurate ? 1 : 0)
      - (this.#weapon.inaccurate ? 1 : 0)
      - (this.#weapon.seeking ? 0 : this.cover);
    // the only thing we actually use base for is the untyped bonuses
    let raw = base + this.#base.accuracy - this.#base.difficulty;
    let lockon = this.usingLockOn ? 1 : 0;

    return raw + lockon;
  }
}

export type AccDiffDataSerialized = t.TypeOf<typeof AccDiffData.schemaCodec>;
export class AccDiffData {
  title: string;
  weapon: AccDiffWeapon;
  base: AccDiffBase;
  targets: AccDiffTarget[];

  static get schema() {
    return {
      title: t.string,
      weapon: AccDiffWeapon.codec,
      base: AccDiffBase.codec,
      targets: t.array(AccDiffTarget.codec)
    }
  }

  static get schemaCodec() { return t.type(this.schema); }
  static get codec() { return enclass(this.schemaCodec, AccDiffData) }

  constructor(obj: t.TypeOf<typeof AccDiffData.schemaCodec>) {
    this.title = obj.title;
    this.weapon = obj.weapon;
    this.base = obj.base;
    this.targets = obj.targets;

    this.weapon.hydrate();
    this.base.hydrate(this.weapon);
    for (let target of this.targets) { target.hydrate(this.weapon, this.base); }
  }

  get raw() {
    return {
      title: this.title,
      weapon: this.weapon,
      base: this.base,
      targets: this.targets,
    }
  }

  static fromObject(obj: t.InputOf<typeof AccDiffData.codec>) {
    return decode(obj, AccDiffData.codec);
  }

  toObject(): t.OutputOf<typeof AccDiffData.codec> {
    return encode(this, AccDiffData.codec);
  }

  static fromParams(
    tags?: TagInstance[],
    title?: string,
    targets?: Token[],
    starting?: [number, number]
  ): AccDiffData {
    let weapon = {
      accurate: false,
      inaccurate: false,
      seeking: false,
    };

    for (let tag of (tags || [])) {
      switch (tag.Tag.LID) {
        case "tg_accurate":
          weapon.accurate = true;
          break;
        case "tg_inaccurate":
          weapon.inaccurate = true;
          break;
        case "tg_seeking":
          weapon.seeking = true;
          break;
      }
    }

    let base = {
      cover: Cover.None,
      accuracy: starting ? starting[0] : 0,
      difficulty: starting ? starting[1] : 0,
    };

    return AccDiffData.fromObject({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      weapon, base,
      targets: (targets || []).map(t => ({
        target_id: t.id,
        accuracy: 0,
        difficulty: 0,
        cover: Cover.None,
        consumeLockOn: true,
      }))
    });
  }
}

type AccDiffView = AccDiffData & {
  hasTargets: boolean,
  hasExactlyOneTarget: boolean,
}

export class AccDiffForm extends ReactiveForm<AccDiffData, AccDiffView> {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/acc_diff.hbs",
      resizable: false,
    });
  }

  constructor(data: AccDiffData) {
    super(data, { title: data.title })
  }

  getViewModel(data: AccDiffData): AccDiffView {
    let ret = data as AccDiffView; // view elements haven't been set yet
    ret.hasTargets = ret.targets.length > 1;
    ret.hasExactlyOneTarget = ret.targets.length == 1;
    return ret
  }
}
