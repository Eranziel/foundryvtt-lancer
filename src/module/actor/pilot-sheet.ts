import { LancerPilotSheetData, LancerFrameData, LancerFrameStatsData } from '../interfaces';
import { LancerItem, LancerFrame } from '../item/lancer-item';
import { MechType } from '../enums';
import { LancerActor } from './lancer-actor';
import { LancerGame } from '../lancer-game';

// TODO: should probably move to HTML/CSS
const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends ActorSheet {
  _sheetTab: string;

  constructor(...args) {
    super(...args);
  }

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
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "pilot"],
      template: "systems/lancer/templates/actor/pilot.html",
      width: 800,
      height: 800,
      tabs: [{
        navSelector: ".lancer-tabs",
        contentSelector: ".sheet-body",
        initial: "pilot"}]
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData(): LancerPilotSheetData {
    let data: LancerPilotSheetData = super.getData() as LancerPilotSheetData;

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
    if (data.data.pilot.background == "") data.data.pilot.background = entryPrompt;
    if (data.data.pilot.history == "")    data.data.pilot.history = entryPrompt;
    if (data.data.pilot.notes == "")      data.data.pilot.notes = entryPrompt;

    // Generate the size string for the pilot's frame
    if (data.frame) {
      const frame: any = data.frame;
      if (frame.data.stats.size === 0.5) {
        data.frame_size = "size-half";
      }
      else {
        data.frame_size = `size-${frame.data.stats.size}`;
      }
    }
    else {
      data.frame_size = undefined;
    }

    console.log("LANCER | Pilot sheet data: ", data);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Owned Items for Character sheets
   * @private
   */
  _prepareItems(data: LancerPilotSheetData) {

    // Mirror items into filtered list properties
    const accumulator = {};
    for (let item of data.items) {
      if (accumulator[item.type] === undefined)
        accumulator[item.type] = [];
      accumulator[item.type].push(item);
    }

    data.skills = accumulator['skill'] || [];
    data.talents = accumulator['talent'] || [];
    data.licenses = accumulator['license'] || [];
    data.core_bonuses = accumulator['core_bonus'] || [];
    data.pilot_loadout = {
      gear: accumulator['pilot_gear'] || [],
      weapons: accumulator['pilot_weapon'] || [],
      armor: accumulator['pilot_armor'] || []
    };
    // Only take one frame
    if (accumulator['frame']) data.frame = accumulator['frame'][0];
    else data.frame = undefined;
    data.mech_loadout = {
      weapons: accumulator['mech_weapon'] || [], // TODO: subdivide into mounts
      systems: accumulator['mech_system'] || []
    }
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Macro triggers
    if (this.actor.owner) {
      // Stat rollers
      let statMacro = html.find('.stat-macro');
      statMacro.click(ev => {
        ev.stopPropagation();  // Avoids triggering parent event handlers
        console.log(ev);

        // Find the stat input to get the stat's key to pass to the macro function
        const statInput = $(ev.currentTarget).closest('.stat-container').find('.lancer-stat-input')[0] as HTMLInputElement;
        const statKey = statInput.name;
        let keySplit = statKey.split('.');
        let title = keySplit[keySplit.length - 1].toUpperCase();
        console.log(`LANCER | Rolling ${title} check, key ${statKey}`);
        game.lancer.rollStatMacro(title, statKey, null, true);
      });

      // Trigger rollers
      let triggerMacro = html.find('.roll-trigger');
      triggerMacro.click(ev => {
        ev.stopPropagation();
        console.log(ev);

        const modifier = parseInt($(ev.currentTarget).find('.roll-modifier').text());
        const title = $(ev.currentTarget).closest('.skill-compact').find('.modifier-name').text();
        //.find('modifier-name').first().text();
        console.log(`LANCER | Rolling '${title}' trigger (d20 + ${modifier})`);

        game.lancer.rollTriggerMacro(title, modifier, true);
      });

      // Weapon rollers
      let weaponMacro = html.find('.roll-attack');
      weaponMacro.click(ev => {
        ev.stopPropagation();
        console.log(ev);

        const weaponElement = $(ev.currentTarget).closest('.weapon')[0] as HTMLElement;
        // Pilot weapon
        if (weaponElement.className.search("pilot") >= 0) {
          let weaponId = weaponElement.getAttribute("data-item-id");
          // TODO: pass weaponId to rollAttackMacro to do the rolling
          game.lancer.rollAttackMacro(weaponId);
        }
        // Mech weapon
        else {
          // Is this actually any different than a pilot weapon?
        }
      })
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.owner) {
      // Item Dragging
      html.find('li[class*="item"]').add('span[class*="item"]').each((i, item) => {
        if ( item.classList.contains("inventory-header") ) return;
        item.setAttribute("draggable", true);
        item.addEventListener("dragstart", ev => this._onDragStart(ev), false);
      });

      // Update Inventory Item
      let items = html.find('.item');
      items.click(ev => {
        console.log(ev);
        const li = $(ev.currentTarget);
        //TODO: Check if in mount and update mount
        const item = this.actor.getOwnedItem(li.data("itemId"));
        if (item) {
          item.sheet.render(true);
        }
      });

      // Delete Item on Right Click
      items.contextmenu(ev => {
        console.log(ev);
        const item = $(ev.currentTarget);

        let mount_element = item.closest(".lancer-mount-container");
        let weapon_element = item.closest(".lancer-weapon-container");

        if (mount_element.length && weapon_element.length) {
          let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
          let weapons = mounts[parseInt(mount_element.data("itemId"))].weapons;
          weapons.splice(parseInt(weapon_element.data("itemId")), 1);
          this.actor.update({"data.mech_loadout.mounts": mounts});
          this._onSubmit(ev);
        } else {
          this.actor.deleteOwnedItem(item.data("itemId"));
        }
        item.slideUp(200, () => this.render(false));
      });

      // Delete Item when trash can is clicked
      items = html.find('.stats-control[data-action*="delete"]');
      items.click(ev => {
        ev.stopPropagation();  // Avoids triggering parent event handlers
        console.log(ev);
        const item = $(ev.currentTarget).closest('.item');

        let mount_element = item.closest(".lancer-mount-container");
        let weapon_element = item.closest(".lancer-weapon-container");

        if (mount_element.length && weapon_element.length) {
          let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
          let weapons = mounts[parseInt(mount_element.data("itemId"))].weapons;
          weapons.splice(parseInt(weapon_element.data("itemId")), 1);
          this.actor.update({"data.mech_loadout.mounts": mounts});
          this._onSubmit(ev);
        } else {
          this.actor.deleteOwnedItem(item.data("itemId"));
        }
        item.slideUp(200, () => this.render(false));
      });

      // Create Mounts
      let add_button = html.find('.add-button[data-action*="create"]');
      add_button.click(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mount = {
          type: "Main",
          weapons: [],
          secondary_mount: "This counts, right?"
        };

        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts)
        mounts.push(mount);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });

      // Update Mounts
      let mount_selector = html.find('select.mounts-control[data-action*="update"]');
      mount_selector.change(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts[parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemId"))].type = $(ev.currentTarget).children("option:selected").val();
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });

      // Delete Mounts
      let mount_trash = html.find('a.mounts-control[data-action*="delete"]');
      mount_trash.click(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts.splice(parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemId")), 1);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });
    }
  }

  async _onDrop(event) {
    event.preventDefault();

    // Get dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
    console.log(event);

    let item: Item;
    const actor = this.actor as LancerActor;
    // NOTE: these cases are copied almost verbatim from ActorSheet._onDrop

    // Case 1 - Item is from a Compendium pack
    if (data.pack) {
      item = (await game.packs.get(data.pack).getEntity(data.id)) as Item;
      console.log("LANCER | Item dropped from compendium: ", item);
    }
    // Case 2 - Item is a World entity
    else if (!data.data) {
      item = game.items.get(data.id);
      // If item isn't from a Compendium or World entity, 
      // see if super can do something with it.
      if (!item) super._onDrop(event);
      console.log("LANCER | Item dropped from world: ", item);
    }

    // Logic below this line is executed only with owner or GM permission of a sheet
    if (!actor.owner && !game.user.isGM) {
      ui.notifications.warn(`LANCER, you shouldn't try to modify ${actor.name}'s loadout. Access Denied.`);
      return;
    }

    if (item) {
      // Swap mech frame
      if (item.type === "frame") {
        let newFrameStats: LancerFrameStatsData;
        let oldFrameStats: LancerFrameStatsData;
        // Remove old frame
        actor.items.forEach(async (i: LancerItem) => {
          if (i.type === "frame") {
            console.log(`LANCER | Removing ${actor.name}'s old ${i.name} frame.`);
            oldFrameStats = duplicate((i as LancerFrame).data.data.stats);
            await this.actor.deleteOwnedItem(i._id);
          }
        });
        // Add the new frame from Compendium pack
        if (data.pack) {
          const frame = await actor.importItemFromCollection(data.pack, data.id) as any;
          console.log(`LANCER | Added ${frame.name} from ${data.pack} to ${actor.name}.`);
          newFrameStats = frame.data.stats;
        }
        // Add the new frame from a World entity
        else {
          newFrameStats = (actor.items.find((i: Item) => i.type === "frame") as any).data.stats;
        }

        if (newFrameStats) {
          console.log(`LANCER | Swapping Frame stats for ${actor.name}`);
          actor.swapFrames(newFrameStats, oldFrameStats);
        }
        return;
      }
      // Handling mech-weapon -> mount mapping
      else if (item.type === "mech_weapon") {
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        if (!mounts.length) {
          ui.notifications.error("A mech weapon was dropped on the page, but there are no weapon mounts installed. Go to the Frame Loadout tab to add some!");
          return;
        }

        let mount_element = $(event.target.closest(".lancer-mount-container"));

        if (mount_element.length) {

          let mount_whitelist = {
            'Auxiliary': ['Integrated', 'Aux-Aux', 'Main', 'Flex', 'Main-Aux', 'Heavy'],
            'Main': ['Integrated', 'Main', 'Flex', 'Main-Aux', 'Heavy'],
            'Heavy': ['Integrated', 'Heavy'],
            'Superheavy': ['Integrated', 'Heavy'],
            'Other': ['Integrated', 'Aux-Aux', 'Main', 'Flex', 'Main-Aux', 'Heavy']
          };

          let mount = mounts[parseInt(mount_element.data("itemId"))];
          let valid = mount_whitelist[item.data.data.mount];
          if (!valid.includes(mount.type)) {
            ui.notifications.error('The weapon you dropped is too large for this weapon mount!');
          } else if (item.data.data.mount === 'Superheavy' && !mount.secondary_mount) {
            ui.notifications.error('Assign a secondary mount to this heavy mount in order to equip a superheavy weapon');
          } else {
            mount.weapons.push(item);
            console.log("LANCER | Inserting Mech Weapon into Mount", item);
            this.actor.update({"data.mech_loadout.mounts": mounts});
            this._onSubmit(event);
          }
        } else {
          ui.notifications.error('You dropped a mech weapon on the page, but not onto a weapon mount. Go to the Frame Loadout tab to find them!');
        }

        return;
      }
      else if (["skill", "talent", "core_bonus", "license",
                             "pilot_armor", "pilot_weapon", "pilot_gear",
                             "mech_system"].includes(item.type)) {
        if (data.pack) {
          console.log(`LANCER | Copying ${item.name} from ${data.pack} to ${actor.name}.`);
          actor.importItemFromCollection(data.pack, item._id);
          return;
        }
        else {
          console.log(`LANCER | Copying ${item.name} to ${actor.name}.`);
          actor.createOwnedItem(duplicate(item.data));
          return;
        }
      }
    }

    // Finally, fall back to super's behaviour if nothing else "handles" the drop (signalled by returning).
    // Don't hate the player, hate the imperative paradigm
    console.log('LANCER | Falling back on super._onDrop');
    return super._onDrop(event);
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    console.log("LANCER | Pilot sheet form data: ", formData);
    // Use the Actor's name for the pilot's callsign
    formData.name = formData["data.pilot.callsign"];

    let token: any = this.actor.token;
    // Set the prototype token image if the prototype token isn't initialized
    if (!this.actor.token) {
      this.actor.update({"token.img": formData.img})
    }
    // Update token image if it matches the old actor image
    else if ((this.actor.img == token.img)
        && (this.actor.img != formData.img)) {
      this.actor.update({"token.img": formData.img});
    }

    // Update the Actor
    return this.object.update(formData);
  }
}
