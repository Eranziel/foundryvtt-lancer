import { LANCER } from "../config";
import { StatusIconConfigOptions } from "../settings";
import { LancerActiveEffect } from "../effects/lancer-active-effect";

interface StatusIconConfigAppOptions extends FormApplication.Options {
  loadDefault: boolean;
}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class StatusIconConfig extends FormApplication<StatusIconConfigAppOptions, StatusIconConfigOptions> {
  /** @override */
  static get defaultOptions(): StatusIconConfigAppOptions {
    return {
      ...super.defaultOptions,
      title: "lancer.statusIconsConfig.menu-label",
      id: "lancer-statusIconsConfig-settings",
      template: `systems/${game.system.id}/templates/window/statusicons-config.hbs`,
      classes: ["lancer", "status-icon-config"],
      width: 350,
      loadDefault: false,
    };
  }

  /** @override */
  getData(options: StatusIconConfigAppOptions): StatusIconConfigOptions {
    if (options.loadDefault) return new StatusIconConfigOptions();
    return game.settings.get(game.system.id, LANCER.setting_status_icons);
  }

  /** @override */
  activateListeners(html: JQuery<HTMLFormElement>): void {
    html.find("button[name=reset]").on("click", this.resetSettings.bind(this));
    html.find("button[name=loadDefault]").on("click", this.loadDefault.bind(this));
  }

  /** @override */
  async _updateObject(_: Event, data: Record<string, unknown>): Promise<void> {
    await game.settings.set(game.system.id, LANCER.setting_status_icons, data as any);
    LancerActiveEffect.populateConfig(true);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    return this.render();
  }

  async loadDefault(): Promise<unknown> {
    return this.render(false, { loadDefault: true });
  }
}
