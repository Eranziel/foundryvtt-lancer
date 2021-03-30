import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import {
  EntryType,
  funcs,
  MountType,
  OpCtx,
  RegRef,
  SystemMount,
  WeaponMount,
  WeaponSlot,
} from "machine-mind";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
  /**
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/mech.html",
      width: 800,
      height: 800,
    });
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: any) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._activateOverchargeControls(html);
    this._activateLoadoutControls(html);
    this._activateMountContextMenus(html);

  }

  /* -------------------------------------------- */

  // Baseline drop behavior. Let people add stuff to the mech
  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail.
    }

    // Prep data
    let item = drop.entity;
    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;

    // Check if we can even do anything with it first
    if (!LANCER.mech_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to a Mech.`);
      return null;
    }

    // Make the context for the item
    const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

    // Always add the item to the mech, now that we know it is a valid mech posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

    // Now, do sensible things with it
    if (new_live_item.Type === EntryType.FRAME) {
      // If frame, auto swap with prior frame
      new_live_this.Loadout.Frame = new_live_item;

      // Reset mounts
      await new_live_this.Loadout.reset_weapon_mounts();
    } else if (new_live_item.Type === EntryType.MECH_WEAPON) {
      // If frame, weapon, put it in an available slot
      new_live_this.Loadout.equip_weapon(new_live_item);
    } else if (new_live_item.Type === EntryType.MECH_SYSTEM) {
      new_live_this.Loadout.equip_system(new_live_item);
    }
    // Most other things (weapon mods) aren't directly equipped to the mech and should be handled in their own sheet / their own subcomponents. We've already taken posession, and do nothing more

    // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
    await new_live_this.writeback();

    // Always return the item if we haven't failed for some reason
    return item;
  }

  /**
   * Handles actions in the overcharge panel
   */
  _activateOverchargeControls(html: any) {
      // Overcharge text
      let overchargeText = html.find(".overcharge-text");


      overchargeText.on("click", (ev: Event) => {
        this._setOverchargeLevel(<MouseEvent>ev,Math.min(this.actor.data.data.current_overcharge + 1,3));
      });

      // Overcharge reset
      let overchargeReset = html.find(".overcharge-reset");

      overchargeReset.on("click", (ev: Event) => {
        this._setOverchargeLevel(<MouseEvent>ev,0);
      });

      // Overcharge macro
      let overchargeMacro = html.find(".overcharge-macro");

      overchargeMacro.on("click", (ev: Event) => {
        this._onClickOvercharge(<MouseEvent>ev);
      });
  }

  /**
   * For dragging overcharge to the hotbar
   * @param event   The associated DragEvent
   */
  _onDragOverchargeStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    // let target = <HTMLElement>event.currentTarget;

    let data = {
      actorId: this.actor._id,
      // Title will simply be CORE PASSIVE since we want to keep the macro dynamic
      title: "OVERCHARGE",
      type: "overcharge",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /**
   * Sets the overcharge level for this actor
   * @param event An event, used by a proper overcharge section in the sheet, to get the overcharge field
   * @param level Level to set overcharge to
   */
  async _setOverchargeLevel(event: MouseEvent, level: number) {
    let data = await this.getDataLazy();
    let ent = data.mm.ent;
    ent.CurrentOvercharge = level;
    await this._commitCurrMM();
  }

  /**
   * Performs the overcharge macro
   * @param event An event, used by a proper overcharge section in the sheet, to get the overcharge field
   */
  _onClickOvercharge(event: MouseEvent) {
    game.lancer.prepareOverchargeMacro(this.actor._id);
  }


  /**
   * Handles more niche controls in the loadout in the overcharge panel
   */
  _activateLoadoutControls(html: any) {
    html.find(".reset-weapon-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-wep", evt);
    });

    html.find(".reset-ll-weapon-mounts-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-all-weapon-mounts", evt);
    });

    html.find(".reset-system-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-sys", evt);
    });
  }

  // Allows user to change mount size via right click ctx
  _activateMountContextMenus(html: any) {
    let mount_options: any[] = [];
    for (let mount_type of Object.values(MountType)) {
      mount_options.push({
        name: mount_type,
        icon: "",
        // condition: game.user.isGM,
        callback: async (html: JQuery) => {
          let cd = await this.getDataLazy();
          let mount_path = html[0].dataset.path ?? "";

          // Get the current mount
          let mount: WeaponMount = resolve_dotpath(cd, mount_path);
          if (!mount) {
            console.error("Bad mountpath:", mount_path);
          }

          // Edit it. Someday we'll want to have a way to resize without nuking. that day is not today
          mount.MountType = mount_type;
          mount.reset();

          // Write back
          await this._commitCurrMM();
        },
      });
    }

    new ContextMenu(html, ".mount-type-ctx-root", mount_options);
  }

  // Save ourselves repeat work by handling most events clicks actual operations here
  async _event_handler(
    mode:
      | "reset-wep"
      | "reset-all-weapon-mounts"
      | "reset-sys"
      | "overcharge"
      | "overcharge-rollback",
    evt: JQuery.ClickEvent
  ) {
    evt.stopPropagation();
    let data = await this.getDataLazy();
    let ent = data.mm.ent;
    let path = evt.currentTarget?.dataset?.path;

    switch (mode) {
      case "reset-all-weapon-mounts":
        await ent.Loadout.reset_weapon_mounts();
        break;
      case "reset-sys":
        if (!path) return;
        let sys_mount = resolve_dotpath(data, path) as SystemMount;
        sys_mount.System = null;
        break;
      case "reset-wep":
        if (!path) return;
        let wep_mount = resolve_dotpath(data, path) as WeaponMount;
        wep_mount?.reset();
        break;
      default:
        return; // no-op
    }

    await this._commitCurrMM();
  }
}
