import { fittingsForMount, FittingSize, MountType, WeaponSize } from "../enums.js";
import { LancerItem } from "../item/lancer-item.js";
import type { SourceData } from "../source-template.js";
import type { SystemData } from "../system-template.js";
import { LancerActor } from "./lancer-actor.js";

/** Holds helper methods for loadout validation etc */
export class LoadoutHelper {
  constructor(private readonly actor: LancerActor) {}

  // Do the specified junk to an item. Returns an object suitable for updateEmbeddedDocuments
  private refresh(
    item: LancerItem,
    opts: {
      repair?: boolean;
      reload?: boolean;
      refill?: boolean;
    }
  ): any {
    let changes: any = { _id: item.id };
    if (opts.repair && (item as any).destroyed !== undefined) {
      changes["system.destroyed"] = false;
    }
    if (opts.reload && (item as any).loaded !== undefined) {
      changes["system.loaded"] = true;
    }
    if (opts.refill && (item as any).uses !== undefined) {
      changes["system.uses"] = (item as any).uses.max;
    }

    return changes;
  }

  // List the all equipped loadout items on this actor
  // For mechs this is everthing in system.loadout, IE: Mech weapons, Mech Systems, Frame
  listLoadout(): Array<LancerItem> {
    let result = [] as LancerItem[];
    let it = this.actor.itemTypes;
    if (this.actor.is_mech()) {
      if (this.actor.system.loadout.frame?.status == "resolved") result.push(this.actor.system.loadout.frame.value);
      // Do all of the weapons/systems/mods on our loadout
      for (let mount of this.actor.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          // Do weapon
          if (slot.weapon?.status == "resolved") {
            result.push(slot.weapon.value);
          }
          // Do mod
          if (slot.mod?.status == "resolved") {
            result.push(slot.mod.value);
          }
        }
      }

      // Do all systems now
      result.push(...(this.actor.system.loadout.systems.filter(x => x?.value).map(x => x!.value) as LancerItem[]));
    } else if (this.actor.is_npc()) {
      if (this.actor.system.class) result.push(this.actor.system.class);
      result.push(...it.npc_class, ...it.npc_template, ...it.npc_feature);
    } else if (this.actor.is_pilot()) {
      // result.push(...ent.OwnedPilotWeapons, ...ent.OwnedPilotArmor, ...ent.OwnedPilotGear); // TODO
    } else {
    }
    return result;
  }

  // Fully repair actor
  // Even pilots can be fully repaired
  async fullRepair() {
    // Remove all statuses affecting this mech. Keep active effects generally - most are positive
    await this.actor.effectHelper.removeAllStatuses();

    // Remove unequipped items
    await this.deleteUnequippedItems();

    let changes: Record<string, any> = {
      // @ts-expect-error System's broken unless narrowed
      "system.hp": this.actor.system.hp.max,
      "system.burn": 0,
      "system.overshield": 0,
    };

    // Things for heat-havers
    if (this.actor.is_mech() || this.actor.is_npc() || this.actor.is_deployable()) {
      changes["system.heat"] = 0;
    }

    if (this.actor.is_mech() || this.actor.is_npc()) {
      changes["system.structure"] = this.actor.system.structure.max;
      changes["system.stress"] = this.actor.system.stress.max;
    }

    // Things just for mechs
    if (this.actor.is_mech()) {
      changes["system.core_energy"] = 1;
      changes["system.core_active"] = false;
      changes["system.overcharge"] = 0;
      changes["system.repairs"] = this.actor.system.repairs.max;
      changes["system.meltdown_timer"] = null;
    }

    // Pilots propagate a repair to their mech
    if (this.actor.is_pilot()) {
      await this.actor.system.active_mech?.value?.loadoutHelper.fullRepair();
    }

    if (!this.actor.is_deployable()) await this.restoreAllItems();
    await this.actor.update(changes);
  }

  /**
   * Find all limited systems and set them to their max/repaired/ideal state
   */
  async restoreAllItems() {
    let fixes = this.listLoadout().map(i =>
      this.refresh(i, {
        reload: true,
        repair: true,
        refill: true,
      })
    );
    return this.actor.updateEmbeddedDocuments("Item", fixes);
  }

  /**
   * Find all owned items and set them to be not destroyed
   */
  async repairAllItems() {
    return Promise.all(this.listLoadout().map(i => this.refresh(i, { repair: true })));
  }

  /**
   * Find all owned weapons and (generate the changes necessary to) reload them
   */
  reloadAllItems() {
    return this.listLoadout().map(i => this.refresh(i, { reload: true }));
  }

  /**
   * Check our items for any that aren't equipped, and delete them
   */
  async deleteUnequippedItems() {
    let deletables: LancerItem[] = [];

    // Flag all unequipped mech equipment
    for (let item of this.actor.items.contents) {
      // Equipped is true for any non-equippable item, so this is pretty simple!
      if (item.id && !item.isEquipped()) {
        deletables.push(item);
      }
    }
    // Kill!
    if (deletables.length) await this.actor._safeDeleteEmbedded("Item", deletables);
  }

  /**
   * Check our loadout as applicable to cleanup any unresolved references
   */
  async cleanupUnresolvedReferences() {
    // Bundled updates are theoretically rare, but if they ever were to occur its better than just first-instinct-updating 30 times
    let killedIds: string[] = [];
    if (this.actor.is_pilot()) {
      // @ts-expect-error
      let cleanupLoadout = foundry.utils.duplicate(this.actor.system._source.loadout) as SourceData.Pilot["loadout"];
      let currLoadout = this.actor.system.loadout;
      // Fairly simple
      cleanupLoadout.armor = cleanupLoadout.armor.map((_, index) => {
        if (currLoadout.armor[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.armor[index]!);
          return null;
        } else {
          return cleanupLoadout.armor[index];
        }
      });
      cleanupLoadout.gear = cleanupLoadout.gear.map((_, index) => {
        if (currLoadout.gear[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.gear[index]!);
          return null;
        } else {
          return cleanupLoadout.gear[index];
        }
      });
      cleanupLoadout.weapons = cleanupLoadout.weapons.map((_, index) => {
        if (currLoadout.weapons[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.weapons[index]!);
          return null;
        } else {
          return cleanupLoadout.weapons[index];
        }
      });

      // Only cleanup on length mismatch
      if (killedIds.length) {
        console.log(`Cleaning up unresolved ids ${killedIds.join(", ")}...`);
        await this.actor.update({ system: { loadout: cleanupLoadout } });
      }
    } else if (this.actor.is_mech()) {
      // @ts-expect-error
      let cleanupLoadout = foundry.utils.duplicate(this.actor.system._source.loadout) as SourceData.Mech["loadout"];
      let currLoadout = this.actor.system.loadout;
      // Frame is simple
      if (currLoadout.frame?.status == "missing") {
        killedIds.push(currLoadout.frame.id);
        cleanupLoadout.frame = null;
      }

      // Systems are annoying. Remove all missing references corresponding source entry, then mark as needing cleanup if that shortened our array
      cleanupLoadout.systems = cleanupLoadout.systems.filter((_, index) => {
        if (currLoadout.systems[index]?.status == "missing") {
          killedIds.push(currLoadout.systems[index]!.id);
          return false;
        } else {
          return true;
        }
      });

      // Weapons are incredibly annoying. Traverse and nullify corresponding slots
      for (let i = 0; i < currLoadout.weapon_mounts.length; i++) {
        let mount = currLoadout.weapon_mounts[i];
        for (let j = 0; j < mount.slots.length; j++) {
          let slot = mount.slots[j];
          if (slot.mod?.status == "missing") {
            cleanupLoadout.weapon_mounts[i].slots[j].mod = null;
            killedIds.push(slot.mod.id);
          }
          if (slot.weapon?.status == "missing") {
            cleanupLoadout.weapon_mounts[i].slots[j].weapon = null;
            killedIds.push(slot.weapon.id);
          }
        }
      }

      // Only update if necessary
      if (killedIds.length) {
        console.log(`Cleaning up unresolved ids ${killedIds.join(", ")}...`);
        await this.actor.update({ system: { loadout: cleanupLoadout } });
      }
    }
    // Deployables and NPCs don't have reference junk, so we don't mess with 'em
  }

  /**
   * Yields a simple error message on a misconfigured mount, or null if no issues detected.
   * @param mount Specific mount to validate
   */
  validateMount(mount: SystemData.Mech["loadout"]["weapon_mounts"][0]): string | null {
    if (this.actor.is_mech()) {
      let loadout = this.actor.system.loadout;
      let hasBracing = loadout.weapon_mounts.some(m => m.bracing);
      let hasSuper = false;
      let hasFlexMain = false;
      let weaponCount = 0;
      let result = "";

      // If someone has messed up fittings, then they probably did so on purpose.
      // Thus, we only check that within each slot the size makes sense

      for (let slot of mount.slots) {
        if (slot.weapon?.status != "resolved") continue;
        weaponCount += 1;
        // if (slot.weapon.value.system.size == WeaponSize.)

        // See if it fits
        const weaponSizeScore =
          {
            [WeaponSize.Aux]: 1,
            [WeaponSize.Main]: 2,
            [WeaponSize.Heavy]: 3,
            [WeaponSize.Superheavy]: 3,
          }[slot.weapon.value.system.size] ?? 4;
        const fittingSizeScore =
          {
            [FittingSize.Auxiliary]: 1,
            [FittingSize.Main]: 2,
            [FittingSize.Flex]: 2,
            [FittingSize.Heavy]: 3,
            [FittingSize.Integrated]: 4,
          }[slot.size] ?? 0;
        if (weaponSizeScore > fittingSizeScore) {
          result += `Weapon of size ${slot.weapon.value.system.size} cannot fit on fitting of size ${slot.size}. `;
          continue;
        }
        if (slot.size == FittingSize.Flex && weaponSizeScore > 1) {
          hasFlexMain = true;
        }
        if (slot.weapon.value.system.size == WeaponSize.Superheavy) {
          hasSuper = true;
        }
      }

      if (hasFlexMain && weaponCount > 1) {
        result += `Flex mounts can either have two Auxillary or one Main weapon.`;
      }

      if (hasSuper && !hasBracing) {
        result += `Superheavy weapons require a mount to be set as "Bracing".`;
      }

      return result || null;
    } else {
      throw new Error(
        `${this.actor.type} actors have no mounts to validate. Call this method on the actor you're trying to check against!`
      );
    }
  }

  /**
   * Reset the mounts to the default for the frame + core bonus configuration
   * Will automatically equip the frames integrated mount
   * @returns
   */
  async resetMounts() {
    if (!this.actor.is_mech()) return;

    let newMounts = [] as SourceData.Mech["loadout"]["weapon_mounts"];

    let frame = this.actor.system.loadout.frame?.value;
    if (frame) {
      const gen_mount = (mt: MountType) => ({
        bracing: false,
        slots: fittingsForMount(mt).map(f => ({
          weapon: null,
          mod: null,
          size: f,
        })),
        type: mt,
      });
      let baseMounts = frame.system.mounts;

      let pilot = this.actor.system.pilot?.value;
      // @ts-expect-error
      const get_cb = (lid: string) => pilot?.itemTypes.core_bonus.find(cb => cb.system.lid == lid);
      let retrofitting = get_cb("cb_mount_retrofitting");
      let improved_armament = get_cb("cb_improved_armament");
      let integrated_weapon = get_cb("cb_integrated_weapon");

      // If improved armament, add a main mount if we need to
      if (baseMounts.length < 3 && improved_armament) {
        baseMounts.push(MountType.Main);
      }

      // If retrofitting, replace worst mount type with a main/aux
      if (retrofitting) {
        for (let mt of [MountType.Aux, MountType.AuxAux, MountType.Main, MountType.Flex]) {
          if (baseMounts.findSplice(x => x == mt, MountType.MainAux)) break;
        }
      }

      // If integrated, add an integrated
      if (integrated_weapon) {
        baseMounts = [MountType.Integrated, ...baseMounts];
      }

      // If frame has an integrated weapon, insert that (or those) as our first weapon(s)
      for (let integrated_lid of frame.system.core_system.integrated) {
        // @ts-expect-error
        let corr_item = this.actor.items.find(x => x.system.lid == integrated_lid);
        if (corr_item && corr_item.is_mech_weapon()) {
          newMounts.push({
            bracing: false,
            slots: [
              {
                mod: null,
                size: FittingSize.Integrated,
                weapon: corr_item.id!,
              },
            ],
            type: MountType.Integrated,
          });
        }
      }

      // Generate rest of our mounts
      for (let mt of baseMounts) {
        newMounts.push(gen_mount(mt));
      }
    }
    this.actor.update({ "system.loadout.weapon_mounts": newMounts });
  }
}
