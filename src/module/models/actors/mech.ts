import {
  template_action_tracking,
  template_heat,
  template_offenses,
  template_statuses,
  template_struss,
  template_universal_actor,
} from "./shared";

import { BoundedNumberField, LancerDataModel, UUIDField } from "../shared";

const fields: any = foundry.data.fields;

export class MechModel extends LancerDataModel {
  static defineSchema() {
    return {
      core_energy: new fields.BooleanField({initial: true}),
      core_active: new fields.BooleanField({initial: false}),
      overcharge: new fields.NumberField({min: 0, integer: true}),
      meltdown_timer: new fields.NumberField({required: false, nullable: true, integer: true, min: 0}),
      notes: new fields.HTMLField(),
      pilot: new UUIDField(),
      repairs: new BoundedNumberField(),
      ...template_universal_actor(),
      ...template_action_tracking(),
      ...template_offenses(),
      ...template_heat(),
      ...template_statuses(),
      ...template_struss(),
    };
  }
}
