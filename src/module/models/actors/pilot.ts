import { LancerActor } from "../../actor/lancer-actor";
import { EntryType } from "../../enums";
import type { LancerBOND, LancerItem } from "../../item/lancer-item";
import { SystemData, SystemTemplates } from "../../system-template";
import { regRefToUuid } from "../../util/migrations";
import { CounterField } from "../bits/counter";
import { EmbeddedRefField, FullBoundedNumberField, LancerDataModel, SyncUUIDRefField } from "../shared";
import { template_action_tracking, template_statuses, template_universal_actor } from "./shared";
import * as lancer_data from "@massif/lancer-data";

const fields = foundry.data.fields;

function pilot_schema() {
  return {
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
      burdens: new fields.ArrayField(new CounterField()),
      clocks: new fields.ArrayField(new CounterField()),
    }),

    ...template_universal_actor(),
    ...template_action_tracking(),
    ...template_statuses(),
  };
}

type PilotSchema = ReturnType<typeof pilot_schema> & DataSchema;

export class PilotModel extends LancerDataModel<PilotSchema, LancerActor, SystemData.Pilot> {
  static defineSchema() {
    return pilot_schema();
  }

  prepareBaseData() {
    // 1. First, finalize our system tasks. Items should be (minimally) prepared by now, so we can resolve embedded items
    super.prepareBaseData();

    // 2. Initialize our universal derived stat fields
    this.edef = 0;
    this.evasion = 0;
    this.speed = 0;
    this.armor = 0;
    this.size = 0;
    this.save = 0;
    this.sensor_range = 0;
    this.tech_attack = 0;
    this.statuses = {
      dangerzone: false,
      downandout: false,
      engaged: false,
      exposed: false,
      invisible: false,
      prone: false,
      shutdown: false,
      immobilized: false,
      impaired: false,
      jammed: false,
      lockon: false,
      shredded: false,
      slowed: false,
      stunned: false,
      hidden: false,
    };
    this.resistances = {
      burn: false,
      energy: false,
      explosive: false,
      heat: false,
      kinetic: false,
      variable: false,
    };
    this.bonuses = {
      weapon_bonuses: [],
    };

    // 3. Establish type specific attributes / perform type specific prep steps
    this.grit = Math.ceil(this.level / 2);
    this.hp.max = lancer_data.rules.base_pilot_hp + this.grit;
    this.bond = (this.parent.items.find(i => i.is_bond()) ?? null) as
      | (LancerItem & { system: DataModelConfig["Item"][EntryType.BOND] })
      | null;
    this.size = 0.5;
    this.sensor_range = 5;
    this.save = this.grit + 10;
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
