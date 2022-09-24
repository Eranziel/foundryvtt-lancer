import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, Mech, PackedPilotData, Pilot } from "machine-mind";
import type { HelperOptions } from "handlebars";
import { buildCounterHeader, buildCounterHTML } from "../helpers/item";
import { ref_commons, ref_params, resolve_ref_element, simple_mm_ref } from "../helpers/refs";
import { resolve_dotpath } from "../helpers/commons";
import { AnyMMActor, is_reg_mech, LancerActor } from "./lancer-actor";
import { fetchPilotViaCache, fetchPilotViaShareCode, pilotCache } from "../compcon";
import type { AnyMMItem, LancerItemType } from "../item/lancer-item";
import { clicker_num_input } from "../helpers/actor";

const shareCodeMatcher = /^[A-Z0-9\d]{6}$/g;
const COUNTER_MAX = 8;

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
      // @ts-expect-error Should be fixed with v10 types
      if (actor.is_pilot() && actor.system.derived.mm!.CloudID) {
        download.on("click", async ev => {
          ev.stopPropagation();

          let self = await this.getDataLazy();
          // Fetch data to sync
          let raw_pilot_data = null;
          if (self.rawID.match(shareCodeMatcher)) {
            // pilot share codes
            ui.notifications!.info("Importing character from share code...");
            console.log(`Attempting import with share code: ${self.rawID}`);
            try {
              raw_pilot_data = await fetchPilotViaShareCode(self.rawID);
            } catch (error) {
              ui.notifications!.error("Error importing from share code. Share code may need to be refreshed.");
              console.error(`Failed import with share code ${self.rawID}, error:`, error);
              return;
            }
          } else if (self.rawID) {
            ui.notifications!.warn(
              "Invalid share code format. Share codes must be exactly six alphanumeric characters."
            );
            console.warn(`Failed import with invalid share code format: ${self.rawID}`);
            return;
          } else if (self.vaultID != "") {
            // Vault ID from a logged-in Comp/Con account
            ui.notifications!.info("Importing character from COMP/CON account...");
            const cachedPilot = self.pilotCache.find(p => p.cloudID == self.vaultID);
            if (cachedPilot != undefined) {
              try {
                raw_pilot_data = await fetchPilotViaCache(cachedPilot);
              } catch (error) {
                ui.notifications!.error(
                  "Failed to import from COMP/CON account. Try refreshing the page to reload pilot list."
                );
                console.error(`Failed to import vaultID ${self.vaultID} via pilot list, error:`, error);
                return;
              }
            } else {
              ui.notifications!.error(
                "Failed to import from COMP/CON account. Try refreshing the page to reload pilot list"
              );
              console.error(`Failed to find pilot in cache, vaultID: ${self.vaultID}`);
              return;
            }
          } else {
            ui.notifications!.error(
              "Could not find character to import! No pilot selected via dropdown and no share code entered."
            );
            console.error(`Failed to import pilot. vaultID: ${self.vaultID}, rawID: ${self.rawID}`);
            return;
          }
          await actor.importCC(raw_pilot_data);
          this._currData = null;
        });
      } else {
        download.addClass("disabled-cloud");
      }

      // JSON Import
      if (actor.is_pilot()) {
        html.find("#pilot-json-import").on("change", ev => this._onPilotJsonUpload(ev, actor));
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

        if (!mech || !is_reg_mech(mech)) return;

        this.activateMech(mech);
      });

      let mechDeactivator = html.find(".deactivate-mech");
      mechDeactivator.on("click", async ev => {
        ev.stopPropagation();

        this.deactivateMech();
      });
    }
  }

  _onPilotJsonUpload(ev: JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLElement>, actor: LancerActor) {
    let files = (ev.target as HTMLInputElement).files;
    let jsonFile: File | null = null;
    if (files) jsonFile = files[0];
    if (!jsonFile) return;

    console.log(`${lp} Selected file changed`, jsonFile);
    const fr = new FileReader();
    fr.readAsBinaryString(jsonFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      this._onPilotJsonParsed((ev.target as FileReader).result as string, actor);
    });
  }

  async _onPilotJsonParsed(fileData: string | null, actor: LancerActor) {
    if (!fileData) return;
    const pilotData = JSON.parse(fileData) as PackedPilotData;
    console.log(`${lp} Pilot Data of selected JSON:`, pilotData);

    if (!pilotData) return;
    ui.notifications!.info(`Starting import of ${pilotData.name}, Callsign ${pilotData.callsign}. Please wait.`);
    console.log(`${lp} Starting import of ${pilotData.name}, Callsign ${pilotData.callsign}.`);
    console.log(`${lp} Parsed Pilot Data pack:`, pilotData);

    await actor.importCC(pilotData);
    ui.notifications!.info(`Import of ${pilotData.name}, Callsign ${pilotData.callsign} complete.`);
    console.log(`${lp} Import of ${pilotData.name}, Callsign ${pilotData.callsign} complete.`);
    this.render();
  }

  async activateMech(mech: Mech) {
    // @ts-expect-error Should be fixed with v10 types
    let this_mm = this.actor.system.derived.mm as Pilot;
    // Set active mech
    this_mm.ActiveMechRef = mech.as_ref();
    if (mech.Pilot?.RegistryID != mech.RegistryID) {
      // Also set the mechs pilot if necessary
      mech.Pilot = this_mm;
      mech.writeback();
    }

    await this_mm.writeback();
  }

  async deactivateMech() {
    // @ts-expect-error Should be fixed with v10 types
    let this_mm = this.actor.system.derived.mm as Pilot;

    // Unset active mech
    this_mm.ActiveMechRef = null;

    await this_mm.writeback();
  }

  async getData() {
    const data = await super.getData(); // Not fully populated yet!

    data.active_mech = await data.mm.ActiveMech();
    data.pilotCache = pilotCache();

    // use the select if and only if we have the pilot in our cache
    let useSelect = data.mm.CloudID && data.pilotCache.find(p => p.cloudID == data.mm.CloudID);

    if (useSelect) {
      // if this is a vault id we know of
      data.vaultID = data.mm.CloudID;
      data.rawID = "";
    } else if (data.mm.CloudID && data.mm.CloudID.match(shareCodeMatcher)) {
      // If this was a share code, show it in the input box so it can be edited
      data.rawID = data.mm.CloudID;
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
        if (!loadout.Armor[i]) {
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
    // @ts-expect-error Should be fixed with v10 types
    if (this.actor.system.callsign !== formData["data.pilot.callsign"]) {
      // Use the Actor's name for the pilot's callsign
      // formData["name"] = formData["data.callsign"];
      // Copy the pilot's callsign to the prototype token
      formData["actor.token.name"] = formData["data.callsign"];
    }
    // Then let parent handle
    return super._updateObject(event, formData);
  }
}

export function pilot_counters(pilot: Pilot, _helper: HelperOptions): string {
  let counter_detail = "";

  let counter_arr = pilot.PilotCounters;
  let custom_path = "mm.CustomCounters";

  for (let i = 0; i < counter_arr.length; i++) {
    // Only allow deletion if the Pilot is the source
    const counter = counter_arr[i].counter;
    if (counter.Max != null) {
      if (counter.Max <= COUNTER_MAX) {
        counter_detail = counter_detail.concat(
          buildCounterHTML(
            counter,
            `mm.PilotCounters.${i}.counter`,
            `mm.PilotCounters.${i}.source`,
            counter_arr[i].source === pilot
          )
        );
      } else {
        counter_detail = counter_detail.concat(
          buildCounterHeader(
            counter,
            `mm.PilotCounters.${i}.counter`,
            `mm.PilotCounters.${i}.source`,
            counter_arr[i].source === pilot
          ),
          clicker_num_input(`mm.PilotCounters.${i}.counter.Value`, counter.Max, _helper),
          "</div>"
        );
      }
    }
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header submajor" style="padding-right: 5px">
      <span>COUNTERS</span>
      <a class="gen-control fas fa-plus" data-action="append" data-path="${custom_path}" data-action-value="(struct)counter"></a>
    </span>
    <div class="wraprow double">
      ${counter_detail}
    </div>
  </div>`;
}

export function all_mech_preview(_helper: HelperOptions): string {
  let this_mm: Pilot = _helper.data.root.mm;
  let active_mech: Mech | null = _helper.data.root.active_mech;

  let html = ``;

  /// I still feel like this is pretty inefficient... but it's probably the best we can do for now
  game?.actors
    ?.filter(
      a =>
        a.is_mech() &&
        // @ts-expect-error Should be fixed with v10 types
        !!a.system.pilot &&
        // @ts-expect-error Should be fixed with v10 types
        a.system.pilot.id === _helper.data.root.actor.id &&
        a.id !== active_mech?.RegistryID
    )
    .map((m, k) => {
      // @ts-expect-error Should be fixed with v10 types
      let inactive_mech = m.system.derived.mm;

      if (!inactive_mech) return;

      if (!is_reg_mech(inactive_mech)) return;

      let cd = ref_commons(inactive_mech);
      if (!cd) return simple_mm_ref(EntryType.MECH, inactive_mech, "ERROR LOADING MECH", "", true);

      html = html.concat(`
      <div class="flexrow inactive-row">
        <a class="activate-mech" ${ref_params(cd.ref, cd.uuid)}><i class="cci cci-activate"></i></a>
        <div class="major valid ${cd.ref.type} ref" ${ref_params(cd.ref, cd.uuid)}>${m.name}</div>
      </div>
    `);
    });

  let cd = ref_commons(this_mm);
  if (active_mech) return active_mech_preview(active_mech, "active_mech", _helper).concat(html);
  else return html;
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
    <a class="deactivate-mech"><i class="cci cci-activate"></i></a>
      <span>ACTIVE MECH: ${mech.Name}</span>
    </div>
    <img class="valid ${cd.ref.type} ref" ${ref_params(cd.ref, cd.uuid)} src="${mech.Flags.top_level_data.img}"/>
    ${stats_html}
  </div>`);

  return html;
}
