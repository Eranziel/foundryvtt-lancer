import { LANCER } from "../config";
import {
  HANDLER_activate_general_controls,
  gentle_merge,
  resolve_dotpath,
  HANDLER_activate_popout_text_editor,
} from "../helpers/commons";
import { HANDLER_enable_mm_dropping, MMDragResolveCache } from "../helpers/dragdrop";
import { HANDLER_activate_counter_listeners, HANDLER_activate_plus_minus_buttons } from "../helpers/item";
import {
  HANDLER_activate_ref_dragging,
  HANDLER_activate_ref_drop_clearing,
  HANDLER_activate_ref_drop_setting,
  HANDLER_activate_ref_clicking,
  HANDLER_activate_uses_editor,
} from "../helpers/refs";
import type { LancerActorSheetData, LancerMacroData, LancerStatMacroData } from "../interfaces";
import type { AnyMMItem } from "../item/lancer-item";
import { AnyMMActor, is_actor_type, LancerActor, LancerActorType } from "./lancer-actor";
import { prepareActivationMacro, prepareChargeMacro, prepareItemMacro, runEncodedMacro } from "../macros";
import {
  EntryType,
  LiveEntryTypes,
  MechSystem,
  MechWeapon,
  NpcFeature,
  OpCtx,
  PilotGear,
  PilotWeapon,
  WeaponMod,
  funcs,
  Mech,
  Counter,
  RegEntry,
} from "machine-mind";
import { ActivationOptions } from "../enums";
import { applyCollapseListeners, CollapseHandler } from "../helpers/collapse";
import { HANDLER_intercept_form_changes } from "../helpers/refs";
import { addExportButton } from "../helpers/io";
import type { FoundryFlagData } from "../mm-util/foundry-reg";
import { mm_owner } from "../mm-util/helpers";
import type { ActionType } from "../action";
import { InventoryDialog } from "../apps/inventory";
import { HANDLER_activate_item_context_menus, HANDLER_activate_edit_counter } from "../helpers/item";
import { getActionTrackerOptions } from "../settings";
import { modAction } from "../action/actionTracker";
import { PrototypeTokenData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet<T extends LancerActorType> extends ActorSheet<
  ActorSheet.Options,
  LancerActorSheetData<T>
> {
  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      scrollY: [".scroll-body"],
    });
  }

  /* -------------------------------------------- */
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Enable collapse triggers.
    this._activateCollapses(html);

    // Enable any action grid buttons.
    this._activateActionGridListeners(html);

    // Make generic refs clickable to open the item
    $(html).find(".ref.valid.clickable-ref:not(.profile-img)").on("click", HANDLER_activate_ref_clicking);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // All-actor macros
    this._activateMacroListeners(html);

    // All-actor macro dragging
    this._activateMacroDragging(html);

    let getfunc = () => this.getDataLazy();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Make +/- buttons work
    HANDLER_activate_plus_minus_buttons(html, getfunc, () => this.submit({}));

    // Make counter pips work
    HANDLER_activate_counter_listeners(html, getfunc);

    // Enable hex use triggers.
    HANDLER_activate_uses_editor(html, getfunc);

    // Enable context menu triggers.
    HANDLER_activate_item_context_menus(html, getfunc, commitfunc);

    // Enable viewing inventory on sheets that support it
    this._activateInventoryButton(html);

    // Make our resolver
    let ctx = this.getCtx();
    let resolver = new MMDragResolveCache(ctx);

    // Make refs droppable, in such a way that we take ownership when dropped
    HANDLER_activate_ref_drop_setting(
      resolver,
      html,
      this.can_root_drop_entry,
      async x => (await this.quick_own(x))[0],
      getfunc,
      commitfunc
    );
    HANDLER_activate_ref_drop_clearing(html, getfunc, commitfunc);

    // Enable general controls, so items can be deleted and such
    this.activate_general_controls(html);

    // Item-referencing inputs
    HANDLER_intercept_form_changes(html, getfunc);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, getfunc, commitfunc);

    HANDLER_activate_edit_counter(html, getfunc);

    // Add export button.
    addExportButton(this.object, html);

    // Add root dropping
    HANDLER_enable_mm_dropping(
      html,
      resolver,
      (entry, _dest, _event) => this.can_root_drop_entry(entry),
      async (entry, _dest, _event) => this.on_root_drop(entry, _event, _dest),
      () => {}
    );
  }

  // So it can be overridden
  activate_general_controls(html: JQuery) {
    let getfunc = () => this.getDataLazy();
    let commitfunc = (_: any) => this._commitCurrMM();
    HANDLER_activate_general_controls(html, getfunc, commitfunc);
  }

  _activateMacroDragging(html: JQuery) {
    const ActionMacroHandler = (e: DragEvent) => this._onDragActivationChipStart(e);
    const EncodedMacroHandler = (e: DragEvent) => this._onDragEncodedMacroStart(e);

    html
      .find('li[class*="item"]')
      .add('span[class*="item"]')
      .add('[class*="macroable"]')
      .add('[class*="lancer-macro"]')
      .each((_i, item) => {
        if (item.classList.contains("inventory-header")) return;
        item.setAttribute("draggable", "true");
        if (item.classList.contains("lancer-macro")) {
          item.addEventListener("dragstart", EncodedMacroHandler, false);
          return;
        }
        if (item.classList.contains("activation-chip")) item.addEventListener("dragstart", ActionMacroHandler, false);
        if (item.classList.contains("item"))
          item.addEventListener(
            "dragstart",
            (ev: any) => {
              this._onDragStart(ev);
            },
            false
          );
      });
  }

  _onDragEncodedMacroStart(e: DragEvent) {
    // For macros with encoded data
    e.stopPropagation();

    let encoded = (<HTMLElement>e.currentTarget).getAttribute("data-macro");

    if (!encoded) throw Error("No macro data available");

    let data = JSON.parse(decodeURI(window.atob(encoded)));
    e.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  _activateCollapses(html: JQuery) {
    let prefix = `lancer-collapse-${this.object._id}-`;
    let triggers = html.find(".collapse-trigger");
    // Init according to session store.
    triggers.each((_index, trigger) => {
      let id = trigger.getAttribute("data-collapse-id");
      if (id !== null && sessionStorage.getItem(prefix + id) !== null) {
        let collapse = document.querySelector(`.collapse[data-collapse-id=${id}]`);
        sessionStorage.getItem(prefix + id) === "opened"
          ? collapse?.classList.remove("collapsed")
          : collapse?.classList.add("collapsed");
      }
    });

    applyCollapseListeners();
  }

  async _activateActionGridListeners(html: JQuery) {
    let elements = html.find(".lancer-action-button");
    elements.on("click", async ev => {
      ev.stopPropagation();

      if (game.user?.isGM || getActionTrackerOptions().allowPlayers) {
        const params = ev.currentTarget.dataset;
        const action = params.action as ActionType | undefined;
        const data = await this.getDataLazy();
        if (action && params.val) {
          let spend: boolean;
          if (params.action === "move") {
            spend = parseInt(params.val) > 0;
          } else {
            spend = params.val === "true";
          }
          modAction(data.actor, spend, action);
        }
      } else {
        console.log(`${game.user?.name} :: Users currently not allowed to toggle actions through action manager.`);
      }
    });
  }

  _activateMacroListeners(html: JQuery) {
    // Encoded macros
    let encMacros = html.find(".lancer-macro");
    encMacros.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers
      runEncodedMacro(ev.currentTarget);
    });

    /*
    // Stat rollers
    let statMacro = html.find(".roll-stat");
    statMacro.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers
      prepareStatMacro(this.actor._id, this.getStatPath(ev)!);
    });*/

    // Weapon rollers
    let weaponMacro = html.find(".roll-attack");
    weaponMacro.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const weaponElement = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
      const weaponId = weaponElement.getAttribute("data-id");
      if (!weaponId) return ui.notifications!.warn(`Error rolling macro: No weapon ID!`);
      const weapon = this.actor.items.get(weaponId);
      if (!weapon) return ui.notifications!.warn(`Error rolling macro: Couldn't find weapon with ID ${weaponId}.`);

      let id = this.token && !this.token.isLinked ? this.token.id! : this.actor.id!;
      prepareItemMacro(id, weapon.id!);
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
      .add(html.find(".cb-macro"))
      // Reserve
      .add(html.find(".reserve-macro"));
    itemMacros.on("click", (ev: any) => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

      const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

      let id = this.token && !this.token.isLinked ? this.token.id! : this.actor.id!;
      prepareItemMacro(id, el.getAttribute("data-id")!);
    });

    // Action-chip (system? Or broader?) macros
    html.find("a.activation-chip:not(.lancer-macro)").on("click", (ev: JQuery.ClickEvent) => {
      ev.stopPropagation();

      const el = ev.currentTarget;

      const item = $(el).closest(".item")[0].getAttribute("data-id");
      if (!item) throw Error("No item ID from activation chip");

      const activation = parseInt(el.getAttribute("data-activation"));
      const deployable = parseInt(el.getAttribute("data-deployable"));

      if (!Number.isNaN(activation)) {
        prepareActivationMacro(this.actor.id!, item, ActivationOptions.ACTION, activation);
      } else if (!Number.isNaN(deployable)) {
        prepareActivationMacro(this.actor.id!, item, ActivationOptions.DEPLOYABLE, deployable);
      }
    });

    let ChargeMacro = html.find(".charge-macro");
    ChargeMacro.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

      prepareChargeMacro(this.actor);
    });
  }

  _onDragActivationChipStart(event: DragEvent) {
    // For talent macros
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let title = target.closest(".action-wrapper")?.querySelector(".action-title")?.textContent;
    let itemId = target.closest(".item")?.getAttribute("data-id");

    if (!itemId) throw Error("No item found");

    title = title ?? this.actor.items.get(itemId)?.name ?? "unknown activation";

    let a = target.getAttribute("data-activation");
    let d = target.getAttribute("data-deployable");

    let activationOption: ActivationOptions;
    let activationIndex: number;
    if (a) {
      const activation = parseInt(a);
      activationOption = ActivationOptions.ACTION;
      activationIndex = activation;
    } else if (d) {
      const deployable = parseInt(d);
      activationOption = ActivationOptions.DEPLOYABLE;
      activationIndex = deployable;
    } else {
      throw Error("unknown activation was dragged.");
    }

    // send as a generated macro:
    let macroData: LancerMacroData = {
      iconPath: `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`,
      title: title,
      fn: "prepareActivationMacro",
      args: [this.actor.id!, itemId, activationOption, activationIndex],
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(macroData));
  }

  getStatPath(event: any): string | null {
    if (!event.currentTarget) return null;
    // Find the stat input to get the stat's key to pass to the macro function
    let el = $(event.currentTarget).closest(".stat-container").find(".lancer-stat")[0] as HTMLElement;

    if (!el) el = $(event.currentTarget).siblings(".lancer-stat")[0];

    if (el.nodeName === "INPUT") {
      return (<HTMLInputElement>el).name;
    } else if (el.nodeName === "DATA") {
      return (<HTMLDataElement>el).id;
    } else if (el.nodeName === "SPAN") {
      return (<HTMLSpanElement>el).getAttribute("data-path");
    } else {
      throw "Error - stat macro was not run on an input or data element";
    }
  }

  /**
   * Handles inventory button
   */
  _activateInventoryButton(html: any) {
    let button = html.find(".inventory button");

    button.on("click", async (ev: Event) => {
      ev.preventDefault();
      return InventoryDialog.show_inventory(this.actor as LancerActor);
    });
  }

  /**
   * Activate event listeners for trigger macros using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateTriggerListeners(html: JQuery) {
    // Trigger rollers
    let triggerMacro = html.find(".roll-trigger");
    triggerMacro.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation(); // Avoids triggering parent event handlers

      let mData: LancerStatMacroData = {
        title: $(ev.currentTarget).closest(".skill-compact").find(".modifier-name").text(),
        bonus: parseInt($(ev.currentTarget).find(".roll-modifier").text()),
      };

      console.log(`${lp} Rolling '${mData.title}' trigger (d20 + ${mData.bonus})`);
      rollStatMacro(this.actor, mData);
    });
  }

  // A grand filter that pre-decides if we can drop an item ref anywhere within this sheet. Should be implemented by child sheets
  // We generally assume that a global item is droppable if it matches our types, and that an owned item is droppable if it is owned by this actor
  // This is more of a permissions/suitability question
  can_root_drop_entry(_item: AnyMMItem | AnyMMActor): boolean {
    return false;
  }

  // This function is called on any dragged item that percolates down to root without being handled
  // Override/extend as appropriate
  async on_root_drop(
    _item: AnyMMItem | AnyMMActor,
    _event: JQuery.DropEvent,
    _dest: JQuery<HTMLElement>
  ): Promise<void> {}

  // Override base behavior
  async _onDrop(_evt: DragEvent) {
    return;
  }

  // Makes us own (or rather, creates an owned copy of) the provided item if we don't already.
  // The second return value indicates whether a new copy was made (true), or if we already owned it/it is an actor (false)
  // Note: this operation also fixes limited to be the full capability of our actor
  async quick_own<T extends EntryType>(entry: LiveEntryTypes<T>): Promise<[LiveEntryTypes<T>, boolean]> {
    // Actors are unaffected
    if (is_actor_type(entry.Type)) {
      return [entry, false];
    }

    if (mm_owner(entry as AnyMMItem) != this.actor) {
      let sheet_data = await this.getDataLazy();
      let this_mm = sheet_data.mm;
      let ctx = this.getCtx();
      let inv = await this_mm.get_inventory();

      let result = await entry.insinuate(inv, ctx, {
        pre_final_write: rec => {
          // Pull a sneaky: set the limited value to max before insinuating
          if (funcs.is_tagged(rec.pending) && (rec.pending as any).Uses != undefined) {
            let as_lim = rec.pending as NpcFeature | MechWeapon | MechSystem | PilotWeapon | PilotGear | WeaponMod;
            as_lim.Uses = funcs.limited_max(as_lim) + (this_mm instanceof Mech ? this_mm.LimitedBonus : 0);
          }
        },
      });
      return [result as LiveEntryTypes<T>, true];
    } else {
      // Its already owned
      return [entry, false];
    }
  }

  _propagateMMData(formData: any): any {
    // Pushes relevant field data from the form to other appropriate locations,
    // e.x. to synchronize name between token and actor
    // @ts-expect-error should be fixed and not need the "as" with v10 types
    let token = this.actor.prototypeToken as PrototypeTokenData;

    // Get the basics
    let new_top: any = {
      img: formData.img,
      name: formData.name,
    };

    // Set the prototype token image if the prototype token isn't initialized
    if (!token) {
      new_top["token.img"] = formData["img"];
      new_top["token.name"] = formData["name"];
    }
    // Update token image if it matches the old actor image - keep in sync
    else {
      // @ts-expect-error should be fixed with v10 types
      if (this.actor.img === token.texture?.src && this.actor.img !== formData["img"]) {
        new_top["token.img"] = formData["img"];
      } // Same for name
      if (this.actor.name === token["name"] && this.actor.name !== formData["name"]) {
        new_top["token.name"] = formData["name"];
      }
    }

    return new_top;
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(_event: Event, formData: any): Promise<LancerActor | undefined> {
    // Fetch the curr data
    let ct = await this.getDataLazy();

    // Bound NPC tier as it is one of the most frequent sheet breakers. TODO: more general solution
    if ("npctier" in formData) {
      formData["mm.Tier"] = Number.parseInt(formData["npctier"]) || 1;
    }

    // Automatically propagates changes that should affect multiple things.
    let new_top = this._propagateMMData(formData);

    // Combine the data, making sure to propagate the "top level data" to the appropriate location in flags
    gentle_merge(ct, formData);
    mergeObject((ct.mm.Flags as FoundryFlagData<any>).top_level_data, new_top);
    await this._commitCurrMM();
    return this.actor;
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<LancerActorSheetData<T>> {
    const data = await super.getData(); // Not fully populated yet!

    // Drag up the mm context (when ready) to a top level entry in the sheet data
    // @ts-ignore T doesn't narrow this.actor.data
    data.mm = await this.actor.system.derived.mm_promise;

    // Also wait for all of their items
    for (let i of this.actor.items.contents) {
      // @ts-expect-error Should be fixed with v10 types
      await i.system.derived?.mm_promise; // The ? is necessary in case of a foundry internal race condition
    }

    console.log(`${lp} Rendering with following actor ctx: `, data);
    this._currData = data;
    return data;
  }
  // Cached getdata
  protected _currData: LancerActorSheetData<T> | null = null;
  async getDataLazy(): Promise<LancerActorSheetData<T>> {
    return this._currData ?? (await this.getData());
  }

  // Write back our currently cached _currData, then refresh this sheet
  // Useful for when we want to do non form-based alterations
  async _commitCurrMM() {
    console.log("Committing ", this._currData);
    let cd = this._currData;
    this._currData = null;
    await cd?.mm.writeback();

    // Compendium entries don't re-draw appropriately unless we do this. 0.8 Should fix, hopefully
    if (this.actor.compendium) {
      this.render();
    }
  }

  // Get the ctx that our actor + its items reside in
  getCtx(): OpCtx {
    return (this.actor as LancerActor)._actor_ctx;
  }
}
function rollStatMacro(_actor: unknown, _mData: LancerStatMacroData) {
  throw new Error("Function not implemented.");
}
