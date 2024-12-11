import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { LANCER } from "../config";
import { AutomationOptions } from "../settings";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface RenderOptions extends foundry.applications.api.ApplicationV2.RenderOptions {
  loadDefault: boolean;
  loadEmpty: boolean;
}

interface Configuration extends foundry.applications.api.ApplicationV2.Configuration {}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class AutomationConfig extends HandlebarsApplicationMixin(ApplicationV2<{}, Configuration, RenderOptions>) {
  static PARTS = {
    form: { template: "systems/lancer/templates/settings/automation-config.hbs" },
    footer: { template: "templates/generic/form-footer.hbs", classes: ["flexrow"] },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-automation-settings",
    tag: "form",
    position: { width: 450 },
    window: { title: "lancer.automation.menu-label" },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onLoadEmpty: this.#loadEmpty,
      onReset: this.#onReset,
    },
  } as const;

  async _prepareContext(opts: DeepPartial<RenderOptions>): Promise<{}> {
    super._prepareContext;
    const config = game.settings.get(game.system.id, LANCER.setting_automation);
    const blank = new AutomationOptions();
    Object.keys(blank).forEach(k => ((<any>blank)[k] = false));
    const ctx = {
      config: opts.loadDefault ? new AutomationOptions() : opts.loadEmpty ? blank : config,
      fields: config.schema.fields,
      buttons: [
        { type: "submit", name: "submit", icon: "fas fa-save", label: "Save" },
        { type: "button", name: "reset", icon: "fas fa-undo", label: "SETTINGS.Reset", action: "onReset" },
        { type: "button", name: "clear", icon: "fas fa-cancel", label: "Clear All", action: "onLoadEmpty" },
      ],
    };
    opts.loadEmpty = false;
    opts.loadDefault = false;
    return ctx;
  }

  static async #formHandler(this: AutomationConfig, _ev: unknown, _form: unknown, formData: any) {
    const res = formData.object;
    await game.settings.set(game.system.id, LANCER.setting_automation, res);
  }

  static async #onReset(this: AutomationConfig) {
    this.render(false, { loadDefault: true });
  }

  static async #loadEmpty(this: AutomationConfig) {
    this.render(false, { loadEmpty: true });
  }
}
