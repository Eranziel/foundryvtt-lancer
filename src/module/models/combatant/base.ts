import fields = foundry.data.fields;

namespace LancerCombatantModel {
  export interface Schema extends DataSchema {
    activations: fields.SchemaField<{
      value: fields.NumberField<{ integer: true }>;
      max: fields.NumberField<{ integer: true }>;
    }>;
    disposition: fields.NumberField;
  }
}

export class LancerCombatantModel extends foundry.abstract.TypeDataModel<LancerCombatantModel.Schema, Combatant> {
  static defineSchema(): LancerCombatantModel.Schema {
    return {
      activations: new fields.SchemaField({
        value: new fields.NumberField({ integer: true }),
        max: new fields.NumberField({ integer: true }),
      }),
      disposition: new fields.NumberField(),
    };
  }

  prepareBaseData(): void {
    this.activations.max ??= foundry.utils.getProperty(this.parent.actor?.getRollData() ?? {}, "activations") ?? 1;
    this.activations.value ??= this.parent.combat?.started ? this.activations.max : 0;
  }
}
