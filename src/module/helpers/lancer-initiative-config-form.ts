import { CombatTrackerAppearance } from "../settings";

export class LancerCombatTrackerConfig extends CombatTrackerConfig<
  FormApplication.Options,
  ClientSettings.Values["lancer.combatTrackerConfig"]
> {
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/combat/combat-tracker-config.hbs`,
    };
  }

  async getData(options?: Partial<FormApplication.Options>) {
    const data = await super.getData(options);
    data.settings.sortTracker = game.settings.get(game.system.id, "combat-tracker-sort");
    return data;
  }

  activateListeners(html: JQuery<HTMLElement>) {
    html.find("button#tracker-appearance").on("click", () => new LancerCombatAppearanceConfig({}).render(true));
  }

  async _updateObject(
    event: Event,
    formData: ClientSettings.Values["lancer.combatTrackerConfig"]
  ): Promise<ClientSettings.Values["core.combatTrackerConfig"]> {
    let res = await super._updateObject(event, formData);
    console.log(formData);
    await game.settings.set(game.system.id, "combat-tracker-sort", formData["sortTracker"]);
    return res;
  }
}

/**
 * Settings form for customizing the icon appearance of the icon used in the
 * tracker
 */
class LancerCombatAppearanceConfig extends FormApplication<FormApplication.Options, CombatTrackerAppearance> {
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      title: "Lancer Intiative",
      id: "lancer-initiative-settings",
      template: `systems/${game.system.id}/templates/combat/lancer-initiative-settings.hbs`,
      width: 350,
    };
  }

  getData() {
    return game.settings.get(game.system.id, "combat-tracker-appearance");
  }

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    //update the preview icon
    html.find('input[name="icon"]').on("change", e => {
      html
        .find("a.preview")
        .removeClass()
        .addClass($(e.target).val() + " preview");
    });

    // Update the preview icon size
    html.find('input[name="icon_size"]').on("change", e => {
      html.find("a.preview").css("font-size", $(e.target).val() + "rem");
    });

    // Set the preview icon color to the last hovered color picker
    html.find('input[type="color"]').on("mouseenter mouseleave", e => {
      html.find("a.preview").css("color", $(e.target).val() as string);
      if ($(e.target).attr("name") === "done_selector") return;
      html.find("li.combatant").css("border-color", $(e.target).val() as string);
    });

    html.find('button[name="reset"]').on("click", this.resetSettings.bind(this));
  }

  async _updateObject(_: Event, data: Record<string, unknown>): Promise<void> {
    const config = CONFIG.LancerInitiative;
    game.settings.set(config.module, "combat-tracker-appearance", data as any);
  }

  /**
   * Sets all settings handled by the form to undefined in order to revert to
   * their default values.
   */
  async resetSettings(): Promise<unknown> {
    const config = CONFIG.LancerInitiative;
    await game.settings.set(config.module, "combat-tracker-appearance", new CombatTrackerAppearance());
    return this.render();
  }
}
