import { AutomationOptions } from "../settings";
import { LANCER } from "../config";

interface AutomationConfigOptions extends FormApplication.Options {
  loadDefault: boolean;
  loadEmpty: boolean;
}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
export class AutomationConfig extends FormApplication<AutomationConfigOptions, AutomationOptions> {
  constructor(object?: any, options = {}) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      title: "lancer.automation.menu-label",
      id: "lancer-automation-settings",
      template: `systems/${game.system.id}/templates/window/automation-config.hbs`,
      classes: ["lancer", "automation-config"],
      width: 350,
      loadDefault: false,
      loadEmpty: false,
    };
  }

  /** @override */
  getData(options: AutomationConfigOptions): AutomationOptions {
    if (options.loadDefault) {
      this.options.loadDefault = false;
      return new AutomationOptions();
    }
    if (options.loadEmpty) {
      this.options.loadEmpty = false;
      const r = new AutomationOptions();
      Object.keys(r).forEach(k => ((<any>r)[k] = false));
      return r;
    }
    return game.settings.get(game.system.id, LANCER.setting_automation);
  }

  /** @override */
  activateListeners(html: JQuery<HTMLFormElement>): void {
    html.find("button[name=reset]").on("click", this.resetSettings.bind(this));
    html.find("button[name=loadDefault]").on("click", this.loadDefault.bind(this));
    html.find("button[name=clear]").on("click", this.loadEmpty.bind(this));
  }

  /** @override */
  async _updateObject(_: Event, data: Record<string, unknown>): Promise<void> {
    game.settings.set(game.system.id, LANCER.setting_automation, data as any);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    // await game.settings.set(game.system.id, LANCER.setting_automation, {} as any);
    return this.render();
  }

  async loadDefault(): Promise<unknown> {
    return this.render(false, { loadDefault: true });
  }

  async loadEmpty(): Promise<unknown> {
    return this.render(false, { loadEmpty: true });
  }
}
