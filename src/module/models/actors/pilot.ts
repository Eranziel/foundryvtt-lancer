import { EntryType } from "../../enums";
import { regRefToUuid } from "../../util/migrations";
import { CounterField } from "../bits/counter";
import { EmbeddedRefField, FullBoundedNumberField, LancerDataModel, SyncUUIDRefField } from "../shared";
import { template_action_tracking, template_statuses, template_universal_actor } from "./shared";

const fields = foundry.data.fields;

const pilot_schema = {
  active_mech: new SyncUUIDRefField("Actor", { allowed_types: [EntryType.MECH] }),
  background: new fields.HTMLField(),
  callsign: new fields.StringField(),
  cloud_id: new fields.StringField(),
  history: new fields.HTMLField(),
  last_cloud_update: new fields.StringField(),
  level: new fields.NumberField({ min: 0, max: 12, integer: true, initial: 0 }),

  loadout: new fields.SchemaField({
    armor: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_ARMOR] })),
    gear: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_GEAR] })),
    weapons: new fields.ArrayField(new EmbeddedRefField("Item", { allowed_types: [EntryType.PILOT_WEAPON] })),
  }),

  hull: new fields.NumberField({ min: 0, max: 6, integer: true, initial: 0 }),
  agi: new fields.NumberField({ min: 0, max: 6, integer: true, initial: 0 }),
  sys: new fields.NumberField({ min: 0, max: 6, integer: true, initial: 0 }),
  eng: new fields.NumberField({ min: 0, max: 6, integer: true, initial: 0 }),

  mounted: new fields.BooleanField({ initial: false }),
  notes: new fields.HTMLField(),
  player_name: new fields.StringField(),
  status: new fields.StringField(),
  text_appearance: new fields.HTMLField(),

  bond_state: new fields.SchemaField({
    xp: new FullBoundedNumberField({ min: 0, max: 8 }),
    stress: new FullBoundedNumberField({ min: 0, max: 8 }),
    xp_checklist: new fields.SchemaField({
      major_ideals: new fields.ArrayField(new fields.BooleanField(), { initial: [false, false, false] }),
      minor_ideal: new fields.BooleanField({ initial: false }),
      veteran_power: new fields.BooleanField({ initial: false }),
    }),
    answers: new fields.ArrayField(new fields.StringField()),
    minor_ideal: new fields.StringField(),
    // @ts-expect-error
    burdens: new fields.ArrayField(new CounterField()),
    // @ts-expect-error
    clocks: new fields.ArrayField(new CounterField()),
  }),

  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_statuses(),
};

type PilotSchema = typeof pilot_schema;

export class PilotModel extends LancerDataModel<DataSchema, Actor> {
  static defineSchema(): PilotSchema {
    return pilot_schema;
  }

  static migrateData(data: any) {
    // Convert old regrefs
    if (typeof data.active_mech == "object") {
      data.active_mech = regRefToUuid("Actor", data.active_mech);
    }

    // Strip nulls from loadouts
    if (Array.isArray(data.loadout?.armor)) data.loadout.armor = data.loadout.armor.filter((a: any) => a);
    if (Array.isArray(data.loadout?.gear)) data.loadout.gear = data.loadout.gear.filter((g: any) => g);
    if (Array.isArray(data.loadout?.weapons)) data.loadout.weapons = data.loadout.weapons.filter((w: any) => w);

    // And renamed fields
    if (data.cloudID) {
      data.cloud_id = data.cloudID;
    }
    if (data.cloudOwnerID) {
      data.cloud_owner_id = data.cloudOwnerID;
    }
    if (data.mechSkills?.length == 4) {
      data.hull = data.mechSkills[0] ?? 0;
      data.agi = data.mechSkills[1] ?? 0;
      data.sys = data.mechSkills[2] ?? 0;
      data.eng = data.mechSkills[3] ?? 0;
    }

    return super.migrateData(data);
  }
}
