import { LANCER, replace_default_resource } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { Deployable, EntryType, LiveEntryTypes, Mech, OpCtx, Pilot } from "machine-mind";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import { mm_wrap_item } from "../mm-util/helpers";
import { funcs, quick_relinker, PackedPilotData } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { HelperOptions } from "handlebars";
import { buildCounterHTML } from "../helpers/item";
import { LancerActorSheetData } from "../interfaces";
import { ref_commons, ref_params, simple_mm_ref } from "../helpers/refs";
import { resolve_dotpath } from "../helpers/commons";
import { LancerActor } from "./lancer-actor";
import { fetchPilot, pilotNames } from "../compcon";

const lp = LANCER.log_prefix;

// TODO: should probably move to HTML/CSS
const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends LancerActorSheet<EntryType.PILOT> {
  // potential vault id
  // gets hooked into getData() to get bound to the template
  // we need this _and_ cloud id to have an idea of where to look, it seems like
  // maybe there's a better solution here
  vaultID: string = ""
  /**
   * Extend and override the default options used by the Pilot Sheet
   * @returns {Object}
   */
  static get defaultOptions(): object {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "pilot"],
      template: "systems/lancer/templates/actor/pilot.hbs",
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

  /* -------------------------------------------- */
  /* // Populate the callsign if blank (new Actor)
    if (data.data.pilot.callsign === "") {
      data.data.pilot.callsign = data.actor.name;
    }
    // Populate name if blank (new Actor)
    if (data.data.pilot.name === "") {
      data.data.pilot.name = data.actor.name;
    }

    // Put placeholder prompts in empty fields
    if (data.data.pilot.background === "") data.data.pilot.background = entryPrompt;
    if (data.data.pilot.history === "") data.data.pilot.history = entryPrompt;
    if (data.data.pilot.notes === "") data.data.pilot.notes = entryPrompt;

    // Generate the size string for the pilot's frame
    if (data.frame) {
      const frame: LancerFrame = data.frame;
      if (frame.data.data.stats.size === 0.5) {
        data.frame_size = "size-half";
      } else {
        data.frame_size = `size-${frame.data.data.stats.size}`;
      }
    } else {
      data.frame_size = "N/A";
    }

    // Newly-added value, overcharge_level, should be set if it doesn't exist
    if (typeof this.actor.data.data.mech.overcharge_level === "undefined") {
      this.actor.data.data.mech.overcharge_level = 0;
    }
    */

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // @ts-ignore .8
    if (this.actor.isOwner) {
      // Item/Macroable Dragging

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      let actor = this.actor as LancerActor<EntryType.PILOT>;
      download.on("click", async ev => {
        ev.stopPropagation();

        let self = await this.getDataLazy();
        // Fetch data to sync
        let raw_pilot_data = null;
        // we check for vault id first, because for vault-fetched pilots, the mm CloudID
        // gets populated with the vaultID, but they may not be in the old gist system.
        if (self.vaultID != "") {
          ui.notifications.info("Importing character from vault...");
          raw_pilot_data = await fetchPilot(self.vaultID);
        } else if (self.mm.CloudID != "") {
          ui.notifications.info("Importing character from cloud share code...");
          raw_pilot_data = await funcs.gist_io.download_pilot(self.mm.CloudID);
        } else {
          ui.notifications.error("Could not find character to import!");
          return;
        };

        await actor.importCC(raw_pilot_data);
        this._currData = null;
      });
    }
  }

  async getData(): Promise<LancerActorSheetData<EntryType.PILOT>> {
    const data = ((await super.getData()) as unknown) as LancerActorSheetData<EntryType.PILOT>; // Not fully populated yet!

    data.active_mech = await data.mm.ActiveMech();
    data.vaultID = this.vaultID;
    data.pilotCache = pilotNames();

    return data;
  }

  async _commitCurrMM() {
    this.vaultID = this?._currData?.vaultID || "";
    return super._commitCurrMM()
  }

  // Baseline drop behavior. Let people add stuff to the pilot
  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (!(drop?.type === "Item" || drop?.type === "Actor")) {
      return null; // Bail.
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;

    if (drop?.type === "Item") {
      const item = drop.entity;

      // Check if we can even do anything with it first
      if (!LANCER.pilot_items.includes(item.type)) {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to a Pilot.`);
        return null;
      }

      // Make the context for the item
      const item_mm: LiveEntryTypes<EntryType> = await mm_wrap_item(item, new OpCtx());

      // Always add the item to the pilot inventory, now that we know it is a valid pilot posession
      // Make a new ctx to hold the item and a post-item-add copy of our mech
      let new_ctx = new OpCtx();
      let this_inv = await this_mm.get_inventory();
      let new_live_item = await item_mm.insinuate(this_inv, new_ctx);

      // Update this, to re-populate arrays etc to reflect new item
      let new_live_this = (await this_mm.refreshed(new_ctx))!;

      // Now, do sensible things with it
      let loadout = new_live_this.Loadout;
      if (new_live_item.Type === EntryType.PILOT_WEAPON) {
        // If weapon, try to equip to first empty slot
        for (let i = 0; i < loadout.Weapons.length; i++) {
          if (!loadout.Weapons[i]) {
            loadout.Weapons[i] = new_live_item;
            break;
          }
        }
      } else if (new_live_item.Type === EntryType.PILOT_GEAR) {
        // If gear, try to equip to first empty slot
        for (let i = 0; i < loadout.Gear.length; i++) {
          if (!loadout.Gear[i]) {
            loadout.Gear[i] = new_live_item;
            break;
          }
        }
      } else if (new_live_item.Type === EntryType.PILOT_ARMOR) {
        // If armor, try to equip to first empty slot
        for (let i = 0; i < loadout.Armor.length; i++) {
          if (!loadout.Gear[i]) {
            loadout.Armor[i] = new_live_item;
            break;
          }
        }
      } else if (new_live_item.Type === EntryType.SKILL || new_live_item.Type == EntryType.TALENT) {
        // If skill or talent, reset to level 1
        new_live_item.CurrentRank = 1;
        await new_live_item.writeback(); // Since we're editing the item, we gotta do this
      }

      // Most other things we really don't need to do anything with

      // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
      await new_live_this.writeback();

      // Always return the item if we haven't failed for some reason
      return item;
    } else if (drop?.type === "Actor") {
      if (drop.entity.data.type != "mech") return null;
      const mech = drop.entity.data.data.derived.mm as Mech;

      this_mm.ActiveMechRef = mech.as_ref();

      this_mm.writeback();
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
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

// TODO: migrate to mech
/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * Also I can't think of a better way to handle actor-specific data like this here... ideally move to within the sheet eventually
 * @param level Level of overcharge, between 0 (1) and 3 (1d6+4) by default
 */
/*
export function overchargeButton(level: number) {
  // This seems like a very inefficient way to do this...
  // I don't think there's a good way to get an actor via handlebars helpers though besides this
  // Might just need to not use helpers for this?
  //@ts-ignore
  let actor: LancerActor = game.actors.get(this.actor._id);

  let rollVal = actor.getOverchargeRoll();

  if (!rollVal) {
    rollVal = "ERROR";
  }

  // Add a line break if it contains a plus to prevent it being too long
  let plusIndex = rollVal.indexOf("+");
  if (plusIndex > 0) {
    rollVal = rollVal.slice(0, plusIndex) + "<br>" + rollVal.slice(plusIndex);
  }

  return `<div class="overcharge-container">

      <a class="overcharge-macro macroable i--dark i--sm" data-action="roll-macro"><i class="fas fa-dice-d20"></i></a>
      <a class="overcharge-text">${rollVal}</a>
      <input style="display:none;border:none" type="number" name="data.mech.overcharge_level" value="${level}" data-dtype="Number"/>
      </input>
      <a class="overcharge-reset mdi mdi-restore"></a>
    </div>`;
}

 */

export function pilot_counters(ent: Pilot, helper: HelperOptions): string {
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
        true
      )
    );
  }
  // Now do our CustomCounters
  for (let i = 0; i < ent.CustomCounters.length; i++) {
    counter_detail = counter_detail.concat(buildCounterHTML(ent.CustomCounters[i], `mm.CustomCounters.${i}`, false));
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header submajor ">
      COUNTERS
      <a class="gen-control fas fa-plus" data-action="append" data-path="${custom_path}" data-action-value="(struct)counter"></a>
    </span>
    ${counter_detail}
  </div>`;
}

export function active_mech_preview(mech: Mech, path: string, helper: HelperOptions): string {
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

  return html;
}
