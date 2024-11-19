import { template_action_tracking, template_heat, template_struss, template_universal_actor } from "./shared";

import { LancerDataModel, EmbeddedRefField, SyncUUIDRefField, FullBoundedNumberField } from "../shared";
import { EntryType, FittingSize, MountType } from "../../enums";

const fields = foundry.data.fields;

const mech_schema = {
  overcharge: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  repairs: new FullBoundedNumberField(),
  core_active: new fields.BooleanField({ initial: false }),
  core_energy: new fields.NumberField({ min: 0, integer: true, initial: 1 }),
  loadout: new fields.SchemaField({
    frame: new EmbeddedRefField("Item", { allowed_types: [EntryType.FRAME] }),
    weapon_mounts: new fields.ArrayField(
      new fields.SchemaField({
        slots: new fields.ArrayField(
          new fields.SchemaField({
            weapon: new EmbeddedRefField("Item", { allowed_types: [EntryType.MECH_WEAPON] }),
            mod: new EmbeddedRefField("Item", { allowed_types: [EntryType.WEAPON_MOD] }),
            size: new fields.StringField({ nullable: false, choices: FittingSize }),
          })
        ),
        type: new fields.StringField({ nullable: false, choices: Object.values(MountType) }),
        bracing: new fields.BooleanField({ initial: false }),
      })
    ),
    systems: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.MECH_SYSTEM] })),
  }),
  meltdown_timer: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
  notes: new fields.HTMLField(),
  pilot: new SyncUUIDRefField("Actor", { allowed_types: [EntryType.PILOT] }),
  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_heat(),
  ...template_struss(),
};

type MechSchema = typeof mech_schema;
export class MechModel extends LancerDataModel<DataSchema, Actor> {
  static defineSchema(): MechSchema {
    return mech_schema;
  }

  static migrateData(data: any) {
    // Convert loadout
    // If we don't already have a systems array attempt to convert a system_mounts array
    if (Array.isArray(data.loadout?.system_mounts)) {
      // Remap the var name + convert from regref + remove nulls
      data.loadout.systems ??= data.loadout.system_mounts
        .map((s: any) => s?.system)
        .filter((sm: any) => sm)
        .sort((a: any, b: any) => a.sort - b.sort);
    }

    // Weapon mounts also pretty gnarly
    if (Array.isArray(data.loadout?.weapon_mounts)) {
      // First remove nulls
      data.loadout.weapon_mounts = data.loadout.weapon_mounts.filter((wm: any) => wm); // Remove nulls if they exist
      // Then process mount-by-mount
      for (let wm of data.loadout.weapon_mounts) {
        wm.type ??= wm?.mount_type; // type got renamed
        wm.slots = wm.slots.filter((s: any) => s); // Remove nulls if they exist
      }
    }

    return super.migrateData(data);
  }
}
