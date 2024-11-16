import type SvelteComponent from "*.svelte";

type SvelteAppOptions = ApplicationOptions & {
  intro?: boolean;
};

export default class SvelteApp<DataModel> extends Application {
  klass: typeof SvelteComponent;
  data: DataModel;
  component?: SvelteComponent;
  declare options: SvelteAppOptions;

  #resolve: ((data: DataModel) => void) | null = null;
  #reject: ((v: void) => void) | null = null;
  promise!: Promise<DataModel>; // constructor calls refreshPromise(), which definitely assigns this

  constructor(App: typeof SvelteComponent, data: DataModel, options?: SvelteAppOptions) {
    super(options);
    this.refreshPromise();
    this.data = data;
    this.klass = App;
  }

  refreshPromise() {
    if (this.#reject) {
      this.#reject();
    }
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  resolvePromise() {
    if (this.#resolve) {
      this.#resolve(this.data);
      this.#reject = null;
    }
  }

  rejectPromise() {
    if (this.#reject) {
      this.#reject();
      this.#resolve = null;
    }
  }

  activateListeners(html: JQuery) {
    if (!html.get(0)) return;
    let component = new this.klass({
      target: html.get(0)!,
      props: this.data as Record<string, unknown>,
      intro: !!this.options.intro,
    });
    component.$on("submit", (_e: Event) => {
      this.resolvePromise();
      return this.close();
    });
    component.$on("cancel", (_e: Event) => {
      return this.close();
    });
    this.component = component;
  }

  close() {
    this.rejectPromise();
    return super.close();
  }

  async _renderInner(_data: any) {
    return $("<div></div>");
  }
}
