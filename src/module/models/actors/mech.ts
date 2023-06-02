import {
  template_action_tracking,
  template_heat,
  template_statuses,
  template_struss,
  template_universal_actor,
} from "./shared";

import { FakeBoundedNumberField, LancerDataModel, EmbeddedRefField, SyncUUIDRefField } from "../shared";
import { EntryType, FittingSize, MountType } from "../../enums";
import { regRefToUuid } from "../../migration";

const fields: any = foundry.data.fields;

const mech_schema = {
  overcharge: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  repairs: new FakeBoundedNumberField(),
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
  pilot: new SyncUUIDRefField(),
  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_heat(),
  ...template_struss(),
};

type MechSchema = typeof mech_schema;
export class MechModel extends LancerDataModel<"MechModel"> {
  static defineSchema(): MechSchema {
    return mech_schema;
  }

  static migrateData(data: any) {
    // Convert old regrefs
    if (typeof data.pilot == "object") {
      data.pilot = regRefToUuid("Actor", data.pilot);
    }

    // @ts-expect-error v11
    return super.migrateData(data);
  }
}
