import { TagInstance } from "machine-mind";
import { LancerActor, LancerActorType } from '../actor/lancer-actor';
import ReactiveForm from './reactive-form';

enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2
}

export type AccDiffData = {
  title: string,
  base: {
    untyped: {
      accuracy: number,
      difficulty: number,
    },
    accuracy: number,
    difficulty: number,
    cover: Cover,
    accurate: boolean,
    inaccurate: boolean,
    seeking: boolean,
    total: number
  },
  targets: {
    target: LancerActor<LancerActorType>,
    accuracy: number,
    difficulty: number,
    cover: Cover,
    total: number
  }[],
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

  static formDataFromParams(
    tags?: TagInstance[],
    title?: string,
    targets?: LancerActor<LancerActorType>[],
    starting?: [number, number]
  ): AccDiffData {
    let ret: AccDiffData = {
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      base: {
        accurate: false,
        inaccurate: false,
        cover: Cover.None,
        seeking: false,
        untyped: {
          accuracy: starting ? starting[0] : 0,
          difficulty: starting ? starting[1] : 0
        },
        get accuracy() {
          return this.untyped.accuracy + (this.accurate ? 1 : 0);
        },
        get difficulty() {
          return this.untyped.difficulty
            + (this.inaccurate ? 1 : 0)
            + (this.seeking ? 0 : this.cover)
        },
        get total() {
          return this.accuracy - this.difficulty;
        }
      },
      targets: []
    };

    ret.targets = (targets || []).map(t => ({
      target: t,
      accuracy: 0,
      difficulty: 0,
      cover: Cover.None,
      get total() {
        return this.accuracy - this.difficulty
          + ret.base.total - (ret.base.seeking ? 0 : this.cover);
      }
    }));

    for (let tag of (tags || [])) {
      switch (tag.Tag.LID) {
        case "tg_accurate":
          ret.base.accurate = true;
          break;
        case "tg_inaccurate":
          ret.base.inaccurate = true;
          break;
        case "tg_seeking":
          ret.base.seeking = true;
          break;
      }
    }

    return ret;
  }

  static fromData(
    tags?: TagInstance[],
    title?: string,
    targets?: LancerActor<LancerActorType>[],
    starting?: [number, number]) {
    return new AccDiffForm(AccDiffForm.formDataFromParams(tags, title, targets, starting));
  }

  getViewModel(data: AccDiffData): AccDiffView {
    let ret = data as AccDiffView; // view elements haven't been set yet
    ret.hasTargets = ret.targets.length > 0;
    ret.baseCoverDisabled = ret.base.seeking || ret.hasTargets;
    return ret
  }
}
