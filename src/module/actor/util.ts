import * as mm from "machine-mind";
import { CompendiumCategory, CompendiumItem, ItemType, MountType, store } from "machine-mind";
import { LancerActor } from "./lancer-actor";
import { LancerMechWeaponData, LancerMechWeaponItemData, LancerMountData, LancerPilotActorData } from "../interfaces";
import { ItemDataManifest, MachineMind_pilot_to_VTT_items_compendium_lookup, MachineMind_to_VTT_data } from "../item/util";
import { LancerItem, LancerMechWeapon } from "../item/lancer-item";

export async function import_pilot_by_code(code: string): Promise<mm.Pilot> {
  let data = await mm.loadPilot(code);
  return mm.Pilot.Deserialize(data);
}

// Make the specified actor be the specified pilot
export async function update_pilot(pilot: LancerActor, cc_pilot: mm.Pilot): Promise<void> {
  // Initialize a pilot
  // let pilot: LancerActor = await (LancerActor.create({
  // type: "pilot",
  // name: cc_pilot.Callsign,
  // }) as Promise<LancerActor>);
  if (pilot.data.type !== "pilot") {
    throw TypeError("Cannot operate on non-pilot actors");
  }
  console.log((pilot.data as LancerPilotActorData).data.mech_loadout);

  // Get those items
  let items = await MachineMind_pilot_to_VTT_items_compendium_lookup(cc_pilot);

  if (items.errors.length) {
    for (let e of items.errors) {
      ui.notifications.warn(e);
    }
    // Escape
    return;
  }

  // Wipe old items
  for (let item of pilot.items.values()) {
    await pilot.deleteOwnedItem(item._id);
  }

  // Do some pre-editing before owning
  let item_data = items.items.map(i => duplicate(i.data));
  let item_data_sorted = new ItemDataManifest().add_items(item_data);

  for (let talent of item_data_sorted.talents) {
    talent.data.rank = cc_pilot.getTalentRank(talent.data.id);
  }

  for (let skill of item_data_sorted.skills) {
    skill.data.rank = cc_pilot.getSkillRank(skill.data.id);
  }

  // Copy them all
  for (let i of item_data) {
    await pilot.createOwnedItem(i);
  }

  // Get actor data for modification. pd is just a shorthand
  let pad = duplicate(pilot.data) as LancerPilotActorData;
  let pd = pad.data;

  // Basics
  pad.name = cc_pilot.Callsign;
  pd.pilot.background = cc_pilot.Background;
  pd.pilot.callsign = cc_pilot.Callsign;
  pd.pilot.grit = cc_pilot.Grit;
  pd.pilot.history = cc_pilot.History;
  pd.pilot.level = cc_pilot.Level;
  pd.pilot.name = cc_pilot.Name;
  pd.pilot.notes = cc_pilot.Notes;
  pd.pilot.quirk = cc_pilot.Quirk;
  pd.pilot.status = cc_pilot.Status;
  pd.pilot.cloud_code = cc_pilot.CloudID;
  pd.pilot.cloud_owner_code = cc_pilot.CloudOwnerID;
  let dt = new Date();
  pd.pilot.cloud_time = `${dt.toDateString()}, ${dt.toTimeString()}`;

  // Stats
  pd.pilot.stats.armor = cc_pilot.Armor;
  pd.pilot.stats.edef = cc_pilot.EDefense;
  pd.pilot.stats.evasion = cc_pilot.Evasion;
  pd.pilot.stats.hp.max = cc_pilot.MaxHP;
  pd.pilot.stats.hp.value = cc_pilot.CurrentHP;
  pd.pilot.stats.size = 0.5;
  pd.pilot.stats.speed = cc_pilot.Speed;

  // Now handle mech (ugh)
  let am = cc_pilot.ActiveMech;
  pd.mech.hull = cc_pilot.MechSkills.Hull;
  pd.mech.agility = cc_pilot.MechSkills.Agi;
  pd.mech.systems = cc_pilot.MechSkills.Sys;
  pd.mech.engineering = cc_pilot.MechSkills.Eng;

  if (am) {
    // All dem stats
    pd.mech.armor = am.Armor;
    pd.mech.edef = am.EDefense;
    pd.mech.evasion = am.Evasion;
    pd.mech.heat.max = am.HeatCapacity;
    pd.mech.heat.value = am.CurrentHeat;
    pd.mech.name = am.Name;
    pd.mech.save = am.SaveTarget;
    pd.mech.sp = am.CurrentSP;
    pd.mech.stress.value = am.CurrentStress;
    pd.mech.stress.max = am.MaxStress;
    pd.mech.structure.value = am.CurrentStructure;
    pd.mech.structure.max = am.MaxStructure;
    pd.mech.tech_attack = am.TechAttack;
    pd.mech.repairs.value = am.CurrentRepairs;
    pd.mech.repairs.max = am.RepairCapacity;
    pd.mech.sensors = am.SensorRange;
    pd.mech.size = am.Size;
    pd.mech.speed = am.Speed;
    pd.mech.hp.value = am.CurrentHP;
    pd.mech.hp.max = am.MaxHP;


    // pd.mech_loadout.mounts
    
    if(am.ActiveLoadout) {
      let aml = am.ActiveLoadout;

      // Check the core bonuses
      let int = store.compendium.getReferenceByIDCareful("CoreBonuses", "cb_integrated_weapon")
      let has_int = int ? cc_pilot.has(int) : false;
      let ia = store.compendium.getReferenceByID("CoreBonuses", "cb_improved_armament");
      let has_ia = ia ? cc_pilot.has(ia) : false;

      let mr = store.compendium.getReferenceByID("CoreBonuses", "cb_mount_retrofitting");

      // Fetch integrated and equippable mounts separately as they are different data types, save trouble later.
      let cc_equippableMounts = aml.AllEquippableMounts(has_ia, has_int)
      let cc_integratedMounts = aml.IntegratedMounts
      // Convert to foundry

      let weaponData = pilot.items.filter((item: LancerItem) => item.type === "mech_weapon")

      let mounts: LancerMountData[] = [];
      let equippableMounts = cc_equippableMounts.map( cc_mount => {
        let is_mr = cc_mount.Bonuses.includes(mr)
        let mountWeapons = cc_mount.Weapons.map(cc_weapon => {
          return weaponData.find(weapon => {
            return cc_weapon.ID === weapon.data.data.id
          })
        }) as LancerMechWeaponItemData[] 

        let mount: LancerMountData = {
          secondary_mount: "",
          type: is_mr ? MountType.MainAux : cc_mount.Type, //Handle Mount Retrofitting core bonus
          weapons: mountWeapons,
        }

        return mount
      })

      let integratedMounts = cc_integratedMounts.map( cc_mount => {
        let mountWeapons = cc_mount.Weapons.map(cc_weapon => {
          return weaponData.find(weapon => {
            return cc_weapon.ID === weapon.data.data.id
          })
        }) as LancerMechWeaponItemData[] 

        let mount: LancerMountData = {
          secondary_mount: "",
          type: cc_mount.Type,
          weapons: mountWeapons,
        }

        return mount
      })
      
      mounts = integratedMounts.concat(equippableMounts)

      pd.mech_loadout.mounts = mounts
      
    }
    
  }

  await pilot.update(pad);

  // Fixup actor name -- this might not work
  // pilot.token.update({name: cc_pilot.Name});
}

export async function give_pilot_compendium_item(
  cat: CompendiumCategory,
  id: string,
  pilot: LancerActor
): Promise<void> {
  // Validate
  if (pilot.data.type != "pilot") {
    console.error("For now, cannot give items to npcs/deployables this way");
    return;
  }

  // Try getting the item. We assume an initialized store
  let item = store.compendium.getReferenceByIDCareful(cat, id);
  if (!item) {
    console.error(`Unable to find item ${id} of type ${cat}`);
    return;
  }

  if (!(item instanceof CompendiumItem)) {
    console.error(`Cannot currently handle non-compendium items of type ${cat}`);
    return;
  }

  // We have it. Now, matter of appropriately converting it

  // Item.createOwned(, pilot);
}
