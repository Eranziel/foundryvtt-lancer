import { template_action_tracking, template_heat, template_struss, template_universal_actor } from "./shared";

import { LancerDataModel, EmbeddedRefField, SyncUUIDRefField, FullBoundedNumberField } from "../shared";
import { EntryType, FittingSize, MountType } from "../../enums";
import { SystemData } from "../../system-template";
import { LancerActor } from "../../actor/lancer-actor";

const fields = foundry.data.fields;

const DEFAULT_OVERCHARGE_SEQUENCE = "+1,+1d3,+1d6,+1d6+4" as const;

function mech_schema() {
  return {
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
}

type MechSchema = ReturnType<typeof mech_schema> & DataSchema;

export class MechModel extends LancerDataModel<MechSchema, LancerActor, SystemData.Mech> {
  static defineSchema() {
    return mech_schema();
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
    // HASE is pretty generic. All but pilot need defaults - pilot gets from source
    this.hull = 0;
    this.agi = 0;
    this.sys = 0;
    this.eng = 0;

    // Aggregate sp/ai
    let equipped_sp = 0;
    let equipped_ai = 0;
    for (let system of this.loadout.systems) {
      if (system?.status == "resolved") {
        equipped_sp += system.value.system.sp;
        // @ts-ignore
        equipped_ai += system.value.system.tags.some(t => t.is_ai) ? 1 : 0;
      }
    }
    for (let mount of this.loadout.weapon_mounts) {
      for (let slot of mount.slots) {
        // @ts-expect-error
        if (slot.weapon?.status == "resolved") {
          // @ts-expect-error
          equipped_sp += slot.weapon.value.system.sp;
        }
        // @ts-expect-error
        if (slot.mod?.status == "resolved") {
          // @ts-expect-error
          equipped_sp += slot.mod.value.system.sp;
          // @ts-ignore
          equipped_ai += slot.mod.value.system.tags.some(t => t.is_ai) ? 1 : 0;
          // @ts-expect-error
          if (slot.weapon?.value) {
            // @ts-expect-error
            slot.weapon.value.system.mod = slot.mod.value;
          }
        }
      }
    }

    // Initialize loadout statistics. Maxs will be fixed by active effects
    this.loadout.sp = { max: 0, min: 0, value: equipped_sp };
    this.loadout.ai_cap = { max: 1, min: 0, value: equipped_ai };
    this.loadout.limited_bonus = 0;

    // Other misc
    this.overcharge_sequence = DEFAULT_OVERCHARGE_SEQUENCE;
    this.level = 0;
    this.grit = 0;
    this.stress_repair_cost = 2;
    this.structure_repair_cost = 2;
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
