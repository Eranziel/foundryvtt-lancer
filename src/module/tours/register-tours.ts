import { LancerLcpTour } from "./lancer-tour";

export async function registerTours() {
  // @ts-expect-error Tours not typed
  game.tours.register(game.system.id, "lcp", await LancerLcpTour.fromJSON("./systems/lancer/tours/lcp.json"));
}
