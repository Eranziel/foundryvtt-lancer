import {
  LancerNPCSheetData,
  LancerNPCClassStatsData,
  LancerNPCData,
  LancerStatMacroData,
  LancerAttackMacroData,
  LancerTechMacroData,
  LancerNPCTemplateItemData,
  LancerNPCClassItemData,
} from "../interfaces";
import {
  LancerNPCClass,
  LancerNPCFeature,
  LancerItemData,
  LancerNPCTemplate,
} from "../item/lancer-item";
import { LancerActor } from "./lancer-actor";
import { LANCER } from "../config";
import { get_NpcFeatures_pack, ItemManifest, ItemDataManifest } from "../item/util";
import { LancerNPCTechData, LancerNPCWeaponData } from "../item/npc-feature";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { prepareItemMacro } from "../macros";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends LancerActorSheet {
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
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "mech",
        },
      ],
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

    console.log(`${lp} NPC data: `, data);
    return data;
  }

  /* -------------------------------------------- */

  _prepareItems(data: LancerNPCSheetData) {
    // let npc_items = this.actor.items as Collection<LancerItem>;
    // let sorted = new ItemManifest().add_items(npc_items.values());
    let npc_item_data = (data.items as unknown) as LancerItemData[];
    let sorted = new ItemDataManifest().add_items(npc_item_data.values());

    //@ts-ignore                Doesn't work now, adding a ts-ignore though.... -Grygon
    data.npc_templates = (sorted.npc_templates as unknown) as LancerNPCTemplate[]; // Why does this work. Like someone fixed exactly one, lol???
    data.npc_features = (sorted.npc_features as unknown) as LancerNPCFeature[];
    data.npc_class = (sorted.npc_classes[0] as unknown) as LancerNPCClass;
    //TODO Templates, Classes and Features
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Macro triggers
    if (this.actor.owner) {
      // Macros that can be handled via the generic item interface
      let itemMacros = html.find(".item-macro");
      itemMacros.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

        prepareItemMacro(this.actor._id, <string>el.getAttribute("data-item-id")).then();
      });

      // Stat rollers
      let statMacro = html.find(".roll-stat");
      statMacro.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers

        // Find the stat input to get the stat's key to pass to the macro function
        const statInput: HTMLInputElement = $(ev.currentTarget)
          .closest(".stat-container")
          .find(".lancer-stat")[0] as HTMLInputElement;
        let tSplit = statInput.name.split(".");
        let mData: LancerStatMacroData = {
          title: tSplit[tSplit.length - 1].toUpperCase(),
          bonus: statInput.value,
        };

        console.log(`${lp} Rolling ${mData.title} check, bonus: ${mData.bonus}`);
        game.lancer.prepareStatMacro(this.actor._id, this.getStatPath(ev)!);
      });

      // Trigger rollers
      this.activateTriggerListeners(html);

      // Weapon rollers
      let weaponMacro = html.find(".roll-attack");
      weaponMacro.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const weaponElement = $(ev.currentTarget).closest(".weapon")[0] as HTMLElement;
        // console.log(weaponElement);
        const weaponId = weaponElement.getAttribute("data-item-id");
        if (!weaponId) return ui.notifications.warn(`Error rolling macro: No weapon ID!`);
        const item = this.actor.getOwnedItem(weaponId);
        if (!item)
          return ui.notifications.warn(
            `Error rolling macro: Couldn't find weapon with ID ${weaponId}.`
          );

        const weapon = item as LancerNPCFeature;
        game.lancer.prepareItemMacro(this.actor._id, weapon._id);
      });

      // Tech rollers
      let techMacro = html.find(".roll-tech");
      techMacro.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        const techElement = $(ev.currentTarget).closest(".tech")[0] as HTMLElement;
        let techId = techElement.getAttribute("data-item-id");
        game.lancer.prepareItemMacro(this.actor._id, techId!);
      });
    }
    if (this.actor.owner) {
      // Item/Macroable Dragging
      const haseMacroHandler = (e: DragEvent) => this._onDragMacroableStart(e);
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .add('[class*="macroable"]')
        .each((i: number, item: any) => {
          if (item.classList.contains("inventory-header")) return;
          if (item.classList.contains("roll-stat"))
            item.addEventListener("dragstart", haseMacroHandler, false);
          if (item.classList.contains("item"))
            item.addEventListener("dragstart", (ev: DragEvent) => this._onDragStart(ev), false);
          item.setAttribute("draggable", "true");
        });

      // Update Inventory Item
      this.activateOpenItemListeners(html);

      // Delete Item when trash can is clicked
      let items = html.find('.arr-control[data-action*="delete"]');
      items.on("click", async (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers
        const li = $(ev.currentTarget).closest(".item");
        const deletedItem = await this.actor.deleteOwnedItem(li.data("itemId"));
        if (deletedItem.type === "npc_template") {
          const actor = this.actor as LancerActor;
          await this.removeTemplate(actor, (deletedItem as unknown) as LancerNPCTemplateItemData);
        }
        li.slideUp(200, () => this.render(false));
      });

      // Change tier
      let tier_selector = html.find('select.tier-control[data-action*="update"]');
      tier_selector.on("change", async (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        let tier = (ev.currentTarget as HTMLSelectElement).selectedOptions[0].value;
        await this.actor.update({ "data.tier": tier });
        // Set Values for
        let actor = this.actor as LancerActor;
        let NPCClassStats: LancerNPCClassStatsData;
        NPCClassStats = (actor.items.find((i: Item) => i.type === "npc_class") as any).data.data
          .stats;
        console.log(`${lp} TIER Swap with ${tier} and ${NPCClassStats}`);
        await actor.swapNPCClassOrTier(NPCClassStats, false, tier);
      });
    }
  }

  _onDragMacroableStart(event: DragEvent) {
    // For roll-stat macros
    event.stopPropagation(); // Avoids triggering parent event handlers
    let statInput = getStatInput(event);
    if (!statInput) return ui.notifications.error("Error finding stat input for macro.");

    let tSplit = statInput.id.split(".");
    let data = {
      title: tSplit[tSplit.length - 1].toUpperCase(),
      dataPath: statInput.id,
      type: "actor",
      actorId: this.actor._id,
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /* -------------------------------------------- */

  async _onDrop(event: any): Promise<boolean> {
    let item: Item | null = await super._onDrop(event);

    const actor = this.actor as LancerActor;
    if (item) {
      // Swap mech class
      if (item.type === "npc_class") {
        // Remove old class
        for (let item of actor.items) {
          const i = (item as unknown) as LancerNPCClass;
          if (i.type === "npc_class") {
            await this.removeClass(actor, i);
          }
        }
        //Add new class
        await this.addClass(actor, item as LancerNPCClass);
        return Promise.resolve(true);
      }
      //Add new template
      else if (item.type === "npc_template") {
        await this.addTemplate(actor, item as LancerNPCTemplate);
        return Promise.resolve(true);
      }
      // Add other NPC item
      else if (LANCER.npc_items.includes(item.type)) {
        await this._addOwnedItem(item);
        return Promise.resolve(true);
      }
      // Disallow adding pilot items
      else if (LANCER.pilot_items.includes(item.type)) {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to an NPC.`);
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(false);
  }

  /* -------------------------------------------- */

  /**
   *
   */
  async addBaseFeatures(
    actor: LancerActor,
    ct: LancerNPCClassItemData | LancerNPCTemplateItemData
  ) {
    let allFeatures = await get_NpcFeatures_pack();
    let features: Array<String> = ct.data.base_features;
    let featureList = allFeatures.filter(feature => features.includes(feature.data.id));

    // Add all base features to the actor
    for (let feature of featureList) {
      const newFeature = (await actor.createOwnedItem(duplicate(feature))) as any;
      console.log(`${lp} Added ${newFeature.data.name} to ${actor.name}.`);
    }
    return Promise.resolve();
  }

  async removeFeatures(actor: LancerActor, ct: LancerNPCClassItemData | LancerNPCTemplateItemData) {
    const features = ct.data.base_features.concat(ct.data.optional_features);

    // Get all features from the actor and remove all the ones that fit the class base features
    for (let i of actor.items.values()) {
      if (i.data.type === "npc_feature" && features.includes(i.data.data.id)) {
        await this.actor.deleteOwnedItem(i._id);
        console.log(`${lp} Removed ${i.data.name} from ${actor.name}.`);
      }
    }
  }

  /*
    Class logic
  */

  async addClass(actor: LancerActor, item: LancerNPCClass) {
    if (item.type === "npc_class") {
      // Add new class
      let newNPCClassStats: LancerNPCClassStatsData;
      const npcClass = (await actor.createOwnedItem(duplicate(item.data))) as any;
      console.log(`${lp} Added ${npcClass.name} to ${actor.name}.`);
      newNPCClassStats = npcClass.data.stats;
      if (newNPCClassStats) {
        console.log(`${lp} Swapping Class stats for ${actor.name}`);
        await actor.swapNPCClassOrTier(newNPCClassStats, true);
      }

      // Get all features and match them up with the IDs, then add them to the actor
      await this.addBaseFeatures(actor, npcClass);
    }
  }

  async removeClass(actor: LancerActor, item: LancerNPCClass) {
    if (item.type === "npc_class") {
      await this.removeFeatures(actor, item.data);

      // Remove the class
      console.log(`${lp} Removing ${actor.name}'s old ${item.name} class.`);
      await this.actor.deleteOwnedItem(item._id!);
    }
  }

  /*
    Template logic
  */

  async addTemplate(actor: LancerActor, templateItem: LancerNPCTemplate) {
    if (templateItem.type === "npc_template") {
      // Add new template
      const npcTemplate = (await actor.createOwnedItem(duplicate(templateItem.data))) as any;
      console.log(`${lp} Added ${npcTemplate.name} to ${actor.name}.`);

      // Get all features and match them up with the IDs, then add them to the actor
      await this.addBaseFeatures(actor, npcTemplate);
    }
  }

  async removeTemplate(actor: LancerActor, templateItem: LancerNPCTemplateItemData) {
    if (templateItem.type === "npc_template") {
      await this.removeFeatures(actor, templateItem);

      // Remove the template
      console.log(`${lp} Removing ${actor.name}'s old ${templateItem.data.name} class.`);
      await this.actor.deleteOwnedItem(templateItem._id!);
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Do these only if the name updated
    if (this.actor.data.data.name !== formData["data.name"]) {
      // Copy the NPC name into the Actor data.
      formData["name"] = formData["data.name"];
      // Copy the NPC name to the prototype token.
      formData["token.name"] = formData["data.name"];
    }

    formData = this._updateTokenImage(formData);

    console.log(`${lp} NPC sheet form data: `, formData);
    // Update the Actor
    return this.object.update(formData);
  }
}

function getStatInput(event: Event): HTMLInputElement | HTMLDataElement | null {
  if (!event.currentTarget) return null;
  // Find the stat input to get the stat's key to pass to the macro function
  return $(event.currentTarget).closest(".stat-container").find(".lancer-stat")[0] as
    | HTMLInputElement
    | HTMLDataElement;
}
