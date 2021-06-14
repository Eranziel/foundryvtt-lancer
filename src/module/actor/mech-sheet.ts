import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import {
  EntryType,
  funcs,
  LiveEntryTypes,
  MountType,
  OpCtx,
  RegEntry,
  RegRef,
  SystemMount,
  WeaponMod,
  WeaponMount,
  WeaponSlot,
} from "machine-mind";
import { mm_owner, mm_wrap_item } from "../mm-util/helpers";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";
import { AnyMMItem, is_item_type, LancerItemType, LancerItemTypes, LancerMechWeapon } from "../item/lancer-item";
import { Mech, MechWeapon } from "machine-mind";
import tippy from "tippy.js";
import { AnyMMActor } from "./lancer-actor";

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
      template: "systems/lancer/templates/actor/mech.hbs",
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
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    this._activateTooltips();

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._activateOverchargeControls(html);
    this._activateLoadoutControls(html);
    this._activateMountContextMenus(html);
  }

  /* -------------------------------------------- */

  private _activateTooltips() {
    tippy('[data-context-menu="toggle"][data-field="Destroyed"]', {
      content: "Right Click to Destroy",
      delay: [300, 100],
    });
  }

  
  can_root_drop_entry(item: AnyMMActor | AnyMMItem): boolean {
    // Reject any non npc / non pilot item
    if(item.Type == EntryType.PILOT) {
      // For setting pilot
      return true;
    }

    if(LANCER.mech_items.includes(item.Type as LancerItemType)) {
      // For everything else
      return true;
    }
    return false;
  }

  async on_root_drop(base_drop: AnyMMItem | AnyMMActor): Promise<void> {
    let sheet_data = await this.getDataLazy();
    let this_mm = sheet_data.mm;

    console.log("Mech dropping");
    // Take posession
    let [drop, is_new] = await this.quick_own(base_drop);

    // Now, do sensible things with it
    if (is_new && drop.Type === EntryType.FRAME) {
      // If new frame, auto swap with prior frame
      this_mm.Loadout.Frame = drop;

      // Reset mounts
      await this_mm.Loadout.reset_weapon_mounts();
    } else if (is_new && drop.Type === EntryType.MECH_WEAPON) {
      // If frame, weapon, put it in an available slot
      await this_mm.Loadout.equip_weapon(drop);
    } else if (is_new && drop.Type === EntryType.MECH_SYSTEM) {
      await this_mm.Loadout.equip_system(drop);
    } else if (drop.Type == EntryType.PILOT) {
      this_mm.Pilot = drop;
    }

    // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
    await this_mm.writeback();
  }

  /**
   * Handles actions in the overcharge panel
   */
  _activateOverchargeControls(html: any) {
    // Overcharge text
    let overchargeText = html.find(".overcharge-text");

    overchargeText.on("click", (ev: Event) => {
      this._setOverchargeLevel(<MouseEvent>ev, Math.min(this.actor.data.data.current_overcharge + 1, 3));
    });

    // Overcharge reset
    let overchargeReset = html.find(".overcharge-reset");

    overchargeReset.on("click", (ev: Event) => {
      this._setOverchargeLevel(<MouseEvent>ev, 0);
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
    let ent = data.mm;
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
    mode: "reset-wep" | "reset-all-weapon-mounts" | "reset-sys" | "overcharge" | "overcharge-rollback",
    evt: JQuery.ClickEvent
  ) {
    evt.stopPropagation();
    let data = await this.getDataLazy();
    let ent = data.mm;
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
