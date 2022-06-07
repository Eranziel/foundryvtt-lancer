import { CounterField } from "../bits/counter";
import { DamageField } from "../bits/damage";
import { BoundedNumberField, LIDField } from "../shared";
const fields: any = foundry.data.fields;

/**
 * Holds any bonuses that can't be accomplished just by direct application of active effects to the actor
 */
interface BonusesMap { // wip
    bonus_range: number;
    bonus_damage: string;
    bonus_tags: string[]; // List of LID's of tags to add. Should only really be used with conditional / temporary things
    // ... Todo
}

/**
 * Tracks core statuses, and allows for active effects to easily and non-exclusively apply impaired.
 * We use the names of keys from lancer-data, but with dashes removed
 */
export interface StatConMap { // wip
    // statuses
    dangerzone: boolean;
    downandout: boolean;
    engaged: boolean;
    exposed: boolean;
    invisible: boolean;
    prone: boolean;
    shutdown: boolean;

    // conditions
    immobilized: boolean;
    impaired: boolean;
    jammed: boolean;
    lockon: boolean;
    shredded: boolean;
    slow: boolean;
    stunned: boolean;
}

// We implement our templates here
export function template_universal_actor() {
  return {
    lid: new LIDField(),
    hp: new BoundedNumberField(),
    overshield: new BoundedNumberField(),
    burn: new fields.NumberField({ min: 0, integer: true, nullable: false }),

    resistances: new fields.SchemaField({
      "Kinetic": new fields.BooleanField(),
      "Energy": new fields.BooleanField(),
      "Explosive": new fields.BooleanField(),
      "Heat": new fields.BooleanField(),
      "Burn": new fields.BooleanField(),
      "Variable": new fields.BooleanField()
    }),

    custom_counters: new fields.ArrayField(new CounterField())
  }
}

export function template_action_tracking() {
  return {
    activations: new fields.NumberField({integer: true, nullable: false, min: 1}),
    actions: new fields.SchemaField({
      protocol: new fields.BooleanField(),
      move: new fields.NumberField({min: 0, integer: true, nullable: false}),
      full: new fields.BooleanField(),
      quick: new fields.BooleanField(),
      reaction: new fields.BooleanField(),
      used_reactions: new fields.ArrayField(new fields.StringField({nullable: false})) // lids
    })
  };
}

export function template_bonuses() {
  return {
    bonuses: new fields.SchemaField({
      attack: new fields.NumberField({integer: true, nullable: false}),
      damage: new fields.ArrayField(new DamageField())
    })
  };
}

export function template_heat() {
  return {
    stress: new BoundedNumberField(),
  };
}

export function template_statuses() {
  return {
    statuses: new fields.SchemaField({
      dangerzone: new fields.BooleanField(),
      downandout: new fields.BooleanField(),
      engaged: new fields.BooleanField(),
      exposed: new fields.BooleanField(),
      invisible: new fields.BooleanField(),
      prone: new fields.BooleanField(),
      shutdown: new fields.BooleanField(),
      immobilized: new fields.BooleanField(),
      impaired: new fields.BooleanField(),
      jammed: new fields.BooleanField(),
      lockon: new fields.BooleanField(),
      shredded: new fields.BooleanField(),
      slow: new fields.BooleanField(),
      stunned: new fields.BooleanField()
    })
  };
}

export function template_struss() {
  return {
    stress: new BoundedNumberField(),
    structure: new BoundedNumberField(),
  };
}

