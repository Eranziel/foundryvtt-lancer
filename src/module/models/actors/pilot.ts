import { template_action_tracking, template_statuses, template_universal_actor } from "./shared.js";

import { FakeBoundedNumberField, LancerDataModel, LIDField, EmbeddedRefField, SyncUUIDRefField } from "../shared.js";
import { EntryType } from "../../enums.js";

const fields: any = foundry.data.fields;

const pilot_schema = {
  active_mech: new SyncUUIDRefField({ allowed_types: [EntryType.MECH] }),
  background: new fields.HTMLField(),
  callsign: new fields.StringField(),
  cloud_id: new fields.StringField(),
  history: new fields.HTMLField(),
  last_cloud_update: new fields.StringField(),
  level: new fields.NumberField({ min: 0, max: 12, integer: true }),

  loadout: new fields.SchemaField({
    armor: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_ARMOR] })),
    gear: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_GEAR] })),
    weapons: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_WEAPON] })),
  }),

  hull: new fields.NumberField({ min: 0, max: 6, integer: true }),
  agi: new fields.NumberField({ min: 0, max: 6, integer: true }),
  sys: new fields.NumberField({ min: 0, max: 6, integer: true }),
  eng: new fields.NumberField({ min: 0, max: 6, integer: true }),

  mounted: new fields.BooleanField(),
  notes: new fields.HTMLField(),
  player_name: new fields.StringField(),
  status: new fields.StringField(),
  text_appearance: new fields.HTMLField(),

  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_statuses(),
};

type PilotSchema = typeof pilot_schema;

export class PilotModel extends LancerDataModel<"PilotModel"> {
  static defineSchema(): PilotSchema {
    return pilot_schema;
  }
}
