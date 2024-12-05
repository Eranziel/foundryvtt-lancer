import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { LANCER } from "../config";
import { StatusIconConfigOptions } from "../settings";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface RenderOptions extends foundry.applications.api.ApplicationV2.RenderOptions {
  loadDefault: boolean;
}

interface Configuration extends foundry.applications.api.ApplicationV2.Configuration {}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class StatusIconConfig extends HandlebarsApplicationMixin(ApplicationV2<{}, Configuration, RenderOptions>) {
  static PARTS = {
    form: { template: "systems/lancer/templates/settings/status-icon-settings.hbs" },
    footer: { template: "templates/generic/form-footer.hbs", classes: ["flexrow"] },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-status-icon-settings",
    tag: "form",
    position: { width: 450 },
    window: { title: "lancer.statusIconsConfig.menu-label" },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onReset: this.#onReset,
    },
  } as const;

  async _prepareContext(opts: DeepPartial<RenderOptions>): Promise<{}> {
    const config = game.settings.get(game.system.id, LANCER.setting_status_icons);
    const ctx = {
      config: opts.loadDefault ? new StatusIconConfigOptions() : config,
      fields: config.schema.fields,
      buttons: [
        { type: "submit", name: "submit", icon: "fas fa-save", label: "Save" },
        { type: "button", name: "reset", icon: "fas fa-undo", label: "SETTINGS.Reset", action: "onReset" },
      ],
    };
    return ctx;
  }

  static async #formHandler(this: StatusIconConfig, _ev: unknown, _form: unknown, formData: any) {
    const res = formData.object;
    await game.settings.set(game.system.id, LANCER.setting_status_icons, res);
  }

  static async #onReset(this: StatusIconConfig) {
    this.render(false, { loadDefault: true });
  }
}
