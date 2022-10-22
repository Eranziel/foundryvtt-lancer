import {
  template_action_tracking,
  template_heat,
  template_statuses,
  template_struss,
  template_universal_actor,
} from "./shared";

import { BoundedNumberField, LancerDataModel, UUIDRefField } from "../shared";

const fields: any = foundry.data.fields;

const mech_schema = {
  core_energy: new fields.NumberField({ min: 0, integer: true, initial: 1 }),
  core_active: new fields.BooleanField({ initial: false }),
  overcharge: new fields.NumberField({ min: 0, integer: true }),
  meltdown_timer: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
  notes: new fields.HTMLField(),
  pilot: new UUIDRefField(),
  repairs: new BoundedNumberField(),
  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_heat(),
  ...template_statuses(),
  ...template_struss(),
};

type MechSchema = typeof mech_schema;
export class MechModel extends LancerDataModel<"MechModel"> {
  static defineSchema(): MechSchema {
    return mech_schema;
  }
}
