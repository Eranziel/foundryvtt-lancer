import { LancerCombatTour, LancerLcpTour } from "./lancer-tour";

export async function registerTours() {
  game.tours.register(game.system.id, "lcp", await LancerLcpTour.fromJSON("./systems/lancer/tours/lcp.json"));
  game.tours.register(game.system.id, "combat", await LancerCombatTour.fromJSON("./systems/lancer/tours/combat.json"));
}
