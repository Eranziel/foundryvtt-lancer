import { stateless } from './serde';
import { getMacroSpeaker } from '../../macros';
import type { AccDiffPlugin, AccDiffPluginData } from './plugin';
import type { AccDiffData, AccDiffTarget } from './index';
import type { LancerItem } from '../../item/lancer-item';
import type { Pilot } from 'machine-mind';

// this is an example of a case implemented without defining a full class
function adjacentSpotter(item: LancerItem<any>): boolean {
  let actor = getMacroSpeaker(item?.actor?.id);
  // only players can have spotter
  if (!actor || actor.data.type != "mech") { return false; }

  // this isn't adjacency, it's "is within range 1 LOS with a hack for larger mechs", but it's good enough
  // computation taken from sensor-sight
  let radius = actor.data.data.derived.mm.Size;
  let token = actor.getActiveTokens()[0];
  let point = token.center;

  function inRange(token: { x: number, y: number }) {
    const range = Math.sqrt((token.x - point.x) * (token.x - point.x) + (token.y - point.y) * (token.y - point.y));
    const scale = canvas.scene.data.gridType > 1 ? Math.sqrt(3) / 2 : 1; // for hexes
    const grid = canvas.scene.data.grid;
    return (radius + .01) * grid * scale > range;
  }

  let adjacentPilots = canvas.tokens.objects.children
    .filter((t: Token) => inRange(t.center) && t != token)
    .map((t: Token) => t.actor.data.data.derived.mm.Pilot);

  return (adjacentPilots.find((p: Pilot) => p.Talents.find(t => t.LID == "t_spotter")));
}

function spotter(): AccDiffPluginData {
  let sp = {
    item: null as LancerItem<any> | null,
    target: null as AccDiffTarget | null,
    uiElement: "checkbox" as "checkbox",
    slug: "spotter",
    humanLabel: "Spotter (*)",
    get uiState() {
      return !!(this.item && this.target?.usingLockOn && adjacentSpotter(this.item))
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
      this.item = data.lancerItem || null;
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
