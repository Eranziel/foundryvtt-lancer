import type { DeepPartial } from "fvtt-types/utils";
import { LANCER } from "../config";
import { ActionTrackerOptions } from "../settings";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface RenderOptions extends foundry.applications.api.ApplicationV2.RenderOptions {
  loadDefault: boolean;
}

interface Configuration extends foundry.applications.api.ApplicationV2.Configuration {}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class ActionTrackerConfig extends HandlebarsApplicationMixin(ApplicationV2<{}, Configuration, RenderOptions>) {
  static PARTS = {
    form: { template: "systems/lancer/templates/settings/action-tracker-config.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-action-tracker-settings",
    tag: "form",
    position: { width: 550 },
    window: { title: "lancer.actionTracker.menu-label", contentClasses: ["standard-form"] },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onReset: this.#onReset,
    },
  };

  async _prepareContext(opts: DeepPartial<RenderOptions>): Promise<{}> {
    const config = game.settings.get(game.system.id, LANCER.setting_actionTracker);
    const ctx = {
      config: opts.loadDefault ? new ActionTrackerOptions() : config,
      fields: config.schema.fields,
      buttons: [
        { type: "submit", name: "submit", icon: "fas fa-save", label: "Save" },
        { type: "button", name: "reset", icon: "fas fa-undo", label: "SETTINGS.Reset", action: "onReset" },
      ],
    };
    return ctx;
  }

  static async #formHandler(this: ActionTrackerConfig, _ev: unknown, _form: unknown, formData: any) {
    const res = formData.object;
    await game.settings.set(game.system.id, LANCER.setting_actionTracker, res);
  }

  static async #onReset(this: ActionTrackerConfig) {
    this.render(false, { loadDefault: true });
  }
}
