import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { resolve_dotpath } from "../helpers/commons";
import tippy from "tippy.js";
import type { LancerActor, LancerMECH } from "./lancer-actor";
import { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType, MountType, SystemType } from "../enums";
import { SystemData } from "../system-template";
import { LancerActorSheetData } from "../interfaces";

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
  /**
   * Extend and override the default options used by the NPC Sheet
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "mech"],
      template: `systems/${game.system.id}/templates/actor/mech.hbs`,
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "stats",
        },
      ],
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

    LancerMechSheet._activateTooltips();

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._activateOverchargeControls(html);
    this._activateLoadoutControls(html);
    this._activateMountContextMenus(html);
  }

  /* -------------------------------------------- */

  private static _activateTooltips() {
    tippy('[data-context-menu="toggle"][data-field="Destroyed"]', {
      content: "Right Click to Destroy",
      delay: [300, 100],
    });
  }

  can_root_drop_entry(item: ResolvedDropData): boolean {
    // Reject any non npc / non pilot item
    if (item.type == "Actor" && item.document.is_pilot()) {
      // For setting pilot
      return true;
    } else if (item.type == "Item") {
      return item.document.is_mech_system() || item.document.is_mech_weapon() || item.document.is_frame();
    } else {
      return false;
    }
  }

  async on_root_drop(base_drop: ResolvedDropData): Promise<void> {
    // Take posession
    let [drop, is_new] = await this.quick_own_drop(base_drop);

    // Now, do sensible things with it
    if (drop.type == "Item" && drop.document.is_frame() && this.actor.is_mech()) {
      // If new frame, auto swap with prior frame
      await this.actor.swapFrameImage(this.actor, this.actor.system.loadout.frame?.value ?? null, drop.document);
      await this.actor.update({
        "system.loadout.frame": drop.document.id,
      });

      // Reset mounts
      // await this_mm.Loadout.reset_weapon_mounts();
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_weapon()) {
      // If frame, weapon, put it in an available slot
      // await this_mm.Loadout.equip_weapon(drop);
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_system()) {
      // await this_mm.Loadout.equip_system(drop);
    } else if (drop.type == "Actor" && drop.document.is_pilot()) {
      await this.actor.update({
        "system.pilot": drop.document.uuid,
      });
    }
  }

  /**
   * Handles actions in the overcharge panel
   */
  _activateOverchargeControls(html: JQuery<HTMLElement>) {
    // Overcharge text
    let overchargeText = html.find(".overcharge-text");

    overchargeText.on("click", ev => {
      if (!this.actor.is_mech()) return;
      this._setOverchargeLevel(ev, Math.min(this.actor.system.overcharge + 1, 3));
    });

    // Overcharge reset
    let overchargeReset = html.find(".overcharge-reset");

    overchargeReset.on("click", ev => {
      this._setOverchargeLevel(ev, 0);
    });
  }

  /**
   * Sets the overcharge level for this actor
   * @param event An event, used by a proper overcharge section in the sheet, to get the overcharge field
   * @param level Level to set overcharge to
   */
  async _setOverchargeLevel(_event: JQuery.ClickEvent, level: number) {
    let a = this.actor as LancerMECH;
    return a.update({
      "system.overcharge": level,
    });
  }

  /**
   * Handles more niche controls in the loadout in the overcharge panel
   */
  _activateLoadoutControls(html: any) {
    html.find(".reset-weapon-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-wep", evt);
    });

    html.find(".reset-all-weapon-mounts-button").on("click", async (evt: JQuery.ClickEvent) => {
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
          let mount_path = html[0].dataset.path ?? "";

          // Get the current mount
          let mount = resolve_dotpath(this.actor, mount_path) as SystemData.Mech["loadout"]["weapon_mounts"][0];
          if (!mount) {
            console.error("Bad mountpath:", mount_path);
          }

          // Edit it. Someday we'll want to have a way to resize without nuking. that day is not today
          this.actor.update({
            [mount_path + ".type"]: mount_type,
            [mount_path + ".bracing"]: false,
          });
          mount.type = mount_type;
          mount.bracing = false;
        },
      });
    }

    // Add a bracing option
    mount_options.push({
      name: "Superheavy Bracing",
      icon: "",
      callback: async (html: JQuery) => {
        let cd = await this.getData();
        let mount_path = html[0].dataset.path ?? "";

        // Get the current mount
        let mount = resolve_dotpath(cd, mount_path) as SystemData.Mech["loadout"]["weapon_mounts"][0];
        if (!mount) {
          console.error("Bad mountpath:", mount_path);
        }

        // Set as bracing
        console.log("TODO");
        // mount.bracing = true;
        // mount.reset();

        // Write back
        // await this._commitCurrMM();
      },
    });

    new ContextMenu(html, ".mount-type-ctx-root", mount_options);
  }

  // Save ourselves repeat work by handling most events clicks actual operations here
  async _event_handler(
    mode: "reset-wep" | "reset-all-weapon-mounts" | "reset-sys" | "overcharge" | "overcharge-rollback",
    evt: JQuery.ClickEvent
  ) {
    evt.stopPropagation();
    let data = await this.getData();
    let mech = this.actor as LancerMECH;
    let path = evt.currentTarget?.dataset?.path;

    switch (mode) {
      case "reset-all-weapon-mounts":
        // await mech.Loadout.reset_weapon_mounts();
        ui.notifications?.info("TODO: Reset the mounts");
        break;
      case "reset-sys":
        if (!path) return;
        ui.notifications?.info("TODO: Reset the systems");
        // let sys_mount = resolve_dotpath(data, path) as SystemMount;
        // sys_mount.System = null;
        break;
      case "reset-wep":
        if (!path) return;
        ui.notifications?.info("TODO: Reset the weapons");
        // let wep_mount = resolve_dotpath(data, path) as WeaponMount;
        // wep_mount?.reset();
        break;
      default:
        return; // no-op
    }
  }

  async getData(): Promise<LancerActorSheetData<EntryType.MECH>> {
    let data = await super.getData();
    // @ts-expect-error
    data.pilot = await this.actor.system.pilot?.value;
    // data.pilot = await this.actor.system.pilot;
    return data;
  }
}
