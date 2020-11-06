import {
  LancerPilotSheetData,
  LancerFrameStatsData,
  LancerMountData,
  LancerPilotData, LancerStatMacroData, LancerAttackMacroData, LancerPilotWeaponData
} from "../interfaces";
import {
  LancerItem,
  LancerFrame,
  LancerMechWeapon,
  LancerItemData,
  LancerSkill,
  LancerTalent,
  LancerLicense,
  LancerCoreBonus,
  LancerPilotGear,
  LancerPilotWeapon,
  LancerPilotArmor,
  LancerMechSystem,
} from "../item/lancer-item";
import { LancerActor } from "./lancer-actor";
import { LANCER } from "../config";
import { ItemDataManifest } from "../item/util";
import { MountType } from "machine-mind";
import { import_pilot_by_code, update_pilot } from "./util";
import { prepareCoreActiveMacro, prepareCorePassiveMacro } from "../macros";
const lp = LANCER.log_prefix;

// TODO: should probably move to HTML/CSS
const entryPrompt = "//:AWAIT_ENTRY>";

/**
* Extend the basic ActorSheet
*/
export class LancerPilotSheet extends ActorSheet {
  _sheetTab: string = ""; // What is this
  
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
  
  /**
  * Prepare data for rendering the Actor sheet
  * The prepared data object contains both the actor data as well as additional sheet options
  */
  getData(): LancerPilotSheetData {
    const data: LancerPilotSheetData = super.getData() as LancerPilotSheetData;

    this._prepareItems(data);
    
    // Populate the callsign if blank (new Actor)   
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
    
    console.log(`${lp} Pilot sheet data: `, data);
    return data;
  }
  
  /* -------------------------------------------- */
  
  /**
  * Organize and classify Owned Items for Character sheets
  * @private
  */
  _prepareItems(data: LancerPilotSheetData) {
    data.sp_used = 0;
    
    // Mirror items into filtered list properties
    // let pilot_items = this.actor.items as Collection<LancerItem>;
    let item_data = (data.items as unknown) as LancerItemData[]; // This is a "True" casting. The typing of data.items is just busted
    // let sorted = new ItemManifest().add_items(pilot_items.values());
    let sorted = new ItemDataManifest().add_items(item_data.values());
    let sp_count = sorted.count_sp();
    
    data.sp_used = sp_count;
    // This is all so wrong but necessary for the time being. Really, both sides of this are just ItemData but the LancerPilotSheetData types are messed up
    data.skills = (sorted.skills as unknown) as LancerSkill[];
    data.talents = (sorted.talents as unknown) as LancerTalent[];
    data.licenses = (sorted.licenses as unknown) as LancerLicense[];
    data.core_bonuses = (sorted.core_bonuses as unknown) as LancerCoreBonus[];
    data.pilot_loadout = {
      gear: (sorted.pilot_gear as unknown) as LancerPilotGear[],
      weapons: (sorted.pilot_weapons as unknown) as LancerPilotWeapon[],
      armor: (sorted.pilot_armor as unknown) as LancerPilotArmor[],
    };
    
    let frame = (<LancerActor>this.actor).getCurrentFrame();
    if (frame) {
      // I'm pretty sure this is very cursed
      // But items are getting reworked. FIX THIS ON ITEM REWORK since it's not worth reworking all our type assumptions here
      data.frame = <LancerFrame>{};
      data.frame.data = frame;
    }
    
    // Equip mech garbo
    data.mech_loadout = {
      weapons: (sorted.mech_weapons as unknown) as LancerMechWeapon[], // TODO: Handle mounts
      systems: (sorted.mech_systems as unknown) as LancerMechSystem[],
    };
    
    // Update mounted weapons to stay in sync with owned items
    data.data.mech_loadout.mounts.forEach((mount: any) => {
      if (Array.isArray(mount.weapons) && mount.weapons.length > 0) {
        // console.log(`${lp} weapons:`, mount.weapons);
        for (let i = 0; i < mount.weapons.length; i++) {
          const ownedWeapon = this.actor.getOwnedItem(mount.weapons[i]._id);
          if (ownedWeapon) {
            // console.log(`${lp} owned weapon:`, ownedWeapon);
            mount.weapons[i] = duplicate(ownedWeapon.data);
          }
          // TODO: If the weapon doesn't exist in owned items anymore, remove it
          else {
            mount.weapons.splice(i, 1);
          }
        }
      }
    });
    console.log(`${lp} mounts:`, data.data.mech_loadout.mounts);
  }
  
  /* -------------------------------------------- */
  
  /**
  * Activate event listeners using the prepared sheet HTML
  * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
  */
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    
    // Macro triggers
    if (this.actor.owner) {
      // Stat rollers
      let statMacro = html.find(".stat-macro");
      statMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        
        game.lancer.prepareStatMacro(this.actor, getStatPath(ev));
      });

      // Talent rollers
      let talentMacro = html.find(".talent-macro");
      talentMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
        
        game.lancer.prepareItemMacro(this.actor._id, el.getAttribute("data-item-id"), {rank: ev.currentTarget.getAttribute("data-rank")});
      });
      
      // Trigger rollers
      let itemMacros = html.find(".skill-macro")
      // System rollers
      .add(html.find(".system-macro"))
      // Gear rollers
      .add(html.find(".gear-macro"));
      itemMacros.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        
        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
        
        game.lancer.prepareItemMacro(this.actor, el.getAttribute("data-item-id"));
      });

      // Core active & passive text rollers
      let CAMacro = html.find(".core-active-macro");
      CAMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        let target = <HTMLElement>ev.currentTarget;
        
        prepareCoreActiveMacro(this.actor._id);
      });

      let CPMacro = html.find(".core-passive-macro");
      CPMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        let target = <HTMLElement>ev.currentTarget;
        
        prepareCorePassiveMacro(this.actor._id);
      });
      
      // Weapon rollers
      let weaponMacro = html.find(".roll-attack");
      weaponMacro.on("click", (ev: any) => {
        ev.stopPropagation();
        console.log(ev);
        const weaponElement = $(ev.currentTarget).closest(".weapon")[0] as HTMLElement;
        console.log(weaponElement);
        const weaponId = weaponElement.getAttribute("data-item-id");
        if (!weaponId) return ui.notifications.warn(`Error rolling macro: No weapon ID!`);
        const item = this.actor.getOwnedItem(weaponId);
        if (!item) return ui.notifications.warn(`Error rolling macro: Couldn't find weapon with ID ${weaponId}.`);

        const weapon = item as LancerPilotWeapon | LancerMechWeapon;
        game.lancer.prepareItemMacro(this.actor._id, weapon._id);
      });
    }
    
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    
    if (this.actor.owner) {
      // Customized increment/decrement arrows
      let decr = html.find('button[class*="mod-minus-button"]');
      decr.on("click", (ev: any) => {
        const but = $(ev.currentTarget);
        but.next()[0].value = but.next()[0].valueAsNumber - 1;
        this.submit({});
      });
      let incr = html.find('button[class*="mod-plus-button"]');
      incr.on("click", (ev: any) => {
        const but = $(ev.currentTarget);
        but.prev()[0].value = but.prev()[0].valueAsNumber + 1;
        this.submit({});
      });

      // Item/Macroable Dragging
      const statMacroHandler = (e: Event) => this._onDragMacroableStart(e);
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
        if (item.classList.contains("stat-macro")) item.addEventListener('dragstart', statMacroHandler, false);
        if (item.classList.contains("talent-macro")) item.addEventListener('dragstart', talentMacroHandler, false);
        if (item.classList.contains("text-macro")) item.addEventListener('dragstart', textMacroHandler, false);
        if (item.classList.contains("core-active-macro")) item.addEventListener('dragstart', CAMacroHandler, false);
        if (item.classList.contains("core-passive-macro")) item.addEventListener('dragstart', CPMacroHandler, false);
        item.setAttribute("draggable", true);
        item.addEventListener("dragstart", (ev: any) => this._onDragStart(ev), false);
      });

      // Update Inventory Item
      let items = html.find(".item");
      items.on("click", (ev: any) => {
        console.log(ev);
        const li = $(ev.currentTarget);
        //TODO: Check if in mount and update mount
        const item = this.actor.getOwnedItem(li.data("itemId"));
        if (item) {
          item.sheet.render(true);
        }
      });
      
      // Delete Item when trash can is clicked
      items = html.find('.stats-control[data-action*="delete"]');
      items.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        console.log(ev);
        const item = $(ev.currentTarget).closest(".item");
        const itemId = item.data("itemId");
        
        let mount_element = item.closest(".lancer-mount-container");
        let weapon_element = item.closest(".lancer-weapon-container");

        if (mount_element.length && weapon_element.length) {
          let mounts = duplicate((this.actor.data.data as LancerPilotData).mech_loadout.mounts);
          let weapons = mounts[parseInt(mount_element.data("itemKey"))].weapons;
          
          weapons.splice(parseInt(weapon_element.data("itemKey")), 1);
          this.actor.update({ "data.mech_loadout.mounts": mounts });
          this._onSubmit(ev);
        } else if (this.actor.getOwnedItem(itemId)!.data.type === "mech_weapon") {
          // Search mounts to remove the weapon
          let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
          for (let i = 0; i < mounts.length; i++) {
            const mount = mounts[i];
            for (let j = 0; j < mount.weapons.length; j++) {
              let weapons = mount.weapons;
              if (weapons[j]._id === itemId) {
                weapons.splice(j, 1);
                this.actor.update({ "data.mech_loadout.mounts": mounts });
                this._onSubmit(ev);
                break;
              }
            }
          }
        }
        
        this.actor.deleteOwnedItem(itemId);
        item.slideUp(200, () => this.render(false));
      });
      
      // Create Mounts
      let add_button = html.find('.add-button[data-action*="create"]');
      add_button.on("click", (ev: any) => {
        ev.stopPropagation();
        console.log(ev);
        let mount: LancerMountData = {
          type: MountType.Main,
          weapons: [],
          secondary_mount: "",
        };
        
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts.push(mount);
        this.actor.update({ "data.mech_loadout.mounts": mounts });
        this._onSubmit(ev);
      });
      
      // Update Mounts
      let mount_selector = html.find('select.mounts-control[data-action*="update"]');
      mount_selector.on("change", (ev: any) => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts[
          parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemKey"))
        ].type = $(ev.currentTarget).children("option:selected").val();
        this.actor.update({ "data.mech_loadout.mounts": mounts });
        this._onSubmit(ev);
      });
      
      // Delete Mounts
      let mount_trash = html.find('a.mounts-control[data-action*="delete"]');
      mount_trash.on("click", (ev: any) => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        let id = $(ev.currentTarget).closest(".lancer-mount-container").data("itemKey");
        // Delete each weapon in the selected mount from the actor's owned items
        let weapons = (this.actor.data.data as LancerPilotData).mech_loadout.mounts[id].weapons;
        for (let i = 0; i < weapons.length; i++) {
          const weapon = weapons[i];
          if (weapon._id) this.actor.deleteOwnedItem(weapon._id);
        }
        mounts.splice(parseInt(id), 1);
        this.actor.update({ "data.mech_loadout.mounts": mounts });
        this._onSubmit(ev);
      });

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      download.on("click", (ev: any) => {
        ev.stopPropagation();
        // Get the data
        ui.notifications.info("Importing character...");
        import_pilot_by_code((this.actor.data.data as LancerPilotData).pilot.cloud_code)
        .then(cc_pilot => update_pilot(this.actor as LancerActor, cc_pilot))
        .then(() => {
          ui.notifications.info("Successfully loaded pilot state from cloud");
        })
        .catch(e => {
          console.warn(e);
          ui.notifications.warn(
            "Failed to update pilot, likely due to missing LCP data: " + e.message
            );
          });
        });
      }
    }
    
    
    _onDragMacroableStart(event: any) {
      
      // For stat-macros
      event.stopPropagation(); // Avoids triggering parent event handlers
      // It's an input so it'll always be an InputElement, right?
      let path = getStatPath(event);

      let tSplit = path.split(".");
      let data = {
        title: tSplit[tSplit.length - 1].toUpperCase(),
        dataPath: path,
        type: "actor",
        actorId: this.actor._id
      };
      
      event.dataTransfer.setData('text/plain', JSON.stringify(data));
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
          type: "talent"
        }
      };
      
      event.dataTransfer?.setData('text/plain', JSON.stringify(data));
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
        type: "Text"
      };
      
      event.dataTransfer?.setData('text/plain', JSON.stringify(data));
    }

    /**
     * For dragging the core active to the hotbar
     * @param event   The associated DragEvent
     */
    _onDragCoreActiveStart(event: DragEvent) {
      event.stopPropagation(); // Avoids triggering parent event handlers

      let target = <HTMLElement>event.currentTarget;

      let data = {
        actorId: this.actor._id,
        // Title will simply be CORE ACTIVE since we want to keep the macro dynamic
        title: "CORE ACTIVE",
        type: "Core-Active"
      };
      
      event.dataTransfer?.setData('text/plain', JSON.stringify(data));
    }

    /**
     * For dragging the core passive to the hotbar
     * @param event   The associated DragEvent
     */
    _onDragCorePassiveStart(event: DragEvent) {
      event.stopPropagation(); // Avoids triggering parent event handlers

      let target = <HTMLElement>event.currentTarget;

      let data = {
        actorId: this.actor._id,
        // Title will simply be CORE PASSIVE since we want to keep the macro dynamic
        title: "CORE PASSIVE",
        type: "Core-Passive"
      };
      
      event.dataTransfer?.setData('text/plain', JSON.stringify(data));
    }
    
    async _onDrop(event: any) {
      event.preventDefault();
      
      // Get dropped data
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData("text/plain"));
        if (data.type !== "Item") return;
      } catch (err) {
        return false;
      }
      console.log(event);
      
      let item: Item | null = null;
      const actor = this.actor as LancerActor;
      // NOTE: these cases are copied almost verbatim from ActorSheet._onDrop
      
      // Case 1 - Item is from a Compendium pack
      if (data.pack) {
        item = (await game.packs.get(data.pack)!.getEntity(data.id)) as Item;
        console.log(`${lp} Item dropped from compendium: `, item);
      }
      // Case 2 - Item is a World entity
      else if (!data.data) {
        item = game.items.get(data.id);
        // If item isn't from a Compendium or World entity,
        // see if super can do something with it.
        if (!item) super._onDrop(event);
        console.log(`${lp} Item dropped from world: `, item);
      }
      
      // Logic below this line is executed only with owner or GM permission of a sheet
      if (!actor.owner && !game.user.isGM) {
        ui.notifications.warn(
          `LANCER, you shouldn't try to modify ${actor.name}'s loadout. Access Denied.`
          );
          return;
        }
      
        if (item) {
          // Swap mech frame
          if (item.type === "frame") {
            let newFrameStats: LancerFrameStatsData;
            let oldFrameStats: LancerFrameStatsData | undefined = undefined;
            // Remove old frame
            actor.items.forEach(async (i: LancerItem) => {
              if (i.type === "frame") {
                console.log(`${lp} Removing ${actor.name}'s old ${i.name} frame.`);
                oldFrameStats = duplicate((i as LancerFrame).data.data.stats);
                await this.actor.deleteOwnedItem(i._id);
              }
            });
            // Add the new frame from Compendium pack
            if (data.pack) {
              const frame = (await actor.importItemFromCollection(data.pack, data.id)) as any;
              console.log(`${lp} Added ${frame.name} from ${data.pack} to ${actor.name}.`);
              newFrameStats = frame.data.stats;
            }
            // Add the new frame from a World entity
            else {
              const frame = (await actor.createOwnedItem(duplicate(item.data))) as any;
              console.log(`${lp} Added ${frame.name} to ${actor.name}.`);
              newFrameStats = frame.data.stats;
            }
            
            if (newFrameStats) {
              console.log(`${lp} Swapping Frame stats for ${actor.name}`);
              actor.swapFrames(newFrameStats, oldFrameStats);
            }
            return;
          }
          // Handling mech-weapon -> mount mapping
          else if (item.type === "mech_weapon") {
            let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
            if (!mounts.length) {
              ui.notifications.error(
                "A mech weapon was dropped on the page, but there are no weapon mounts installed. Go to the Frame Loadout tab to add some!"
                );
                return;
              }
              
              let mount_element = $(event.target.closest(".lancer-mount-container"));

              if (mount_element.length) {
                let mount_whitelist = {
                  Auxiliary: [MountType.Integrated, MountType.Aux, MountType.AuxAux, MountType.MainAux, MountType.Flex, MountType.Main, MountType.Heavy],
                  Main: [MountType.Integrated, MountType.Main, MountType.Flex, MountType.MainAux, MountType.Heavy],
                  Heavy: [MountType.Integrated, MountType.Heavy],
                  Superheavy: [MountType.Integrated, MountType.Heavy],
                  Other: [MountType.Integrated, MountType.Aux, MountType.AuxAux, MountType.MainAux, MountType.Flex, MountType.Main, MountType.Heavy]
                };

                let mount = mounts[parseInt(mount_element.data("itemKey"))];
                let valid = mount_whitelist[(item as LancerMechWeapon).data.data.mount];
                if (!valid.includes(mount.type)) {
                  ui.notifications.error("The weapon you dropped is too large for this weapon mount!");
                } else if (item.data.data.mount === "Superheavy" && !mount.secondary_mount) {
                  ui.notifications.error(
                    "Assign a secondary mount to this heavy mount in order to equip a superheavy weapon"
                  );
                } else {
                  let weapon = await actor.createOwnedItem(duplicate(item.data));
                  mount.weapons.push(weapon);
                  console.log(`${lp} Inserted Mech Weapon into Mount`, weapon);
                  this.actor.update({ "data.mech_loadout.mounts": mounts });
                  this._onSubmit(event);
                  }
                } else {
                  ui.notifications.error(
                    "You dropped a mech weapon on the page, but not onto a weapon mount. Go to the Frame Loadout tab to find them!"
                    );
                  }
                  
                  return;
                } else if (LANCER.pilot_items.includes(item.type)) {
                  if (data.pack) {
                    console.log(`${lp} Copying ${item.name} from ${data.pack} to ${actor.name}.`);
                    const dupData = duplicate(item.data);
                    const newItem = await actor.importItemFromCollection(data.pack, item._id);
                    // Make sure the new item includes all of the data from the original.
                    (dupData as any)._id = newItem._id;
                    actor.updateOwnedItem(dupData);
                    return;
                  } else {
                    console.log(`${lp} Copying ${item.name} to ${actor.name}.`);
                    const dupData = duplicate(item.data);
                    const newItem = await actor.createOwnedItem(dupData);
                    // Make sure the new item includes all of the data from the original.
                    (dupData as any)._id = newItem._id;
                    actor.updateOwnedItem(dupData);
                    return;
                  }
                } else if (LANCER.npc_items.includes(item.type)) {
                  ui.notifications.error(`Cannot add Item of type "${item.type}" to a Pilot.`);
                  return;
                }
              }
              
              // Finally, fall back to super's behaviour if nothing else "handles" the drop (signalled by returning).
              // Don't hate the player, hate the imperative paradigm
              console.log(`${lp} Falling back on super._onDrop`);
              return super._onDrop(event);
            }
            
            /* -------------------------------------------- */
            
            /**
            * Implement the _updateObject method as required by the parent class spec
            * This defines how to update the subject of the form when the form is submitted
            * @private
            */
            _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
              // Use the Actor's name for the pilot's callsign
              formData["name"] = formData["data.pilot.callsign"];
              // Copy the pilot's callsign to the prototype token
              formData["token.name"] = formData["data.pilot.callsign"];
              
              let token: any = this.actor.data["token"];
              // Set the prototype token image if the prototype token isn't initialized
              if (!token) {
                formData["token.img"] = formData["img"];
              }
              // Update token image if it matches the old actor image
              else if (this.actor.data.img === token["img"] && this.actor.img !== formData["img"]) {
                formData["token.img"] = formData["img"];
              }
              
              console.log(`${lp} Pilot sheet form data: `, formData);
              // Update the Actor
              return this.object.update(formData);
            }
          }

    
function getStatPath(event: any): string {
  // Find the stat input to get the stat's key to pass to the macro function
  let el = ($(event.currentTarget)
  .closest(".stat-container")
  .find(".lancer-stat")[0] as HTMLElement);

  if(el.nodeName === "INPUT"){
    return (<HTMLInputElement>el).name;
  } else if (el.nodeName === "DATA") {
    return (<HTMLDataElement>el).id;
  } else {
    throw "Error - stat macro was not run on an input or data element";
  }
}