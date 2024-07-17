import type { LancerCombat, LancerCombatant } from "../combat/lancer-combat";
import { LancerCombatTrackerConfig } from "./lancer-initiative-config-form";

const dispositions: Record<number, string> = {
  [-2]: "",
  [-1]: "enemy",
  [0]: "neutral",
  [1]: "friendly",
  [2]: "player",
};

/**
 * Hook to apply system specific customizations to the Combat Carousel UI
 * @param app  - The Combat Carousel ui form
 * @param html - The jquery data for the form
 */
export function handleRenderCombatCarousel(...[app, html]: Parameters<Hooks.RenderApplication<CombatCarousel>>) {
  const icon = game.settings.get(game.system.id, "combat-tracker-appearance").icon;
  html.addClass("lancer");
  html.find("li.card").each((_, e) => {
    const combatant_id = $(e).data("combatant-id");
    const combatant = app.combat?.getEmbeddedDocument("Combatant", combatant_id) as LancerCombatant | undefined;
    $(e).addClass(dispositions[combatant?.disposition ?? -2]);
    const pending = combatant?.activations.value ?? 0;
    const done = (combatant?.activations.max ?? 1) - pending;
    $(e)
      .find("div.initiative")
      .before(
        '<div class="lancer-activate">' +
          `<a class="${icon} lancer-combat-control" data-control="activateCombatant"></a>`.repeat(pending) +
          `<i class="${icon} lancer-combat-control done" data-control="deactivateCombatant"></i>`.repeat(done) +
          "</div>"
      );
  });
  html.find(".lancer-combat-control").on("click", ev => activateButton(app.combat, ev));
  html.find("a.turn").hide();
  html.find("div.initiative").hide();
  html.find("a.encounter-control[data-action=rollNPC]").hide();
  html.find("a.encounter-control[data-action=rollAll]").hide();
  html
    .find("a.encounter-control[data-action=config]")
    .off("click")
    .on("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      new LancerCombatTrackerConfig(undefined).render(true);
    });
}

function activateButton(
  combat: LancerCombat | undefined | null,
  ev: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
) {
  ev.preventDefault();
  ev.stopPropagation();
  if (!combat) return;
  const target = ev.currentTarget;
  const combatant = target.closest<HTMLElement>(".card")?.dataset.combatantId;
  if (!combatant) return;
  switch (target.dataset.control) {
    case "activateCombatant":
      combat.activateCombatant(combatant);
      break;
    case "deactivateCombatant":
      combat.deactivateCombatant(combatant);
      break;
  }
}

declare class CombatCarousel extends Application {
  combat?: LancerCombat | null;
}
