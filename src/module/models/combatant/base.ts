import fields = foundry.data.fields;

export type LancerCombatantModelSchema = ReturnType<typeof defineLancerCombatantModelSchema>;

const defineLancerCombatantModelSchema = () => {
  return {
    activations: new fields.SchemaField({
      value: new fields.NumberField({ integer: true, nullable: false }),
      max: new fields.NumberField({ integer: true, nullable: false }),
    }),
    disposition: new fields.NumberField(),
  };
};

export class LancerCombatantModel extends foundry.abstract.TypeDataModel<
  LancerCombatantModelSchema,
  Combatant.Implementation
> {
  static defineSchema() {
    return defineLancerCombatantModelSchema();
  }

  prepareBaseData(): void {
    const activations = foundry.utils.getProperty(this.parent.actor?.getRollData() ?? {}, "activations") as number;
    this.activations.max ??= activations ?? 1;
    this.activations.value ??= this.parent.combat?.started ? this.activations.max : 0;
  }
}
