import { TagInstance } from "machine-mind";
import ReactiveForm from './reactive-form';

enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2
}

type AccDiffWeapon = {
  accurate: boolean,
  inaccurate: boolean,
  seeking: boolean,
}

type AccDiffWeaponSerialized = AccDiffWeapon;

type AccDiffBaseSerialized = {
  accuracy: number,
  difficulty: number,
  cover: Cover
}

type AccDiffTargetSerialized = AccDiffBaseSerialized & {
  target: string
}

export type AccDiffDataSerialized = {
  title: string,
  weapon: AccDiffWeaponSerialized,
  base: AccDiffBaseSerialized,
  targets: AccDiffTargetSerialized[],
}

class AccDiffBase {
  accuracy: number;
  difficulty: number;
  cover: Cover;
  #weapon: AccDiffWeapon;

  constructor(obj: AccDiffBaseSerialized, weapon: AccDiffWeapon) {
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
    this.#weapon = weapon;
  }

  static fromObject(obj: AccDiffBaseSerialized, extra: { weapon: AccDiffWeapon }): AccDiffBase {
    return new AccDiffBase(obj, extra.weapon);
  }

  toObject(): AccDiffBaseSerialized {
    return {
      accuracy: this.accuracy,
      difficulty: this.difficulty,
      cover: this.cover,
    }
  }

  get total() {
    return this.accuracy - this.difficulty
      + (this.#weapon.accurate ? 1 : 0)
      - (this.#weapon.inaccurate ? 1 : 0)
      - (this.#weapon.seeking ? 0 : this.cover)

  }
}

class AccDiffTarget extends AccDiffBase {
  target: Token;
  #base: AccDiffBase;

  constructor(obj: {
    target: Token,
    accuracy: number,
    difficulty: number,
    cover: Cover
  }, base: AccDiffBase, weapon: AccDiffWeapon) {
    super(obj, weapon);
    this.target = obj.target;
    this.#base = base;
  }

  toObject(): AccDiffTargetSerialized {
    return {
      target: this.target.id,
      accuracy: this.accuracy,
      difficulty: this.difficulty,
      cover: this.cover
    }
  }

  static fromObject(obj: AccDiffTargetSerialized,
                    extra: { base: AccDiffBase, weapon: AccDiffWeapon }): AccDiffTarget {
    let target = canvas.scene.tokens.get(obj.target);
    if (!target) {
      ui.notifications.error("Trying to access tokens from a different scene!");
      throw new Error("Token not found");
    }
    return new AccDiffTarget({
      target: target,
      accuracy: obj.accuracy,
      difficulty: obj.difficulty,
      cover: obj.cover
    }, extra.base, extra.weapon)
  }

  get total() {
    // the only thing we actually use base for is the untyped bonuses
    return super.total + this.#base.accuracy - this.#base.difficulty;
  }
}

export class AccDiffData {
  title: string;
  weapon: AccDiffWeapon;
  base: AccDiffBase;
  targets: AccDiffTarget[];

  constructor(obj: {
    title: string,
    base: AccDiffBase,
    weapon: AccDiffWeapon,
    targets: AccDiffTarget[]
  }) {
    this.title = obj.title;
    this.weapon = obj.weapon;
    this.base = obj.base;
    this.targets = obj.targets;
  }

  toObject(): AccDiffDataSerialized {
    return {
      title: this.title,
      weapon: this.weapon,
      base: this.base.toObject(),
      targets: this.targets.map(t => t.toObject())
    }
  }

  static fromObject(obj: AccDiffDataSerialized): AccDiffData {
    let base = AccDiffBase.fromObject(obj.base, obj);
    let targets = obj.targets.map(t => AccDiffTarget.fromObject(t, { base, weapon: obj.weapon }));
    return new AccDiffData({
      title: obj.title,
      weapon: obj.weapon,
      base, targets
    });
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

    let base = new AccDiffBase({
      cover: Cover.None,
      accuracy: starting ? starting[0] : 0,
      difficulty: starting ? starting[1] : 0,
    }, weapon);

    return new AccDiffData({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      weapon, base,
      targets: (targets || []).map(t => new AccDiffTarget({
        target: t,
        accuracy: 0,
        difficulty: 0,
        cover: Cover.None
      }, base, weapon))
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
