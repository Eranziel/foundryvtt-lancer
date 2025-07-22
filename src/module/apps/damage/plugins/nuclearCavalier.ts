import { enclass } from "../../serde";
import { slugify } from "../../../util/lid";
import { getHistory, isTech } from "../../../util/misc";
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

  modifyDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    let damageSlice = damages.damage.slice();
    let bonusDamageSlice = damages.bonus_damage.slice();

    damageSlice.push({ type: DamageType.Heat, val: "2" });
    return {
      damage: damageSlice,
      bonus_damage: bonusDamageSlice,
    };
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Nuke_1 {
    let ret = new Nuke_1();
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

  modifyDamages(damages: { damage: DamageData[]; bonus_damage: DamageData[] }): {
    damage: DamageData[];
    bonus_damage: DamageData[];
  } {
    if (!this.active) return damages;

    const convertDamage = (damage: DamageData) => {
      if (damage.type === DamageType.Explosive || damage.type === DamageType.Kinetic) {
        damage.type = DamageType.Energy;
      }
      return damage;
    };

    let damageSlice = damages.damage.slice().map(convertDamage);
    let bonusDamageSlice = damages.bonus_damage.slice().map(convertDamage);

    bonusDamageSlice.push({ type: DamageType.Energy, val: "1d6" });
    return {
      damage: damageSlice,
      bonus_damage: bonusDamageSlice,
    };
  }

  //perTarget because we have to know where the token is
  //Perhaps don't initialize at all if talent not applicable?
  static perUnknownTarget(): Nuke_2 {
    let ret = new Nuke_2();
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
    console.log(data);
    console.log(target);

    //This talent does not apply to tech attacks
    if (isTech(data.lancerItem ?? null, data.title)) return false;

    return true;
  }
}
