import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "../../damage";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { AbstractTalent } from "./abstractTalent";
import { BoundedNum } from "../../../source-template";
import { TotalDamage } from "../data";

function isDangerZone(heat?: BoundedNum): boolean {
  if (heat == undefined || heat.max === undefined) return false;

  return heat.value >= heat.max / 2;
}

//Automated
export class Nuke_1 extends AbstractTalent implements DamageHudCheckboxPluginData {
  //Plugin state
  // This plugin can exist in multiple plugins objects.
  // Pressing the checkbox for one should activate all.
  static active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Aggressive Heat Bleed", "-");
  slug: string = slugify("Aggressive Heat Bleed", "-");
  lid: string = "t_nuclear_cavalier";
  talentRank: number = 1;
  humanLabel: string = "Aggressive Heat Bleed";
  quickReference: string = "+2";
  tooltip: string = "The first attack roll you make on your turn while in the Danger Zone deals +2 Heat on a hit.";

  get uiState(): boolean {
    return Nuke_1.active;
  }
  set uiState(data: boolean) {
    Nuke_1.active = data;

    console.log("BEING SET, active = " + Nuke_1.active);
  }

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Nuke_1, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_1);
  }

  modifyDamages(damages: TotalDamage, target?: DamageHudTarget): TotalDamage {
    if (!Nuke_1.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonusDamage.slice();

    if (target !== undefined) {
      //Avoid adding bonus damage when this is called in base by adding it here
      bonusDamageSlice.push({ type: DamageType.Heat, val: "2" });

      //NucCav 1 only applies bonus damage to first target
      if (this.data !== undefined && this.data.targets.length > 1) {
        const firstTargetId = this.data.targets[0].target.id;
        if (firstTargetId !== target?.target.id) return damages;
      }
    }

    return {
      damage: damageSlice,
      bonusDamage: bonusDamageSlice,
    };
  }

  static perUnknownTarget(): Nuke_1 {
    let ret = new Nuke_1();
    return ret;
  }
  static perTarget(item: Token): Nuke_1 {
    let ret = Nuke_1.perUnknownTarget();
    return ret;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget) {
    if (!data.lancerActor?.is_mech()) return;

    const recentActions = getHistory()?.getCurrentTurn(data.lancerActor.id)?.actions ?? [];
    const dangerZoneAttacks = recentActions.filter(action => {
      return isDangerZone(action.heat);
    });
    if (dangerZoneAttacks.length > 1) return;

    if (!isDangerZone(data.lancerActor.system.heat)) return;

    Nuke_1.active = true;
  }
}

//Automated
export class Nuke_2 extends AbstractTalent implements DamageHudCheckboxPluginData {
  //Plugin state
  // This plugin can exist in multiple plugins objects.
  // Pressing the checkbox for one should activate all.
  static active: boolean = false;

  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Fusion Hemorrhage", "-");
  slug: string = slugify("Fusion Hemorrhage", "-");
  lid: string = "t_nuclear_cavalier";
  talentRank: number = 2;
  humanLabel: string = "Fusion Hemorrhage";
  quickReference: string = "1d6";
  tooltip: string =
    "The first ranged or melee attack roll you make on your turn while in the Danger Zone deals Energy instead of Kinetic or Explosive and additionally deals +1d6 Energy bonus damage on a hit.";

  get uiState(): boolean {
    return Nuke_2.active;
  }
  set uiState(data: boolean) {
    Nuke_2.active = data;

    console.log("BEING SET, active = " + Nuke_2.active);
  }

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Nuke_2, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_2);
  }

  modifyDamages(damages: TotalDamage, target?: DamageHudTarget): TotalDamage {
    if (!Nuke_2.active) return damages;

    const convertDamage = (damage: DamageData) => {
      if (damage.type === DamageType.Explosive || damage.type === DamageType.Kinetic) {
        damage.type = DamageType.Energy;
      }
      return damage;
    };

    let damageSlice = damages.damage.slice().map(convertDamage);
    let bonusDamageSlice = damages.bonusDamage.slice().map(convertDamage);

    if (target !== undefined) {
      //Avoid adding bonus damage when this is called in base by adding it here
      bonusDamageSlice.push({ type: DamageType.Energy, val: "1d6" });

      //NucCav 2 only applies bonus damage to first target
      if (this.data !== undefined && this.data.targets.length > 1) {
        const firstTargetId = this.data.targets[0].target.id;
        if (firstTargetId !== target?.target.id) return damages;
      }
    }

    return {
      damage: damageSlice,
      bonusDamage: bonusDamageSlice,
    };
  }

  //We do need to do all three to make sure all damage is converted when applicable
  static perRoll(): Nuke_2 {
    let ret = new Nuke_2();
    return ret;
  }
  static perUnknownTarget(): Nuke_2 {
    let ret = new Nuke_2();
    return ret;
  }
  static perTarget(item: Token): Nuke_2 {
    let ret = Nuke_2.perUnknownTarget();
    return ret;
  }

  //The unique logic of the talent
  talent(data: DamageHudData, target?: DamageHudTarget) {
    if (!data.lancerActor?.is_mech()) return false;

    const recentActions = getHistory()?.getCurrentTurn(data.lancerActor.id)?.actions ?? [];
    const dangerZoneAttacks = recentActions.filter(action => {
      if (action.type === "attack") return false;
      return isDangerZone(action.heat);
    });
    if (dangerZoneAttacks.length > 1) return;

    if (!isDangerZone(data.lancerActor.system.heat)) return;

    Nuke_2.active = true;
  }

  get visible(): boolean {
    //Should really be an error
    if (this.data === undefined) return false;

    //This talent does not apply to tech attacks
    if (this.data.base.tech) return false;

    //It's complicated
    if (this.data.targets.length > 1) return false;

    return true;
  }
}
