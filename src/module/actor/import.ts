import { PackedPilotData } from "../util/unpacking/packed-types";
import { LancerPILOT } from "./lancer-actor";

// Imports packed pilot data, from either a vault id or gist id
export async function importCC(actor: LancerPILOT, data: PackedPilotData, clearFirst = false) {
  /*
    TODO
    if (this.type !== EntryType.PILOT) {
      return;
    }
    if (data == null) return;
    if (clearFirst) {
        await this.deleteEmbeddedDocuments("Item", Array.from(this.items.keys()));
    }

    try {
      // @ts-expect-error Should be fixed with v10 types
      const mm = await this.system.derived.mm_promise;
      // This block is kept for posterity, in case we want to re-implement automatic folder creation.
      // Get/create folder for sub-actors
      // let unit_folder_name = `${data.callsign}'s Units`;
      // let unit_folder = game.folders.getName(unit_folder_name);
      // if (!unit_folder) {
      //   unit_folder = await Folder.create({
      //     name: unit_folder_name,
      //     type: "Actor",
      //     sorting: "a",
      //     parent: this.folder || null,
      //   });
      // }
      let unit_folder = this.folder;
      console.log("Unit folder id:", unit_folder?.id);
      // @ts-expect-error Should be fixed with v10 types
      let permission = duplicate(this.ownership);

      // Check whether players are allowed to create Actors
      if (!game.user?.can("ACTOR_CREATE")) {
        new Dialog({
          title: "Cannot Create Actors",
          content: `<p>You are not permitted to create actors, so sync may fail.</p>
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

      // Setup registries
      // We look for missing items in world first, compendium second
      let ps1 = new FoundryReg("game");
      let ps2 = new FoundryReg("comp_core");

      // Setup relinker to be folder bound for actors
      let base_relinker = quick_relinker<any>({
        key_pairs: [
          ["LID", "lid"],
          ["Name", "name"],
        ],
      });

      // Setup sync tracking etc
      let synced_deployables: Deployable[] = []; // Track these as we go
      let synced_data = await funcs.cloud_sync(data, mm as Pilot, [ps1, ps2], {
        relinker: async (source_item, dest_reg, dest_cat) => {
          // Link by specific subfolder if deployable
          if (source_item.Type == EntryType.DEPLOYABLE) {
            console.debug("Relinking deployable: ", source_item);
            // Narrow down our destination options to find one that's in the proper folder
            let dest_deployables = (await dest_cat.list_live(source_item.OpCtx)) as Deployable[];
            return dest_deployables.find(dd => {
              let dd_folder_id: string = dd.Flags.orig_doc.data.folder;
              console.log(
                "Checking folder: " + dd.Name + " has folder id " + dd_folder_id + " which ?== " + unit_folder?.id
              );
              if (dd_folder_id != unit_folder?.id) {
                return false;
              }

              // Still need to have the right name, though. Do by substring since we reformat quite a bit
              return dd.Name.includes(source_item.Name);
            });
          } else {
            return base_relinker(source_item, dest_reg, dest_cat);
          }
        },
        // Rename and rehome deployables
        // @TODO: pilot typing weirdness.
        sync_deployable_nosave: (dep: Deployable) => {
          let flags = dep.Flags as FoundryFlagData<EntryType.DEPLOYABLE>;
          let owned_name = dep.Name.includes(data.callsign) ? dep.Name : `${data.callsign}'s ${dep.Name}`;
          flags.top_level_data["name"] = owned_name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["token.name"] = owned_name;
          flags.top_level_data["permission"] = permission;
          flags.top_level_data["token.disposition"] = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
          // dep.writeback(); -- do this later, after setting active!
          synced_deployables.push(dep);
        },
        // Rename and rehome mechs
        sync_mech: async (mech: Mech) => {
          let flags = mech.Flags as FoundryFlagData<EntryType.MECH>;
          let portrait = mech.CloudPortrait || mech.Frame?.ImageUrl || "";
          let new_img = replace_default_resource(flags.top_level_data["img"], portrait);

          flags.top_level_data["name"] = mech.Name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["img"] = new_img;
          flags.top_level_data["permission"] = permission;
          flags.top_level_data["token.name"] = data.callsign;
          // @ts-expect-error Should be fixed with v10 types
          flags.top_level_data["token.disposition"] = this.token?.disposition;
          flags.top_level_data["token.actorLink"] = true;

          // the following block of code is version 1 to ensure all weapons are their own unique object in the registry.
          // This is primarily to fix issues with loading weapons. I am not particularly proud of the method (maybe a bit more writing and deleting than I'd like)
          // We iterate over every available mount, telling the registry to generate a new instance of itself, we then replace it in the mount and delete the original.
          // This is done only to avoid messing with how the Machine Mind deals with populating the sheet.

          for (let i = 0; i < mech.Loadout.WepMounts.length; i++) {
            for (let k = 0; k < mech.Loadout.WepMounts[i].Slots.length; k++) {
              let oldWepLocation = mech.Loadout.WepMounts[i].Slots[k];
              //console.log(`processing mount ${i}, slot ${k} :`,oldWepLocation)
              let newWep =
                (await oldWepLocation.Weapon?.Registry.create_live(
                  EntryType.MECH_WEAPON,
                  oldWepLocation.Weapon.OpCtx,
                  oldWepLocation.Weapon.OrigData
                )) || null;
              //console.log("Our brand new weapon: ", newWep)
              oldWepLocation.Weapon?.Registry.delete(EntryType.MECH_WEAPON, oldWepLocation.Weapon.RegistryID);
              oldWepLocation.Weapon = newWep;
            }
          }

          // We proceed to do a similar process for the mech systems. This is to ensure non-unique systems can be disabled individually on the mech sheet
          for (let i = 0; i < mech.Loadout.SysMounts.length; i++) {
            let oldSystemLocation = mech.Loadout.SysMounts[i];
            let newSys =
              (await oldSystemLocation.System?.Registry.create_live(
                EntryType.MECH_SYSTEM,
                oldSystemLocation.System.OpCtx,
                oldSystemLocation.System.OrigData
              )) || null;
            oldSystemLocation.System?.Registry.delete(EntryType.MECH_SYSTEM, oldSystemLocation.System.RegistryID);
            oldSystemLocation.System = newSys;
          }

          await mech.writeback();

          // If we've got a frame (which we should) check for setting Retrograde image
          if (mech.Frame && (await (mech.Flags.orig_doc as LancerActor).swapFrameImage(mech, null, mech.Frame))) {
            // Write back again if we swapped images
            await mech.writeback();
          }
        },
        // Set pilot token
        sync_pilot: (pilot: Pilot) => {
          let flags = pilot.Flags as FoundryFlagData<EntryType.PILOT>;
          let new_img = replace_default_resource(flags.top_level_data["img"], pilot.CloudPortrait);
          flags.top_level_data["name"] = pilot.Name;
          flags.top_level_data["img"] = new_img;
          flags.top_level_data["token.name"] = pilot.Callsign;

          // Check and see if we have a custom token (not from imgur) set, and if we don't, set the token image.
          if (
            // @ts-expect-error Should be fixed with v10 types
            this.token?.img === "systems/lancer/assets/icons/pilot.svg" ||
            // @ts-expect-error Should be fixed with v10 types
            this.token?.img?.includes("imgur")
          ) {
            flags.top_level_data["token.img"] = new_img;
          }
        },
      });

      // Now we can iterate over deploys, setting their deployer to active mech and writing back again. Set all deployers to the pilots active mech
      let active = await (synced_data as any).ActiveMech();
      for (let deployable of synced_deployables) {
        if (active) {
          deployable.Deployer = active;
        }
        deployable.writeback();
      }

      // Reset curr data and render all
      this.render();
      (await synced_data.Mechs()).forEach((m: Mech) => m.Flags.orig_doc.render());

      ui.notifications!.info("Successfully loaded pilot new state.");
    } catch (e) {
      console.warn(e);
      if (e instanceof Error) {
        ui.notifications!.warn(`Failed to update pilot, likely due to missing LCP data: ${e.message}`);
      } else {
        ui.notifications!.warn(`Failed to update pilot, likely due to missing LCP data: ${e}`);
      }
    }
    */
}
