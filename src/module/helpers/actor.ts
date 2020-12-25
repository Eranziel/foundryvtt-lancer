import { MechLoadout } from "machine-mind";
import { simple_mm_ref } from "./commons";

// HEAVY WIP
export function mech_loadout(loadout: MechLoadout): string {
    const frame = simple_mm_ref(loadout.Frame);
    const weapons = loadout.Weapons.map(w => simple_mm_ref(w));
    const systems = loadout.Systems.map(s => simple_mm_ref(s));
    return `
  <div class="flexcol card clipped">
    <span class="lancer-stat-header major clipped-top">LOADOUT</span>
        <span> Equipped frame: </span>
        ${frame}
        <span> Equipped weapons: </span>
        ${weapons.join("\n")}
        <span> Equipped systems: </span>
        ${systems.join("\n")}
      {{{ref-mm frame}}}
    </span>
  </div>`
}


