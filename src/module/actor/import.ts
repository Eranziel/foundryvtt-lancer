import { replaceDefaultResource } from "../config";
import { EntryType, FittingSize, MountType } from "../enums";
import {
  LancerBOND,
  LancerCORE_BONUS,
  LancerFRAME,
  LancerItem,
  LancerLICENSE,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerPILOT_ARMOR,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerSKILL,
  LancerTALENT,
  LancerWEAPON_MOD,
} from "../item/lancer-item";
import { PowerData } from "../models/bits/power";
import { SourceData } from "../source-template";
import { insinuate } from "../util/doc";
import { lookupLID } from "../util/lid";
import {
  PackedEquipmentData,
  PackedMechWeaponSaveData,
  PackedMountData,
  PackedPilotData,
  PackedPilotEquipmentState,
} from "../util/unpacking/packed-types";
import { LancerActor, LancerMECH, LancerPILOT } from "./lancer-actor";
import { frameToPath } from "./retrograde-map";

// Imports packed pilot data, from either a vault id or gist id
export async function importCC(pilot: LancerPILOT, data: PackedPilotData, clearFirst = false) {
  console.log("Importing Pilot", pilot, data);
  if (!pilot.is_pilot() || !data) return;
  if (clearFirst) {
    await pilot.deleteEmbeddedDocuments("Item", Array.from(pilot.items.keys()));
    let existing_mechs = game.actors?.filter(x => x.is_mech() && x.system.pilot?.value == pilot) ?? [];
    for (let m of existing_mechs) {
      await m.deleteEmbeddedDocuments("Item", Array.from(m.items.keys()));
    }
  }

  // Immediately fix the name, so deployables get named properly
  await pilot.update({
    name: data.name,
  });

  try {
    let unit_folder = pilot.folder;
    // @ts-expect-error Should be fixed with v10 types
    let permission = foundry.utils.duplicate(pilot.ownership);

    // Check whether players are allowed to create Actors
    let canCreate = !game.user?.can("ACTOR_CREATE");
    let gmsOnline = game.users?.some(u => u.isGM && u.active);
    if (!canCreate && !gmsOnline) {
      new Dialog({
        title: "Cannot Create Actors",
        content: `<p>You are not permitted to create actors + No GM's are online, so sync will not produce any new mechs.</p>
            <p>Your GM can allow Players/Trusted Players to create actors in Settings->Configure Permissions.</p>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
          },
        },
        default: "ok",
      }).render(true);
    }

    // Synchronize pilot
    let populatedGear: string[] = [];
    let populatedArmor: string[] = [];
    let populatedWeapons: string[] = [];
    let bond: LancerBOND | null = null;
    if (data.loadout) {
      // Make a helper to get (a unique copy of) a given lid item, importing if necessary
      let pilot_item_pool = [...pilot.items.contents];
      const getPilotItemByLid = async (lid: string, type: EntryType) => {
        let fi = pilot_item_pool.findSplice(i => (i as any).system.lid == lid);
        if (fi) {
          return fi;
        } else {
          let fromCompendium = (await lookupLID(lid, type)) as LancerItem | null;
          if (!fromCompendium) return;
          return (await insinuate([fromCompendium], pilot!))[0];
        }
      };
      let itemUpdates: any = [];

      // Do gear
      let flatGear = [...(data.loadout.gear ?? []), ...(data.loadout.extendedGear ?? [])].filter(g => g);
      for (let gear of flatGear as PackedPilotEquipmentState[]) {
        let g = (await getPilotItemByLid(gear?.id, EntryType.PILOT_GEAR)) as LancerPILOT_GEAR | null;
        if (g) {
          populatedGear.push(g.id!);
        }
      }

      // Do armor
      let flatArmor = (data.loadout.armor ?? []).filter(a => a);
      for (let armor of flatArmor as PackedPilotEquipmentState[]) {
        let a = (await getPilotItemByLid(armor?.id, EntryType.PILOT_ARMOR)) as LancerPILOT_ARMOR | null;
        if (a) {
          populatedArmor.push(a.id!);
        }
      }

      // Do weapons
      let flatWeapons = [...(data.loadout.weapons ?? []), ...(data.loadout.extendedWeapons ?? [])].filter(w => w);
      for (let weapon of flatWeapons as PackedPilotEquipmentState[]) {
        let w = (await getPilotItemByLid(weapon?.id, EntryType.PILOT_WEAPON)) as LancerPILOT_WEAPON | null;
        if (w) {
          populatedWeapons.push(w.id!);
        }
      }

      // Do core bonuses
      for (let coreBonus of data.core_bonuses) {
        (await getPilotItemByLid(coreBonus, EntryType.CORE_BONUS)) as LancerCORE_BONUS | null;
      }

      // Do skills
      for (let skill of data.skills) {
        if (skill.custom) {
          pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.SKILL,
              name: skill.custom_desc ?? "Custom Skill",
              "system.rank": skill.rank,
              "system.detail": skill.custom_detail,
            },
          ]);
        } else {
          let s = (await getPilotItemByLid(skill.id, EntryType.SKILL)) as LancerSKILL | null;
          if (s) {
            itemUpdates.push({
              _id: s.id,
              "system.curr_rank": skill.rank,
            });
          }
        }
      }

      // Do talents
      for (let talent of data.talents) {
        let t = (await getPilotItemByLid(talent.id, EntryType.TALENT)) as LancerTALENT | null;
        if (t) {
          itemUpdates.push({
            _id: t.id,
            "system.curr_rank": talent.rank,
          });
        }
      }

      // Populate bond data
      bond = (data.bondId ? await getPilotItemByLid(data.bondId, EntryType.BOND) : null) as LancerBOND | null;
      if (bond && data.bondPowers) {
        // Disable all powers, in case the pilot already had this bond
        bond.system.powers.forEach(p => {
          p.unlocked = false;
        });

        const bondPack = game.packs.get(`world.${EntryType.BOND}`);
        await bondPack?.getIndex();
        const bonds: LancerItem[] | null = ((await bondPack?.getDocuments({})) as unknown as LancerItem[]) ?? null;
        const unlockAndRefill = function (power: PowerData) {
          power.unlocked = true;
          if (power.uses) {
            power.uses.value = power.uses.max;
          }
        };
        data.bondPowers.forEach(p => {
          // Find and unlock the power on the bond
          let i = bond!.system.powers.findIndex(x => x.name == p.name);
          if (i != undefined && i != -1) {
            const power = bond!.system.powers[i];
            unlockAndRefill(power);
            return;
          }
          // The power isn't from this bond - look for it in the compendium
          let found = false;
          for (const b of bonds) {
            if (found || !b.is_bond()) return;
            const newPower = b.system.powers.find(x => x.name == p.name);
            if (newPower) {
              found = true;
              unlockAndRefill(newPower);
              bond!.system.powers.push(newPower);

              // The pilot has a power from another bond - unlock the veteran power
              i = bond!.system.powers.findIndex(x => x.veteran);
              if (i != undefined && i != -1) {
                const power = bond!.system.powers[i];
                unlockAndRefill(power);
              }
              break;
            }
          }
        });
        // Commit the updates
        await bond.update({ "system.powers": bond.system.powers });
      }

      // Do licenses
      for (let license of data.licenses) {
        let t = (await getPilotItemByLid(license.id.replace("mf", "lic"), EntryType.LICENSE)) as LancerLICENSE | null;
        if (t) {
          itemUpdates.push({
            _id: t.id,
            "system.curr_rank": license.rank,
          });
        }
      }

      // Update all items
      await pilot.updateEmbeddedDocuments("Item", itemUpdates);

      // Delete all old items of certain types when done
      let toDelete = pilot_item_pool.filter(x =>
        [EntryType.TALENT, EntryType.SKILL, EntryType.CORE_BONUS].includes(x.type!)
      );
      await pilot._safeDeleteDescendant("Item", toDelete);
    }

    // Perform base pilot update
    await pilot.update({
      name: data.name,
      img: replaceDefaultResource(pilot.img, data.cloud_portrait),
      system: {
        "hp.value": data.current_hp,

        // Pilot specific
        background: data.background,
        callsign: data.callsign,
        cloud_id: data.cloudID,
        history: data.history,
        last_cloud_update: data.lastCloudUpdate,
        level: data.level,
        loadout: {
          armor: populatedArmor,
          gear: populatedGear,
          weapons: populatedWeapons,
        },
        hull: data.mechSkills[0],
        agi: data.mechSkills[1],
        sys: data.mechSkills[2],
        eng: data.mechSkills[3],
        mounted: data.state?.mounted ?? true,
        notes: data.notes,
        player_name: data.player_name,
        status: data.status,
        text_appearance: data.text_appearance,
        bond_state: bond
          ? {
              "xp.value": data.xp,
              "stress.value": data.stress,
              answers: data.bondAnswers,
              minor_ideal: data.minorIdeal,
              burdens: data.burdens.map(b => ({
                lid: b.id,
                name: b.title,
                min: 0,
                max: b.segments,
                value: b.progress,
                default_value: 0,
              })),
              clocks: data.clocks.map(c => ({
                lid: c.id,
                name: c.title,
                min: 0,
                max: c.segments,
                value: c.progress,
                default_value: 0,
              })),
            }
          : undefined,
      },
      prototypeToken: {
        name: data.name,
        // @ts-expect-error
        "texture.src": replaceDefaultResource(pilot.prototypeToken?.texture?.src, data.cloud_portrait, pilot.img),
      },
    });

    // Iterate over mechs
    let active_mech_uuid = "";
    for (let cloud_mech of data.mechs) {
      // Find the existing mech, or create one as necessary
      let mech = game.actors!.find(m => m.is_mech() && m.system.lid == cloud_mech.id) as unknown as LancerMECH | null;
      if (!mech) {
        if (!game.user?.hasPermission("ACTOR_CREATE")) {
          ui.notifications?.warn(
            `Could not import mech '${cloud_mech.name}' as you lack the permission to create new actors. Please ask your GM for assistance (either they import for you, or give you permissions)`
          );
          continue;
        }

        mech = (await LancerActor.create({
          name: cloud_mech.name,
          type: EntryType.MECH,
          folder: pilot.folder?.id,
        })) as unknown as LancerMECH;
      }

      // Make a helper to get (a unique copy of) a given lid item, importing if necessary
      let mech_item_pool = [...mech.items.contents];
      const getMechItemByLid = async (lid: string, type: EntryType) => {
        let fi = mech_item_pool.findSplice(i => (i as any).system.lid == lid);
        if (fi) {
          return fi;
        } else {
          let fromCompendium = (await lookupLID(lid, type)) as LancerItem | null;
          if (!fromCompendium) return;
          return (await insinuate([fromCompendium], mech!))[0];
        }
      };

      // Do our preliminary loadout buildup
      let loadout = cloud_mech.loadouts[cloud_mech.active_loadout_index];

      // Populate our frame
      let frame = (await getMechItemByLid(cloud_mech.frame, EntryType.FRAME)) as LancerFRAME | null;

      // Populate our systems
      let flatSystems = [...loadout.integratedSystems, ...loadout.systems];
      let populatedSystems: string[] = [];
      let assocSystemData = new Map<string, PackedEquipmentData>();
      for (let sys of flatSystems) {
        let realSys = (await getMechItemByLid(sys.id, EntryType.MECH_SYSTEM)) as LancerMECH_SYSTEM | null;
        if (realSys) {
          populatedSystems.push(realSys.id!);
          assocSystemData.set(realSys.id!, sys);
        }
      }

      // Populate our weapons and mods
      let flatMounts: PackedMountData[] = [];
      let assocWeaponData = new Map<string, PackedMechWeaponSaveData>();
      if (loadout.integratedWeapon?.slots.some(x => x.weapon)) flatMounts.push(loadout.integratedWeapon);
      if (loadout.improved_armament?.slots.some(x => x.weapon)) flatMounts.push(loadout.improved_armament);
      flatMounts.push(
        ...loadout.integratedMounts
          .map(im => ({
            mount_type: MountType.Integrated,
            slots: [
              {
                weapon: im.weapon,
                mod: null,
                size: FittingSize.Integrated,
              },
            ],
            extra: [],
            bonus_effects: [],
          }))
          .filter(im => im.slots.some(x => x.weapon))
      );
      flatMounts.push(...loadout.mounts);
      let populatedMounts: SourceData.Mech["loadout"]["weapon_mounts"] = [];
      for (let mount of flatMounts) {
        let slots: typeof populatedMounts[0]["slots"] = [];
        for (let slot of mount.slots) {
          let weapon = slot.weapon
            ? ((await getMechItemByLid(slot.weapon.id, EntryType.MECH_WEAPON)) as LancerMECH_WEAPON | null)
            : null;
          let mod =
            weapon && slot.weapon?.mod
              ? ((await getMechItemByLid(slot.weapon.mod.id, EntryType.WEAPON_MOD)) as LancerWEAPON_MOD | null)
              : null;
          slots.push({
            mod: mod?.id ?? null,
            weapon: weapon?.id ?? null,
            size: slot.size,
          });
          if (weapon) assocWeaponData.set(weapon.id!, slot.weapon!);
          if (mod) assocSystemData.set(weapon!.id!, slot.weapon!.mod!);
        }
        populatedMounts.push({
          bracing: mount.lock ?? false,
          type: mount.mount_type as MountType,
          slots,
        });
      }

      // Do base actor update, collecting weapons as we go
      await mech.update({
        name: cloud_mech.name,
        folder: unit_folder ? unit_folder.id : null,
        img: replaceDefaultResource(mech.img, cloud_mech.portrait, frame ? frameToPath(frame.name) : null),
        permission,
        prototypeToken: {
          name: pilot.system.callsign || cloud_mech.name,
          disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
          "texture.src": replaceDefaultResource(
            // @ts-expect-error
            mech.prototypeToken?.texture?.src,
            cloud_mech.cloud_portrait,
            frame ? frameToPath(frame.name) : null
          ),
        },
        system: {
          // Universal stuff
          lid: cloud_mech.id,
          "hp.value": cloud_mech.current_hp,
          "overshield.value": cloud_mech.overshield,
          burn: cloud_mech.burn,
          activations: cloud_mech.activations,
          // custom_counters: cloud_mech. - CC Doesn't have these except on pilots
          "heat.value": cloud_mech.current_heat,
          "stress.value": cloud_mech.current_stress,
          "structure.value": cloud_mech.current_structure,

          // Mech stuff
          overcharge: cloud_mech.current_overcharge,
          "repairs.value": cloud_mech.current_repairs,
          core_active: cloud_mech.core_active,
          core_energy: cloud_mech.current_core_energy,
          // meltdown_timer: - CC doesn't help with this
          notes: cloud_mech.notes,
          pilot: pilot.uuid,
          // Maybe handle ejected state? Who cares?
          loadout: {
            frame: frame?.id ?? null,
            weapon_mounts: populatedMounts,
            systems: populatedSystems,
          },
        },
      });

      if (mech.system.lid == data.state?.active_mech_id) active_mech_uuid = mech.uuid;

      // Synchronize our weapon states
      let itemUpdates: any = [];
      // Weapons/mods
      for (let mount of mech.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon) {
            let data = assocWeaponData.get(slot.weapon.id);
            if (data) {
              itemUpdates.push({
                _id: slot.weapon.id,
                system: {
                  loaded: data.loaded,
                  destroyed: data.destroyed,
                  cascading: data.cascading,
                  "uses.value": data.uses,
                },
              });
            }
          }
          if (slot.mod) {
            let data = assocSystemData.get(slot.mod.id);
            if (data) {
              itemUpdates.push({
                _id: slot.mod.id,
                system: {
                  destroyed: data.destroyed,
                  cascading: data.cascading,
                  "uses.value": data.uses,
                },
              });
            }
          }
        }
      }
      // Systems
      for (let system of mech.system.loadout.systems) {
        if (!system?.value) continue;
        let data = assocSystemData.get(system.id);
        if (data) {
          itemUpdates.push({
            _id: system.id,
            system: {
              destroyed: data.destroyed,
              cascading: data.cascading,
              uses: data.uses,
            },
          });
        }
      }

      // Apply all of these weapon updates
      await mech.updateEmbeddedDocuments("Item", itemUpdates);
    }

    // Fix active mech
    await pilot.update({
      "system.active_mech": active_mech_uuid,
    });
    pilot.effectHelper.propagateEffects(true);

    // Reset curr data and render all
    pilot.render();
    ui.notifications!.info("Successfully loaded pilot new state.");
  } catch (e) {
    console.warn(e);
    ui.notifications!.warn(`Failed to update pilot: ${e instanceof Error ? e.message : e}`);
  }
}
