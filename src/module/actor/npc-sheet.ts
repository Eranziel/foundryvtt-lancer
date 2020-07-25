import { LancerNPCSheetData, LancerNPCClassStatsData, LancerNPCData } from '../interfaces';
import { LancerItem, LancerNPCClass, LancerNPCTemplate, LancerNPCFeature } from '../item/lancer-item';
import { MechType } from '../enums';
import { LancerActor } from './lancer-actor';
import { LANCER } from '../config';
const lp = LANCER.log_prefix;

const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends ActorSheet {
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
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/npc.html",
      width: 800,
      height: 800,
      tabs: [{
        navSelector: ".lancer-tabs",
        contentSelector: ".sheet-body",
        initial: "mech"
      }]
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData(): LancerNPCSheetData {
    const data: LancerNPCSheetData = super.getData() as LancerNPCSheetData;

    this._prepareItems(data);

    // Populate name if blank (new Actor)
    if (data.data.name === "") {
      data.data.name = data.actor.name;
    }

    console.log(`${lp} NPC data: `);
    console.log(data);
    return data;
  }

  /* -------------------------------------------- */

  _prepareItems(data: LancerNPCSheetData) {

    // Mirror items into filtered list properties
    const accumulator = {};
    for (let item of data.items) {
      if (accumulator[item.type] === undefined)
        accumulator[item.type] = [];
      accumulator[item.type].push(item);
    }
    data.npc_templates = accumulator['npc_template'] || [];
    data.npc_features = accumulator['npc_feature'] || [];
    if (accumulator['npc_class']) data.npc_class = accumulator['npc_class'][0];
    else data.npc_class = undefined;
    //TODO Templates, Classes and Features
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;


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
        console.log(`${lp} Rolling ${title} check, key ${statKey}`);
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
        console.log(`${lp} Rolling '${title}' trigger (d20 + ${modifier})`);

        game.lancer.rollTriggerMacro(title, modifier, true);
      });

      // Weapon rollers
      let weaponMacro = html.find('.roll-attack');
      weaponMacro.click(ev => {
        ev.stopPropagation();
        console.log(`${lp} Weapon macro button click`, ev);

        const weaponElement = $(ev.currentTarget).closest('.weapon')[0] as HTMLElement;
        let weaponId = weaponElement.getAttribute("data-item-id");
        game.lancer.rollAttackMacro(weaponId, this.actor._id);
        return;
        // Pilot weapon
        if (weaponElement.className.search("pilot") >= 0) {
          let weaponId = weaponElement.getAttribute("data-item-id");
          game.lancer.rollAttackMacro(weaponId, this.actor._id);
        }
        // Mech weapon
        else {
          let weaponMountIndex = weaponElement.getAttribute("data-item-id");
          const mountElement = $(ev.currentTarget).closest(".lancer-mount-container");
          if (mountElement.length) {
            const mounts = this.actor.data.data.mech_loadout.mounts;
            const weapon = mounts[parseInt(mountElement.data("itemId"))].weapons[weaponMountIndex];
            game.lancer.rollAttackMacro(weapon._id, this.actor._id);
          }
          else {
            console.log(`${lp} No mount element`, weaponMountIndex, mountElement);
          }
        }
      });
    }
    if (this.actor.owner) {
      // Item Dragging
      let handler = ev => this._onDragStart(ev);
      html.find('li[class*="item"]').add('span[class*="item"]').each((i, item) => {
        if (item.classList.contains("inventory-header")) return;
        item.setAttribute("draggable", true);
        // TODO: I think handler needs to be item.*something*._onDragStart(ev).
        item.addEventListener("dragstart", handler, false);
      });

      // Update Inventory Item
      let items = html.find('.item');
      items.click(ev => {
        console.log(ev)
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
        const li = $(ev.currentTarget);
        this.actor.deleteOwnedItem(li.data("itemId"));
        li.slideUp(200, () => this.render(false));
      });

      // Delete Item when trash can is clicked
      items = html.find('.stats-control[data-action*="delete"]');
      items.click(ev => {
        ev.stopPropagation();  // Avoids triggering parent event handlers
        console.log(ev);
        const li = $(ev.currentTarget).closest('.item');
        this.actor.deleteOwnedItem(li.data("itemId"));
        li.slideUp(200, () => this.render(false));
      });

      let tier_selector = html.find('select.tier-control[data-action*="update"]');
      tier_selector.change(ev => {
        ev.stopPropagation();
        console.log(ev);
        let tier = ev.currentTarget.selectedOptions[0].value;
        this.actor.update({ "data.tier": tier });
        // Set Values for 
        let actor = this.actor as LancerActor;
        let NPCClassStats: LancerNPCClassStatsData;
        NPCClassStats = (actor.items.find((i: Item) => i.type === "npc_class") as any).data.data.stats;
        console.log(`${lp} TIER Swap with ${tier} and ${NPCClassStats}`);
        actor.swapNPCClassOrTier(NPCClassStats, false, tier);
      });
    }
  }

  /* -------------------------------------------- */

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
      ui.notifications.warn(`LANCER, you shouldn't try to modify ${actor.name}'s loadout. Access Denied.`);
      return;
    }

    if (item) {
      // Swap mech class
      if (item.type === "npc_class") {
        let newNPCClassStats: LancerNPCClassStatsData;
        // Remove old class
        actor.items.forEach(async (i: LancerItem) => {
          if (i.type === "npc_class") {
            console.log(`${lp} Removing ${actor.name}'s old ${i.name} class.`);
            await this.actor.deleteOwnedItem(i._id);
          }
        });
        // Add the new class from Compendium pack
        if (data.pack) {
          const npcClass = await actor.importItemFromCollection(data.pack, data.id) as LancerNPCClass;
          console.log(`${lp} Added ${npcClass.name} from ${data.pack} to ${actor.name}.`);
          newNPCClassStats = npcClass.data.stats;
        }
        // Add the new Class from a World entity
        else {
          await actor.createEmbeddedEntity("OwnedItem", duplicate(item.data));
          const npcClass = await actor.createOwnedItem(duplicate(item.data)) as LancerNPCClass;
          console.log(`${lp} Added ${npcClass.name} from ${data.pack} to ${actor.name}.`);
          newNPCClassStats = npcClass.data.stats;
        }
        if (newNPCClassStats) {
          console.log(`${lp} Swapping Class stats for ${actor.name}`);
          actor.swapNPCClassOrTier(newNPCClassStats, true);
        }
      }
      else if (LANCER.npc_items.includes(item.type)) {
        if (data.pack) {
          console.log(`${lp} Copying ${item.name} from ${data.pack} to ${actor.name}.`);
          const dupData = duplicate(item.data);
          const newItem = await actor.importItemFromCollection(data.pack, item._id);
          // Make sure the new item includes all of the data from the original.
          (dupData as any)._id = newItem._id;
          actor.updateOwnedItem(dupData);
          return;
        }
        else {
          console.log(`${lp} Copying ${item.name} to ${actor.name}.`);
          const dupData = duplicate(item.data);
          const newItem = await actor.createOwnedItem(dupData);
          // Make sure the new item includes all of the data from the original.
          (dupData as any)._id = newItem._id;
          actor.updateOwnedItem(dupData);
          return;
        }
      }
      //TODO add basic features to NPC
      //TODO remove basic feature from NPC on Class swap
      //TODO implement similar logi for Templates
      else if (LANCER.pilot_items.includes(item.type)) {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to an NPC.`);
        return;
      }

      return super._onDrop(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    console.log(formData);
    // Use the Actor's name for the pilot's callsign
    formData.name = formData["data.npc.name"];

    let token: any = this.actor.token;
    // Set the prototype token image if the prototype token isn't initialized
    if (!this.actor.token) {
      this.actor.update({ "token.img": formData.img })
    }
    // Update token image if it matches the old actor image
    else if ((this.actor.img == token.img)
      && (this.actor.img != formData.img)) {
      this.actor.update({ "token.img": formData.img });
    }

    // Update the Actor
    return this.object.update(formData);
  }
}
