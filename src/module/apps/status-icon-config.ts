import { LANCER } from "../config";
import { StatusIconConfigOptions, getStatusIconConfigOptions } from "../settings";
import { configureStatusIcons } from "../status-icons";

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class StatusIconConfig extends FormApplication<FormApplication.Options, StatusIconConfigOptions> {
  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      title: "lancer.statusIconsConfig.menu-label",
      id: "lancer-statusIconsConfig-settings",
      template: `systems/${game.system.id}/templates/window/statusicons-config.hbs`,
      width: 350,
    };
  }

  /** @override */
  getData(): StatusIconConfigOptions {
    return {
      ...getStatusIconConfigOptions(true),
      ...(game.settings.get(game.system.id, LANCER.setting_status_icons) as Partial<StatusIconConfigOptions>),
    };
  }

  /** @override */
  activateListeners(html: JQuery<HTMLFormElement>): void {
    html.find("input[name=enabled]").on("change", e => {
      const val = (<HTMLInputElement>e.target).checked;
      html.find("input:not([name=enabled])").prop("disabled", !val);
    });
  }

  /** @override */
  async _updateObject(_: Event, data: Record<string, unknown>): Promise<void> {
    await game.settings.set(game.system.id, LANCER.setting_status_icons, data);
    configureStatusIcons();
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    await game.settings.set(game.system.id, LANCER.setting_status_icons, {});
    return this.render();
  }
}
