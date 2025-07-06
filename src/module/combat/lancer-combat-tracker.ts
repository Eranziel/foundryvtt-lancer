import { LANCER } from "../config.js";
import type { CombatTrackerAppearance } from "../settings.js";
import type { LancerCombat, LancerCombatant } from "./lancer-combat.js";

/**
 * Overrides the display of the combat and turn order tab to add activation
 * buttons and either move or remove the initiative button
 */
// @ts-expect-error V13 namespacing
export class LancerCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  static DEFAULT_OPTIONS = {
    actions: {
      activateCombatantTurn: LancerCombatTracker.#activateCombatantTurn,
      deactivateCombatantTurn: LancerCombatTracker.#deactivateCombatantTurn,
    },
  };
  static PARTS = foundry.utils.mergeObject(
    // @ts-expect-error V13 namespacing
    foundry.applications.sidebar.tabs.CombatTracker.PARTS,
    { tracker: { template: "systems/lancer/templates/combat/tracker.hbs" } },
    { inplace: false }
  );

  viewed!: LancerCombat;

  async _prepareTrackerContext(ctx: any, opts: any) {
    const appearance = game.settings.get(game.system.id, LANCER.setting_combat_appearance);
    const disp: Record<number, string> = { [-2]: "", [-1]: "enemy", [0]: "neutral", [1]: "friendly", [2]: "player" };
    await super._prepareTrackerContext(ctx, opts);
    ctx.turns = ctx.turns?.map((t: any) => {
      const combatant: LancerCombatant = this.viewed.getEmbeddedDocument("Combatant", t.id, {}) as any;
      // @ts-expect-error v13 Combatant typedata
      const buttons = Array.from(Array(combatant?.system.activations.value ?? 0), () => ({
        icon: appearance.icon,
        action: "activateCombatantTurn",
      }));
      if (combatant === this.viewed.combatant)
        buttons.push({ icon: appearance.deactivate, action: "deactivateCombatantTurn" });
      return {
        ...t,
        css: `${t.css} ${disp[combatant.disposition]}`.trim(),
        buttons,
        // @ts-expect-error v13 Combatant typedata
        activations: combatant?.system.activations.max,
        // @ts-expect-error v13 Combatant typedata
        pending: combatant?.system.activations.value,
      };
    });
    if (game.settings.get(game.system.id, LANCER.setting_combat_sort) && ctx?.turns != null) {
      ctx.turns.sort(function (a: any, b: any) {
        const aa = a.css.indexOf("active") !== -1 ? 1 : 0;
        const ba = b.css.indexOf("active") !== -1 ? 1 : 0;
        if (ba - aa !== 0) return ba - aa;
        const ad = a.pending === 0 ? 1 : 0;
        const bd = b.pending === 0 ? 1 : 0;
        return ad - bd;
      });
    }
  }

  static async #activateCombatantTurn(this: LancerCombatTracker, ev: MouseEvent, target: HTMLElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const { combatantId } = target.closest<HTMLElement>("[data-combatant-id]")?.dataset ?? {};
    this.viewed.activateCombatant(combatantId!);
  }

  static async #deactivateCombatantTurn(this: LancerCombatTracker, ev: MouseEvent, target: HTMLElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const { combatantId } = target.closest<HTMLElement>("[data-combatant-id]")?.dataset ?? {};
    this.viewed.deactivateCombatant(combatantId!);
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
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.addActivations(1);
  }

  protected async _onRemoveActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.addActivations(-1);
  }

  protected async _onUndoActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.modifyCurrentActivations(1);
  }

  protected _getEntryContextOptions(): ContextMenuEntry[] {
    const getCombatant = (li: HTMLLIElement) => this.viewed.combatants.get(li.dataset.combatantId!);
    const m: ContextMenuEntry[] = [
      {
        name: "LANCERINITIATIVE.AddActivation",
        icon: '<i class="fas fa-plus"></i>',
        // @ts-expect-error v13 jquery deprecation
        callback: (li: HTMLLIElement) => getCombatant(li)?.addActivations(1),
      },
      {
        name: "LANCERINITIATIVE.RemoveActivation",
        icon: '<i class="fas fa-minus"></i>',
        // @ts-expect-error v13 jquery deprecation
        callback: (li: HTMLLIElement) => getCombatant(li)?.addActivations(-1),
      },
      {
        name: "LANCERINITIATIVE.UndoActivation",
        icon: '<i class="fas fa-undo"></i>',
        // @ts-expect-error v13 jquery deprecation
        callback: (li: HTMLLIElement) =>
          this.viewed
            .deactivateCombatant(li.dataset.combatantId!)
            .then(() => getCombatant(li)?.modifyCurrentActivations(1)),
      },
    ];
    m.push(...super._getEntryContextOptions().filter((i: any) => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }
}

export function setAppearance(val?: CombatTrackerAppearance): void {
  if (!val) return;
  document.documentElement.style.setProperty("--lancer-initiative-icon-size", `${val.icon_size}rem`);
  document.documentElement.style.setProperty("--lancer-initiative-player-color", val.player_color?.toString() ?? null);
  document.documentElement.style.setProperty(
    "--lancer-initiative-friendly-color",
    val.friendly_color?.toString() ?? null
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-neutral-color",
    val?.neutral_color?.toString() ?? null
  );
  document.documentElement.style.setProperty("--lancer-initiative-enemy-color", val?.enemy_color?.toString() ?? null);
  document.documentElement.style.setProperty("--lancer-initiative-done-color", val?.done_color?.toString() ?? null);
  game.combats?.render();
}
