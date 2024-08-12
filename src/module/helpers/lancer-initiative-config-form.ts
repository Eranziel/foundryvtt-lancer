import { CombatTrackerAppearance } from "../settings";

// @ts-expect-error v12
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LancerInitiativeConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    form: { template: "systems/lancer/templates/combat/lancer-initiative-settings-v2.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
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

  async _prepareContext(opts: any) {
    const appearance = game.settings.get(game.system.id, "combat-tracker-appearance");
    const ctx = {
      appearance: opts.reset ? new CombatTrackerAppearance() : appearance,
      // @ts-expect-error v12
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
    // @ts-expect-error v12
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
    this.render(false, { reset: true });
  }

  static async #formHandler(_ev: unknown, _form: unknown, formData: any) {
    game.settings.set(game.system.id, "combat-tracker-appearance", formData.object);
  }
}

export function extendCombatTrackerConfig(...[app, [html]]: Parameters<Hooks.RenderApplication>) {
  const group = document.createElement("div");
  group.classList.add("form-group", "submenu");
  const label = document.createElement("label");
  label.innerHTML = game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu");
  group.appendChild(label);
  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = game.i18n.localize("LANCERINITIATIVE.IconSettingsMenu");
  button.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    // @ts-expect-error v12
    new LancerInitiativeConfigApp().render(true);
  });
  group.appendChild(button);
  html.querySelector("div[data-setting-id='core.combatTheme']")?.after(group);
  if (game.user!.isGM) {
    // @ts-expect-error v12
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
  app.setPosition({ height: "auto" });
}

export function onCloseCombatTrackerConfig(...[_app, [html]]: Parameters<Hooks.CloseApplication>) {
  if (!game.user!.isGM) return;
  const sort = html.querySelector<HTMLInputElement>("input[name=combat-tracker-sort]")?.checked;
  game.settings.set(game.system.id, "combat-tracker-sort", sort);
}
