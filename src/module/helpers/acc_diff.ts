import { TagInstance } from "machine-mind";
import { LancerActor, LancerActorType } from '../actor/lancer-actor';
import { gentle_merge } from '../helpers/commons';

export type AccDiffFormData = {
  title: string,
  baseUntypedAccDiff: { accuracy: number, difficulty: number },
  baseAccDiff: { accuracy: number, difficulty: number },
  targetedAccDiffs: { target: LancerActor<LancerActorType>, accuracy: number, difficulty: number }[],
  accurate: boolean,
  inaccurate: boolean,
  softCover: boolean,
  hardCover: boolean,
  seeking: boolean,
  seekingDisabled?: string,
  totalIcon?: {
    value: number,
    color: string,
    className: string
  }
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
    let baseAccDiff = {
      accuracy: starting ? starting[0] : 0,
      difficulty: starting ? starting[1] : 0
    };

    let ret: AccDiffFormData = {
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      baseUntypedAccDiff: baseAccDiff,
      baseAccDiff: baseAccDiff, // this'll get overwritten by getData soon

      targetedAccDiffs: (targets || []).map(t => ({
        target: t,
        accuracy: 0,
        difficulty: 0
      })),

      accurate: false,
      inaccurate: false,
      softCover: false,
      hardCover: false,
      seeking: false
    };

    for (let tag of (tags || [])) {
      switch (tag.Tag.LID) {
        case "tg_accurate":
          ret.accurate = true;
          break;
        case "tg_inaccurate":
          ret.inaccurate = true;
          break;
        case "tg_seeking":
          ret.seeking = true;
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

  getData(): AccDiffFormData {
    let ret = this.data;

    ret.baseAccDiff = {
      accuracy: ret.baseUntypedAccDiff.accuracy + (ret.accurate ? 1 : 0),
      difficulty: ret.baseUntypedAccDiff.difficulty + (ret.inaccurate ? 1 : 0)
    };
    if (!ret.seeking && (ret.hardCover || ret.softCover)) {
      ret.baseAccDiff.difficulty += ret.hardCover ? 2 : 1;
    }

    ret.seekingDisabled = ret.seeking ? "disabled" : "";

    let total = ret.baseAccDiff.accuracy - ret.baseAccDiff.difficulty;

    ret.totalIcon = {
      value: Math.abs(total),
      color: total > 0 ? "#017934" : total < 0 ? "#9c0d0d" : "#443c3c",
      className: total >= 0 ? "cci-accuracy" : "cci-difficulty"
    };

    return ret;
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
