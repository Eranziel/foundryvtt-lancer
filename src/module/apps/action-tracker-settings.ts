import { LANCER } from "../config";
import { ActionTrackerOptions } from "../settings";

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class ActionTrackerConfig extends FormApplication<FormApplicationOptions, ActionTrackerOptions> {
  /** @override */
  static get defaultOptions(): FormApplicationOptions {
    return {
      ...super.defaultOptions,
      title: "lancer.actionTracker.menu-label",
      id: "lancer-actionTracker-settings",
      template: `systems/${game.system.id}/templates/window/actiontracker-config.hbs`,
      classes: ["action-tracker-config"],
      width: 350,
    };
  }

  /** @override */
  getData(): ActionTrackerOptions {
    return game.settings.get(game.system.id, LANCER.setting_actionTracker);
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
    game.settings.set(game.system.id, LANCER.setting_actionTracker, data);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    await game.settings.set(game.system.id, LANCER.setting_actionTracker, {});
    return this.render();
  }
}
