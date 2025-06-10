import { CombatTrackerAppearance } from "../settings";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LancerInitiativeConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    form: { template: "systems/lancer/templates/combat/lancer-initiative-settings-v2.hbs" },
    footer: { template: "templates/generic/form-footer.hbs", classes: ["flexrow"] },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-initiative-settings",
    tag: "form",
    position: { width: 350 },
    window: { title: "LANCERINITIATIVE.IconSettingsMenu" },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: { onReset: this.#onReset },
  };

  async _prepareContext(opts: any): Promise<{}> {
    const appearance = game.settings.get(game.system.id, "combat-tracker-appearance");
    const ctx = {
      appearance: opts.reset ? new CombatTrackerAppearance() : appearance,
      fields: appearance.schema.fields,
      buttons: [
        { type: "submit", name: "submit", icon: "fas fa-save", label: "Save" },
        { type: "button", name: "reset", icon: "fas fa-undo", label: "Reset", action: "onReset" },
      ],
    };
    opts.reset = false;
    return ctx;
  }

  _onRender() {
    const element: HTMLElement = this.element;
    const icon = element.querySelector<HTMLAnchorElement>("a.preview");
    const fake_combatant = element.querySelector<HTMLDivElement>("div.fake-combatant");
    element.querySelectorAll("input[name=icon],input[name=deactivate]").forEach(e => {
      const handler = (ev: Event) => {
        icon!.className = "preview";
        icon!.classList.add(...(<HTMLInputElement>ev.target).value.split(" ").filter(c => !!c));
      };
      e.addEventListener("change", handler);
      e.addEventListener("mouseover", handler);
    });
    element.querySelectorAll("range-picker input").forEach(e => {
      e.addEventListener("change", ev => (icon!.style.fontSize = `${(<HTMLInputElement>ev.target).value}rem`));
    });
    element.querySelectorAll("input[type=color]").forEach(e => {
      e.addEventListener("mouseover", ev => {
        icon!.style.color = fake_combatant!.style.borderColor = (<HTMLInputElement>ev.target).value;
      });
    });
  }

  static async #onReset() {
    // @ts-expect-error v12
    this.render({ reset: true });
  }

  static async #formHandler(_ev: unknown, _form: unknown, formData: any) {
    game.settings.set(game.system.id, "combat-tracker-appearance", formData.object);
  }
}

export function extendCombatTrackerConfig(app: foundry.applications.api.ApplicationV2, html: HTMLElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu");
  button.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    // @ts-expect-error v12
    new LancerInitiativeConfigApp().render(true);
  });
  const group = foundry.applications.fields.createFormGroup({
    input: button,
    label: "LANCERINITIATIVE.IconSettingsMenu",
    localize: true,
    classes: ["submenu"],
  });
  html.querySelector("div[data-setting-id='core.combatTheme']")?.after(group);
  if (game.user!.isGM) {
    const def_handler = app.options.form?.handler;
    app.options.form!.handler = async function (ev, form, submitData) {
      await def_handler?.(ev, form, submitData);
      const sort = submitData.object["combat-tracker-sort"] as unknown as boolean;
      game.settings.set(game.system.id, "combat-tracker-sort", sort);
    };
    const sort = new foundry.data.fields.BooleanField({
      initial: true,
      label: "LANCERINITIATIVE.SortTracker",
      hint: "LANCERINITIATIVE.SortTrackerDesc",
    });
    group.after(
      sort.toFormGroup(
        { localize: true },
        {
          name: "combat-tracker-sort",
          value: game.settings.get(game.system.id, "combat-tracker-sort"),
        }
      )
    );
  }
}
