import type { LancerCombat, LancerCombatant } from "./lancer-combat.js";

/**
 * Overrides the display of the combat and turn order tab to add activation
 * buttons and either move or remove the initiative button
 */
export class LancerCombatTracker extends CombatTracker {
  static override get defaultOptions(): CombatTracker.Options {
    return {
      ...super.defaultOptions,
      template: CONFIG.LancerInitiative.templatePath!,
    };
  }

  override scrollToTurn(): void {
    if (this.viewed?.turn == null || !(CONFIG.LancerInitiative?.sort ?? true)) return super.scrollToTurn();
    this.element.find("ol#combat-tracker")[0].scrollTop = 0;
  }

  /**
   * Intercepts the data being sent to the combat tracker window and
   * optionally sorts the the turn data that gets displayed. This allows the
   * units that have already gone to be moved to the bottom without the risk of
   * updateCombat events being eaten.
   */
  override async getData(options?: Partial<CombatTracker.Options>): Promise<CombatTracker.Data> {
    const config = CONFIG.LancerInitiative;
    const appearance = getTrackerAppearance();
    const data = (await super.getData(options)) as {
      turns: {
        id: string;
        css: string;
        pending: number;
        finished: number;
      }[];
      [x: string]: unknown;
    };
    const sort = config.sort ?? true;
    const disp: Record<number, string> = {
      [-2]: "",
      [-1]: "enemy",
      [0]: "neutral",
      [1]: "friendly",
      [2]: "player",
    };
    data.turns = data.turns.map(t => {
      const combatant: LancerCombatant | undefined = <LancerCombatant>(
        this.viewed!.getEmbeddedDocument("Combatant", t.id)
      );
      return {
        ...t,
        css: t.css + " " + disp[combatant?.disposition ?? -2],
        activations: combatant?.activations.max,
        pending: combatant?.activations.value ?? 0,
        finished: +(this.viewed!.combatant === combatant),
      };
    });
    if (sort) {
      data.turns.sort(function (a, b) {
        const aa = a.css.indexOf("active") !== -1 ? 1 : 0;
        const ba = b.css.indexOf("active") !== -1 ? 1 : 0;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.pending === 0 ? 1 : 0;
        const bd = b.pending === 0 ? 1 : 0;
        return ad - bd;
      });
    }
    data.icon_class = appearance.icon;
    data.deactivate_icon_class = appearance.deactivate;
    data.enable_initiative = CONFIG.LancerInitiative.enable_initiative ?? false;
    return <CombatTracker.Data>data;
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find(".lancer-combat-control").on("click", this._onActivateCombatant.bind(this));
  }

  /**
   * Activate the selected combatant
   */
  protected async _onActivateCombatant(
    event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const id = btn.closest<HTMLElement>(".combatant")?.dataset.combatantId;
    if (!id) return;
    switch (btn.dataset.control) {
      case "deactivateCombatant":
        await (<LancerCombat>this.viewed!).deactivateCombatant(id);
        break;
      case "activateCombatant":
        await (<LancerCombat>this.viewed!).activateCombatant(id);
        break;
    }
  }

  protected async _onAddActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"))
    );
    await combatant.addActivations(1);
  }

  protected async _onRemoveActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"))
    );
    await combatant.addActivations(-1);
  }

  protected async _onUndoActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"))
    );
    await combatant.modifyCurrentActivations(1);
  }

  protected override _getEntryContextOptions(): ContextMenuEntry[] {
    const m: ContextMenuEntry[] = [
      {
        name: "LANCERINITIATIVE.AddActivation",
        icon: '<i class="fas fa-plus"></i>',
        callback: this._onAddActivation.bind(this),
      },
      {
        name: "LANCERINITIATIVE.RemoveActivation",
        icon: '<i class="fas fa-minus"></i>',
        callback: this._onRemoveActivation.bind(this),
      },
      {
        name: "LANCERINITIATIVE.UndoActivation",
        icon: '<i class="fas fa-undo"></i>',
        callback: this._onUndoActivation.bind(this),
      },
    ];
    m.push(...super._getEntryContextOptions().filter(i => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }
}

/**
 * Get the current appearance data from settings
 */
export function getTrackerAppearance(): NonNullable<CONFIG["LancerInitiative"]["def_appearance"]> {
  const config = CONFIG.LancerInitiative;
  if (!config.def_appearance) throw new Error("No default appearance specified in CONFIG.LancerInitiative");
  return {
    ...config.def_appearance,
    ...(game.settings.get(config.module, "combat-tracker-appearance") as Appearance),
  };
}

export function setAppearance(val: Partial<Appearance>): void {
  const defaults = CONFIG.LancerInitiative.def_appearance!;
  document.documentElement.style.setProperty(
    "--lancer-initiative-icon-size",
    `${val?.icon_size ?? defaults.icon_size}rem`
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-player-color",
    val?.player_color ?? defaults.player_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-friendly-color",
    val?.friendly_color ?? defaults.friendly_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-neutral-color",
    val?.neutral_color ?? defaults.neutral_color
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-enemy-color",
    val?.enemy_color ?? defaults.enemy_color
  );
  document.documentElement.style.setProperty("--lancer-initiative-done-color", val?.done_color ?? defaults.done_color);
  game.combats?.render();
}

type Appearance = Partial<CONFIG["LancerInitiative"]["def_appearance"]>;

/**
 * Register the helper we use to print the icon the correnct number of times
 */
Handlebars.registerHelper("lancerinitiative-repeat", function (n, block) {
  let accum = "";
  for (let i = 0; i < n; i++) accum += block.fn(i);
  return accum;
});
