import { getAutomationOptions } from "../settings";
import type { AutomationOptions } from "../settings";
import { LANCER } from "../config";
/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class AutomationConfig extends FormApplication<FormApplication.Options, AutomationOptions> {
  constructor(object?: any, options = {}) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      title: "lancer.automation.menu-label",
      id: "lancer-automation-settings",
      template: `systems/${game.system.id}/templates/window/automation-config.hbs`,
      width: 350,
    };
  }

  /** @override */
  getData(): AutomationOptions {
    return {
      ...getAutomationOptions(true),
      ...game.settings.get(game.system.id, LANCER.setting_automation),
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
    console.log(data);
    game.settings.set(game.system.id, LANCER.setting_automation, data);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    await game.settings.set(game.system.id, LANCER.setting_automation, {});
    return this.render();
  }
}
