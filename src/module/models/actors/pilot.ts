
import {
  template_action_tracking,
  template_statuses,
  template_universal_actor,
} from "./shared";

import { BoundedNumberField, LancerDataModel, LIDField, UUIDRefField } from "../shared";

const fields: any = foundry.data.fields;

const pilotSchema = {
  active_mech: new UUIDRefField(),
  background: new fields.HTMLField(),
  callsign: new fields.StringField(),
  cloudID: new fields.StringField(),
  cloudOwnerID: new fields.StringField(),
  history: new fields.HTMLField(),
  lastCloudUpdate: new fields.StringField(),
  level: new fields.NumberField({ min: 0, max: 12, integer: true }),

  loadout: new fields.SchemaField({
    lid: new LIDField(),
    armor: new fields.ArrayField(new UUIDRefField()),
    gear: new fields.ArrayField(new UUIDRefField()),
    weapons: new fields.ArrayField(new UUIDRefField()),
  }),

  mechSkills: new fields.ArrayField(new fields.NumberField({ min: 0, max: 6, integer: true }), {
    validate: (x: number[]) => x.length == 4,
    initial: [0, 0, 0, 0]
  }),

  mounted: new fields.BooleanField(),
  notes: new fields.HTMLField(),
  player_name: new fields.StringField(),
  status: new fields.StringField(),

  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_statuses(),
};

type PilotSchema = typeof pilotSchema;

export class PilotModel extends LancerDataModel<"PilotModel"> {
  static defineSchema(): PilotSchema {
    return pilotSchema;
  }
}
