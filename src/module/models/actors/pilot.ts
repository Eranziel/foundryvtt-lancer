import { template_action_tracking, template_statuses, template_universal_actor } from "./shared";
import { LancerDataModel, EmbeddedRefField, SyncUUIDRefField, FakeBoundedNumberField } from "../shared";
import { EntryType } from "../../enums";
import { regRefToUuid } from "../../util/migrations";
import { CounterField } from "../bits/counter";

const fields: any = foundry.data.fields;

const pilot_schema = {
  active_mech: new SyncUUIDRefField("Actor", { allowed_types: [EntryType.MECH] }),
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

  bond_state: new fields.SchemaField({
    xp: new FakeBoundedNumberField({ min: 0, max: 8, integer: true }),
    stress: new FakeBoundedNumberField({ min: 0, max: 8, integer: true }),
    xp_checklist: new fields.SchemaField({
      major_ideals: new fields.ArrayField(new fields.BooleanField()),
      minor_ideals: new fields.BooleanField(),
      veteran_power: new fields.BooleanField(),
    }),
    answers: new fields.ArrayField(new fields.StringField()),
    minor_ideal: new fields.StringField(),
    burdens: new fields.ArrayField(new CounterField()),
    clocks: new fields.ArrayField(new CounterField()),
  }),

  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_statuses(),
};

type PilotSchema = typeof pilot_schema;

export class PilotModel extends LancerDataModel<"PilotModel"> {
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
    if (data.cloudID) data.cloud_id ??= data.cloudID;
    if (data.cloudOwnerID) data.cloud_owner_id ??= data.cloudOwnerID;
    if (data.mechSkills?.length == 4) {
      data.hull ??= data.mechSkills[0];
      data.agi ??= data.mechSkills[1];
      data.sys ??= data.mechSkills[2];
      data.eng ??= data.mechSkills[3];
    }

    // Initialize missing bond state
    if (!data.bond_state.xp) data.bond_state.xp = 0;
    if (!data.bond_state.stress) data.bond_state.stress = 0;
    if (data.bond_state.xp_checklist?.major_ideals?.length === 0) {
      data.bond_state.xp_checklist.major_ideals = [false, false, false];
    }
    if (!data.bond_state.minor_ideal) data.bond_state.minor_ideal = "";

    // @ts-expect-error v11
    return super.migrateData(data);
  }
}
