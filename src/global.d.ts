import type { LancerActionManager } from "./module/action/action-manager";
import type { AttackFlag } from "./module/flows/attack";
import type { DamageFlag } from "./module/flows/damage";
import type { DeployableModel } from "./module/models/actors/deployable";
import type { MechModel } from "./module/models/actors/mech";
import type { NpcModel } from "./module/models/actors/npc";
import type { PilotModel } from "./module/models/actors/pilot";
import type { BondModel } from "./module/models/items/bond";
import type { CoreBonusModel } from "./module/models/items/core_bonus";
import type { FrameModel } from "./module/models/items/frame";
import type { LicenseModel } from "./module/models/items/license";
import type { MechSystemModel } from "./module/models/items/mech_system";
import type { MechWeaponModel } from "./module/models/items/mech_weapon";
import type { NpcClassModel } from "./module/models/items/npc_class";
import type { NpcFeatureModel } from "./module/models/items/npc_feature";
import type { NpcTemplateModel } from "./module/models/items/npc_template";
import type { OrganizationModel } from "./module/models/items/organization";
import type { PilotArmorModel } from "./module/models/items/pilot_armor";
import type { PilotGearModel } from "./module/models/items/pilot_gear";
import type { PilotWeaponModel } from "./module/models/items/pilot_weapon";
import type { ReserveModel } from "./module/models/items/reserve";
import type { SkillModel } from "./module/models/items/skill";
import type { StatusModel } from "./module/models/items/status";
import type { TalentModel } from "./module/models/items/talent";
import type { WeaponModModel } from "./module/models/items/weapon_mod";
import type {
  ActionTrackerOptions,
  AutomationOptions,
  CombatTrackerAppearance,
  StatusIconConfigOptions,
} from "./module/settings";
import type { TerrainHeightToolsAPI } from "./types/terrain-height-tools";

interface LancerInitiativeConfig<T extends string = string> {
  /**
   * Filepath to the handlebars template for LancerCombatTracker. Can be
   * omitted if LancerCombatTracker is not used.
   */
  templatePath?: string;
  /**
   * Whether to enable the initiative rolling buttons in the tracker. Only
   * needed if LancerCombatTracker or a subclass is used for the tracker and
   * intitaitve rolling is wanted.
   * @defaultValue `false`
   */
  enable_initiative?: boolean;
  /**
   * Whether to sort the displayed combat tracker based on activation status.
   * If enabled, the active unit is displayed on the top and units that have
   * used all their activations are sorted to the bottom. Only needed if
   * LancerCombatTracker or a subclass is used and sorting is not wanted, or
   * the ability to toggle it is desired.
   * @defaultValue `true`
   */
  sort?: boolean;
}

declare global {
  // Since we never use these before `init` tell league types that they are
  // never undefined
  interface LenientGlobalVariableTypes {
    game: never;
    canvas: never;
  }
  interface AssumeHookRan {
    ready: never;
  }

  interface System {
    id: "lancer";
  }

  interface ReadyGame {
    lancer: Record<string, unknown>;
    action_manager?: LancerActionManager;
  }

  interface CONFIG {
    LancerInitiative: LancerInitiativeConfig<Game["system"]["id"]>;
  }

  // TODO: Centralize models to a single namespace
  interface DataModelConfig {
    Actor: {
      deployable: DeployableModel;
      mech: MechModel;
      npc: NpcModel;
      pilot: PilotModel;
    };
    Item: {
      bond: BondModel;
      core_bonus: CoreBonusModel;
      frame: FrameModel;
      license: LicenseModel;
      mech_system: MechSystemModel;
      mech_weapon: MechWeaponModel;
      npc_class: NpcClassModel;
      npc_feature: NpcFeatureModel;
      npc_template: NpcTemplateModel;
      organization: OrganizationModel;
      pilot_armor: PilotArmorModel;
      pilot_gear: PilotGearModel;
      pilot_weapon: PilotWeaponModel;
      reserve: ReserveModel;
      skill: SkillModel;
      status: StatusModel;
      talent: TalentModel;
      weapon_mod: WeaponModModel;
    };
  }

  interface FlagConfig {
    ChatMessage: {
      lancer: {
        attackData?: AttackFlag;
        damageData?: DamageFlag;
      };
    };
  }

  interface SettingConfig {
    "lancer.actionManager": boolean;
    "lancer.actionManagerPlayersUse": boolean;
    "lancer.actionTracker": typeof ActionTrackerOptions;
    "lancer.attackSwitch": boolean;
    "lancer.autoCalcStructure": boolean;
    "lancer.autoOCHeat": boolean;
    "lancer.autoOKillHeat": boolean;
    "lancer.automationOptions": typeof AutomationOptions;
    "lancer.automationSwitch": boolean;
    "lancer.combat-tracker-appearance": typeof CombatTrackerAppearance;
    "lancer.combat-tracker-sort": boolean;
    "lancer.combatTrackerConfig": { sortTracker: boolean } | ClientSettings.Values["lancer.combatTrackerConfig"];
    "lancer.coreDataVersion": string;
    "lancer.dsnSetup": boolean;
    "lancer.floatingNumbers": boolean;
    "lancer.hideWelcome": boolean;
    "lancer.installedLCPs": { index: IContentPackManifest[] };
    "lancer.keepStockIcons": boolean;
    "lancer.squareGridDiagonals": "111" | "121" | "222" | "euc";
    "lancer.statusIconConfig": typeof StatusIconConfigOptions;
    "lancer.systemMigrationVersion": string;
    "lancer.tagConfig": Record<string, unknown>;
    "lancer.uiTheme": foundry.data.fields.StringField<{
      choices: {
        gms: "lancer.uiTheme.gms";
        gmsDark: "lancer.uiTheme.gmsDark";
        msmc: "lancer.uiTheme.msmc";
        horus: "lancer.uiTheme.horus";
        ha: "lancer.uiTheme.ha";
        ssc: "lancer.uiTheme.ssc";
        ipsn: "lancer.uiTheme.ipsn";
        gal: "lancer.uiTheme.gal";
      };
    }>;
    // "lancer.warningFor120": boolean; // Old setting, currently unused.
    // "lancer.warningForBeta": boolean; // Old setting, currently unused.

    "dice-so-nice.enabledSimultaneousRollForMessage": boolean;

    "lancer-conditions.keepStockIcons": boolean;
    "lancer-conditions.cancerConditionsStatus": boolean;
    "lancer-conditions.cancerNPCTemplates": boolean;
    "lancer-conditions.hayleyConditionsStatus": boolean;
    "lancer-conditions.hayleyPC": boolean;
    "lancer-conditions.hayleyNPC": boolean;
    "lancer-conditions.hayleyUtility": boolean;
    "lancer-conditions.tommyConditionsStatus": boolean;
  }

  /**
   * Terrain Height Tools API.
   * Make sure to guard usage with a check for the module being active
   */
  const terrainHeightTools: TerrainHeightToolsAPI | undefined;
}
