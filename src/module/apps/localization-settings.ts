import { LANCER } from "../config";
import type { LLPLocalizationIndexOverrides } from "../settings";
import { slugify } from "../util/lid";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LocalizationConfig extends HandlebarsApplicationMixin(
  ApplicationV2<
    {},
    foundry.applications.api.ApplicationV2.Configuration,
    foundry.applications.api.ApplicationV2.RenderOptions
  >
) {
  static override PARTS = {
    form: { template: "systems/lancer/templates/settings/localization-config.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  static override DEFAULT_OPTIONS = {
    id: "lancer-localization-settings",
    tag: "form",
    window: {
      title: "lancer.setting.localization.menu.label",
      icon: "mdi mdi-translate",
      contentClasses: ["standard-form"],
      resizable: true,
    },
    position: {
      width: 800,
      height: 600,
    },
    form: {
      handler: LocalizationConfig.#formHandler,
    },
    actions: {
      addOverride: LocalizationConfig.#addOverride,
      exportOverrides: LocalizationConfig.#exportOverrides,
      importOverrides: LocalizationConfig.#importOverrides,
      removeOverride: LocalizationConfig.#removeOverride,
      resetOverrides: LocalizationConfig.#resetOverrides,
    },
  };

  protected override async _prepareContext() {
    const files = game.settings.get(game.system.id, LANCER.setting_localization_llp_files);
    const overrides = game.settings.get(game.system.id, LANCER.setting_localization_llp_index_override);

    const targets = new Set(Object.keys(overrides));
    for (const languageFiles of Object.values(files)) {
      for (const target of Object.keys(languageFiles)) {
        targets.add(target);
      }
    }

    const packs = [...targets].map(pack => {
      const previewPatch = Object.values(files).find(languageFiles => languageFiles[pack])?.[pack];
      const translations = previewPatch?.data ?? {};
      const packOverrides = overrides[pack] ?? {};
      const rows = Object.keys(packOverrides)
        .sort()
        .map(destination => ({
          source: packOverrides[destination],
          destination,
          translation: packOverrides[destination]
            .split(",")
            .map(key => translations[key] ?? "")
            .join("\n\n"), // This is how they are joined in the index as well
        }));
      return { pack, rows };
    });

    return {
      packs,
      buttons: [
        {
          type: "submit",
          icon: "fas fa-save",
          label: "SETTINGS.Save",
        },
        {
          type: "button",
          icon: "fas fa-arrows-rotate",
          label: "Reset",
          action: "resetOverrides",
        },
      ],
    };
  }

  /**
   * Packs the table data into the database
   * @param _event
   * @param form
   * @private
   */
  static async #formHandler(_event: unknown, form: HTMLFormElement) {
    const result: LLPLocalizationIndexOverrides = {};

    for (const section of form.querySelectorAll<HTMLElement>("[data-pack]")) {
      const pack = section.dataset.pack!;
      for (const row of section.querySelectorAll(".llp-override-row")) {
        const source = row.querySelector<HTMLInputElement>('[data-field="source"]')!.value;
        const destination = row.querySelector<HTMLInputElement>('[data-field="destination"]')!.value;
        if (!source || !destination) continue;
        result[pack] ??= {};
        result[pack][destination] = source;
      }
    }

    await game.settings.set(game.system.id, LANCER.setting_localization_llp_index_override, result);
  }

  /**
   *
   * @private
   */
  static async #resetOverrides(this: LocalizationConfig): Promise<void> {
    await game.settings.set(game.system.id, LANCER.setting_localization_llp_index_override, {});
    await this.render();
  }

  // Probably best to avoid adding to handlebars helpers?
  /**
   *
   * @param _event
   * @param target
   * @private
   */
  static #addOverride(_event: PointerEvent, target: HTMLElement): void {
    const section = target.closest<HTMLElement>("[data-pack]");
    const rows = section?.querySelector(".llp-override-rows");
    const template = section?.querySelector<HTMLTemplateElement>("template");
    if (!rows || !template) return;

    const row = template.content.querySelector<HTMLElement>(".llp-override-row")!.cloneNode(true) as HTMLElement;
    rows.append(row);
    row.querySelector<HTMLInputElement>("input")?.focus();
  }

  /**
   *
   * @param _event
   * @param target
   * @private
   */
  static #removeOverride(_event: PointerEvent, target: HTMLElement): void {
    target.closest(".llp-override-row")?.remove();
  }

  /**
   *
   * @param _event
   * @param target
   * @private
   */
  static #exportOverrides(_event: PointerEvent, target: HTMLElement): void {
    const pack = target.closest<HTMLElement>("[data-pack]")?.dataset.pack;
    if (!pack) return;

    const overrides = game.settings.get(game.system.id, LANCER.setting_localization_llp_index_override)[pack] ?? {};
    const file = new Blob([JSON.stringify(overrides, undefined, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `${slugify(pack, "-")}-llp-index-overrides.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   *
   * @param _event
   * @param target
   * @private
   */
  static #importOverrides(this: LocalizationConfig, _event: PointerEvent, target: HTMLElement): void {
    const section = target.closest<HTMLElement>("[data-pack]");
    const input = section?.querySelector<HTMLInputElement>('[data-field="import"]');
    if (!input) return;

    input.addEventListener("change", LocalizationConfig.#handleImport.bind(this), { once: true });
    input.value = "";
    input.click();
  }

  /**
   *
   * @param event
   * @private
   */
  static async #handleImport(this: LocalizationConfig, event: Event): Promise<void> {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    const input = event.currentTarget;
    const pack = input.closest<HTMLElement>("[data-pack]")?.dataset.pack;
    const file = input.files?.[0];
    if (!pack || !file) return;

    try {
      const imported = JSON.parse(await file.text());
      if (!LocalizationConfig.#isOverrideMap(imported)) throw new Error("Invalid override map");

      const overrides = foundry.utils.deepClone(
        game.settings.get(game.system.id, LANCER.setting_localization_llp_index_override)
      );
      overrides[pack] = { ...(overrides[pack] ?? {}), ...imported };
      await game.settings.set(game.system.id, LANCER.setting_localization_llp_index_override, overrides);
      await this.render();
    } catch {
      ui.notifications?.error("The selected file is not a valid LLP index override map.");
    }
  }

  /**
   *
   * @param value
   * @private
   */
  static #isOverrideMap(value: unknown): value is Record<string, string> {
    return (
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every(source => typeof source === "string")
    );
  }
}
