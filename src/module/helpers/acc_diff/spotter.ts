import { stateless } from "./serde";
import type { AccDiffPlugin, AccDiffPluginData } from "./plugin";
import type { AccDiffData, AccDiffTarget } from "./index";
import type { LancerActor } from "../../actor/lancer-actor";
import type { Mech, Pilot } from "machine-mind";
import type { LancerToken } from "../../token";

// this is an example of a case implemented without defining a full class
function adjacentSpotter(actor: LancerActor): boolean {
  // only players can benefit from spotter
  if (!actor.is_mech()) {
    return false;
  }

  // computation shamelessly stolen from sensor-sight

  let token: LancerToken = actor.getActiveTokens()[0];

  const spaces = token.getOccupiedSpaces();
  function adjacent(token: LancerToken) {
    const otherSpaces = token.getOccupiedSpaces();
    const rays = spaces.flatMap(s => otherSpaces.map(t => ({ ray: new Ray(s, t) })));
    const min_d = Math.min(...canvas.grid!.grid!.measureDistances(rays, { gridSpaces: true }));
    return min_d < 1.1;
  }

  // TODO: TYPECHECK: all of this seems to work
  let adjacentPilots = (canvas!.tokens!.objects!.children as LancerToken[])
    .filter((t: LancerToken) => t.actor?.is_mech() && adjacent(t) && t.id != token.id)
    // @ts-expect-error Should be fixed with v10 types
    .map((t: LancerToken) => (t.actor!.system.derived.mm! as Mech).Pilot);

  return !!adjacentPilots.find((p: Pilot | null) => p?.Talents.find(t => t.LID == "t_spotter"));
}

function spotter(): AccDiffPluginData {
  let sp = {
    actor: null as LancerActor | null,
    target: null as AccDiffTarget | null,
    uiElement: "checkbox" as "checkbox",
    slug: "spotter",
    humanLabel: "Spotter (*)",
    get uiState() {
      return !!(this.actor && this.target?.usingLockOn && adjacentSpotter(this.actor));
    },
    set uiState(_v: boolean) {
      // noop
    },
    disabled: true,
    get visible() {
      return !!this.target?.usingLockOn;
    },
    modifyRoll(roll: string) {
      if (this.uiState) {
        return `{${roll},${roll}}kh[🎯 spotter]`;
      } else {
        return roll;
      }
    },
    rollPrecedence: -100, // after numeric modifiers
    hydrate(data: AccDiffData, target?: AccDiffTarget) {
      this.actor = data.lancerActor || null;
      this.target = target || null;
    },
  };

  return sp;
}

const Spotter: AccDiffPlugin<AccDiffPluginData> = {
  slug: "spotter",
  codec: stateless(
    "Spotter",
    (t: unknown): t is AccDiffPluginData => typeof t == "object" && (t as any)?.slug == "spotter",
    spotter
  ),
  perTarget(_t: Token) {
    return spotter();
  },
};

export default Spotter;
