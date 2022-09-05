/*
import { Bonus, Damage, MechWeapon } from "@src/class";
import type {
    AnyRegNpcFeatureData,
    BaseRegNpcFeatureData,
    INpcClassStats,
    INpcStats,
    PackedOrganizationData,
    RegBonusData,
    RegCoreBonusData,
    RegCoreSystemData,
    RegDeployableData,
    RegFrameData,
    RegFrameTraitData,
    RegLicenseData,
    RegManufacturerData,
    RegMechData,
    RegMechLoadoutData,
    RegMechSystemData,
    RegMechWeaponData,
    RegMechWeaponProfile,
    RegNpcClassData,
    RegNpcData,
    RegNpcReactionData,
    RegNpcSystemData,
    RegNpcTechData,
    RegNpcTemplateData,
    RegNpcTraitData,
    RegNpcWeaponData,
    RegPilotArmorData,
    RegPilotData,
    RegPilotGearData,
    RegPilotLoadoutData,
    RegPilotWeaponData,
    RegQuirkData,
    RegReserveData,
    RegSkillData,
    RegTalentData,
    RegTalentRank,
    RegWeaponModData,
    RegWepMountData,
    RegActionData,
    RegTagTemplateData,
    RegStatusData,
    RegEnvironmentData,
    RegFactionData,
    RegSitrepData,
    RegOrganizationData
} from "@src/interface";
import { EntryType, RegEntryTypes } from "@src/registry";
import { nanoid } from "nanoid";
import {
    ActivationType,
    DamageType,
    FrameEffectUse,
    RangeType,
    ReserveType,
    SystemType,
    WeaponSize,
    WeaponType,
    SkillFamily,
    OrgType,
    NpcFeatureType,
    MountType,
    NpcTechType,
} from "@src/enums";
import { DEFAULT_ACTION_NAME, CC_VERSION, DEFAULT_COLOR, DEFAULT_DESCRIPTION, DEFAULT_ICON, DEFAULT_LOGO } from "../consts";
import { DeployableType } from "./Deployable";


// Our default bonus basically does nothing but allows everything
export function BONUS(): RegBonusData {
    return {
        lid: "unknown",
        val: "0",
        overwrite: false,
        replace: false,
        damage_types: {
            Burn: true,
            Energy: true,
            Explosive: true,
            Heat: true,
            Kinetic: true,
            Variable: true,
        },
        range_types: {
            Blast: true,
            Burst: true,
            Cone: true,
            Line: true,
            Range: true,
            Threat: true,
            Thrown: true,
        },
        weapon_sizes: {
            Auxiliary: true,
            Heavy: true,
            Main: true,
            Superheavy: true,
        },
        weapon_types: {
            CQB: true,
            Cannon: true,
            Launcher: true,
            Melee: true,
            Nexus: true,
            Rifle: true,
        },
    };
}

export function ACTION(): RegActionData {
    return {
        lid: "act_" + nanoid(),
        activation: ActivationType.Quick,
        detail: DEFAULT_DESCRIPTION,
        name: DEFAULT_ACTION_NAME,
        confirm: ["CONFIRM"],
        cost: 1,
        frequency: "",
        heat_cost: 0,
        hide_active: false,
        ignore_used: false,
        init: "",
        damage: [],
        range: [],
        log: "",
        mech: true,
        pilot: true,
        synergy_locations: [],
        terse: "Terse Description",
        trigger: ""
    };
}

export function CORE_BONUS(): RegCoreBonusData {
    return {
        actions: [],
        bonuses: [],
        synergies: [],
        counters: [],
        deployables: [],
        description: DEFAULT_DESCRIPTION,
        integrated: [],
        name: "New Core Bonus",
        effect: "",
        lid: "cb_" + nanoid(),
        mounted_effect: "",
        source: null,
    };
}

export function CORE_SYSTEM(): RegCoreSystemData {
    return {
        name: "New Core System",
        description: DEFAULT_DESCRIPTION,
        use: FrameEffectUse.Unknown,

        activation: ActivationType.Quick,
        active_name: "Core Active",
        active_effect: "",
        active_actions: [],
        active_bonuses: [],
        active_synergies: [],
        deactivation: ActivationType.None,

        counters: [],
        deployables: [],
        integrated: [],
        passive_actions: [],
        passive_effect: "",
        passive_name: "Core Passive",
        passive_bonuses: [],
        passive_synergies: [],
        tags: [],
    };
}

export function DEPLOYABLE(): RegDeployableData {
    return {
        lid: "dep_" + nanoid(),
        actions: [],
        bonuses: [],
        counters: [],
        synergies: [],
        tags: [],
        activation: ActivationType.None,
        armor: 0,
        cost: 1,
        instances: 1,
        hp: 0,
        heat: 0,
        deactivation: ActivationType.None,
        detail: "",
        edef: 0,
        evasion: 0,
        heatcap: 0,
        max_hp: 0,
        name: "New Deployable",
        overshield: 0,
        recall: ActivationType.None,
        redeploy: ActivationType.None,
        repcap: 0,
        save: 0,
        sensor_range: 0,
        size: 1,
        speed: 0,
        tech_attack: 0,
        type: DeployableType.Deployable,
        resistances: Damage.MakeChecklist([]),
        avail_unmounted: false,
        avail_mounted: true,
        deployer: null,
        burn: 0,
    };
}

export function ENVIRONMENT(): Required<RegEnvironmentData> {
    return {
        description: DEFAULT_DESCRIPTION,
        lid: "env_" + nanoid(),
        name: "New Environment",
    };
}

export function FACTION(): Required<RegFactionData> {
    return {
        color: DEFAULT_COLOR,
        description: DEFAULT_DESCRIPTION,
        lid: "fac_" + nanoid(),
        logo: DEFAULT_LOGO,
        name: "New Faction",
        logo_url: "",
    };
}

export function FRAME_TRAIT(): RegFrameTraitData {
    return {
        actions: [],
        bonuses: [],
        counters: [],
        synergies: [],
        deployables: [],
        integrated: [],
        description: DEFAULT_DESCRIPTION,
        name: "New Frame Trait",
        use: FrameEffectUse.Unknown,
    };
}

export function FRAME(): RegFrameData {
    return {
        description: DEFAULT_DESCRIPTION,
        lid: "mf_" + nanoid(),
        license_level: 2,
        mechtype: ["BALANCED"],
        mounts: [],
        name: "New Mech",
        license: "UNKNOWN",
        source: null,
        stats: {
            armor: 0,
            edef: 8,
            evasion: 8,
            heatcap: 5,
            hp: 8,
            repcap: 5,
            save: 10,
            sensor_range: 10,
            size: 1,
            sp: 5,
            speed: 5,
            stress: 4,
            structure: 4,
            tech_attack: 0,
        },
        traits: [],
        y_pos: 0,
        core_system: CORE_SYSTEM(),
        image_url: "",
        other_art: [],
    };
}

export function LICENSE(): RegLicenseData {
    return {
        lid: "lic_" + nanoid(),
        key: "UNKNOWN",
        manufacturer: null,
        name: "New License",
        rank: 0,
    };
}

export function MANUFACTURER(): RegManufacturerData {
    return {
        dark: "#000000",
        description: DEFAULT_DESCRIPTION,
        lid: "man_" + nanoid(),
        light: "#EEEEEE",
        logo: DEFAULT_LOGO,
        name: "New Manufacturer",
        quote: "We sell mechs and mech accessories",
        logo_url: ""
    };
}

export function MECH(): RegMechData {
    return {
        burn: 0,
        cc_ver: CC_VERSION,
        cloud_portrait: "",
        core_active: false,
        core_energy: 1,
        heat: 0,
        hp: 0,
        overcharge: 0,
        repairs: 0,
        stress: 0,
        structure: 0,
        ejected: false,
        gm_note: "",
        lid: "mech_" + nanoid(),
        loadout: {
            frame: null,
            system_mounts: [],
            weapon_mounts: [],
        },
        meltdown_imminent: false,
        name: "New Mech",
        notes: "",
        overshield: 0,
        pilot: null,
        portrait: "",
        reactions: [],
        resistances: {
            Variable: false,
            Kinetic: false,
            Heat: false,
            Explosive: false,
            Energy: false,
            Burn: false,
        },
    };
}

export function MECH_LOADOUT(): RegMechLoadoutData {
    return {
        frame: null,
        system_mounts: [],
        weapon_mounts: [],
    };
}

export function MECH_WEAPON(): RegMechWeaponData {
    return {
        cascading: false,
        deployables: [],
        destroyed: false,
        lid: "mw_" + nanoid(),
        integrated: [],
        license: "",
        license_level: 0,
        name: "New Mech Weapon",
        source: null,
        sp: 0,
        uses: 0,
        profiles: [WEAPON_PROFILE()],
        no_attack: false,
        no_bonuses: false,
        no_core_bonuses: false,
        no_mods: false,
        no_synergies: false,
        loaded: false,
        selected_profile: 0,
        size: WeaponSize.Main,
    };
}

export function MECH_SYSTEM(): RegMechSystemData {
    return {
        cascading: false,
        counters: [],
        deployables: [],
        destroyed: false,
        effect: "",
        lid: "ms_" + nanoid(),
        integrated: [],
        license: "",
        license_level: 0,
        name: "New Mech System",
        source: null,
        tags: [],
        sp: 0,
        uses: 0,
        actions: [],
        bonuses: [],
        synergies: [],
        description: DEFAULT_DESCRIPTION,
        type: SystemType.System,
    };
}

export function NPC(): RegNpcData {
    return {
        hp: 0,
        heat: 0,
        burn: 0,
        campaign: "",
        cloudImage: "",
        custom_counters: [],
        defeat: "",
        destroyed: false,
        lid: "npc_" + nanoid(),
        labels: [],
        localImage: "",
        name: "New Npc",
        note: "",
        overshield: 0,
        resistances: Damage.MakeChecklist([]),
        side: "Enemy",
        subtitle: "",
        tag: "",
        tier: 1,
        stress: 1,
        structure: 1,
    };
}

export function NPC_CLASS(): RegNpcClassData {
    return {
        lid: "npcc_" + nanoid(),
        name: "New Npc Class",
        base_features: [],
        base_stats: NPC_CLASS_STATS(),
        info: {
            tactics: "No tactics provided",
            flavor: "No flavor provided",
        },
        optional_features: [],
        power: 0,
        role: "UNKNOWN",
    };
}

export function NPC_FEATURE(): AnyRegNpcFeatureData {
    return NPC_TRAIT();
}

function npc_feature_commons(): BaseRegNpcFeatureData {
    return {
        lid: "npcf_" + nanoid(),
        name: "New Npc Feature",
        origin: {
            base: false,
            name: "UNKNOWN",
            type: "Class", // just guess
        },
        tags: [],
        type: NpcFeatureType.Trait,
        bonus: {},
        effect: "No Effect",
        override: {},
        charged: true,
        uses: 0,
        loaded: true,
        destroyed: false,
        tier_override: 0,
    };
}

export function NPC_TECH(): RegNpcTechData {
    return {
        ...npc_feature_commons(),
        name: "New NPC Tech",
        type: NpcFeatureType.Tech,
        accuracy: [],
        attack_bonus: [],
        tech_type: NpcTechType.Quick,
    };
}

export function NPC_WEAPON(): RegNpcWeaponData {
    return {
        ...npc_feature_commons(),
        name: "New NPC Tech",
        type: NpcFeatureType.Weapon,
        accuracy: [0, 0, 0],
        attack_bonus: [0, 0, 0],
        weapon_type: "Unknown",
        damage: [
            [
                {
                    type: DamageType.Kinetic,
                    val: "1",
                },
            ],
            [
                {
                    type: DamageType.Kinetic,
                    val: "2",
                },
            ],
            [
                {
                    type: DamageType.Kinetic,
                    val: "3",
                },
            ],
        ],
        range: [
            {
                type: RangeType.Range,
                val: "5",
            },
            {
                type: RangeType.Range,
                val: "10",
            },
            {
                type: RangeType.Range,
                val: "15",
            },
        ],
        on_hit: "",
    };
}

export function NPC_REACTION(): RegNpcReactionData {
    return {
        ...npc_feature_commons(),
        name: "New NPC Reaction",
        trigger: "Undefined trigger",
        type: NpcFeatureType.Reaction,
    };
}

export function NPC_TRAIT(): RegNpcTraitData {
    return {
        ...npc_feature_commons(),
        name: "New NPC Trait",
        type: NpcFeatureType.Trait,
    };
}

export function NPC_SYSTEM(): RegNpcSystemData {
    return {
        ...npc_feature_commons(),
        name: "New NPC System",
        type: NpcFeatureType.System,
    };
}

export function NPC_TEMPLATE(): RegNpcTemplateData {
    return {
        lid: "npct_" + nanoid(),
        base_features: [],
        description: DEFAULT_DESCRIPTION,
        name: "New Npc Template",
        optional_features: [],
        power: 0,
    };
}

export function NPC_CLASS_STATS(): Required<INpcClassStats> {
    return {
        activations: [1, 1, 1],
        agility: [0, 0, 0],
        armor: [0, 0, 0],
        edef: [0, 0, 0],
        engineering: [0, 0, 0],
        evade: [5, 5, 5],
        heatcap: [5, 5, 5],
        hp: [10, 10, 10],
        hull: [0, 0, 0],
        save: [0, 0, 0],
        sensor: [10, 10, 10],
        size: [[1], [1], [1]],
        speed: [5, 5, 5],
        systems: [0, 0, 0],
        stress: [1, 1, 1],
        structure: [1, 1, 1],
    };
}

export function NPC_STATS(): Required<INpcStats> {
    return {
        activations: 0,
        agility: 0,
        armor: 0,
        edef: 0,
        engineering: 0,
        evade: 0,
        heatcap: 0,
        hp: 0,
        hull: 0,
        save: 0,
        sensor: 0,
        size: 0,
        speed: 0,
        systems: 0,
        stress: 0,
        structure: 0,
        sizes: [1, 1, 1],
        reactions: [],
    };
}

export function ORGANIZATION(): Required<RegOrganizationData> {
    return {
        actions: "",
        description: DEFAULT_DESCRIPTION,
        efficiency: 0,
        influence: 0,
        name: "New Organization",
        purpose: OrgType.Academic, // Just the alphabetic first
        lid: "ord_" + nanoid()
    };
}

export function PILOT_GEAR(): RegPilotGearData {
    return {
        actions: [],
        bonuses: [],
        deployables: [],
        description: DEFAULT_DESCRIPTION,
        uses: 0,
        lid: "pg_" + nanoid(),
        name: "New Gear",
        synergies: [],
        tags: [],
    };
}

export function PILOT_ARMOR(): RegPilotArmorData {
    // Provides the basic bonus stat info
    return {
        ...PILOT_GEAR(),
        name: "New Armor",
        bonuses: [
            Bonus.generate("pilot_hp", 3, true).save(),
            Bonus.generate("pilot_evasion", 3, true).save(),
            Bonus.generate("pilot_edef", 3, true).save(),
            Bonus.generate("pilot_speed", 3, true).save(),
            Bonus.generate("pilot_armor", 0, true).save(),
        ],
    };
}

export function PILOT_WEAPON(): RegPilotWeaponData {
    // Provides the basic bonus stat info
    return {
        ...PILOT_GEAR(),
        name: "New Pilot Weapon",
        range: [
            {
                type: RangeType.Range,
                val: "5",
            },
        ],
        damage: [
            {
                type: DamageType.Kinetic,
                val: "1d3",
            },
        ],
        effect: "",
        loaded: true,
    };
}

export function PILOT(): RegPilotData {
    return {
        name: "New Pilot",
        active_mech: null,
        background: "",
        callsign: "",
        campaign: "",
        cc_ver: CC_VERSION,
        cloudID: "",
        cloudOwnerID: "",
        cloud_portrait: "",
        hp: 0,
        custom_counters: [],
        group: "",
        history: "",
        lid: "pilot_" + nanoid(),
        lastCloudUpdate: "",
        level: 0,
        loadout: {
            lid: "loadout_" + nanoid(),
            name: "Foundry Loadout",
            armor: [null],
            gear: [null, null, null],
            weapons: [null, null],
            extendedGear: [null, null],
            extendedWeapons: [null],
        },
        mechSkills: [0, 0, 0, 0],
        mounted: false,
        notes: "",
        player_name: "",
        portrait: "",
        sort_index: 0,
        status: "",
        text_appearance: "",
        overshield: 0,
        burn: 0,
        resistances: Damage.MakeChecklist([])
    };
}

export function PILOT_LOADOUT(): RegPilotLoadoutData {
    return {
        armor: [null],
        extendedGear: [null, null],
        extendedWeapons: [null, null],
        gear: [null, null, null],
        lid: "ploadout_" + nanoid(),
        name: "Foundry Loadout",
        weapons: [null, null],
    };
}

export function RESERVE(): RegReserveData {
    return {
        name: "New Reserve",
        consumable: true,
        counters: [],
        integrated: [],
        label: "",
        resource_name: "",
        resource_note: "",
        resource_cost: "",
        type: ReserveType.Resources,
        used: false,
        actions: [],
        bonuses: [],
        deployables: [],
        description: DEFAULT_DESCRIPTION,
        lid: "res_" + nanoid(),
        synergies: [],
    };
}

export function SITREP(): Required<RegSitrepData> {
    return {
        description: DEFAULT_DESCRIPTION,
        enemyVictory: "The enemy wins when ___",
        lid: "sit_" + nanoid(),
        name: "New Sitrep",
        pcVictory: "The PCs win when ___",
        controlZone: "",
        deployment: "",
        extraction: "",
        noVictory: "",
        objective: "",
    };
}

export function SKILL(): RegSkillData {
    return {
        lid: "sk_" + nanoid(),
        description: "No description",
        detail: "",
        family: SkillFamily.cha,
        name: "New Skill",
        rank: 1,
    };
}

export function STATUS(): Required<RegStatusData> {
    return {
        lid: "cond_" + nanoid(),
        effects: "Unknown effect",
        terse: "Unknown",
        icon: DEFAULT_ICON,
        name: "New Status/Condition",
        type: "Status",
    };
}

export function TAG_TEMPLATE(): Required<RegTagTemplateData> {
    return {
        description: DEFAULT_DESCRIPTION,
        lid: "tg_" + nanoid(),
        name: "New Tag",
        hidden: false,
        filter_ignore: false,
    };
}

export function TALENT(): RegTalentData {
    return {
        curr_rank: 1,
        description: DEFAULT_DESCRIPTION,
        icon: DEFAULT_ICON,
        lid: "t_" + nanoid(),
        name: "New Talent",
        ranks: [TALENT_RANK(), TALENT_RANK(), TALENT_RANK()],
        terse: "",
    };
}

export function TALENT_RANK(): RegTalentRank {
    return {
        actions: [],
        bonuses: [],
        synergies: [],
        counters: [],
        deployables: [],
        description: DEFAULT_DESCRIPTION,
        exclusive: false,
        integrated: [],
        name: "Rank X",
    };
}

export function QUIRK(): RegQuirkData {
    return {
        lid: "q_" + nanoid(),
        actions: [],
        bonuses: [],
        counters: [],
        deployables: [],
        description: DEFAULT_DESCRIPTION,
        integrated: [],
        name: "New Quirk",
        synergies: [],
    };
}

export function WEAPON_MOUNT_DATA(): RegWepMountData {
    return {
        mount_type: MountType.Main,
        slots: [],
        bracing: false
    };
}

export function WEAPON_PROFILE(): RegMechWeaponProfile {
    return {
        // ...MECH_WEAPON(),
        actions: [],
        bonuses: [],
        counters: [],
        damage: [],
        description: DEFAULT_DESCRIPTION,
        effect: "",
        name: "New Profile",
        on_attack: "",
        on_crit: "",
        on_hit: "",
        range: [],
        synergies: [],
        tags: [],
        type: WeaponType.Rifle,
        barrageable: true,
        cost: 1,
        skirmishable: true,
    };
}

export function WEAPON_MOD(): RegWeaponModData {
    return {
        added_damage: [],
        added_tags: [],
        cascading: false,
        counters: [],
        deployables: [],
        destroyed: false,
        description: DEFAULT_DESCRIPTION,
        effect: "",
        lid: "wm_" + nanoid(),
        integrated: [],
        license: "",
        license_level: 0,
        name: "New Weapon Mod",
        source: null,
        tags: [],
        sp: 0,
        uses: 0,
        allowed_sizes: MechWeapon.MakeSizeChecklist([]),
        allowed_types: MechWeapon.MakeTypeChecklist([]),
        actions: [],
        added_range: [],
        bonuses: [],
        synergies: [],
    };
}

// Provides a default function for every entrytype
const DEFAULT_FUNC_MAP: { [key in EntryType]: () => RegEntryTypes<key> } = {
    [EntryType.CORE_BONUS]: CORE_BONUS,
    [EntryType.ENVIRONMENT]: ENVIRONMENT,
    [EntryType.FACTION]: FACTION,
    [EntryType.FRAME]: FRAME,
    [EntryType.LICENSE]: LICENSE,
    [EntryType.MANUFACTURER]: MANUFACTURER,
    [EntryType.MECH_SYSTEM]: MECH_SYSTEM,
    [EntryType.MECH_WEAPON]: MECH_WEAPON,
    [EntryType.NPC]: NPC,
    [EntryType.NPC_CLASS]: NPC_CLASS,
    [EntryType.NPC_FEATURE]: NPC_FEATURE,
    [EntryType.NPC_TEMPLATE]: NPC_TEMPLATE,
    [EntryType.ORGANIZATION]: ORGANIZATION,
    [EntryType.PILOT_ARMOR]: PILOT_ARMOR,
    [EntryType.PILOT_GEAR]: PILOT_GEAR,
    [EntryType.PILOT_WEAPON]: PILOT_WEAPON,
    [EntryType.QUIRK]: QUIRK,
    [EntryType.RESERVE]: RESERVE,
    [EntryType.SITREP]: SITREP,
    [EntryType.SKILL]: SKILL,
    [EntryType.STATUS]: STATUS,
    [EntryType.TAG]: TAG_TEMPLATE,
    [EntryType.TALENT]: TALENT,
    [EntryType.WEAPON_MOD]: WEAPON_MOD,

    // The inventoried things (actors!)
    [EntryType.PILOT]: PILOT,
    [EntryType.DEPLOYABLE]: DEPLOYABLE,
    [EntryType.MECH]: MECH,
};

export function DEFAULT_FUNC_FOR<T extends EntryType>(type: T): () => RegEntryTypes<T> {
    return DEFAULT_FUNC_MAP[type] as () => RegEntryTypes<T>;
}

export function DEFAULT_FOR<T extends EntryType>(type: T): RegEntryTypes<T> {
    return DEFAULT_FUNC_MAP[type]() as RegEntryTypes<T>;
}

export function merge_defaults<T>(targ: Partial<T>, defaults: T): T {
    for(let key in defaults) {
        if(targ[key] === undefined && key in defaults) {
            targ[key] = defaults[key];
        }
    }
    return targ as T;
}
*/