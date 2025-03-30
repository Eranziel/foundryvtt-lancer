/**
 * TypeScript entry file for Lancer on Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import SCSS into our build
import "./lancer.scss";

// Import TypeScript modules
import { LancerActor } from "./module/actor/lancer-actor";
import { LANCER, WELCOME } from "./module/config";
import { LancerItem } from "./module/item/lancer-item";
import { migrateLancerConditions } from "./module/status-icons";
import { populatePilotCache } from "./module/util/compcon";

import { LancerActionManager } from "./module/action/action-manager";

// Import applications
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerMechSheet } from "./module/actor/mech-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerPilotSheet } from "./module/actor/pilot-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerLicenseSheet } from "./module/item/license-sheet";
import { WeaponRangeTemplate } from "./module/canvas/weapon-range-template";

// Import helpers
import { LCPManager, addLCPManagerButton } from "./module/apps/lcp-manager/lcp-manager";
import { attachTagTooltips } from "./module/helpers/tags";
import { preloadTemplates } from "./module/preload-templates";
import { getAutomationOptions, registerSettings } from "./module/settings";
import { applyTheme } from "./module/themes";
import * as migrations from "./module/world_migration";

// Import sliding HUD (used for accuracy/difficulty windows)
import * as slidingHUD from "./module/apps/slidinghud";

// Import Tippy.js
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css"; // optional for styling
tippy.setDefaultProps({ theme: "lancer-small", arrow: false, delay: [400, 200] });
// tippy.setDefaultProps({ theme: "lancer", arrow: false, delay: [400, 200], hideOnClick: false, trigger: "click"});

// Import node modules
// import { importCC } from "./module/actor/import";
import { LancerCombat, LancerCombatant } from "./module/combat/lancer-combat";
import { LancerCombatTracker } from "./module/combat/lancer-combat-tracker";
import { LancerActiveEffect } from "./module/effects/lancer-active-effect";
import { EntryType } from "./module/enums";
import { targetsFromTemplate } from "./module/flows/_template";
import { registerHandlebarsHelpers } from "./module/helpers";
import { handleCombatUpdate } from "./module/helpers/automation/combat";
import { gridDist } from "./module/helpers/automation/targeting";
import { applyCollapseListeners, initializeCollapses } from "./module/helpers/collapse";
import CompconLoginForm from "./module/helpers/compcon-login-form";
import { applyGlobalDragListeners } from "./module/helpers/dragdrop";
// import { handleActorExport, validForExport } from "./module/helpers/io";
import { extendCombatTrackerConfig, onCloseCombatTrackerConfig } from "./module/apps/lancer-initiative-config-form";
import { handleRefClickOpen } from "./module/helpers/refs";
import { DeployableModel } from "./module/models/actors/deployable";
import { MechModel } from "./module/models/actors/mech";
import { NpcModel } from "./module/models/actors/npc";
import { PilotModel } from "./module/models/actors/pilot";
import { CoreBonusModel } from "./module/models/items/core_bonus";
import { FrameModel } from "./module/models/items/frame";
import { MechSystemModel } from "./module/models/items/mech_system";
import { MechWeaponModel } from "./module/models/items/mech_weapon";
import { PilotArmorModel } from "./module/models/items/pilot_armor";
import { PilotGearModel } from "./module/models/items/pilot_gear";
import { PilotWeaponModel } from "./module/models/items/pilot_weapon";
import { TalentModel } from "./module/models/items/talent";
import { LancerToken, LancerTokenDocument, extendTokenConfig } from "./module/token";
import { lookupOwnedDeployables } from "./module/util/lid";
import { fulfillImportActor } from "./module/util/requests";

import { dropStatusToCanvas } from "./module/canvas/drop-status";
import { beginCascadeFlow } from "./module/flows/cascade";
import { applyDamage, rollDamageCallback, undoDamage } from "./module/flows/damage";
import { Flow } from "./module/flows/flow";
import { onHotbarDrop } from "./module/flows/hotbar";
import { beginItemChatFlow } from "./module/flows/item";
import { registerFlows } from "./module/flows/register-flows";
import { beginSecondaryStructureFlow, triggerStrussFlow } from "./module/flows/structure";
import { fromLid, fromLidMany, fromLidSync } from "./module/helpers/from-lid";
import { addEnrichers } from "./module/helpers/text-enrichers";
import { LancerNPCClassSheet } from "./module/item/npc-class-sheet";
import { LancerNPCFeatureSheet } from "./module/item/npc-feature-sheet";
import { BondModel } from "./module/models/items/bond";
import { LicenseModel } from "./module/models/items/license";
import { NpcClassModel } from "./module/models/items/npc_class";
import { NpcFeatureModel } from "./module/models/items/npc_feature";
import { NpcTemplateModel } from "./module/models/items/npc_template";
import { OrganizationModel } from "./module/models/items/organization";
import { ReserveModel } from "./module/models/items/reserve";
import { SkillModel } from "./module/models/items/skill";
import { StatusModel } from "./module/models/items/status";
import { WeaponModModel } from "./module/models/items/weapon_mod";
import { registerTours } from "./module/tours/register-tours";
import { get_pack_id } from "./module/util/doc";
import { tokenScrollText } from "./module/util/misc";

const lp = LANCER.log_prefix;

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
addEnrichers();
Hooks.once("init", () => {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  CONFIG.ActiveEffect.legacyTransferral = false;

  // Add this schema for each document type.
  // game.documentTypes.Item.forEach(type => CONFIG.Item.dataModels[type] = MyItemModel);
  CONFIG.Item.dataModels[EntryType.PILOT_ARMOR] = PilotArmorModel;
  CONFIG.Item.dataModels[EntryType.PILOT_GEAR] = PilotGearModel;
  CONFIG.Item.dataModels[EntryType.PILOT_WEAPON] = PilotWeaponModel;
  CONFIG.Item.dataModels[EntryType.CORE_BONUS] = CoreBonusModel;
  CONFIG.Item.dataModels[EntryType.FRAME] = FrameModel;
  CONFIG.Item.dataModels[EntryType.LICENSE] = LicenseModel;
  CONFIG.Item.dataModels[EntryType.MECH_WEAPON] = MechWeaponModel;
  CONFIG.Item.dataModels[EntryType.MECH_SYSTEM] = MechSystemModel;
  CONFIG.Item.dataModels[EntryType.WEAPON_MOD] = WeaponModModel;
  CONFIG.Item.dataModels[EntryType.RESERVE] = ReserveModel;
  CONFIG.Item.dataModels[EntryType.ORGANIZATION] = OrganizationModel;
  CONFIG.Item.dataModels[EntryType.SKILL] = SkillModel;
  CONFIG.Item.dataModels[EntryType.STATUS] = StatusModel;
  CONFIG.Item.dataModels[EntryType.TALENT] = TalentModel;
  CONFIG.Item.dataModels[EntryType.BOND] = BondModel;
  CONFIG.Item.dataModels[EntryType.NPC_CLASS] = NpcClassModel;
  CONFIG.Item.dataModels[EntryType.NPC_TEMPLATE] = NpcTemplateModel;
  CONFIG.Item.dataModels[EntryType.NPC_FEATURE] = NpcFeatureModel;

  CONFIG.Actor.dataModels[EntryType.MECH] = MechModel;
  CONFIG.Actor.dataModels[EntryType.PILOT] = PilotModel;
  CONFIG.Actor.dataModels[EntryType.NPC] = NpcModel;
  CONFIG.Actor.dataModels[EntryType.DEPLOYABLE] = DeployableModel;

  // Set up trackable resources for the various actor types
  const base = {
    bar: ["hp", "heat", "overshield"],
    value: [
      "activations",
      "agi",
      "armor",
      "burn",
      "edef",
      "eng",
      "evasion",
      "hull",
      "overshield.value",
      "save",
      "sensor_range",
      "size",
      "speed",
      "sys",
      "tech_attack",
    ],
  };
  CONFIG.Actor.trackableAttributes = {
    // @ts-expect-error
    base,
    // @ts-expect-error
    ["deployable"]: {
      bar: [...base.bar],
      value: [...base.value, "cost", "instances"],
    },
    // @ts-expect-error
    ["mech"]: {
      bar: [...base.bar, "structure", "stress", "repairs"],
      value: [...base.value, "action_tracker.move", "core_energy", "grit", "meltdown_timer", "overcharge"],
    },
    // @ts-expect-error
    ["npc"]: {
      bar: [...base.bar, "structure", "stress"],
      value: [...base.value, "meltdown_timer", "tier"],
    },
    // @ts-expect-error
    ["pilot"]: {
      bar: [...base.bar, "bond_state.stress", "bond_state.xp"],
      value: [...base.value, "grit", "level"],
    },
  };

  // Configure indexes
  CONFIG.Item.compendiumIndexFields = ["system.lid", "system.license", "system.key"]; // key is for licenses
  CONFIG.Actor.compendiumIndexFields = ["system.lid"];

  // Register custom system settings
  registerSettings();
  // Apply theme colors
  applyTheme(game.settings.get(game.system.id, LANCER.setting_ui_theme) as "gms" | "msmc" | "horus");

  // no need to block on amplify - logging into comp/con and populating the cache
  // it can happen in the background
  configureAmplify();

  // Register flow steps
  const { flows, flowSteps } = registerFlows();

  // Assign custom classes and constants here
  // Create a Lancer namespace within the game global
  game.lancer = {
    applications: {
      LancerPilotSheet,
      LancerMechSheet,
      LancerNPCSheet,
      LancerDeployableSheet,
      LancerItemSheet,
      LancerFrameSheet,
      LancerLicenseSheet,
      LancerNPCClassSheet,
      LancerNPCFeatureSheet,
    },
    entities: {
      LancerActor,
      LancerItem,
    },
    canvas: {
      WeaponRangeTemplate,
    },
    helpers: {
      gridDist,
      lookupOwnedDeployables,
    },
    flows,
    flowSteps,
    Flow,
    beginItemChatFlow,
    importActor: fulfillImportActor,
    targetsFromTemplate,
    migrations: migrations,
    getAutomationOptions: () => {
      ui.notifications.warn(
        "The getAutomationOptions helper is deprecated and will be removed i" +
          'n Foundry v13. Use game.settings.get("lancer", "automationOptions' +
          '") directly instead.',
        { permanent: true }
      );
      return getAutomationOptions();
    },
    fromLid: fromLid,
    fromLidMany: fromLidMany,
    fromLidSync: fromLidSync,
  };

  // Record Configuration Values
  CONFIG.Actor.documentClass = LancerActor;
  CONFIG.Item.documentClass = LancerItem;
  CONFIG.ActiveEffect.documentClass = LancerActiveEffect;
  CONFIG.Token.documentClass = LancerTokenDocument;
  CONFIG.Token.objectClass = LancerToken;
  CONFIG.Combat.documentClass = LancerCombat;
  CONFIG.Combatant.documentClass = LancerCombatant;
  // @ts-expect-error This is literally a subclass so idk why it's busted
  CONFIG.ui.combat = LancerCombatTracker;

  // Set up default system status icons
  LancerActiveEffect.initConfig();

  // Register the system tours
  registerTours();

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

  registerHandlebarsHelpers();

  // ------------------------------------------------------------------------
  // Sliding HUD Zone, including accuracy/difficulty window
  Hooks.on("renderHeadsUpDisplay", slidingHUD.attach);

  // Combat tracker HUD modules integration
  if (game.modules.get("combat-carousel")?.active) {
    (async () => {
      const { handleRenderCombatCarousel } = await import("./module/integrations/combat-carousel");
      Hooks.on("renderCombatCarousel", handleRenderCombatCarousel);
    })();
  }
  if (game.modules!.get("combat-tracker-dock")?.active) {
    (async () => {
      game.lancer.combatTrackerDock = await import("./module/integrations/combat-tracker-dock");
      Hooks.on("renderCombatDock", (...[_app, html]: Parameters<Hooks.RenderApplication>) => {
        html.find(".buttons-container [data-action='roll-all']").hide();
        html.find(".buttons-container [data-action='roll-npc']").hide();
        // html.find(".buttons-container [data-action='previous-turn']").hide();
        html.find(".buttons-container [data-action='next-turn']").hide();
      });
    })();
  }

  // Extend TokenConfig for token size automation
  Hooks.on("renderTokenConfig", extendTokenConfig);
});

Hooks.once("setup", () => {
  /////////////////////////////////
  // DIRTY HACK DO NOT REPLICATE //
  /////////////////////////////////
  // Change the default value of the grid based templates option
  // TODO Remove when we get https://github.com/foundryvtt/foundryvtt/issues/11477
  if (game.settings.settings.get("core.gridTemplates"))
    // @ts-expect-error This is hacky, but valid
    game.settings.settings.get("core.gridTemplates")!.default = true;
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
// Make an awaitable for when this shit is done
Hooks.once("ready", async function () {
  // Register sheet application classes
  setupSheets();

  Hooks.on("updateCombat", handleCombatUpdate);

  // Start preloading Handlebars templates in the background, don't await.
  preloadTemplates();

  console.log(`${lp} Foundry ready, doing final checks.`);

  await doMigration();

  applyGlobalDragListeners();

  game.action_manager = new LancerActionManager();
  game.action_manager!.init();

  // Set up status icons from compendium and world items
  await LancerActiveEffect.populateFromItems();

  Hooks.on("updateCompendium", async collection => {
    if (collection?.metadata?.id == get_pack_id(EntryType.STATUS)) {
      await LancerActiveEffect.populateFromItems();
    }
  });
  Hooks.on("itemCreated", async (item: LancerItem) => {
    if (!item.is_status()) return;
    await LancerActiveEffect.populateFromItems();
  });
});

Hooks.once("ready", () => {
  if (
    game.user!.isGM &&
    game.modules.get("dice-so-nice")?.active &&
    !game.settings.get(game.system.id, LANCER.setting_dsn_setup)
  ) {
    // Set up Dice So Nice to icrementally show attacks then damge rolls
    console.log(`${lp} First login setup for Dice So Nice`);
    game.settings.set("dice-so-nice", "enabledSimultaneousRollForMessage", false);
    game.settings.set(game.system.id, LANCER.setting_dsn_setup, true);
  }

  // Migrate settings from Lancer Condition Icons and disable the module
  migrateLancerConditions();
});

// Attach socket listeners
Hooks.once("ready", () => {
  game.socket!.on(`system.${game.system.id}`, msg => {
    if (msg.action === "scrollText") {
      tokenScrollText(msg.data);
    }
  });
});

// Action Manager hooks.
Hooks.on("controlToken", () => {
  game.action_manager?.update();
});
Hooks.on("updateToken", (_scene: Scene, _token: Token, diff: any, _options: any, _idUser: any) => {
  // If it's an X or Y change assume the token is just moving.
  if (diff.hasOwnProperty("y") || diff.hasOwnProperty("x")) return;
  game.action_manager?.update();
});
Hooks.on("updateActor", (...[_actor, changes]: Parameters<Hooks.UpdateDocument<typeof Actor>>): void => {
  game.action_manager?.update();
  triggerStrussFlow(_actor, changes);
});
Hooks.on("closeSettingsConfig", () => {
  game.action_manager?.updateConfig();
});
Hooks.on("getSceneNavigationContext", async () => {
  game.action_manager && (await game.action_manager!.reset());
});
Hooks.on("createCombat", (_actor: Actor) => {
  game.action_manager?.update();
});
Hooks.on("deleteCombat", (_actor: Actor) => {
  game.action_manager?.update();
});
Hooks.on("updateCombat", (_combat: Combat, changes: object) => {
  if (
    game.settings.get(game.system.id, LANCER.setting_automation).remove_templates &&
    "turn" in changes &&
    game.user?.isGM
  ) {
    canvas?.templates?.placeables.forEach(t => {
      if (t.document.getFlag("lancer", "isAttack")) t.document.delete();
    });
  }
  // This can be removed in v10
  if (foundry.utils.hasProperty(changes, "turn")) {
    // @ts-expect-error Just blindy try
    ui.combatCarousel?.render();
  }
});

// Handle dropping statuses on tokens
Hooks.on("dropCanvasData", dropStatusToCanvas);

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManagerButton(app, html);
});

// TODO: keep or remove?
// This seems broken
// Hooks.on("getActorDirectoryEntryContext", (_html: JQuery<HTMLElement>, ctxOptions: ContextMenuEntry[]) => {
//   const editMigratePilot: ContextMenuEntry = {
//     name: "Migrate Pilot",
//     icon: '<i class="fas fa-user-circle"></i>',
//     condition: (li: any) => {
//       const actor = game.actors?.get(li.data("documentId"));
//       return actor?.type === "pilot" && validForExport(actor);
//     },
//     callback: (li: any) => {
//       const actor = game.actors?.get(li.data("documentId"));
//       // @ts-expect-error Migrations?
//       const dump = handleActorExport(actor, false);
//       if (dump && actor?.is_pilot()) importCC(actor, dump as any, true);
//     },
//   };

//   const editExportPilot: ContextMenuEntry = {
//     name: "Export Pilot",
//     icon: '<i class="fas fa-user-circle"></i>',
//     condition: (li: any) => {
//       const actor = game.actors?.get(li.data("documentId"));
//       return actor?.type === "pilot" && validForExport(actor);
//     },
//     callback: (li: any) => {
//       const actor = game.actors?.get(li.data("documentId"));
//       // @ts-expect-error Migrations?
//       handleActorExport(actor, true);
//     },
//   };

//   ctxOptions.unshift(editMigratePilot);
//   ctxOptions.unshift(editExportPilot);
// });

// For the settings tab
Hooks.on("renderSettings", async (app: Application, html: HTMLElement) => {
  addSettingsButtons(app, html);
});
Hooks.on("renderCombatTrackerConfig", extendCombatTrackerConfig);
Hooks.on("closeCombatTrackerConfig", onCloseCombatTrackerConfig);

// Disable token vision and fog exploration by default in scene config
Hooks.on("preCreateScene", (scene: any) => {
  scene.updateSource({ tokenVision: false, fogExploration: false });
});

Hooks.on("renderChatMessage", async (cm: ChatMessage, html: JQuery, data: any) => {
  // Reapply listeners.
  initializeCollapses(html);
  applyCollapseListeners(html);
  attachTagTooltips(html);

  // Handle old macro buttons
  html.find(".chat-button").on("click", async ev => {
    let elt = $(ev.target).closest("[data-action]")[0];
    if (elt?.dataset.action) {
      ev.stopPropagation();
      const action = elt.dataset.action;
      switch (action) {
        case "importActor":
          const actorId = elt.dataset.targetId;
          if (!actorId) return ui.notifications?.error("No target actor ID found on actor import prompt button.");
          const importId = elt.dataset.importId;
          if (!importId) return ui.notifications?.error("No import actor ID found on actor import prompt button.");
          const toImport = await LancerActor.fromUuid(
            importId,
            "Invalid import actor ID on actor import prompt button."
          );
          const forActor = await LancerActor.fromUuid(
            actorId,
            "Invalid target actor ID on actor import prompt button."
          );
          await fulfillImportActor(toImport, forActor);
          break;
        default:
          ui.notifications?.error("Invalid action on chat button.");
          return false;
      }
      if (elt.classList.contains("self-destruct")) {
        cm.delete();
      }
      return true;
    }
    return false;
  });

  // Handle flow buttons in chat messages
  html.find(".flow-button").on("click", ev => {
    const element = $(ev.target).closest("[data-flow-type]")[0];
    if (element?.dataset.flowType) {
      ev.stopPropagation();
      const flowType = element.dataset.flowType;
      const actorId = element.dataset.actorId;
      const itemId = element.dataset.itemId;
      switch (flowType) {
        case "check":
          const actor = LancerActor.fromUuidSync(actorId ?? "", "Invalid actor ID on check prompt button.");
          const checkType = element.dataset.checkType;
          switch (checkType) {
            case "hull":
            default:
              actor.beginStatFlow("system.hull");
              break;
            case "agility":
              actor.beginStatFlow("system.agility");
              break;
            case "systems":
              actor.beginStatFlow("system.systems");
              break;
            case "engineering":
              actor.beginStatFlow("system.engineering");
              break;
          }
          break;
        case "secondaryStructure":
          if (!actorId) return ui.notifications?.error("No actor ID found on secondary structure prompt button.");
          beginSecondaryStructureFlow(actorId);
          break;
        case "cascade":
          if (!actorId) return ui.notifications?.error("No actor ID found on cascade prompt button.");
          beginCascadeFlow(actorId);
          break;
        default:
          return ui.notifications?.error("Invalid flow type on flow prompt button.");
      }
      return true;
    }
  });

  // Highlight attack and damage targets on hover
  const hoverCallback = async (
    ev:
      | JQuery.MouseEnterEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
      | JQuery.MouseLeaveEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ) => {
    if (!canvas.ready) return;
    const targetId = $(ev.target).closest("[data-uuid]").data("uuid");
    if (!targetId) return;
    const token = (await fromUuid(targetId)) as LancerToken | null;
    if (!token) return;
    if (ev.type === "mouseover") {
      // @ts-expect-error we're not supposed to call the private method, oops
      token.object._onHoverIn(ev);
    } else if (ev.type === "mouseout") {
      // @ts-expect-error we're not supposed to call the private method, oops
      token.object._onHoverOut(ev);
    }
  };
  const atkDmgTargets = html.find(".lancer-hit-target, .lancer-damage-target");
  atkDmgTargets.on("mouseenter", hoverCallback);
  atkDmgTargets.on("mouseleave", hoverCallback);

  html.find(".lancer-damage-flow").on("click", rollDamageCallback);

  html.find(".lancer-damage-apply").on("click", applyDamage);

  html.find(".lancer-damage-undo").on("click", undoDamage);

  // Handle clickable refs in chat messages
  handleRefClickOpen(html);
});

Hooks.on("hotbarDrop", (_bar: any, data: any, slot: number) => {
  onHotbarDrop(_bar, data, slot);
});

/**
 * For use on first run of a new world. Open the LCP manager so user can install core data.
 */
async function promptInstallCoreData() {
  // Open the LCP manager
  let app = new LCPManager();
  await app.render(true);
  // Render a dialog on top to explain
  let content = `
  <h2 style="text-align: center">WELCOME GAME MASTER</h2>
  <p style="text-align: center;margin-bottom: 1em">THIS IS YOUR <span class="horus--very--subtle">FIRST</span> TIME LAUNCHING</p>
  <p style="text-align: center;margin-bottom: 1em">Use the LANCER Compendium Manager window to install the <span class="horus--very--subtle">LANCER DATA</span> you wish to use.</p>`;
  new foundry.applications.api.DialogV2({
    window: { title: `Install Core Data`, icon: "cci cci-content-manager i--sm" },
    position: {
      width: 700,
    },
    content,
    buttons: [
      {
        action: "close",
        label: "Close",
      },
    ],
  }).render(true);
}

function setupSheets() {
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lancer", LancerPilotSheet, { types: [EntryType.PILOT], makeDefault: true });
  Actors.registerSheet("lancer", LancerMechSheet, { types: [EntryType.MECH], makeDefault: true });
  Actors.registerSheet("lancer", LancerNPCSheet, { types: [EntryType.NPC], makeDefault: true });
  Actors.registerSheet("lancer", LancerDeployableSheet, {
    types: [EntryType.DEPLOYABLE],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [
      EntryType.SKILL,
      EntryType.TALENT,
      EntryType.BOND,
      EntryType.CORE_BONUS,
      EntryType.RESERVE,
      EntryType.STATUS,
      EntryType.PILOT_ARMOR,
      EntryType.PILOT_WEAPON,
      EntryType.PILOT_GEAR,
      EntryType.MECH_SYSTEM,
      EntryType.MECH_WEAPON,
      EntryType.WEAPON_MOD,
      EntryType.NPC_FEATURE,
      EntryType.ORGANIZATION,
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: [EntryType.FRAME], makeDefault: true });
  Items.registerSheet("lancer", LancerLicenseSheet, { types: [EntryType.LICENSE], makeDefault: true });
  Items.registerSheet("lancer", LancerNPCClassSheet, {
    types: [EntryType.NPC_CLASS, EntryType.NPC_TEMPLATE],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerNPCFeatureSheet, { types: [EntryType.NPC_FEATURE], makeDefault: true });
}

/**
 * Check whether the world needs any migration.
 * @return True if migration is required
 */
async function versionCheck(): Promise<"first_run" | "yes" | "no" | "too_old"> {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);

  // If it's 0 then it's a fresh install
  if (currentVersion === "0" || !currentVersion) {
    return "first_run";
  }

  // Check if its before new rolling migration system was integrated
  if (foundry.utils.isNewerVersion("1.0.0", currentVersion)) {
    return "too_old";
  }

  // Otherwise return if version is even slightly out of date
  return foundry.utils.isNewerVersion(game.system.version, currentVersion) ? "yes" : "no";
}

async function promptLCPManagerTour() {
  const showTour = await foundry.applications.api.DialogV2.confirm({
    // @ts-expect-error This should expect a partial
    window: { title: "Compendium Manager Tour?" },
    content: "The LANCER Compendium Manager has had a major update. Would you like to get a tour?",
    rejectClose: false,
  });
  if (!showTour) return;
  const lcpTour: Tour | undefined = game.tours.get(`${game.system.id}.lcp`);
  if (!lcpTour) {
    console.error(`${lp} LCP manager tour not found.`);
    return;
  }
  console.log(`${lp} Starting LCP manager tour`);
  lcpTour.start();
}

/**
 * Performs our version validation and migration
 */
async function doMigration() {
  const oldVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
  // Auxiliary - settings and tour migrations
  if (oldVersion && foundry.utils.isNewerVersion("2.7.0", oldVersion)) {
    console.log(`${lp} Game is migrating from ${oldVersion}. Should show LCP manager tour`);
    // New LCP manager was introduced in version 2.7.0
    // Reset LCP manager tour
    const lcpTour: Tour | undefined = game.tours.get(`${game.system.id}.lcp`);
    if (!lcpTour) {
      console.error(`${lp} LCP manager tour not found.`);
      return;
    }
    await lcpTour.reset();
    // Ask to show LCP manager tour. Do not await, let it sit in the background
    // while the rest of the migration work proceeds.
    promptLCPManagerTour();
  }

  // Determine whether a system migration  is needed
  let needsMigrate = await versionCheck();
  if (needsMigrate == "first_run") {
    game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);
    await promptInstallCoreData();
  } else if (needsMigrate == "too_old") {
    // System version is too old for migration
    ui.notifications!.error(
      `Your LANCER system data is from too old a version (${game.settings.get(
        game.system.id,
        LANCER.setting_migration_version
      )}) and cannot be reliably migrated to the latest version. Please install and migrate to version 1.5.0+ before attempting this migration`,
      { permanent: true }
    );
    return;
  } else if (needsMigrate == "yes" && game.user!.isGM) {
    // Print the update message to chat
    printUpdateMessage();
    ui.notifications!.info(
      `Migrating to LANCER version ${game.system.version}. Please be patient and wait until migration completes.`,
      { permanent: true }
    );
    await migrations.migrateWorld();
    // Update the stored version number for next migration
    await game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);
  } else if (needsMigrate == "yes") {
    ui.notifications!.warn(
      "Your GM needs to migrate this world. Please do not attempt to play the game or edit anything until migrations are done.",
      { permanent: true }
    );
  } else if (needsMigrate == "no" && game.user!.isGM) {
    // Update the stored version number for next migration
    await game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);
  }
}

async function configureAmplify() {
  // Pull in the parts of AWS Amplify we need
  const aws = (await import("./aws-exports")).default as {
    aws_cognito_identity_pool_id: string;
  };
  const { Auth } = await import("@aws-amplify/auth");
  const { Storage } = await import("@aws-amplify/storage");

  Auth.configure(aws);
  Storage.configure(aws);

  // if we have a login already, this is where we populate the pilot cache
  try {
    return populatePilotCache();
  } catch {
    // the error is just that we don't have a login
    // noop
  }
}

/**
 * Print a chat message to share the changelog link and legalese journal.
 */
async function printUpdateMessage() {
  // Wait until sidebar is ready to render messages
  while (!ui.sidebar.rendered) await new Promise(resolve => setTimeout(resolve, 100));
  await ChatMessage.create({
    content: WELCOME(),
    speaker: { alias: `LANCER System v${game.system.version}` },
  });
}

function addSettingsButtons(_app: Application, html: HTMLElement) {
  const lancerHeader = $(`<h2>LANCER</h2>
            <div id="settings-lancer"></div>`);

  const faqButton = $(`<button id="triggler-form" data-action="triggler">
            <i class="fas fa-robot"></i>LANCER Help
        </button>`);

  const loginButton = $(`<button id="compcon-login" data-action="compconLogin">
            <i class="mdi mdi-cloud-sync-outline "></i>COMP/CON Login
          </button>`);

  $(html).find("#settings-game").after(lancerHeader);
  $(html).find("#settings-lancer").append(loginButton);
  $(html).find("#settings-lancer").append(faqButton);

  loginButton.on("click", async () => {
    const app = new CompconLoginForm({});
    return app.render(true);
  });

  faqButton.on("click", async () => {
    let helpContent = await renderTemplate(`systems/${game.system.id}/templates/window/lancerHelp.hbs`, {});

    new foundry.applications.api.DialogV2({
      window: {
        title: `LANCER Help`,
        icon: "fas fa-robot",
      },
      content: helpContent,
      position: {
        width: 600,
      },
      buttons: [
        {
          action: "close",
          label: "Close",
        },
      ],
    }).render(true);
  });
}
