import { Damage, DamageType } from "machine-mind";

export class AppliedDamage {
  public Kinetic: number;
  public Energy: number;
  public Explosive: number;
  public Burn: number;
  public Heat: number;
  public Variable: number;

  public constructor(damageData: Damage[]) {
    this.Kinetic = this.sum_damage(damageData, DamageType.Kinetic);
    this.Energy = this.sum_damage(damageData, DamageType.Energy);
    this.Explosive = this.sum_damage(damageData, DamageType.Explosive);
    this.Burn = this.sum_damage(damageData, DamageType.Burn);
    this.Heat = this.sum_damage(damageData, DamageType.Heat);
    this.Variable = this.sum_damage(damageData, DamageType.Variable);
  }

  public sum_damage(damageData: Damage[], damageType: DamageType): number {
    return damageData.reduce((sum, d) => {
      return sum + (d.DamageType === damageType ? parseInt(d.Value) : 0);
    }, 0);
  }
}
