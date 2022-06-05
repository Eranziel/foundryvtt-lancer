import { ActiveEffectDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData";
import { 
    Range, 
    Damage,
    WeaponType,
    WeaponSize,
    DamageTypeChecklist, 
    PackedBonusData, 
    RangeTypeChecklist, 
    WeaponSizeChecklist, 
    WeaponTypeChecklist, 
    MechWeapon,
    Bonus
} from "machine-mind";
import { LancerActorType } from "../actor/lancer-actor";
import { LancerActiveEffectConstructorData, LancerEffectTarget } from "./lancer-active-effect";



// Converts a single bonus to a single active effect
export function convert_bonus(label: string, bonus: PackedBonusData): null | LancerActiveEffectConstructorData {
    let changes: Required<LancerActiveEffectConstructorData["changes"]> = [];
    let disabled = false;
    let target_type: LancerEffectTarget | undefined = undefined;
    // First try to infer the target type.
    switch(bonus.id) {
        // We don't yet verify points
        // case "skill_point":
        // case "mech_skill_point":
        // case "talent_point":
        // case "license_point":
        // case "cb_point":
        // We don't yet support verifying pilot gear
        // case "pilot_gear":
        case "range":
            changes.push({
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            });
            //
            break;
        default:
            ui.notifications?.warn(`Effect ${bonus.id} not yet supported`);
            // TODO: 
            return null; // This effect is unsupported
    }

    // Compute all restrictions
    let restrictions: LancerActiveEffectConstructorData["flags"]["restrictions"] = undefined
    if (bonus.range_types) { 
        restrictions = restrictions ?? {};
        restrictions.range = Range.MakeChecklist(bonus.range_types);
    }
    if (bonus.damage_types) {
        restrictions = restrictions ?? {};
        restrictions.damage = Damage.MakeChecklist(bonus.damage_types);
    }
    if (bonus.weapon_sizes) {
        restrictions = restrictions ?? {};
        restrictions.weapon_size = MechWeapon.MakeSizeChecklist(bonus.weapon_sizes);
    }
    if (bonus.weapon_types) {
        restrictions = restrictions ?? {};
        restrictions.weapon_type = MechWeapon.MakeTypeChecklist(bonus.weapon_types);
    }

    return {
        label,
        flags: {
            restrictions,
        },
        changes,
        transfer: true,
        disabled: false
    };
}