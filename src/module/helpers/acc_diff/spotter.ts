import { stateless } from './serde';
import type { AccDiffPlugin, AccDiffPluginData } from './plugin';
import type { AccDiffData, AccDiffTarget } from './index';
import type { LancerActor } from '../../actor/lancer-actor';
import type { Mech, Pilot } from 'machine-mind';

// this is an example of a case implemented without defining a full class
function adjacentSpotter(actor: LancerActor): boolean {
  // only players can benefit from spotter
  if (!actor.is_mech()) { return false; }

  // this isn't adjacency, it's "is within range 1 LOS with a hack for larger mechs", but it's good enough
  // computation taken from sensor-sight
  let radius = actor.data.data.derived.mm!.Size;
  let token = actor.getActiveTokens()[0];
  // TODO: TYPECHECK: center does always seem to exist on this thing ts thinks is a LancerTokenDocument
  let point = (token as any).center;

  function inRange(token: { x: number, y: number }) {
    const range = Math.sqrt((token.x - point.x) * (token.x - point.x) + (token.y - point.y) * (token.y - point.y));
    const scale = canvas!.scene!.data.gridType > 1 ? Math.sqrt(3) / 2 : 1; // for hexes
    const grid = canvas!.scene!.data.grid;
    return (radius + .01) * grid * scale > range;
  }

  // TODO: TYPECHECK: all of this seems to work
  let adjacentPilots = (canvas!.tokens!.objects!.children as Token[])
    .filter((t: Token) => t.actor?.is_mech() && inRange((t as any).center) && t.id != token.id)
    .map((t: Token) => (t.actor!.data.data.derived.mm! as Mech).Pilot);

  return !!(adjacentPilots.find((p: Pilot | null) => p?.Talents.find(t => t.LID == "t_spotter")));
}

function spotter(): AccDiffPluginData {
  let sp = {
    actor: null as LancerActor | null,
    target: null as AccDiffTarget | null,
    uiElement: "checkbox" as "checkbox",
    slug: "spotter",
    humanLabel: "Spotter (*)",
    get uiState() {
      return !!(this.actor && this.target?.usingLockOn && adjacentSpotter(this.actor))
    },
    set uiState(_v: boolean) {
      // noop
    },
    disabled: true,
    get visible() {
      return !!(this.target?.usingLockOn);
    },
    modifyRoll(roll: string) {
      if (this.uiState) {
        return roll.replace('1d20', '2d20kh1[spotter]');
      } else {
        return roll;
      }
    },
    hydrate(data: AccDiffData, target?: AccDiffTarget) {
      this.actor = data.lancerActor || null;
      this.target = target || null;
    }
  };

  return sp;
}

const Spotter: AccDiffPlugin<AccDiffPluginData> = {
  slug: "spotter",
  codec: stateless("Spotter",
    (t: unknown): t is AccDiffPluginData => typeof t == 'object' && (t as any)?.slug == "spotter",
    spotter
  ),
  perTarget(_t: Token) { return spotter() }
}

export default Spotter;
