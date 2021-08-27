import { AccDiffTarget, AccDiffData } from './data';
import SvelteApp from "../svelte-application";
import AccDiffSvelte from "./Form.svelte";

let formCache: AccDiffForm;

export class AccDiffForm extends SvelteApp<AccDiffData> {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      resizable: false,
      popOut: false,
      intro: true
    });
  }

  constructor(data: AccDiffData) {
    if (formCache) {
      formCache.refresh(data);
      formCache.open();
    } else {
      super(AccDiffSvelte, data);
      formCache = this;
      this.render(true);
    }
    return formCache;
  }

  static coalesceTargets(ts: Token[], forceFullRefresh: boolean = false): AccDiffForm | null {
    if (formCache) {
      let targets = ts.map(t => AccDiffTarget.fromParams(t));
      formCache.data.targets = targets;
      for (let target of targets) { target.hydrate(formCache.data); };

      // do a full refresh either if the form is currently closed, or we've been told to
      if (!formCache.isOpen || forceFullRefresh) {
        formCache.refresh(formCache.data);
      } else {
        formCache.component?.$set({ targets: formCache.data.targets });
      }

      // when the client only provides us targets, we want to let them
      // set up downstream actions if and only if nothing else is pending
      if (formCache.isOpen) {
        // this is the case where the form already has a pending promise
        return null;
      } else {
        formCache.open();
        return formCache;
      }
    } else {
      let data = AccDiffData.fromParams(undefined, undefined, 'Basic Attack', ts, undefined);
      return new AccDiffForm(data);
    }
  }

  refresh(data: AccDiffData) {
    // really simple little diff
    // broadly just rerendering the whole thing is fast enough
    // we're just doing this to ensure that the slide in for the whole modal
    // only happens when the weapon is changed
    let diff = { ...data };
    if (diff.lancerItem === this.data.lancerItem) {
      delete diff.lancerItem;
    }

    this.data = data;
    this.refreshPromise();
    this.component?.$set(diff);
  }

  get isOpen() {
    // @ts-ignore open does exist on the component, because we compile it with accessors:true
    return this.component?.open;
  }

  open() {
    this.component?.$set({ open: true });
  }

  async close() {
    this.component?.$set({ open: false });
    this.rejectPromise();
    return null;
  }

  async _renderInner(_data: any) {
    const sidebarWidth = $("#sidebar").width() || 0;
    return $(`<div class="app window-app" style="bottom: 0; right: ${sidebarWidth + 5}px"></div>`);
  }

  _injectHTML(html: JQuery) {
    // override to disable foundry's jquery animations
    $(document.body).append(html);
    this._element = html;
    // @ts-ignore
    this._element.slideUp = function(timeout: number, callback) {
      setTimeout(callback, timeout);
    }
    return html;
  }
}
