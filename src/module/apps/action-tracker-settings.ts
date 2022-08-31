import { LANCER } from "../config";
import { ActionTrackerOptions, getActionTrackerOptions } from "../settings";

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class ActionTrackerConfig extends FormApplication<FormApplication.Options, ActionTrackerOptions> {
  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      title: "lancer.actionTracker.menu-label",
      id: "lancer-actionTracker-settings",
      template: `systems/${game.system.id}/templates/window/actiontracker-config.hbs`,
      width: 350,
    };
  }

  /** @override */
  getData(): ActionTrackerOptions {
    return {
      ...getActionTrackerOptions(true),
      ...(game.settings.get(game.system.id, LANCER.setting_actionTracker) as Partial<ActionTrackerOptions>),
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
    const defs = getActionTrackerOptions();
    const set = foundry.utils.diffObject(defs, data, { inner: true });
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
