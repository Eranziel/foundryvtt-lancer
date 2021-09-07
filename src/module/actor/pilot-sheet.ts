import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, Mech, Pilot } from "machine-mind";
import { funcs } from "machine-mind";
import type { HelperOptions } from "handlebars";
import { buildCounterHTML } from "../helpers/item";
import { ref_commons, ref_params, resolve_ref_element, simple_mm_ref } from "../helpers/refs";
import { resolve_dotpath } from "../helpers/commons";
import { AnyMMActor, is_reg_mech, is_actor_type } from './lancer-actor';
import { cleanCloudOwnerID, fetchPilot, pilotCache } from "../compcon";
import type { AnyMMItem, LancerItemType } from "../item/lancer-item";
import { derived } from 'svelte/store';

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends LancerActorSheet<EntryType.PILOT> {
  /**
   * Extend and override the default options used by the Pilot Sheet
   * @returns {Object}
   */
  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "pilot"],
      template: `systems/${game.system.id}/templates/actor/pilot.hbs`,
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "tactical",
        },
      ],
    });
  }

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.isOwner) {
      // Item/Macroable Dragging

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      let actor = this.actor;
      if (actor.is_pilot() && actor.data.data.derived.mm!.CloudID) {
        download.on("click", async ev => {
          ev.stopPropagation();

          let self = await this.getDataLazy();
          // Fetch data to sync
          let raw_pilot_data = null;
          if (self.vaultID != "" || self.rawID.match(/\/\//)) {
            // new style vault code with owner information
            // it's possible that this was one we reconstructed and doesn't actually live in this user acct
            ui.notifications!.info("Importing character from vault...");
            try {
              raw_pilot_data = await fetchPilot(self.vaultID != "" ? self.vaultID : self.rawID);
            } catch {
              if (self.vaultID != "") {
                ui.notifications!.error("Failed to import. Probably a network error, please try again.");
              } else {
                ui.notifications!.error(
                  "Failed. You will have to ask the player whose pilot this is for their COMP/CON vault record code."
                );
              }
              return;
            }
          } else if (self.rawID.match(/^[^-]+(-[^-]+){4}/)) {
            // old-style vault code
            // not much we can do. we can try to fetch it and see if it works
            // it will if this pilot happens to be in this comp/con user's bucket
            ui.notifications!.info("Attempting to import from old-style vault code...");
            try {
              raw_pilot_data = await fetchPilot(self.rawID);
            } catch {
              ui.notifications!.error(
                "Failed. Old-style vault ids are phasing out in support; please ask the player whose pilot this is for their COMP/CON vault record code."
              );
              return;
            }
          } else if (self.rawID != "") {
            ui.notifications!.info("Importing character from cloud share code...");
            raw_pilot_data = await funcs.gist_io.download_pilot(self.rawID);
          } else {
            ui.notifications!.error("Could not find character to import!");
            return;
          }
          await actor.importCC(raw_pilot_data);
          this._currData = null;
        });
      } else {
        download.addClass("disabled-cloud");
      }

      // editing rawID clears vaultID
      // (other way happens automatically because we prioritise vaultID in commit)
      let rawInput = html.find('input[name="rawID"]');
      rawInput.on("input", async ev => {
        if ((ev.target as any).value != "") {
          (html.find('select[name="vaultID"]')[0] as any).value = "";
        }
      });

      // Mech swapping
      let mechActivators = html.find(".activate-mech");
      mechActivators.on("click", async ev => {
        ev.stopPropagation();
        let mech = await resolve_ref_element(ev.currentTarget);
        
        if(!mech || !is_reg_mech(mech)) return;

        this.activateMech(mech);
      })
    }
  }

  async activateMech(mech: Mech) {
    let this_mm = (this.actor.data.data.derived.mm as Pilot)
    // Set active mech
    this_mm.ActiveMechRef = mech.as_ref();
    if (mech.Pilot?.RegistryID != mech.RegistryID) {
      // Also set the mechs pilot if necessary
      mech.Pilot = this_mm;
      mech.writeback();
    }

    await this_mm.writeback();
  }

  async getData() {
    const data = await super.getData(); // Not fully populated yet!

    data.active_mech = await data.mm.ActiveMech();
    data.pilotCache = pilotCache();

    data.cleanedOwnerID = cleanCloudOwnerID(data.mm.CloudOwnerID);

    // use the select if and only if we have the pilot in our cache
    let useSelect =
      data.mm.CloudID &&
      data.cleanedOwnerID &&
      data.pilotCache.find(p => p.cloudID == data.mm.CloudID && p.cloudOwnerID == data.cleanedOwnerID);

    if (useSelect) {
      // if this is a vault id we know of
      data.vaultID = data.cleanedOwnerID + "//" + data.mm.CloudID;
      data.rawID = "";
    } else if (data.mm.CloudID) {
      // whatever this is, we need to display it as raw text, so the user can edit it
      if (data.cleanedOwnerID) {
        data.rawID = data.cleanedOwnerID + "//" + data.mm.CloudID;
      } else {
        data.rawID = data.mm.CloudID;
      }
      data.vaultID = "";
    } else {
      data.rawID = "";
      data.vaultID = "";
    }

    return data;
  }

  // Pilots can handle most stuff
  can_root_drop_entry(item: AnyMMActor | AnyMMItem): boolean {
    // Accept mechs, so as to change their actor
    if (item.Type == EntryType.MECH) {
      return true;
    }

    // Accept non pilot item
    if (LANCER.pilot_items.includes(item.Type as LancerItemType)) {
      return true;
    }

    // Reject anything else
    return false;
  }

  async on_root_drop(base_drop: AnyMMItem | AnyMMActor): Promise<void> {
    let sheet_data = await this.getDataLazy();
    let this_mm = sheet_data.mm;

    // Take posession
    let [drop, is_new] = await this.quick_own(base_drop);

    // Now, do sensible things with it
    let loadout = this_mm.Loadout;
    if (is_new && drop.Type === EntryType.PILOT_WEAPON) {
      // If new weapon, try to equip to first empty slot
      for (let i = 0; i < loadout.Weapons.length; i++) {
        if (!loadout.Weapons[i]) {
          loadout.Weapons[i] = drop;
          break;
        }
      }
    } else if (is_new && drop.Type === EntryType.PILOT_GEAR) {
      // If new gear, try to equip to first empty slot
      for (let i = 0; i < loadout.Gear.length; i++) {
        if (!loadout.Gear[i]) {
          loadout.Gear[i] = drop;
          break;
        }
      }
    } else if (is_new && drop.Type === EntryType.PILOT_ARMOR) {
      // If new armor, try to equip to first empty slot
      for (let i = 0; i < loadout.Armor.length; i++) {
        if (!loadout.Gear[i]) {
          loadout.Armor[i] = drop;
          break;
        }
      }
    } else if ((is_new && drop.Type === EntryType.SKILL) || drop.Type == EntryType.TALENT) {
      // If new skill or talent, reset to level 1
      drop.CurrentRank = 1;
      await drop.writeback(); // Since we're editing the item, we gotta do this
    } else if (drop.Type === EntryType.MECH) {
      this.activateMech(drop);
    }

    // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw
    await this_mm.writeback();
  }

  async _commitCurrMM() {
    if (this._currData) {
      // we prioritise vault ids here, so when the user selects a vault id via dropdown
      // it gets saved and any rawID doesn't, so the render clears the rawID
      // i.e., editing vaultID clears rawID
      // other way around happens in the rawID input listener
      let assignSplit = (str: string) => {
        if (str.match(/\/\//)) {
          let [owner, id] = str.split("//");
          this._currData!.mm.CloudOwnerID = owner;
          this._currData!.mm.CloudID = id;
        } else {
          this._currData!.mm.CloudID = str;
        }
      };

      if (this._currData.vaultID) {
        assignSplit(this._currData.vaultID);
      } else {
        assignSplit(this._currData.rawID);
      }
    }
    return super._commitCurrMM();
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event, formData: any) {
    if (!this.actor.is_pilot()) return;
    // Do some pre-processing
    // Do these only if the callsign updated
    if (this.actor.data.data.callsign !== formData["data.pilot.callsign"]) {
      // Use the Actor's name for the pilot's callsign
      // formData["name"] = formData["data.callsign"];
      // Copy the pilot's callsign to the prototype token
      formData["actor.token.name"] = formData["data.callsign"];
    }
    // Then let parent handle
    return super._updateObject(event, formData);
  }
}

export function pilot_counters(ent: Pilot, _helper: HelperOptions): string {
  let counter_detail = "";

  let counter_arr = ent.AllCounters;
  let custom_path = "mm.CustomCounters";

  // Pilots have AllCounters, but self-sourced ones refer to CustomCounters specifically
  for (let i = 0; i < counter_arr.length; i++) {
    // If our source is the pilot, we'll add it later to make sure we align with the CustomCounters index
    if (counter_arr[i].source === ent) continue;

    counter_detail = counter_detail.concat(
      buildCounterHTML(
        counter_arr[i].counter,
        `mm.Allcounters.${i}.counter`,
        false,
        `ent.AllCounters.${i}.source`,
        false
      )
    );
  }
  // Now do our CustomCounters
  for (let i = 0; i < ent.CustomCounters.length; i++) {
    counter_detail = counter_detail.concat(
      buildCounterHTML(ent.CustomCounters[i], `mm.CustomCounters.${i}`, true, "", true)
    );
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header submajor" style="padding-right: 5px">
      <span>COUNTERS</span>
      <a class="gen-control fas fa-plus" data-action="append" data-path="${custom_path}" data-action-value="(struct)counter"></a>
    </span>
    ${counter_detail}
  </div>`;
}

export function active_mech_preview(mech: Mech, path: string, _helper: HelperOptions): string {
  var html = ``;

  // Generate commons
  let cd = ref_commons(mech);
  if (!cd) return simple_mm_ref(EntryType.MECH, mech, "No Active Mech", path, true);

  // Making ourselves easy templates for the preview in case we want to switch in the future
  let preview_stats_arr = [
    { title: "HP", icon: "mdi mdi-heart-outline", path: "CurrentHP" },
    { title: "HEAT", icon: "cci cci-heat", path: "CurrentHeat" },
    { title: "EVASION", icon: "cci cci-evasion", path: "Evasion" },
    { title: "ARMOR", icon: "mdi mdi-shield-outline", path: "Armor" },
    { title: "STRUCTURE", icon: "cci cci-structure", path: "CurrentStructure" },
    { title: "STRESS", icon: "cci cci-reactor", path: "CurrentStress" },
    { title: "E-DEF", icon: "cci cci-edef", path: "EDefense" },
    { title: "SPEED", icon: "mdi mdi-arrow-right-bold-hexagon-outline", path: "Speed" },
    { title: "SAVE", icon: "cci cci-save", path: "SaveTarget" },
    { title: "SENSORS", icon: "cci cci-sensor", path: "SensorRange" },
  ];

  var stats_html = ``;

  for (let i = 0; i < preview_stats_arr.length; i++) {
    const builder = preview_stats_arr[i];
    stats_html = stats_html.concat(`
    <div class="mech-preview-stat-wrapper">
      <i class="${builder.icon} i--m i--dark"> </i>
      <span class="major">${builder.title}</span>
      <span class="major">${resolve_dotpath(mech, builder.path)}</span>
    </div>`);
  }

  html = html.concat(`
  <div class="mech-preview">
    <div class="mech-preview-titlebar">
      <span>ACTIVE MECH: ${mech.Name}</span>
    </div>
    <img class="valid ${cd.ref.type} ref" ${ref_params(cd.ref)} src="${mech.Flags.top_level_data.img}"/>
    ${stats_html}
  </div>`);

  /// I still feel like this is pretty inefficient... but it's probably the best we can do for now
  game?.actors?.filter( a => a.is_mech() && 
                        !!a.data.data.pilot && 
                        a.data.data.pilot.id === _helper.data.root.actor.id && 
                        a.id !== mech.RegistryID).map(m => {
    let inactive_mech = m.data.data.derived.mm;

    if(!inactive_mech) return;

    if (!is_reg_mech(inactive_mech)) return;

    let cd = ref_commons(inactive_mech);
    if (!cd) return simple_mm_ref(EntryType.MECH, inactive_mech, "ERROR LOADING MECH", path, true);

    html = html.concat(`
      <div class="flexrow">
        <a class="activate-mech" ${ref_params(cd.ref)} draggable="true"><i class="cci cci-activate"></i></a>
        <div class="major valid ${cd.ref.type} ref" ${ref_params(cd.ref)}>${m.name}</div>
      </div>
    `)
  })

  return html;
}
