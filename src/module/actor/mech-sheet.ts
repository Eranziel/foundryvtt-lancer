import { LancerActorSheet } from "./lancer-actor-sheet";
import { resolveDotpath } from "../helpers/commons";
import tippy from "tippy.js";
import type { LancerMECH } from "./lancer-actor";
import { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType, fittingsForMount, FittingSize, MountType, SystemType } from "../enums";
import { SystemData } from "../system-template";
import { LancerActorSheetData } from "../interfaces";
import { SourceData } from "../source-template";

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
  /**
   * Extend and override the default options used by the NPC Sheet
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._activateOverchargeControls(html);
    this._activateLoadoutControls(html);
    this._activateMountContextMenus(html);
  }

  /* -------------------------------------------- */

  canRootDrop(item: ResolvedDropData): boolean {
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

  async onRootDrop(base_drop: ResolvedDropData, event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {
    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    if (drop.type == "Item" && drop.document.is_frame() && this.actor.is_mech()) {
      // Find and delete the old frame item, if it exists
      const oldFrame = this.actor.items.find(i => i.is_frame() && i.id != drop.document.id);
      if (oldFrame) {
        await this.actor.deleteEmbeddedDocuments("Item", [oldFrame.id!]);
      }
      // If new frame, auto swap with prior frame
      await this.actor.swapFrameImage(drop.document);
      await this.actor.updateTokenSize(drop.document);
      await this.actor.update({
        "system.loadout.frame": drop.document.id,
      });
      await this.actor.loadoutHelper.resetMounts();
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_weapon()) {
      // If frame, weapon, put it in first available slot. Who cares if it fits
      let currMounts: SourceData.Mech["loadout"]["weapon_mounts"] = foundry.utils.duplicate(
        // @ts-expect-error
        this.actor.system._source.loadout.weapon_mounts
      );
      let set = false;
      for (let mount of currMounts) {
        if (set) break;
        for (let i = 0; i < mount.slots.length; i++) {
          if (!mount.slots[i].weapon) {
            mount.slots[i].weapon = drop.document.id;
            set = true;
            break;
          }
        }
      }
      await this.actor.update({
        "system.loadout.weapon_mounts": currMounts,
      });
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_system()) {
      let oldSystems: string[] = (this.actor as any).system._source.loadout.systems;
      await this.actor.update({
        "system.loadout.systems": [...oldSystems, drop.document.id],
      });
    } else if (drop.type == "Actor" && drop.document.is_pilot()) {
      await this.actor.update({
        "system.pilot": drop.document.uuid,
      });
      await drop.document.update({
        "system.active_mech": this.actor.uuid,
      });
    }

    // If this isn't a new item and it's an NPC feature, we need to update the sorting
    if (this.isEditable && !is_new && drop.type === "Item" && drop.document.is_mech_system()) {
      // @ts-expect-error v11 types
      this._onSortItem(event, drop.document.toObject());
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

    // Handle generic mount type
    for (let selection of Object.values(MountType)) {
      mount_options.push({
        name: selection,
        icon: "",
        callback: async (html: JQuery) => {
          let mountPath = html[0].dataset.path ?? "";

          // Get the current mount
          let mount = resolveDotpath(this.actor, mountPath) as SystemData.Mech["loadout"]["weapon_mounts"][0];
          if (!mount) {
            console.error("Bad mountpath:", mountPath);
          }

          // Construct our new slots based on old slots
          let newSlots: SourceData.Mech["loadout"]["weapon_mounts"][0]["slots"] = [];
          let newSlotTypes = fittingsForMount(selection);
          newSlots = newSlots.splice(newSlotTypes.length); // Cut off everything past this end
          for (let i = 0; i < newSlotTypes.length; i++) {
            if (mount.slots[i]?.weapon?.value) {
              newSlots.push({
                mod: mount.slots[i].mod?.value?.id ?? null,
                size: newSlotTypes[i],
                weapon: mount.slots[i].weapon?.value?.id ?? null,
              });
            } else {
              newSlots.push({
                mod: null,
                size: newSlotTypes[i],
                weapon: null,
              });
            }
          }

          // Put the edits
          this.actor.update({
            [mountPath + ".type"]: selection,
            [mountPath + ".bracing"]: false,
            [mountPath + ".slots"]: newSlots,
          });
        },
      });
    }

    // Add a bracing option
    mount_options.push({
      name: "Superheavy Bracing",
      icon: "",
      callback: async (html: JQuery) => {
        let cd = await this.getData();
        let mountPath = html[0].dataset.path ?? "";

        // Get the current mount
        let mount = resolveDotpath(cd, mountPath) as SystemData.Mech["loadout"]["weapon_mounts"][0];
        if (!mount) {
          console.error("Bad mountpath:", mountPath);
        }

        // Set as bracing
        this.actor.update({
          [mountPath + ".type"]: MountType.Unknown,
          [mountPath + ".bracing"]: true,
          [mountPath + ".slots"]: [],
        });
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
    let mech = this.actor as LancerMECH;
    let path = evt.currentTarget?.dataset?.path;

    switch (mode) {
      case "reset-all-weapon-mounts":
        await this.actor.loadoutHelper.resetMounts();
        break;
      case "reset-sys":
        this.actor.update({ "system.loadout.systems": [] });
        break;
      case "reset-wep":
        if (!path) return;
        ui.notifications?.info("TODO: Reset the weapons");
        // let wep_mount = resolveDotpath(data, path) as WeaponMount;
        // wep_mount?.reset();
        break;
      default:
        return; // no-op
    }
  }

  async getData(): Promise<LancerActorSheetData<EntryType.MECH>> {
    let data = await super.getData();
    // @ts-expect-error
    data.pilot = this.actor.system.pilot?.value;
    // @ts-expect-error
    data.is_active = this.actor.system.pilot?.value?.system.active_mech?.value == this.actor;
    // data.pilot = await this.actor.system.pilot;
    return data;
  }
}
