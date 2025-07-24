import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { getHistory } from "../../../util/misc";
import { DamageHudData, DamageHudTarget } from "../../damage";
import { DamageHudCheckboxPluginData, DamageHudPluginCodec } from "./plugin";
import { DamageData } from "../../../models/bits/damage";
import { DamageType } from "../../../enums";
import { SampleTalent } from "./sampleTalent";
import { BoundedNum } from "../../../source-template";

function isDangerZone(heat?: BoundedNum): boolean {
  if (heat == undefined || heat.max === undefined) return false;

  return heat.value >= heat.max / 2;
}

//Automated
export class Nuke_1 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Aggressive Heat Bleed", "-");
  slug: string = slugify("Aggressive Heat Bleed", "-");
  humanLabel: string = "Aggressive Heat Bleed";
  quickReference: string = "+2";
  tooltip: string = "The first attack roll you make on your turn while in the Danger Zone deals +2 Heat on a hit.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Nuke_1, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_1);
  }

  modifyDamages(damages: { damage: DamageData[]; bonusDamage: DamageData[] }): {
    damage: DamageData[];
    bonusDamage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonusDamage.slice();

    bonusDamageSlice.push({ type: DamageType.Heat, val: "2" });
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
  talent(data: DamageHudData, target?: DamageHudTarget): boolean {
    if (!data.lancerActor?.is_mech()) return false;

    const recentActions = getHistory()?.getCurrentTurn(data.lancerActor.id)?.actions ?? [];
    const dangerZoneAttacks = recentActions.filter(action => {
      return isDangerZone(action.heat);
    });
    if (dangerZoneAttacks.length > 1) return false;

    if (!isDangerZone(data.lancerActor.system.heat)) return false;

    return true;
  }
}

//Automated
export class Nuke_2 extends SampleTalent implements DamageHudCheckboxPluginData {
  //Shared type requirements
  //slugify here to make sure the slug is same across this plugin and TalentWindow.svelte
  static slug: string = slugify("Fusion Hemorrhage", "-");
  slug: string = slugify("Fusion Hemorrhage", "-");
  humanLabel: string = "Fusion Hemorrhage";
  quickReference: string = "1d6";
  tooltip: string =
    "The first ranged or melee attack roll you make on your turn while in the Danger Zone deals Energy instead of Kinetic or Explosive and additionally deals +1d6 Energy bonus damage on a hit.";

  //AccDiffHudPlugin requirements
  // the codec lets us know how to persist whatever data you need for rerolls
  static get codec(): DamageHudPluginCodec<Nuke_2, unknown, unknown> {
    return enclass(this.schemaCodec, Nuke_2);
  }

  modifyDamages(
    damages: { damage: DamageData[]; bonusDamage: DamageData[] },
    target?: DamageHudTarget
  ): {
    damage: DamageData[];
    bonusDamage: DamageData[];
  } {
    if (!this.active) return damages;

    console.log("NucCav2");

    //NucCav 2 only applies bonus damage to first target
    if (this.data?.targets !== undefined && this.data?.targets.length > 0) {
      const firstTargetId = this.data.targets[0].target.id;
      console.log(firstTargetId);
      console.log(target?.target.id);
      if (firstTargetId !== target?.target.id) return damages;
    }

    const convertDamage = (damage: DamageData) => {
      if (damage.type === DamageType.Explosive || damage.type === DamageType.Kinetic) {
        damage.type = DamageType.Energy;
      }
      return damage;
    };

    let damageSlice = damages.damage.slice().map(convertDamage);
    let bonusDamageSlice = damages.bonusDamage.slice().map(convertDamage);

    bonusDamageSlice.push({ type: DamageType.Energy, val: "1d6" });
    console.log(bonusDamageSlice);
    return {
      damage: damageSlice,
      bonusDamage: bonusDamageSlice,
    };
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
  talent(data: DamageHudData, target?: DamageHudTarget): boolean {
    if (!data.lancerActor?.is_mech()) return false;

    const recentActions = getHistory()?.getCurrentTurn(data.lancerActor.id)?.actions ?? [];
    const dangerZoneAttacks = recentActions.filter(action => {
      if (action.type === "attack") return false;
      return isDangerZone(action.heat);
    });
    if (dangerZoneAttacks.length > 1) return false;

    if (!isDangerZone(data.lancerActor.system.heat)) return false;

    return true;
  }

  isVisible(data: DamageHudData, target?: DamageHudTarget): boolean {
    //This talent does not apply to tech attacks
    if (data.base.tech) return false;

    return true;
  }
}
