import { LANCER } from "../config";
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
import { get_pack_id, insinuate } from "../util/doc";
import { fromLid } from "../helpers/from-lid";
import {
  PackedEquipmentData,
  PackedMechWeaponSaveData,
  PackedMountData,
  PackedPilotData,
  PackedPilotEquipmentState,
} from "../util/unpacking/packed-types";
import { LancerActor, LancerMECH, LancerPILOT } from "./lancer-actor";
import { frameToPath } from "./retrograde-map";
const lp = LANCER.log_prefix;

// Imports packed pilot data, from either a vault id or gist id
export async function importCC(pilot: LancerPILOT, data: PackedPilotData, clearFirst = true) {
  const coreVersion = game.settings.get(game.system.id, LANCER.setting_core_data);
  if (!coreVersion) {
    ui.notifications!.warn(
      "You must import the Core Book Data in the Lancer Compendium Manager before importing a pilot.",
      { permanent: true }
    );
    return;
  }
  console.log(`${lp} Importing Pilot`, pilot, data);
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
    let unitFolder = pilot.folder;
    let permission = foundry.utils.duplicate(pilot.ownership);

    // Check whether players are allowed to create Actors
    const canCreate = game.user?.can("ACTOR_CREATE");
    const gmsOnline = game.users?.some((u: User) => u.isGM && u.active);
    if (!canCreate && !gmsOnline) {
      new foundry.applications.api.DialogV2({
        window: { title: `Cannot Create Actors`, icon: "fas fa-triangle-exclamation" },
        content: `<p>You are not permitted to create actors and no GM's are online, so sync will not produce any new mechs or deployables.</p>
        <p>Your GM can allow Players/Trusted Players to create actors in Settings->Configure Permissions.</p>`,
        buttons: [
          {
            action: "close",
            icon: "fas fa-check",
            label: "Close",
            default: true,
          },
        ],
      }).render(true);
    }

    // Keep track of which actors and items could not be found/created
    const missingActors: { name: string; lid: string }[] = [];
    const missingItems: { actor: string; lid: string }[] = [];

    // Synchronize pilot
    let populatedGear: string[] = [];
    let populatedArmor: string[] = [];
    let populatedWeapons: string[] = [];
    let bond: LancerBOND | null = null;
    if (data.loadout) {
      // Make a helper to get (a unique copy of) a given lid item, importing if necessary
      let pilotItemPool = [...pilot.items.contents];
      const getPilotItemByLid = async (lid: string) => {
        const existingItem = pilotItemPool.findSplice(i => (i as any).system.lid == lid);
        if (existingItem) {
          return existingItem;
        } else {
          let fromCompendium = (await fromLid(lid)) as LancerItem | null;
          if (!fromCompendium) {
            missingItems.push({ actor: pilot.name, lid });
            return;
          }
          return (await insinuate([fromCompendium], pilot!))[0];
        }
      };
      let itemUpdates: any = [];

      // Do gear
      let flatGear = [...(data.loadout.gear ?? []), ...(data.loadout.extendedGear ?? [])].filter(g => g);
      for (let gear of flatGear as PackedPilotEquipmentState[]) {
        let g = (await getPilotItemByLid(gear?.id)) as LancerPILOT_GEAR | null;
        if (g) {
          populatedGear.push(g.id!);
        }
      }

      // Do armor
      let flatArmor = (data.loadout.armor ?? []).filter(a => a);
      for (let armor of flatArmor as PackedPilotEquipmentState[]) {
        let a = (await getPilotItemByLid(armor?.id)) as LancerPILOT_ARMOR | null;
        if (a) {
          populatedArmor.push(a.id!);
        }
      }

      // Do weapons
      let flatWeapons = [...(data.loadout.weapons ?? []), ...(data.loadout.extendedWeapons ?? [])].filter(w => w);
      for (let weapon of flatWeapons as PackedPilotEquipmentState[]) {
        let w = (await getPilotItemByLid(weapon?.id)) as LancerPILOT_WEAPON | null;
        if (w) {
          populatedWeapons.push(w.id!);
        }
      }

      // Do core bonuses
      for (let coreBonus of data.core_bonuses) {
        (await getPilotItemByLid(coreBonus)) as LancerCORE_BONUS | null;
      }

      // Do skills
      for (let skill of data.skills) {
        if (skill.custom) {
          pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.SKILL,
              name: skill.id ?? "Custom Skill",
              "system.rank": skill.rank,
              "system.description": skill.custom_desc || skill.custom_detail || "",
            },
          ]);
        } else {
          let s = (await getPilotItemByLid(skill.id)) as LancerSKILL | null;
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
        let t = (await getPilotItemByLid(talent.id)) as LancerTALENT | null;
        if (t) {
          itemUpdates.push({
            _id: t.id,
            "system.curr_rank": talent.rank,
          });
        }
      }

      // Populate bond data
      bond = (data.bondId ? await getPilotItemByLid(data.bondId) : null) as LancerBOND | null;
      if (bond && data.bondPowers) {
        // Disable all powers, in case the pilot already had this bond
        bond.system.powers.forEach(p => {
          p.unlocked = false;
        });

        const bondPack = game.packs.get(get_pack_id(EntryType.BOND));
        await bondPack?.getIndex();
        const bonds: LancerItem[] | null =
          ((await bondPack?.getDocuments({ type: EntryType.BOND })) as unknown as LancerItem[]) ?? null;
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
        let t = (await getPilotItemByLid(`lic_${license.id}`)) as LancerLICENSE | null;
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
      let toDelete = pilotItemPool.filter(x =>
        [EntryType.TALENT, EntryType.SKILL, EntryType.CORE_BONUS].includes(x.type! as EntryType)
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
    let activeMechUuid = "";
    for (const cloudMech of data.mechs) {
      // Find the existing mech, or create one as necessary
      let mech = game.actors!.find(
        (m: LancerActor) => m.is_mech() && m.system.lid == cloudMech.id
      ) as unknown as LancerMECH | null;
      if (!mech) {
        if (!game.user?.can("ACTOR_CREATE")) {
          ui.notifications!.warn(
            `Could not import mech '${cloudMech.name}' as you lack the permission to create new actors. Please ask your GM for assistance (either they import for you, or give you permissions)`,
            { permanent: true }
          );
          missingActors.push({ name: cloudMech.name, lid: cloudMech.frame });
          continue;
        }

        mech = (await LancerActor.create({
          name: cloudMech.name,
          type: EntryType.MECH,
          folder: unitFolder?.id,
          ownership: permission,
          system: {
            pilot: pilot.uuid,
          },
        })) as unknown as LancerMECH;
      }
      if (!mech.canUserModify(game.user!, "update")) {
        ui.notifications!.warn(
          `Could not import mech '${cloudMech.name}' as you lack the permission to update the actor. Please ask your GM for assistance.`,
          { permanent: true }
        );
        missingActors.push({ name: cloudMech.name, lid: cloudMech.frame });
        continue;
      }

      // Make a helper to get (a unique copy of) a given lid item, importing if necessary
      let mechItemPool = [...mech.items.contents];
      const getMechItemByLid = async (lid: string) => {
        let foundItem = mechItemPool.findSplice(i => (i as any).system.lid == lid);
        if (foundItem) {
          return foundItem;
        } else {
          let fromCompendium = (await fromLid(lid)) as LancerItem | null;
          if (!fromCompendium) {
            missingItems.push({ actor: mech.name, lid });
            return;
          }
          return (await insinuate([fromCompendium], mech!))[0];
        }
      };

      // Do our preliminary loadout buildup
      let loadout = cloudMech.loadouts[cloudMech.active_loadout_index];

      // Populate our frame
      let frame = (await getMechItemByLid(cloudMech.frame)) as LancerFRAME | null;

      // Populate our systems
      let flatSystems = [...loadout.integratedSystems, ...loadout.systems];
      let populatedSystems: string[] = [];
      let assocSystemData = new Map<string, PackedEquipmentData>();
      for (let sys of flatSystems) {
        let realSys = (await getMechItemByLid(sys.id)) as LancerMECH_SYSTEM | null;
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
      if (loadout.superheavy_mounting?.slots.some(x => x.weapon)) flatMounts.push(loadout.superheavy_mounting);
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
        let populatedSlots: typeof populatedMounts[0]["slots"] = [];
        for (const slot of mount.slots) {
          let weapon = slot.weapon ? ((await getMechItemByLid(slot.weapon.id)) as LancerMECH_WEAPON | null) : null;
          let mod =
            weapon && slot.weapon?.mod
              ? ((await getMechItemByLid(slot.weapon.mod.id)) as LancerWEAPON_MOD | null)
              : null;
          populatedSlots.push({
            mod: mod?.id ?? null,
            weapon: weapon?.id ?? null,
            size: slot.size,
          });
          // 2nd weapons are in extra, e.g. aux/aux and flex mounts
          for (const extraSlot of mount.extra) {
            let weapon = extraSlot.weapon
              ? ((await getMechItemByLid(extraSlot.weapon.id)) as LancerMECH_WEAPON | null)
              : null;
            let mod =
              weapon && extraSlot.weapon?.mod
                ? ((await getMechItemByLid(extraSlot.weapon.mod.id)) as LancerWEAPON_MOD | null)
                : null;
            populatedSlots.push({
              mod: mod?.id ?? null,
              weapon: weapon?.id ?? null,
              size: slot.size,
            });
          }
          if (weapon) assocWeaponData.set(weapon.id!, slot.weapon!);
          if (mod) assocSystemData.set(weapon!.id!, slot.weapon!.mod!);
        }
        populatedMounts.push({
          bracing: mount.lock ?? false,
          type: mount.mount_type as MountType,
          slots: populatedSlots,
        });
      }

      // Do base actor update, collecting weapons as we go
      await mech.update({
        name: cloudMech.name,
        folder: unitFolder ? unitFolder.id : null,
        img: replaceDefaultResource(mech.img, cloudMech.portrait, frame ? frameToPath(frame.name) : null),
        permission,
        prototypeToken: {
          name: pilot.system.callsign || cloudMech.name,
          disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
          "texture.src": replaceDefaultResource(
            mech.prototypeToken?.texture?.src,
            cloudMech.cloud_portrait,
            frame ? frameToPath(frame.name) : null
          ),
        },
        system: {
          // Universal stuff
          lid: cloudMech.id,
          "hp.value": cloudMech.current_hp,
          "overshield.value": cloudMech.overshield,
          burn: cloudMech.burn,
          activations: cloudMech.activations,
          // custom_counters: cloud_mech. - CC Doesn't have these except on pilots
          "heat.value": cloudMech.current_heat,
          "stress.value": cloudMech.current_stress,
          "structure.value": cloudMech.current_structure,

          // Mech stuff
          overcharge: cloudMech.current_overcharge,
          "repairs.value": cloudMech.current_repairs,
          core_active: cloudMech.core_active,
          core_energy: cloudMech.current_core_energy,
          // meltdown_timer: - CC doesn't help with this
          notes: cloudMech.notes,
          pilot: pilot.uuid,
          // Maybe handle ejected state? Who cares?
          loadout: {
            frame: frame?.id ?? null,
            weapon_mounts: populatedMounts,
            systems: populatedSystems,
          },
        },
      });

      // If the pilot does not have an active mech, set the first one as active.
      // Otherwise, this will set the active mech to match Comp/Con.
      if (!data.state?.active_mech_id || mech.system.lid == data.state?.active_mech_id) {
        activeMechUuid = mech.uuid;
      }

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
      "system.active_mech": activeMechUuid,
    });
    pilot.effectHelper.propagateEffects(true);

    // Reset curr data and render all
    pilot.render();
    if (missingItems.length || missingActors.length) {
      let message = `Partially loaded '${pilot.name}'s new state.`;
      if (missingActors.length) {
        message += ` ${missingActors.length} actors could not be created/updated.`;
      }
      if (missingItems.length) {
        message += ` ${missingItems.length} items could not be found.`;
      }
      message += ` See dialog for details.`;
      ui.notifications!.warn(message, { permanent: true });
      console.warn(`${lp} Some actors and/or items were missed during pilot import:`, missingActors, missingItems);

      let content = "";
      if (missingActors.length) {
        content += `<div><span>The following Actors could not be created or updated:</span>
        <ul>${missingActors.map(i => `<li>${i.name} - ${i.lid}</li>`).join("")}</ul></div>`;
      }
      if (missingItems.length) {
        content += `<div><span>The following Items were not found in the compendium and could not be imported:</span>
        <ul>${missingItems.map(i => `<li>${i.actor} - ${i.lid}</li>`).join("")}</ul>
        <span>Import all necessary LCPs first using the <b>Lancer Compendium Manager</b>.</span></div>`;
      }
      new foundry.applications.api.DialogV2({
        window: { title: `Incomplete Pilot Import`, icon: "fas fa-triangle-exclamation" },
        content,
        buttons: [
          {
            action: "close",
            icon: "fas fa-check",
            label: "Close",
            default: true,
          },
        ],
      }).render(true);
    } else {
      ui.notifications!.info("Successfully loaded pilot new state.");
    }
  } catch (e) {
    console.warn(e);
    ui.notifications!.warn(`Failed to update pilot: ${e instanceof Error ? e.message : e}`, { permanent: true });
  }
}
