import { LancerCombatTour, LancerLcpTour, LancerPilotTour } from "./lancer-tour";

export async function registerTours() {
  game.tours.register(
    game.system.id,
    "lcp",
    await LancerLcpTour.fromJSON(`./systems/${game.system.id}/tours/lcp.json`)
  );
  game.tours.register(
    game.system.id,
    "pilot-import",
    await LancerPilotTour.fromJSON(`./systems/${game.system.id}/tours/pilot-import.json`)
  );
  game.tours.register(
    game.system.id,
    "combat",
    await LancerCombatTour.fromJSON(`./systems/${game.system.id}/tours/combat.json`)
  );
}
