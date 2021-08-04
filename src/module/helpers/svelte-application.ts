import type SvelteComponent from '*.svelte';

export default class SvelteApp<DataModel> extends Application {
  klass: typeof SvelteComponent;
  data: DataModel;
  component!: any;

  #resolve: ((data: DataModel) => void) | null = null;
  #reject: ((v: void) => void) | null = null;
  promise: Promise<DataModel>;

  constructor(App: typeof SvelteComponent, data: DataModel, options: ApplicationOptions) {
    super(options);
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    })
    this.data = data;
    this.klass = App;
  }

  activateListeners(html: JQuery) {
    this.component = new this.klass({
      target: html.get(0),
      props: this.data,
    });
    this.component.$on('submit', (_e: Event) => {
      if (this.#resolve) {
        this.#resolve(this.data);
        this.#reject = null;
      }
      return this.close();
    });
    this.component.$on('cancel', (_e: Event) => {
      return this.close();
    });
  }

  close() {
    if (this.#reject) {
      this.#reject();
      this.#resolve = null;
    }
    return super.close();
  }

  async _renderInner(_data: any) {
    return $('<div></div>');
  }

}
