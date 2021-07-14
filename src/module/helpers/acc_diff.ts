import { TagInstance } from "machine-mind";
import ReactiveForm from './reactive-form';

enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2
}

type AccDiffBaseSerialized = {
  untyped: { accuracy: number, difficulty: number },
  cover: Cover,
  accurate: boolean,
  inaccurate: boolean,
  seeking: boolean
}

type AccDiffTargetSerialized = {
  target: string,
  accuracy: number,
  difficulty: number,
  cover: Cover
}

export type AccDiffDataSerialized = {
  title: string,
  base: AccDiffBaseSerialized,
  targets: AccDiffTargetSerialized[],
}

class AccDiffBase {
  untyped: { accuracy: number, difficulty: number };
  cover: Cover;
  accurate: boolean;
  inaccurate: boolean;
  seeking: boolean;

  constructor(obj: AccDiffBaseSerialized) {
    this.untyped = obj.untyped;
    this.cover = obj.cover;
    this.accurate = obj.accurate;
    this.inaccurate = obj.inaccurate;
    this.seeking = obj.seeking;
  }

  static fromObject(obj: AccDiffBaseSerialized): AccDiffBase {
    return new AccDiffBase(obj);
  }

  toObject(): AccDiffBaseSerialized {
    return {
      untyped: this.untyped,
      cover: this.cover,
      accurate: this.accurate,
      inaccurate: this.inaccurate,
      seeking: this.seeking
    }
  }

  get accuracy() {
    return this.untyped.accuracy + (this.accurate ? 1 : 0);
  }

  get difficulty() {
    return this.untyped.difficulty
      + (this.inaccurate ? 1 : 0)
      + (this.seeking ? 0 : this.cover)
  }

  get total() {
    return this.accuracy - this.difficulty;
  }
}

class AccDiffTarget {
  target: Token;
  accuracy: number;
  difficulty: number;
  cover: Cover;
  #base: AccDiffBase;

  constructor(obj: {
    target: Token,
    accuracy: number,
    difficulty: number,
    cover: Cover
  }, base: AccDiffBase) {
    this.target = obj.target;
    this.accuracy = obj.accuracy;
    this.difficulty = obj.difficulty;
    this.cover = obj.cover;
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

  static fromObject(obj: AccDiffTargetSerialized, base: AccDiffBase): AccDiffTarget {
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
    }, base)
  }

  get total() {
    return this.accuracy - this.difficulty
      + this.#base.total - (this.#base.seeking ? 0 : this.cover);
  }
}

export class AccDiffData {
  title: string;
  base: AccDiffBase;
  targets: AccDiffTarget[];

  constructor(obj: {
    title: string,
    base: AccDiffBase,
    targets: AccDiffTarget[]
  }) {
    this.title = obj.title;
    this.base = obj.base;
    this.targets = obj.targets;
  }

  toObject(): AccDiffDataSerialized {
    return {
      title: this.title,
      base: this.base.toObject(),
      targets: this.targets.map(t => t.toObject())
    }
  }

  static fromObject(obj: AccDiffDataSerialized): AccDiffData {
    let base = AccDiffBase.fromObject(obj.base);
    let targets = obj.targets.map(t => AccDiffTarget.fromObject(t, base));
    return new AccDiffData({ title: obj.title, base, targets });
  }

  static fromParams(
    tags?: TagInstance[],
    title?: string,
    targets?: Token[],
    starting?: [number, number]
  ): AccDiffData {
    let base = AccDiffBase.fromObject({
      accurate: false,
      inaccurate: false,
      cover: Cover.None,
      seeking: false,
      untyped: {
        accuracy: starting ? starting[0] : 0,
        difficulty: starting ? starting[1] : 0
      },
    });

    for (let tag of (tags || [])) {
      switch (tag.Tag.LID) {
        case "tg_accurate":
          base.accurate = true;
          break;
        case "tg_inaccurate":
          base.inaccurate = true;
          break;
        case "tg_seeking":
          base.seeking = true;
          break;
      }
    }

    return new AccDiffData({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      base: base,
      targets: (targets || []).map(t => new AccDiffTarget({
        target: t,
        accuracy: 0,
        difficulty: 0,
        cover: Cover.None
      }, base))
    });
  }
}

type AccDiffView = AccDiffData & {
  baseCoverDisabled: boolean,
  hasTargets: boolean
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
    ret.hasTargets = ret.targets.length > 0;
    ret.baseCoverDisabled = ret.base.seeking || ret.hasTargets;
    return ret
  }
}
