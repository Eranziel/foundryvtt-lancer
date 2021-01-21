import {
  LancerMechWeapon,
  LancerPilotWeapon,
} from "../item/lancer-item";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { prepareCoreActiveMacro, prepareCorePassiveMacro } from "../macros";
import { EntryType, MountType, OpCtx } from "machine-mind";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
import { funcs } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";

const lp = LANCER.log_prefix;

// TODO: should probably move to HTML/CSS
const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends LancerActorSheet<EntryType.PILOT> {
  /**
   * A convenience reference to the Actor entity
   */
  // get actor(): LancerPilot {
  //   return this.actor;
  // };

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the Pilot Sheet
   * @returns {Object}
   */
  static get defaultOptions(): object {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "pilot"],
      template: "systems/lancer/templates/actor/pilot.html",
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "pilot",
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

    if (this.actor.owner) {
      // Macro triggers
      // Stat rollers
      let statMacro = html.find(".roll-stat");
      statMacro.on("click", (ev) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        game.lancer.prepareStatMacro(this.actor, this.getStatPath(ev)!);
      });

      // Talent rollers
      let talentMacro = html.find(".talent-macro");
      talentMacro.on("click", (ev) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

        game.lancer.prepareItemMacro(this.actor._id, el.getAttribute("data-item-id")!, {
          rank: (<HTMLDataElement>ev.currentTarget).getAttribute("data-rank"),
        });
      });

      // TODO: This should really just be a single item-macro class
      // Trigger rollers
      let itemMacros = html
        .find(".skill-macro")
        // System rollers
        .add(html.find(".system-macro"))
        // Gear rollers
        .add(html.find(".gear-macro"))
        // Core bonus
        .add(html.find(".cb-macro"));
      itemMacros.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

        game.lancer.prepareItemMacro(this.actor, el.getAttribute("data-item-id")!);
      });

      // Core active & passive text rollers
      let CAMacro = html.find(".core-active-macro");
      CAMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        // let target = <HTMLElement>ev.currentTarget;

        prepareCoreActiveMacro(this.actor._id);
      });

      let CPMacro = html.find(".core-passive-macro");
      CPMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        // let target = <HTMLElement>ev.currentTarget;

        prepareCorePassiveMacro(this.actor._id);
      });

      // Weapon rollers
      let weaponMacro = html.find(".roll-attack");
      weaponMacro.on("click", (ev) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();

        const weaponElement = $(ev.currentTarget).closest(".weapon")[0] as HTMLElement;
        const weaponId = weaponElement.getAttribute("data-item-id");
        if (!weaponId) return ui.notifications.warn(`Error rolling macro: No weapon ID!`);
        const item = this.actor.getOwnedItem(weaponId);
        if (!item)
          return ui.notifications.warn(
            `Error rolling macro: Couldn't find weapon with ID ${weaponId}.`
          );

        const weapon = item as LancerPilotWeapon | LancerMechWeapon;
        game.lancer.prepareItemMacro(this.actor._id, weapon._id);
      });
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.owner) {
      // Item/Macroable Dragging
      const statMacroHandler = (e: DragEvent) => this._onDragMacroableStart(e);
      const talentMacroHandler = (e: DragEvent) => this._onDragTalentMacroableStart(e);
      const textMacroHandler = (e: DragEvent) => this._onDragTextMacroableStart(e);
      const CAMacroHandler = (e: DragEvent) => this._onDragCoreActiveStart(e);
      const CPMacroHandler = (e: DragEvent) => this._onDragCorePassiveStart(e);
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .add('[class*="macroable"]')
        .each((i: number, item: any) => {
          if (item.classList.contains("inventory-header")) return;
          if (item.classList.contains("stat-macro"))
            item.addEventListener("dragstart", statMacroHandler, false);
          if (item.classList.contains("talent-macro"))
            item.addEventListener("dragstart", talentMacroHandler, false);
          if (item.classList.contains("text-macro"))
            item.addEventListener("dragstart", textMacroHandler, false);
          if (item.classList.contains("core-active-macro"))
            item.addEventListener("dragstart", CAMacroHandler, false);
          if (item.classList.contains("core-passive-macro"))
            item.addEventListener("dragstart", CPMacroHandler, false);
          if (item.classList.contains("item"))
            item.addEventListener("dragstart", (ev: any) => this._onDragStart(ev), false);
          item.setAttribute("draggable", true);
        });

      // Update Inventory Item
      this.activateOpenItemListeners(html);

      // Delete Item when trash can is clicked
      let items = html.find('.stats-control[data-action*="delete"]');
      items.on("click", (ev) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers
        console.log(ev);
        const item = $(ev.currentTarget).closest(".item");
        const itemId = item.data("itemId");

        // Delete the item from the actor.
        this.actor.deleteOwnedItem(itemId).then();
        item.slideUp(200, () => this.render(true));
      });

      /*
      // Create Mounts
      let add_button = html.find('.add-button[data-action*="create"]');
      add_button.on("click", (ev) => {
        ev.stopPropagation();
        let mount: LancerMountData = {
          type: MountType.Main,
          weapons: [],
          secondary_mount: "",
        };

        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts.push(mount);
        this.actor.update({ "data.mech_loadout.mounts": mounts }).then();
        this._onSubmit(ev).then();
      });

      // Update Mounts
      let mount_selector = html.find('select.mounts-control[data-action*="update"]');
      mount_selector.on("change", (ev: JQuery.ChangeEvent) => {
        ev.stopPropagation();
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts[
          parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemKey"))
        ].type = $(ev.currentTarget).children("option:selected").val();
        this.actor.update({ "data.mech_loadout.mounts": mounts }).then();
        this._onSubmit(ev).then();
      });

      // Delete Mounts
      let mount_trash = html.find('a.mounts-control[data-action*="delete"]');
      mount_trash.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        let id = $(ev.currentTarget).closest(".lancer-mount-container").data("itemKey");
        // Delete each weapon in the selected mount from the actor's owned items
        let weapons = (this.actor.data.data as LancerPilotData).mech_loadout.mounts[id].weapons;
        for (let i = 0; i < weapons.length; i++) {
          const weapon = weapons[i];
          if (weapon._id) this.actor.deleteOwnedItem(weapon._id).then();
        }
        mounts.splice(parseInt(id), 1);
        this.actor.update({ "data.mech_loadout.mounts": mounts }).then();
        this._onSubmit(ev).then();
      });
      */

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      download.on("click", async (ev) => {
        ev.stopPropagation();
        // Get the data
        try {
          ui.notifications.info("Importing character...");
          let self = await this.getDataLazy();
          let raw_pilot_data = await funcs.gist_io.download_pilot(self.mm.ent.CloudID);

          // Pull the trigger
          let pseudo_compendium = new FoundryReg({ // We look for missing items here
            item_source: ["compendium", null],
            actor_source: "world"
          });
          let synced_data = await funcs.cloud_sync(raw_pilot_data, self.mm.ent, [pseudo_compendium]);
          if(!synced_data) {
            throw new Error("Pilot was somehow destroyed by the sync");
          }

          // Back-populate names and images
          await this.actor.update({
            name: synced_data.pilot.Name || this.actor.name,
            img: synced_data.pilot.CloudPortrait || this.actor.img,
          });

          for(let mech of synced_data.pilot_mechs) {
            let mech_actor = (mech.flags as FlagData<EntryType.MECH>).orig_entity;
            await mech_actor.update({
              name: mech.Name || mech_actor.name,
              img: mech.CloudPortrait || mech_actor.img
            }, {});
            mech_actor.render();
          }

          // Reset curr data and render all
          this._currData = null;
          this.actor.render();
          ui.notifications.info("Successfully loaded pilot state from cloud");
        } catch (e) {
          console.warn(e);
          ui.notifications.warn(
            "Failed to update pilot, likely due to missing LCP data: " + e.message
          );
        }
      });
    }
  }

  _onDragMacroableStart(event: DragEvent) {
    // For roll-stat macros
    event.stopPropagation(); // Avoids triggering parent event handlers
    // It's an input so it'll always be an InputElement, right?
    let path = this.getStatPath(event);
    if (!path) return ui.notifications.error("Error finding stat for macro.");

    let tSplit = path.split(".");
    let data = {
      title: tSplit[tSplit.length - 1].toUpperCase(),
      dataPath: path,
      type: "actor",
      actorId: this.actor._id,
    };
    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  _onDragTalentMacroableStart(event: DragEvent) {
    // For talent macros
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let data = {
      itemId: target.closest(".item")?.getAttribute("data-item-id"),
      actorId: this.actor._id,
      type: "Item",
      title: target.nextElementSibling?.textContent,
      rank: target.getAttribute("data-rank"),
      data: {
        type: EntryType.TALENT,
      },
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  // Baseline drop behavior. Let people add stuff to the pilot
  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail. 
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;
    const item = drop.entity;

    // Check if we can even do anything with it first
    if (!LANCER.pilot_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to a Pilot.`);
      return null;
    }

    // Make the context for the item
    const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

    // Always add the item to the pilot inventory, now that we know it is a valid pilot posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

    // Now, do sensible things with it
    let loadout = new_live_this.Loadout;
    if (new_live_item.Type === EntryType.PILOT_WEAPON) {
      // If weapon, try to equip to first empty slot
      for(let i = 0; i < loadout.Weapons.length; i++) {
        if(!loadout.Weapons[i]) {
          loadout.Weapons[i] = new_live_item;
          break;
        }
      }
    } else if (new_live_item.Type === EntryType.PILOT_GEAR) {
      // If gear, try to equip to first empty slot
      for(let i = 0; i < loadout.Gear.length; i++) {
        if(!loadout.Gear[i]) {
          loadout.Gear[i] = new_live_item;
          break;
        }
      }
    } else if (new_live_item.Type === EntryType.PILOT_ARMOR) {
      // If armor, try to equip to first empty slot
      for(let i = 0; i < loadout.Armor.length; i++) {
        if(!loadout.Gear[i]) {
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
  }

  /**
   * For macros which simple expect a title & description, no fancy handling.
   * Assumes data-path-title & data-path-description defined
   * @param event   The associated DragEvent
   */
  _onDragTextMacroableStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let data = {
      title: target.getAttribute("data-path-title"),
      description: target.getAttribute("data-path-description"),
      actorId: this.actor._id,
      type: "Text",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /**
   * For dragging the core active to the hotbar
   * @param event   The associated DragEvent
   */
  _onDragCoreActiveStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    // let target = <HTMLElement>event.currentTarget;

    let data = {
      actorId: this.actor._id,
      // Title will simply be CORE ACTIVE since we want to keep the macro dynamic
      title: "CORE ACTIVE",
      type: "Core-Active",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /**
   * For dragging the core passive to the hotbar
   * @param event   The associated DragEvent
   */
  _onDragCorePassiveStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    // let target = <HTMLElement>event.currentTarget;

    let data = {
      actorId: this.actor._id,
      // Title will simply be CORE PASSIVE since we want to keep the macro dynamic
      title: "CORE PASSIVE",
      type: "Core-Passive",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }
  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Only unique behavior we've got here is we want to set the token name using the callsign
    formData["actor.token.name"] = formData["data.callsign"];
    return super._updateObject(event, formData);
  }
}

