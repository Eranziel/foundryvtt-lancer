import { LANCER } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
import { SystemTemplates } from "../system-template";
import { DAMAGE } from "../util/unpacking/defaults";
import { LancerItemSheet } from "./item-sheet";
import * as defaults from "../util/unpacking/defaults";
import { Damage } from "../models/bits/damage";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCFeatureSheet extends LancerItemSheet<EntryType.NPC_FEATURE> {
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Watch for damage append. Can't use a gen-control for this one because it needs to
    // insert into 3 different arrays.
    html.find(".npc-damage-append").on("click", _e => {
      console.log("NPC damage append");
      if (!this.object.is_npc_feature() || this.object.system.type !== NpcFeatureType.Weapon) return;
      const damages = (this.object.system as unknown as SystemTemplates.NPC.WeaponData).damage;
      damages[0].push(new Damage(defaults.DAMAGE()));
      damages[1].push(new Damage(defaults.DAMAGE()));
      damages[2].push(new Damage(defaults.DAMAGE()));
      console.log("new damages", damages);
      this.object.update({
        "system.damage": damages,
      });
    });
  }
}
