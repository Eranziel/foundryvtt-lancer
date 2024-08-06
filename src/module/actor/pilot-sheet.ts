import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { LancerActorSheet } from "./lancer-actor-sheet";
import type { HelperOptions } from "handlebars";
import { buildCounterHeader, buildCounterHTML } from "../helpers/item";
import { ref_params, resolve_ref_element, simple_ref_slot } from "../helpers/refs";
import { inc_if, resolveDotpath } from "../helpers/commons";
import { LancerActor, LancerMECH, LancerPILOT } from "./lancer-actor";
import { fetchPilotViaShareCode } from "../util/compcon";
import { LancerFRAME, LancerItem, LancerItemType } from "../item/lancer-item";
import { clicker_num_input } from "../helpers/actor";
import { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";
import { PackedPilotData } from "../util/unpacking/packed-types";
import { importCC } from "./import";

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
      let pilot = this.actor as LancerPILOT;
      // Item/Macroable Dragging

      // Cloud id select
      let cloudSelect = html.find('select[name="selectCloudId"]');
      cloudSelect.on("change", evt => {
        evt.stopPropagation();
        pilot.update({ "system.cloud_id": (evt.target as HTMLSelectElement).value });
      });

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      if (pilot.system.cloud_id) {
        download.on("click", async ev => {
          ev.stopPropagation();

          // Fetch data to sync
          let raw_pilot_data = null;
          if (pilot.system.cloud_id.match(shareCodeMatcher)) {
            // pilot share codes
            ui.notifications!.info("Importing character from share code...");
            console.log(`Attempting import with share code: ${pilot.system.cloud_id}`);
            try {
              raw_pilot_data = await fetchPilotViaShareCode(pilot.system.cloud_id);
            } catch (error) {
              ui.notifications!.error("Error importing from share code. Share code may need to be refreshed.");
              console.error(`Failed import with share code ${pilot.system.cloud_id}, error:`, error);
              return;
            }
          } else {
            ui.notifications!.error("Could not find character to import! No share code entered.");
            return;
          }
          await importCC(this.actor as LancerPILOT, raw_pilot_data);
        });
      } else {
        download.addClass("disabled-cloud");
      }

      // JSON Import
      html.find("#pilot-json-import").on("change", ev => this._onPilotJsonUpload(ev));

      // Mech swapping
      let mechActivators = html.find(".activate-mech");
      mechActivators.on("click", async ev => {
        ev.stopPropagation();
        let mech = (await resolve_ref_element(ev.currentTarget.parentElement!)) as LancerActor | null;

        if (!mech || !mech.is_mech()) return;

        this.activateMech(mech);
      });

      let mechDeactivator = html.find(".deactivate-mech");
      mechDeactivator.on("click", async ev => {
        ev.stopPropagation();

        this.deactivateMech();
      });
    }
  }

  _onPilotJsonUpload(ev: JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    let files = (ev.target as HTMLInputElement).files;
    let jsonFile: File | null = null;
    if (files) jsonFile = files[0];
    if (!jsonFile) return;

    console.log(`${lp} Selected file changed`, jsonFile);
    const fr = new FileReader();
    fr.readAsBinaryString(jsonFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      this._onPilotJsonParsed((ev.target as FileReader).result as string, this.actor);
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

    await importCC(this.actor as LancerPILOT, pilotData);
    ui.notifications!.info(`Import of ${pilotData.name}, Callsign ${pilotData.callsign} complete.`);
    console.log(`${lp} Import of ${pilotData.name}, Callsign ${pilotData.callsign} complete.`);
    this.render();
  }

  activateMech(mech: LancerMECH) {
    let pilot = this.actor as LancerPILOT;
    // Set active mech
    pilot.update({ "system.active_mech": mech.uuid });
    mech.update({ "system.pilot": pilot.uuid });
  }

  async deactivateMech() {
    // Unset active mech
    await this.actor.update({
      "system.active_mech": null,
    });
  }

  async getData() {
    const data = await super.getData(); // Not fully populated yet!
    const pilot = this.actor as LancerPILOT;

    if (pilot.system.cloud_id && pilot.system.cloud_id.match(shareCodeMatcher)) {
      // If this was a share code, show it in the input box so it can be edited
      data.vaultID = "";
      data.rawID = pilot.system.cloud_id;
    } else {
      data.rawID = "";
      data.vaultID = "";
    }

    return data;
  }

  // Pilots can handle most stuff
  canRootDrop(item: ResolvedDropData): boolean {
    // Accept mechs, so as to change their pilot
    if (item.type == "Actor" && item.document.is_mech()) {
      return true;
    }

    // Accept pilot items
    if (
      item.type == "Item" &&
      (item.document.is_core_bonus() ||
        item.document.is_pilot_weapon() ||
        item.document.is_pilot_armor() ||
        item.document.is_pilot_gear() ||
        item.document.is_license() ||
        item.document.is_skill() ||
        item.document.is_talent() ||
        item.document.is_organization() ||
        item.document.is_reserve() ||
        item.document.is_bond())
    ) {
      return true;
    }

    // Reject anything else
    return false;
  }

  async onRootDrop(base_drop: ResolvedDropData, event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {
    if (!this.actor.is_pilot()) return; // Just for types really
    let pilot = this.actor as LancerPILOT;
    let loadout = pilot.system.loadout;
    let oldBonds = pilot.items.filter(i => i.is_bond());

    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    // Now, do sensible things with it
    if (drop.type == "Item") {
      // Handle all pilot item types
      if (drop.document.is_pilot_weapon()) {
        // If new weapon, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.weapons.length || i <= 2; i++) {
          if (!loadout.weapons[i]) {
            await pilot.update({
              [`system.loadout.weapons.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if (drop.document.is_pilot_gear()) {
        // If new gear, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.gear.length || i <= 3; i++) {
          if (!loadout.gear[i]) {
            await pilot.update({
              [`system.loadout.gear.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if (drop.document.is_pilot_armor()) {
        // If new armor, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.armor.length || i <= 1; i++) {
          if (!loadout.armor[i]) {
            await pilot.update({
              [`system.loadout.armor.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if ((is_new && drop.document.is_talent()) || drop.document.is_skill()) {
        // If new skill or talent, reset to level 1
        await drop.document.update({ "system.rank": 1 });
      } else if (is_new && drop.document.is_bond() && oldBonds.length > 0) {
        // Delete all other bond items
        for (let oldBond of oldBonds) {
          await pilot._safeDeleteDescendant("Item", [oldBond]);
        }
      }
    } else if (drop.type == "Actor" && drop.document.is_mech()) {
      this.activateMech(drop.document);
    }

    // TODO
    // If this isn't a new item and it's an NPC feature, we need to update the sorting
    // if (
    //   this.isEditable &&
    //   !is_new &&
    //   drop.type === "Item" &&
    //   (drop.document.is_pilot_gear() || drop.document.is_pilot_weapon() || drop.document.is_reserve())
    // ) {
    //   // @ts-expect-error v11 types
    //   this._onSortItem(event, drop.document.toObject());
    // }
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
    if (this.actor.system.callsign !== formData["callsign"]) {
      // Use the Actor's name for the pilot's callsign
      // formData["name"] = formData["data.callsign"];
      // Copy the pilot's callsign to the prototype token
      formData["prototypeToken.name"] = formData["callsign"];
    }
    // Then let parent handle
    return super._updateObject(event, formData);
  }
}

export function pilotCounters(pilot: LancerPILOT, _options: HelperOptions): string {
  let counter_detail = "";

  let counter_arr = pilot.system.custom_counters;

  for (let i = 0; i < counter_arr.length; i++) {
    // Only allow deletion if the Pilot is the source
    const counter = counter_arr[i];
    if (counter.max != null) {
      if (counter.max <= COUNTER_MAX) {
        counter_detail = counter_detail.concat(
          buildCounterHTML(counter, `system.custom_counters.${i}`, { canDelete: true })
        );
      } else {
        counter_detail = counter_detail.concat(
          buildCounterHeader(counter, `system.custom_counters.${i}`, { canDelete: true }),
          clicker_num_input(`system.custom_counters.${i}.value`, _options),
          "</div>"
        );
      }
    }
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header lancer-primary submajor" style="padding-right: 5px">
      <span>COUNTERS</span>
      <a class="gen-control fas fa-plus" data-action="append" data-path="system.custom_counters" data-action-value="(struct)counter"></a>
    </span>
    <div class="wraprow double">
      ${counter_detail}
    </div>
  </div>`;
}

export function allMechPreview(_options: HelperOptions): string {
  let active_mech: LancerMECH | null = _options.data.root.system.active_mech?.value;

  /// I still feel like this is pretty inefficient... but it's probably the best we can do for now
  let owned_mechs = (game?.actors?.filter(
    mech =>
      mech.is_mech() &&
      mech.system.pilot?.status == "resolved" &&
      mech.system.pilot.value.id === _options.data.root.actor.id
  ) ?? []) as unknown as LancerMECH[];
  let as_html = [];
  for (let m of owned_mechs) {
    as_html.push(mech_preview(m, m == active_mech, _options));
  }
  return as_html.join("");
}

export function mech_preview(mech: LancerMECH, active: boolean, _options: HelperOptions): string {
  // Generate commons
  let frame = mech.items.find(i => i.type === EntryType.FRAME) as LancerFRAME | undefined;
  let mfr = frame?.system.manufacturer;

  // Making ourselves easy templates for the preview in case we want to switch in the future
  let preview_stats_arr = [
    { title: "HP", icon: "mdi mdi-heart-outline", path: "system.hp.value" },
    { title: "HEAT", icon: "cci cci-heat", path: "system.heat.value" },
    { title: "EVASION", icon: "cci cci-evasion", path: "system.evasion" },
    { title: "ARMOR", icon: "mdi mdi-shield-outline", path: "system.armor" },
    { title: "STRUCTURE", icon: "cci cci-structure", path: "system.structure.value" },
    { title: "STRESS", icon: "cci cci-reactor", path: "system.stress.value" },
    { title: "E-DEF", icon: "cci cci-edef", path: "system.edef" },
    { title: "SPEED", icon: "mdi mdi-arrow-right-bold-hexagon-outline", path: "system.speed" },
    { title: "SAVE", icon: "cci cci-save", path: "system.save" },
    { title: "SENSORS", icon: "cci cci-sensor", path: "system.sensor_range" },
  ];

  let stats_html = ``;

  for (let i = 0; i < preview_stats_arr.length; i++) {
    const builder = preview_stats_arr[i];
    stats_html = stats_html.concat(`
    <div class="mech-preview-stat-wrapper">
      <i class="${builder.icon} i--m i--dark"> </i>
      <span class="major">${builder.title}</span>
      <span class="major">${resolveDotpath(mech, builder.path, 0)}</span>
    </div>`);
  }

  let button = active
    ? `<a class="deactivate-mech"><i class="cci cci-deactivate"></i></a>`
    : `<a class="activate-mech"><i class="cci cci-activate"></i></a>`;

  return `
  <div class="mech-preview lancer-border-${active ? "primary" : "dark-gray"}">
    <div class="mech-preview-titlebar ref set click-open ${active ? "active" : "inactive"}" ${ref_params(mech)}>
      ${button}
      <span>${mech.name}${inc_if(" // ACTIVE", active)}  --  ${mfr} ${frame?.name}</span>
    </div>
    <img src="${mech.img}"/>
    ${stats_html}
  </div>`;
}
