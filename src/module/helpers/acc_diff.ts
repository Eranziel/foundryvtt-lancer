import { TagInstance } from "machine-mind";
import { LancerActor, LancerActorType } from '../actor/lancer-actor';
import { gentle_merge } from '../helpers/commons';

enum Cover {
  None = 0,
  Soft = 1,
  Hard = 2
}

export type AccDiffFormData = {
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

type AccDiffFormView = {
  baseCoverDisabled: boolean,
  hasTargets: boolean
}

export class AccDiffForm extends FormApplication {
  data: AccDiffFormData;
  resolve: ((data: AccDiffFormData) => void) | null = null;
  reject: ((v: void) => void) | null = null;
  promise: Promise<AccDiffFormData>;

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/acc_diff.hbs",
      resizable: false,
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: true,
    });
  }

  constructor(data: AccDiffFormData) {
    super(data, { title: data.title });
    this.data = data;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    })
  }

  static formDataFromParams(
    tags?: TagInstance[],
    title?: string,
    targets?: LancerActor<LancerActorType>[],
    starting?: [number, number]
  ): AccDiffFormData {
    let ret: AccDiffFormData = {
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

  getData(): AccDiffFormData & AccDiffFormView {
    let ret: AccDiffFormData = this.data as AccDiffFormData;

    let view: AccDiffFormView = {
      baseCoverDisabled: ret.base.seeking || ret.targets.length > 0,
      hasTargets: ret.targets.length > 0
    }

    return mergeObject(
      ret as AccDiffFormData & AccDiffFormView,
      view as AccDiffFormData & AccDiffFormView
    );
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find(".cancel").on("click", async (_ev) => {
      return this.close();
    });
  }

  async _onChangeInput(_e: Event) {
    // @ts-ignore .8 -- FormApplication._onChangeInput does exist
    await super._onChangeInput(_e);
    // @ts-ignore .8 -- FormApplication._getSubmitData does exist
    let data = this._getSubmitData(null);
    await this._updateObject(_e, data);
  }

  _updateObject(ev: Event, formData: any) {
    gentle_merge(this.data, formData);
    this.render();

    if (ev.type == "submit") {
      if (this.resolve) {
        this.resolve(this.data);
        this.reject = null;
      }
      return this.promise;
    } else {
      return Promise.resolve(this.data);
    }
  }

  // FormApplication.close() does take an options hash
  // @ts-ignore .8
  close(options: any = {}) {
    if (this.reject) {
      this.reject();
      this.resolve = null;
    };
    // @ts-ignore .8
    return super.close(options);
  }
}
