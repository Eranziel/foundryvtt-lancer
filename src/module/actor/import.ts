import { LANCER } from "../config";
import { replaceDefaultResource } from "../config";
import { EntryType, EntryTypeLidPrefix, FittingSize, MountType } from "../enums";
import {
  type LancerBOND,
  type LancerCORE_BONUS,
  type LancerFRAME,
  type LancerItem,
  type LancerLICENSE,
  type LancerMECH_SYSTEM,
  type LancerMECH_WEAPON,
  type LancerPILOT_ARMOR,
  type LancerPILOT_GEAR,
  type LancerPILOT_WEAPON,
  type LancerSKILL,
  type LancerTALENT,
  type LancerRESERVE,
  type LancerWEAPON_MOD,
} from "../item/lancer-item";
import type { PowerData } from "../models/bits/power";
import type { SourceData } from "../source-template";
import { get_pack_id, insinuate } from "../util/doc";
import { fromLid } from "../helpers/from-lid";
import type {
  PackedPilotWrapper,
  PackedPilotData,
  PackedPilotEquipmentWrapper,
  PackedPilotEquipmentState,
  PackedPilotArmorData,
  PackedPilotGearData,
  PackedPilotWeaponData,
  PackedClockBurdenData,
  PackedCoreBonusData,
  PackedMechData,
  PackedMechWeaponSaveWrapper,
  PackedMechWeaponSaveData,
  PackedMechEquipmentData,
  PackedMountData,
} from "../util/unpacking/packed-types";
import { LancerActor, type LancerMECH, type LancerPILOT } from "./lancer-actor";
import { frameToPath } from "./retrograde-map";
import { unpackPilotArmor } from "../models/items/pilot_armor";
import type { UnpackContext } from "../models/shared";
import { unpackPilotWeapon } from "../models/items/pilot_weapon";
import { unpackPilotGear } from "../models/items/pilot_gear";
import { unpackCoreBonus } from "../models/items/core_bonus";
import { unpackSkill } from "../models/items/skill";
import { unpackTalent } from "../models/items/talent";
import { unpackBond } from "../models/items/bond";
import { unpackLicense } from "../models/items/license";
import { unpackMechSystem } from "../models/items/mech_system";
import { unpackMechWeapon } from "../models/items/mech_weapon";
import { unpackWeaponMod } from "../models/items/weapon_mod";
import { unpackReserve } from "../models/items/reserve";
import { unpackFrame } from "../models/items/frame";
const lp = LANCER.log_prefix;

/**
 * Updates the Pilot document, given COMP/CON data.
 * @param pilot   - The pilot actor
 * @param data    - `PackedPilotData`
 * @param armor   - Array of pilot armor UUIDs
 * @param gear    - Array of pilot gear UUIDs
 * @param weapons - Array of pilot weapon UUIDs
 */
async function updatePilot(
  pilot: LancerPILOT,
  data: PackedPilotData,
  armor?: string[],
  gear?: string[],
  weapons?: string[]
) {
  const portrait = data.cloud_portrait ?? data.img.cloud_portrait;
  const unpackClock = (clock: PackedClockBurdenData) => {
    return {
      lid: clock.id,
      name: clock.title,
      min: 0,
      max: clock.segments,
      value: clock.progress,
      default_value: 0,
    };
  };

  await pilot.update({
    name: data.name,
    img: replaceDefaultResource(pilot.img, portrait),
    system: {
      hp: {
        value: data.stats.current.hp,
      },

      // Pilot specific
      background: data.background,
      callsign: data.callsign,
      cloud_id: data.cloudID,
      history: data.history,
      level: data.level,
      loadout: {
        armor: armor ?? [],
        gear: gear ?? [],
        weapons: weapons ?? [],
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
      bond_state: data.bond
        ? {
            xp: {
              value: data.xp ?? data.bond.xp,
            },
            stress: {
              value: data.stress ?? data.bond.stress,
            },
            answers: data.bondAnswers ?? data.bond.bondAnswers,
            minor_ideal: data.minorIdeal ?? data.bond.minorIdeal,
            burdens: (data.burdens ?? data.bond.burdens).map(b => unpackClock(b)),
            clocks: (data.clocks ?? data.bond.clocks).map(c => unpackClock(c)),
          }
        : undefined,
    },
    prototypeToken: {
      name: data.name,
      texture: {
        src: replaceDefaultResource(pilot.prototypeToken?.texture?.src, portrait, pilot.img),
      },
    },
  });
}

/**
 * Updates the Mech document, given COMP/CON data.
 * @param mech              - The mech actor
 * @param pilot             - The pilot actor
 * @param data              - `PackedMechData`
 * @param ownershipLevel    - The `CONST.DOCUMENT_OWNERSHIP_LEVELS` to set the mech document
 * @param populatedMounts   - idk tbh lol
 * @param populatedSystems  - Array of mech system UUIDs
 * @param frame
 */
async function updateMech(
  mech: LancerMECH,
  pilot: LancerPILOT,
  data: PackedMechData,
  ownershipLevel: Record<string, CONST.DOCUMENT_OWNERSHIP_LEVELS>,
  populatedMounts: SourceData.Mech["loadout"]["weapon_mounts"],
  populatedSystems: string[],
  frame?: LancerFRAME | null
) {
  await mech.update({
    name: data.name,
    folder: pilot.folder?.id || null,
    img: replaceDefaultResource(mech.img, data.portrait, frame ? frameToPath(frame.name) : null),
    ownershipLevel,
    prototypeToken: {
      name: pilot.system.callsign || data.name,
      disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      texture: {
        src: replaceDefaultResource(
          mech.prototypeToken?.texture?.src,
          data.img.cloud_portrait,
          frame ? frameToPath(frame.name) : null
        ),
      },
    },
    system: {
      // Universal stuff
      lid: data.id,
      hp: {
        value: data.stats.current.hp,
        max: data.stats.max.hp,
      },
      overshield: {
        value: data.stats.current.overshield,
        max: data.stats.max.overshield,
      },
      burn: data.stats.current.burn,
      activations: data.stats.current.activations,
      heat: {
        value: data.stats.current.heat,
        max: data.stats.max.heat,
      },
      stress: {
        value: data.stats.current.stress,
        max: data.stats.max.stress,
      },
      structure: {
        value: data.stats.current.structure,
        max: data.stats.max.structure,
      },

      // Mech stuff
      overcharge: data.stats.current.overcharge,
      repairs: {
        value: data.stats.current.repairCapacity,
        max: data.stats.max.repairCapacity,
      },
      core_active: data.coreActive,
      core_energy: data.corePower,
      notes: data.notes,
      pilot: pilot.uuid,
      loadout: {
        frame: frame?.id ?? null,
        weapon_mounts: populatedMounts,
        systems: populatedSystems,
      },
    },
  });
}

/**
 * Clear all embedded documents related to the given pilot
 * @param pilot - The pilot actor to delete embedded documents off of
 */
async function clearPilotEmbeddedDocuments(pilot: LancerPILOT) {
  await pilot.deleteEmbeddedDocuments("Item", Array.from(pilot.items.keys()));
  let existing_mechs = game.actors?.filter((a: LancerActor) => a.is_mech() && a.system.pilot?.value == pilot) ?? [];
  for (let m of existing_mechs) {
    await m.deleteEmbeddedDocuments("Item", Array.from(m.items.keys()));
  }
}

/**
 * Checks whether the calling client is able to create Actors
 */
function hasCreatePermissions() {
  const canCreate = game.user?.can("ACTOR_CREATE");
  const gmsOnline = game.users?.some(u => u.isGM && u.active);
  if (!canCreate && !gmsOnline) {
    new foundry.applications.api.DialogV2({
      window: {
        title: `Cannot Create Actors`,
        icon: "fas fa-triangle-exclamation",
      },
      content: `
        <p>You are not permitted to create actors and no GM's are online, so sync will not produce any new mechs or deployables.</p>
        <p>Your GM can allow Players/Trusted Players to create actors in Settings->Configure Permissions.</p>
      `,
      buttons: [
        {
          action: "close",
          icon: "fas fa-check",
          label: "Close",
          default: true,
        },
      ],
    }).render(true);

    return false;
  }

  return true;
}

/**
 * Prompts a pilot loadout selector
 * @param loadouts - Array of loadout string names
 * @return The index of the choice made
 */
async function promptLoadoutSelection(loadouts: string[]) {
  let contentChoices = "";
  loadouts.map((l, i) => {
    contentChoices += `<label><input type="radio" name="choice" value=${i} ${i == 0 ? "checked" : ""}>${l}</label>`;
  });

  // @ts-ignore Please stop yelling at me :sob:
  return foundry.applications.api.DialogV2.prompt({
    window: {
      title: `Select Pilot Loadout`,
      icon: "fas fa-triangle-exclamation",
    },
    content: `
      <span>Multiple pilot loadouts found. Please select a single loadout to import and use:</span>
      ${contentChoices}
      <hr>
    `,
    ok: {
      label: "Import Selected Loadout",
      callback: (_event: Event, button: HTMLButtonElement, _dialog: any) =>
        (button.form?.elements as unknown as { choice: RadioNodeList }).choice.value,
    },
  });
}

/**
 * Gets an actor's Item by their LID and tries to insert the item into their Document.
 * Searches from the item pool first before attempting to look up the Compendium entry.
 * @param lid           - LID to lookup
 * @param actor         - Actor to insert the embedded documents into
 * @param itemPool      - Item pool to reference
 * @param missingItems  - Array appending an object holding the `actor` and `lid` of any failed lookups
 * @return The `LancerItem` if successful or `null`
 */
async function getActorItemByLid(
  lid: string,
  actor: LancerPILOT | LancerMECH,
  itemPool: LancerItem[],
  missingItems: { actor: string; lid: string }[]
): Promise<LancerItem | null> {
  let existingItem = itemPool.findSplice(i => (i as any).system.lid == lid);
  if (existingItem) return existingItem;
  let fromCompendium = (await fromLid(lid)) as LancerItem | null;
  if (!fromCompendium) {
    missingItems.push({ actor: actor.name, lid });
    return null;
  }
  return (await insinuate([fromCompendium], actor))[0] ?? null;
}

/**
 * Wrapper function to determine which importer to use
 */
export async function importCC(
  pilot: LancerPILOT,
  importedData: PackedPilotData | PackedPilotWrapper,
  clearFirst = true
) {
  if ("EXPORT_TYPE" in importedData) {
    await importCCv3(pilot, importedData, clearFirst);
  } else {
    await importCCv2(pilot, importedData, clearFirst);
  }
}

/**
 * Imports packed pilot data from CCv3.
 * Minimum import version: CCv3.0.4
 */
export async function importCCv3(pilot: LancerPILOT, importedData: PackedPilotWrapper, clearFirst = true) {
  console.log(`${lp} Importing v3 Pilot`, pilot, importedData);
  if (!pilot.is_pilot()) console.error(`${lp} Actor was not a pilot type`, pilot);
  if (!importedData) console.error(`${lp} Imported data is missing`, importedData);
  const data = importedData.data;
  if (!data) {
    console.error(`${lp} Tried using CCv3 importer on CCv2 data`, importedData);
  }

  if (clearFirst) {
    await clearPilotEmbeddedDocuments(pilot);
  }

  hasCreatePermissions();

  // Extract data
  try {
    // Immediately fix the name, so deployables get named properly
    await pilot.update({
      name: data.name,
      system: {
        callsign: data.callsign,
      },
    });
    const _context: UnpackContext = { createdDeployables: [] };

    // Keep track of which actors and items could not be found/created
    const _missingActors: { name: string; lid: string }[] = [];
    const _missingItems: { actor: string; lid: string }[] = [];

    // --- Pilot ---
    const pilotItemUpdates: any = [];
    const pilotItemPool = [...pilot.items.contents];
    let selectedLoadout = 0;

    // Get the object by LIDs first if able as a natural guard against incomplete data
    // and then overwrite with values in the importing data
    const gears: string[] = [];
    const armors: string[] = [];
    const weapons: string[] = [];
    if (data.loadouts) {
      try {
        if (data.loadouts.length > 1)
          selectedLoadout = Number(await promptLoadoutSelection(data.loadouts.map(l => l.name)));
      } catch {
        console.log(`${lp} User cancelled pilot import`);
        return;
      }

      let flatData: ((PackedPilotEquipmentState & PackedPilotEquipmentWrapper) | null)[];

      // Gear
      flatData = (data.loadouts[selectedLoadout].gear ?? []).filter(a => a);
      for (const item of flatData) {
        if (!item) continue;
        const compendiumItem = (await getActorItemByLid(
          item.id,
          pilot,
          pilotItemPool,
          _missingItems
        )) as LancerPILOT_GEAR | null;
        const id =
          compendiumItem?.id ??
          (
            await pilot.createEmbeddedDocuments("Item", [
              {
                type: EntryType.PILOT_GEAR,
                name: item.data.name,
              },
            ])
          )[0].id;

        gears.push(id);

        const ccData = unpackPilotGear(item.data as PackedPilotGearData, _context);
        pilotItemUpdates.push({
          ...ccData,
          _id: id,
        });
      }

      // Armor
      flatData = (data.loadouts[selectedLoadout].armor ?? []).filter(a => a);
      for (const item of flatData) {
        if (!item) continue;
        const compendiumItem = (await getActorItemByLid(
          item.id,
          pilot,
          pilotItemPool,
          _missingItems
        )) as LancerPILOT_GEAR | null;
        const id =
          compendiumItem?.id ??
          (
            await pilot.createEmbeddedDocuments("Item", [
              {
                type: EntryType.PILOT_ARMOR,
                name: item.data.name,
              },
            ])
          )[0].id;

        armors.push(id);

        const ccData = unpackPilotArmor(item.data as PackedPilotArmorData, _context);
        pilotItemUpdates.push({
          ...ccData,
          _id: id,
        });
      }

      // Weapons
      flatData = (data.loadouts[selectedLoadout].weapons ?? []).filter(a => a);
      for (const item of flatData) {
        if (!item) continue;
        const compendiumItem = (await getActorItemByLid(
          item.id,
          pilot,
          pilotItemPool,
          _missingItems
        )) as LancerPILOT_GEAR | null;
        const id =
          compendiumItem?.id ??
          (
            await pilot.createEmbeddedDocuments("Item", [
              {
                type: EntryType.PILOT_WEAPON,
                name: item.data.name,
              },
            ])
          )[0].id;

        weapons.push(id);

        const ccData = unpackPilotWeapon(item.data as PackedPilotWeaponData, _context);
        pilotItemUpdates.push({
          ...ccData,
          _id: id,
        });
      }
    }

    // Core Bonuses
    for (const item of data.core_bonuses as PackedCoreBonusData[]) {
      const compendiumItem = (await getActorItemByLid(
        item.id,
        pilot,
        pilotItemPool,
        _missingItems
      )) as LancerCORE_BONUS | null;
      const id =
        compendiumItem?.id ??
        (
          await pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.CORE_BONUS,
              name: item.name,
            },
          ])
        )[0].id;

      const ccData = unpackCoreBonus(item, _context);
      pilotItemUpdates.push({
        ...ccData,
        _id: id,
      });
    }

    // Skills
    for (const item of data.skills) {
      if ("custom" in item && item.custom) {
        pilot.createEmbeddedDocuments("Item", [
          {
            type: EntryType.SKILL,
            name: item.id ?? "Custom Skill",
            system: <any>{
              rank: item.rank,
              description: item.custom_desc || item.custom_detail || "",
            },
          },
        ]);
      } else if ("data" in item) {
        const compendiumItem = (await getActorItemByLid(
          item.id,
          pilot,
          pilotItemPool,
          _missingItems
        )) as LancerSKILL | null;
        const id =
          compendiumItem?.id ??
          (
            await pilot.createEmbeddedDocuments("Item", [
              {
                type: EntryType.SKILL,
                name: item.data.name,
              },
            ])
          )[0].id;

        const ccData = unpackSkill(item.data, _context);
        pilotItemUpdates.push({
          ...ccData,
          _id: id,
        });
      }
    }

    // Talents
    for (const item of data.talents) {
      const compendiumItem = (await getActorItemByLid(
        item.id,
        pilot,
        pilotItemPool,
        _missingItems
      )) as LancerTALENT | null;
      const id =
        compendiumItem?.id ??
        (
          await pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.TALENT,
              name: item.data.name,
            },
          ])
        )[0].id;

      const ccData = unpackTalent(item.data, _context);
      pilotItemUpdates.push({
        ...ccData,
        _id: id,
        system: {
          ...ccData.system,
          curr_rank: item.rank,
        },
      });
    }

    // Bonds
    if (data.bond?.bondId) {
      const item = data.bond;
      const bond = (await getActorItemByLid(item.bondId, pilot, pilotItemPool, _missingItems)) as LancerBOND | null;
      const id =
        bond?.id ??
        (
          await pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.BOND,
              name: item.data.name,
            },
          ])
        )[0].id;

      const ccData = unpackBond(item.data);
      pilotItemUpdates.push({
        ...ccData,
        _id: id,
      });
    }

    // Licenses
    for (const item of data.licenses) {
      const lid = EntryTypeLidPrefix(EntryType.LICENSE) + item.id;
      const compendiumItem = (await getActorItemByLid(
        lid,
        pilot,
        pilotItemPool,
        _missingItems
      )) as LancerLICENSE | null;
      const id =
        compendiumItem?.id ??
        (
          await pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.LICENSE,
              name: item.stub.name,
            },
          ])
        )[0].id;

      const ccData = unpackLicense(item.stub.name, lid, item.stub.source, _context);
      pilotItemUpdates.push({
        ...ccData,
        _id: id,
      });
    }

    // Reserves
    for (const item of data.reserves) {
      const compendiumItem = (await getActorItemByLid(
        item.id,
        pilot,
        pilotItemPool,
        _missingItems
      )) as LancerRESERVE | null;
      const id =
        compendiumItem?.id ??
        (
          await pilot.createEmbeddedDocuments("Item", [
            {
              type: EntryType.RESERVE,
              name: item.name,
            },
          ])
        )[0].id;

      const ccData = unpackReserve(item, _context);
      pilotItemUpdates.push({
        ...ccData,
        _id: id,
      });
    }

    // Update all items
    await pilot.updateEmbeddedDocuments("Item", pilotItemUpdates);

    // Delete all old items of certain types when done
    const remove = pilotItemPool.filter(x =>
      [EntryType.TALENT, EntryType.SKILL, EntryType.CORE_BONUS].includes(x.type! as EntryType)
    );
    await pilot._safeDeleteDescendant("Item", remove);

    // Perform base pilot update
    await updatePilot(pilot, data, armors, gears, weapons);

    // --- Mechs ---
    let activeMechUuid: string | null = null;
    const ownershipLevel = foundry.utils.deepClone(pilot.ownership);
    const createNewMech = async (importData: PackedMechData) => {
      if (!game.user?.can("ACTOR_CREATE")) {
        ui.notifications!.warn(
          `Could not import mech '${importData.name}' as you lack the permission to create new actors. Please ask your GM for assistance (either they import for you, or give you permissions)`,
          { permanent: true }
        );
        _missingActors.push({ name: importData.name, lid: importData.frameData.id });
      } else {
        return (await LancerActor.create({
          name: importData.name,
          type: EntryType.MECH,
          folder: pilot.folder?.id,
          ownership: ownershipLevel,
          system: {
            pilot: pilot.uuid,
          },
        })) as LancerMECH;
      }
    };

    for (const importedMech of data.mechs) {
      // Find the existing mech, or create one as necessary
      let mech = game.actors!.find((m: LancerActor) => m.is_mech() && m.system.lid == importedMech.id) as LancerMECH;
      if (!mech) {
        const newMech = await createNewMech(importedMech);
        if (newMech) mech = newMech;
      }
      if (!mech.canUserModify(game.user!, "update")) {
        ui.notifications!.warn(
          `Could not import mech '${importedMech.name}' as you lack the permission to update the actor. Please ask your GM for assistance.`,
          { permanent: true }
        );
        _missingActors.push({ name: importedMech.name, lid: importedMech.frameData.id });
        continue;
      }

      const mechItemPool = [...mech.items.contents];
      const mechItemUpdates: any = [];
      const loadout = importedMech.loadouts[importedMech.active_loadout_index];
      const populatedMounts: SourceData.Mech["loadout"]["weapon_mounts"] = [];
      const populatedSystems: string[] = [];

      // Mech Frame
      const compendiumFrame = (await getActorItemByLid(
        importedMech.frame,
        mech,
        mechItemPool,
        _missingItems
      )) as LancerFRAME | null;
      const frameId =
        compendiumFrame?.id ??
        (
          await mech.createEmbeddedDocuments("Item", [
            {
              type: EntryType.FRAME,
              name: importedMech.frameData.name,
            },
          ])
        )[0].id;

      const ccData = unpackFrame(importedMech.frameData, _context);
      mechItemUpdates.push({
        ...ccData,
        _id: frameId,
      });

      // Mech Systems
      const flatSystems = [...loadout.integratedSystems, ...loadout.systems];
      // const assocSystemData = new Map<string, PackedMechEquipmentData>();
      for (const item of flatSystems) {
        const compendiumItem = (await getActorItemByLid(
          item.data.id,
          mech,
          mechItemPool,
          _missingItems
        )) as LancerMECH_SYSTEM | null;
        const id =
          compendiumItem?.id ??
          (
            await mech.createEmbeddedDocuments("Item", [
              {
                type: EntryType.MECH_SYSTEM,
                name: item.data.name,
              },
            ])
          )[0].id;

        populatedSystems.push(id);
        // assocSystemData.set(id, item);

        const ccData = unpackMechSystem(item.data, _context);
        mechItemUpdates.push({
          ...ccData,
          _id: id,
          system: {
            ...ccData.system,
            uses: {
              value: Math.max(0, (item.maxUses ?? 0) - (item.currentUses ?? 0)),
              max: item.maxUses,
            } as const,
          },
        });
      }

      // Mounts
      const flatMounts: PackedMountData[] = [
        loadout.integratedWeapon,
        loadout.improved_armament,
        loadout.superheavy_mounting,
        ...loadout.integratedMounts.map(im => ({
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
        })),
        ...loadout.mounts,
      ].filter(m => m?.slots.some(x => x.weapon));
      // const assocWeaponData = new Map<string, PackedMechWeaponSaveData>();

      for (const mount of flatMounts) {
        const populatedSlots: (typeof populatedMounts)[0]["slots"] = [];
        // Helper that creates a weapon and maybe its mod and attaches it to the mech
        const processMechWeapon = async (weaponSlot: PackedMechWeaponSaveData & PackedMechWeaponSaveWrapper) => {
          const weapon = (await getActorItemByLid(
            weaponSlot.id,
            mech,
            mechItemPool,
            _missingItems
          )) as LancerMECH_WEAPON | null;
          const weaponId =
            weapon?.id ??
            (
              await mech.createEmbeddedDocuments("Item", [
                {
                  type: EntryType.MECH_WEAPON,
                  name: weaponSlot.data.name,
                },
              ])
            )[0].id;

          const ccData = unpackMechWeapon(weaponSlot.data, _context);
          mechItemUpdates.push({
            ...ccData,
            _id: weaponId,
            system: {
              ...ccData.system,
              uses: {
                value: Math.max(0, (weaponSlot.maxUses ?? 0) - (weaponSlot.currentUses ?? 0)),
                max: weaponSlot.maxUses,
              } as const,
            },
          });

          let mod: LancerWEAPON_MOD | null = null;
          let modId: string | null = null;
          if (weaponSlot.mod) {
            mod = (await getActorItemByLid(weaponSlot.mod.id, mech, mechItemPool, _missingItems)) as LancerWEAPON_MOD;
            modId =
              mod?.id ??
              (
                await mech.createEmbeddedDocuments("Item", [
                  {
                    type: EntryType.WEAPON_MOD,
                    name: weaponSlot.mod.data.name,
                  },
                ])
              )[0].id;

            const ccData = unpackWeaponMod(weaponSlot.mod.data, _context);
            mechItemUpdates.push({
              ...ccData,
              _id: modId,
              system: {
                ...ccData.system,
                uses: {
                  value: Math.max(0, (weaponSlot.mod.maxUses ?? 0) - (weaponSlot.mod.currentUses ?? 0)),
                  max: weaponSlot.mod.maxUses,
                } as const,
              },
            });
          }

          return { weapon, weaponId, mod, modId };
        };

        for (const slot of mount.slots) {
          if (!slot.weapon) continue;
          const { weapon, weaponId, mod, modId } = await processMechWeapon(slot.weapon);
          // assocWeaponData.set(weaponId, slot.weapon);
          // if (slot.weapon.mod) assocSystemData.set(weaponId, slot.weapon.mod);
          populatedSlots.push({
            mod: mod ? modId : null,
            weapon: weapon ? weaponId : null,
            size: slot.size,
          });
        }

        for (const extraSlot of mount.extra) {
          if (!extraSlot.weapon) continue;
          const { weapon, weaponId, mod, modId } = await processMechWeapon(extraSlot.weapon);
          populatedSlots.push({ mod: mod ? modId : null, weapon: weapon ? weaponId : null, size: extraSlot.size });
        }

        populatedMounts.push({
          bracing: mount.lock ?? false,
          type: mount.mount_type as MountType,
          slots: populatedSlots,
        });
      }

      // Update all items
      await mech.updateEmbeddedDocuments("Item", mechItemUpdates);

      // Perform base mech update
      await updateMech(mech, pilot, importedMech, ownershipLevel, populatedMounts, populatedSystems, compendiumFrame);

      // Try to use CC's starred mech otherwise set the first one as active.
      if (!activeMechUuid) activeMechUuid = mech.uuid;
      else if (data.favorite_mech === mech.system.lid) activeMechUuid = mech.uuid;
    }

    // Update active mech and last imported timestamp
    await pilot.update({
      system: {
        active_mech: activeMechUuid,
        last_cloud_update: new Date().toISOString(),
      },
    });

    pilot.effectHelper.propagateEffects(true);
    // Reset current data and render all
    pilot.render();
    ui.notifications!.info("Successfully loaded pilot new state.");
  } catch (e) {
    console.warn(e);
    ui.notifications!.warn(`Failed to update pilot: ${e instanceof Error ? e.message : e}`, { permanent: true });
  }
}

// Imports packed pilot data, from either a vault id or gist id
export async function importCCv2(pilot: LancerPILOT, data: PackedPilotData, clearFirst = true) {
  const coreVersion = game.settings.get(game.system.id, LANCER.setting_core_data);
  if (!coreVersion) {
    ui.notifications!.warn(
      "You must import the Core Book Data in the Lancer Compendium Manager before importing a pilot.",
      { permanent: true }
    );
    return;
  }
  console.log(`${lp} Importing v2 Pilot`, pilot, data);
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
    const gmsOnline = game.users?.some(u => u.isGM && u.active);
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

      // Do reserves
      for (let reserve of data.reserves) {
        let _r = (await getActorItemByLid(reserve.id, pilot, pilotItemPool, missingItems)) as LancerRESERVE | null;
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
        "texture.src": replaceDefaultResource(pilot.prototypeToken?.texture?.src, data.cloud_portrait, pilot.img),
      },
    });

    // Iterate over mechs
    let activeMechUuid = "";
    for (const cloudMech of data.mechs) {
      // Find the existing mech, or create one as necessary
      let mech = game.actors!.find((m): m is LancerMECH => m.is_mech() && m.system.lid == cloudMech.id);
      if (!mech) {
        if (!game.user?.can("ACTOR_CREATE")) {
          ui.notifications!.warn(
            `Could not import mech '${cloudMech.name}' as you lack the permission to create new actors. Please ask your GM for assistance (either they import for you, or give you permissions)`,
            { permanent: true }
          );
          missingActors.push({ name: cloudMech.name, lid: cloudMech.frame });
          continue;
        }

        mech = await LancerActor.create({
          name: cloudMech.name,
          type: EntryType.MECH,
          folder: unitFolder?.id,
          ownership: permission,
          system: {
            pilot: pilot.uuid,
          },
        });
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
      let assocSystemData = new Map<string, PackedMechEquipmentData>();
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
        let populatedSlots: (typeof populatedMounts)[0]["slots"] = [];
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

    // Update active mech and last imported timestamp
    await pilot.update({
      "system.active_mech": activeMechUuid,
      "system.last_cloud_update": new Date().toISOString(),
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
