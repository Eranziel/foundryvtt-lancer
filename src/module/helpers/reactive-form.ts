import { gentle_merge } from "../helpers/commons";

// this captures a useful pattern where we want to make a reactive form
// that is rooted on "raw data" rather than a Foundry Document
// to access the data from outside it, use the .promise property
// it is resolved when the user clicks submit, and rejected if the form is closed otherwise
// assumptions:
// * the name attributes in the html form directly match the keys in the raw data
//     (modulo gentle_merge)
// * the template contains precisely one HTML form as its outermost element
export default abstract class ReactiveForm<
  DataModel extends object,
  ViewModel extends DataModel
> extends FormApplication<FormApplication.Options, DataModel, DataModel> {
  declare object: DataModel;

  #resolve: ((data: DataModel) => void) | null = null;
  #reject: ((v: void) => void) | null = null;
  promise: Promise<DataModel>;

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: true,
    });
  }

  constructor(data: DataModel, options: FormApplication.Options) {
    super(data, options);
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  abstract getViewModel(data: DataModel): ViewModel;

  getData(): ViewModel {
    let ret: DataModel = this.object;
    return this.getViewModel(ret);
  }

  // cancel buttons need explicit handling
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find(".cancel").on("click", async _ev => {
      return this.close();
    });
  }

  async _onChangeInput(_e: JQuery.ChangeEvent<any, any, any, any>) {
    await super._onChangeInput(_e);
    let data = this._getSubmitData(null);
    // TODO: TYPECHECK: are jquery events castable to dom events?
    return this._updateObject(_e as unknown as Event, data);
  }

  // requires the names in the template to match
  _updateObject(ev: Event, formData: any) {
    gentle_merge(this.object, formData);
    this.render();

    if (ev.type == "submit") {
      if (this.#resolve) {
        this.#resolve(this.object);
        this.#reject = null;
      }
      return this.promise;
    } else {
      return Promise.resolve(this.object);
    }
  }

  // FormApplication.close() does take an options hash
  close(options = {}) {
    if (this.#reject) {
      this.#reject();
      this.#resolve = null;
    }
    // @ts-ignore .8
    return super.close(options);
  }
}
