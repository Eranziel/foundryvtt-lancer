/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { LANCER, STATUSES, WELCOME } from "./module/config";
import { LancerGame } from "./module/lancer-game";
import {
  LancerActor,
  lancerActorInit,
  mount_card,
  mount_type_selector,
  npc_tier_selector,
} from "./module/actor/lancer-actor";
import {
  core_system_preview,
  effect_type_selector,
  is_loading,
  LancerItem,
  lancerItemInit,
  mech_system_preview,
  mech_trait_preview,
  mech_weapon_preview,
  npc_accuracy_preview,
  npc_attack_bonus_preview,
  npc_feature_preview,
  npc_weapon_damage_selector,
  pilot_weapon_damage_selector,
  system_type_selector,
  weapon_damage_preview,
  weapon_range_preview,
  weapon_range_selector,
  weapon_size_selector,
  weapon_type_selector,
} from "./module/item/lancer-item";

import {
  action_type_icon,
  action_type_selector,
  ai_effect_preview,
  basic_effect_preview,
  bonus_effect_preview,
  charge_effect_preview,
  charge_type_selector,
  deployable_effect_preview,
  drone_effect_preview,
  effect_preview,
  generic_effect_preview,
  invade_option_preview,
  npc_reaction_effect_preview,
  npc_system_effect_preview,
  npc_tech_effect_preview,
  npc_trait_effect_preview,
  npc_weapon_effect_preview,
  offensive_effect_preview,
  profile_effect_preview,
  protocol_effect_preview,
  reaction_effect_preview,
  tech_effect_preview,
} from "./module/item/effects";

// Import applications
import { LancerPilotSheet, overchargeButton } from "./module/actor/pilot-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerNPCClassSheet } from "./module/item/npc-class-sheet";
import { WeaponRangeTemplate } from "./module/pixi/weapon-range-template";

// Import helpers
import { preloadTemplates } from "./module/preloadTemplates";
import { registerSettings } from "./module/settings";
import {
  compactTagList,
  renderChunkyTag,
  renderCompactTag,
  renderFullTag,
} from "./module/item/tags";
import * as migrations from "./module/migration";
import { addLCPManager } from "./module/apps/lcpManager";

// Import Machine Mind and helpers
import { CCDataStore, NpcFeatureType, setup_store } from "machine-mind";
import { FauxPersistor } from "./module/ccdata_io";
import { reload_store } from "./module/item/util";
import * as macros from "./module/macros";

// Import node modules
import compareVersions = require("compare-versions");
import marked = require("marked");

const lp = LANCER.log_prefix;

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async function () {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  // Assign custom classes and constants here
  // Create a Lancer namespace within the game global
  (game as LancerGame).lancer = {
    applications: {
      LancerPilotSheet,
      LancerNPCSheet,
      LancerDeployableSheet,
      LancerItemSheet,
    },
    entities: {
      LancerActor,
      LancerItem,
    },
    canvas: {
      WeaponRangeTemplate,
    },
    prepareItemMacro: macros.prepareItemMacro,
    prepareStatMacro: macros.prepareStatMacro,
    prepareTextMacro: macros.prepareTextMacro,
    prepareCoreActiveMacro: macros.prepareCoreActiveMacro,
    prepareCorePassiveMacro: macros.prepareCorePassiveMacro,
    prepareOverchargeMacro: macros.prepareOverchargeMacro,
    prepareOverheatMacro: macros.prepareOverheatMacro,
    prepareStructureMacro: macros.prepareStructureMacro,
    migrations: migrations,
  };

  // Record Configuration Values
  CONFIG.Actor.entityClass = LancerActor;
  CONFIG.Item.entityClass = LancerItem;

  // Register custom system settings
  registerSettings();

  // Set up system status icons
  const keepStock = game.settings.get(LANCER.sys_name, LANCER.setting_stock_icons);
  let statuses: { id: string; label: string; icon: string }[] = [];
  // The type for statusEffects is wrong
  //@ts-ignore
  if (keepStock) statuses = statuses.concat(CONFIG.statusEffects);
  statuses = statuses.concat(STATUSES);
  // The type for statusEffects is wrong
  //@ts-ignore
  CONFIG.statusEffects = statuses;

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

  // Preload Handlebars templates
  await preloadTemplates();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lancer", LancerPilotSheet, { types: ["pilot"], makeDefault: true });
  Actors.registerSheet("lancer", LancerNPCSheet, { types: ["npc"], makeDefault: true });
  Actors.registerSheet("lancer", LancerDeployableSheet, {
    types: ["deployable"],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [
      "skill",
      "talent",
      "license",
      "core_bonus",
      "pilot_armor",
      "pilot_weapon",
      "pilot_gear",
      "mech_system",
      "mech_weapon",
      "npc_feature",
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: ["frame"], makeDefault: true });
  Items.registerSheet("lancer", LancerNPCClassSheet, {
    types: ["npc_class", "npc_template"],
    makeDefault: true,
  });

  // *******************************************************************
  // Register handlebars helpers

  // inc, for those off-by-one errors
  Handlebars.registerHelper("inc", function (value) {
    return parseInt(value) + 1;
  });

  // dec, for those off-by-one errors
  Handlebars.registerHelper("dec", function (value) {
    return parseInt(value) - 1;
  });

  // get an index from an array
  Handlebars.registerHelper("idx", function (array, index) {
    return array[index];
  });

  // invert the input
  Handlebars.registerHelper("neg", function (value) {
    return parseInt(value) * -1;
  });

  // double the input
  Handlebars.registerHelper("double", function (value) {
    return parseInt(value) * 2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("eq", function (val1, val2) {
    return val1 === val2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("neq", function (val1, val2) {
    return val1 !== val2;
  });

  // Logical "or" evaluation
  Handlebars.registerHelper("or", function (val1, val2) {
    return val1 || val2;
  });

  // Greater-than evaluation
  Handlebars.registerHelper("gt", function (val1, val2) {
    return val1 > val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("gtpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 > val2;
  });

  // Less-than evaluation
  Handlebars.registerHelper("lt", function (val1, val2) {
    return val1 < val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("ltpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 < val2;
  });

  Handlebars.registerHelper("lower-case", function (str: string) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper("upper-case", function (str: string) {
    return str.toUpperCase();
  });

  // For loops in Handlebars
  Handlebars.registerHelper("for", function (n, block) {
    var accum = "";
    for (var i = 0; i < n; ++i) accum += block.fn(i);
    return accum;
  });

  // ------------------------------------------------------------------------
  // Generic components
  Handlebars.registerHelper("l-num-input", function (target: string, value: string) {
    // Init value to 0 if it doesn't exist
    // So the arrows work properly
    if (!value) {
      value = "0";
    }

    return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      <input class="lancer-stat major" type="number" name="${target}" value="${value}" data-dtype="Number"\>
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
  });
  // ------------------------------------------------------------------------
  // Tags
  Handlebars.registerHelper("compact-tag", renderCompactTag);
  Handlebars.registerPartial("tag-list", compactTagList);
  Handlebars.registerHelper("chunky-tag", renderChunkyTag);
  Handlebars.registerHelper("full-tag", renderFullTag);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("is-loading", is_loading);
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", weapon_range_selector);
  Handlebars.registerHelper("wpn-damage-sel", pilot_weapon_damage_selector);
  Handlebars.registerHelper("npc-wpn-damage-sel", npc_weapon_damage_selector);
  Handlebars.registerHelper("wpn-range", weapon_range_preview);
  Handlebars.registerHelper("wpn-damage", weapon_damage_preview);
  Handlebars.registerHelper("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerHelper("npcf-acc", npc_accuracy_preview);
  Handlebars.registerPartial("mech-weapon-preview", mech_weapon_preview);

  // ------------------------------------------------------------------------
  // Systems
  Handlebars.registerHelper("sys-type-sel", system_type_selector);
  Handlebars.registerHelper("eff-type-sel", effect_type_selector);
  Handlebars.registerHelper("act-icon", action_type_icon);
  Handlebars.registerHelper("act-type-sel", action_type_selector);
  Handlebars.registerHelper("chg-type-sel", charge_type_selector);
  Handlebars.registerPartial("mech-system-preview", mech_system_preview);

  // ------------------------------------------------------------------------
  // Effects
  Handlebars.registerHelper("eff-preview", effect_preview);
  Handlebars.registerPartial("generic-eff-preview", generic_effect_preview);
  Handlebars.registerHelper("basic-eff-preview", basic_effect_preview);
  Handlebars.registerHelper("ai-eff-preview", ai_effect_preview);
  Handlebars.registerHelper("bonus-eff-preview", bonus_effect_preview);
  Handlebars.registerHelper("chg-eff-preview", charge_effect_preview);
  Handlebars.registerHelper("dep-eff-preview", deployable_effect_preview);
  Handlebars.registerHelper("drn-eff-preview", drone_effect_preview);
  Handlebars.registerHelper("off-eff-preview", offensive_effect_preview);
  Handlebars.registerHelper("prf-eff-preview", profile_effect_preview);
  Handlebars.registerHelper("prot-eff-preview", protocol_effect_preview);
  Handlebars.registerHelper("rct-eff-preview", reaction_effect_preview);
  Handlebars.registerHelper("inv-eff-preview", invade_option_preview);
  Handlebars.registerHelper("tech-eff-preview", tech_effect_preview);

  // ------------------------------------------------------------------------
  // NPC Effects
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);
  Handlebars.registerHelper("npc-rct-preview", npc_reaction_effect_preview);
  Handlebars.registerHelper("npc-sys-preview", npc_system_effect_preview);
  Handlebars.registerHelper("npc-trait-preview", npc_trait_effect_preview);
  Handlebars.registerHelper("npc-tech-preview", npc_tech_effect_preview);
  Handlebars.registerHelper("npc-wpn-preview", npc_weapon_effect_preview);

  // ------------------------------------------------------------------------
  // Frames
  Handlebars.registerPartial("core-system", core_system_preview);
  Handlebars.registerPartial("mech-trait", mech_trait_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("mount-selector", mount_type_selector);
  Handlebars.registerPartial("mount-card", mount_card);
  Handlebars.registerHelper("overcharge-button", overchargeButton);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
});

/* ------------------------------------ */
/* Setup system			            				*/
/* ------------------------------------ */
Hooks.once("setup", async function () {
  // Do anything after initialization but before ready.

  // Create the faux Comp/Con store.
  try {
    // Do some CC magic
    let store = new CCDataStore(new FauxPersistor(), {
      disable_core_data: true,
      shim_fallback_items: true,
    });
    setup_store(store);
    await store.load_all(f => f(store));
    await reload_store();
    console.log(`${lp} Comp/Con data store initialized.`);
  } catch (error) {
    console.log(`Fatal error loading COMP/CON`);
    console.log(error);
    ui.notifications.error(
      `Warning: COMP/CON has failed to load. You may experience severe data integrity failure`
    );
  }
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
Hooks.once("ready", async function () {
  await versionCheck();
  await showChangelog();

  // v0.1.20 Warning for v0.2
  // TODO: Remove for v0.2
  // Get the published warning from https://github.com/Eranziel/foundryvtt-lancer/wiki/v0.1.20-Announcement
  if (game.settings.get(LANCER.sys_name, LANCER.setting_120)) {
    function warningDialog(text: string) {new Dialog(
      {
        title: `Warning for next update`,
        content: text,
        buttons: {
          dont_show: {
            label: "Acknowledged",
            callback: async () => {
              await game.settings.set(LANCER.sys_name, LANCER.setting_120, false);
            },
          },
          close: {
            label: "Remind Later",
          },
        },
        default: "Remind Later",
      },
      {
        width: 800,
      }
    ).render(true);
  }

    let req = $.get(
      `https://raw.githubusercontent.com/wiki/Eranziel/foundryvtt-lancer/v0.1.20-Announcement.md`
    );
    req.done((data, status) => {
      warningDialog(marked(data));
    });
      
    req.fail((data, status) => {
      let errorText = `<h2>Warning: Next version will include major changes</h2></br><a href="https://raw.githubusercontent.com/wiki/Eranziel/foundryvtt-lancer/v0.1.20-Announcement.md">Click Here For More Information</a>`;

      warningDialog(errorText);
    });
  }
});

// Add any additional hooks if necessary
Hooks.on("preCreateActor", lancerActorInit);
Hooks.on("preCreateItem", lancerItemInit);

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManager(app, html);
});

// For the settings tab
Hooks.on("renderSettings", async (app: Application, html: HTMLElement) => {
  addSettingsButtons(app, html);
});

// Attack function to overkill reroll button
Hooks.on("renderChatMessage", async (cm: ChatMessage, html: any, data: any) => {
  const overkill = html[0].getElementsByClassName("overkill-reroll");
  for (let i = 0; i < overkill.length; i++) {
    if (cm.isAuthor) {
      overkill[i].addEventListener("click", async function () {
        // console.log(data);
        const roll = new Roll("1d6").roll();
        const templateData = {
          roll: roll,
          roll_tooltip: await roll.getTooltip(),
        };
        const html = await renderTemplate(
          "systems/lancer/templates/chat/overkill-reroll.html",
          templateData
        );
        let chat_data = {
          user: game.user,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          roll: templateData.roll,
          speaker: data.message.speaker,
          content: html,
        };
        let cm = await ChatMessage.create(chat_data);
        cm.render();
        return Promise.resolve();
      });
    }
  }
});

Hooks.on("hotbarDrop", (_bar: any, data: any, slot: number) => {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = "systems/lancer/assets/icons/macro-icons/d20-framed.svg";

  console.log(`${lp} Data dropped on hotbar:`, data);

  // TODO: Figure out if I am really going down this route and, if so, switch to a switch
  if (data.type === "actor") {
    command = `
      const a = game.actors.get('${data.actorId}');
      if (a) {
        game.lancer.prepareStatMacro('${data.actorId}', "${data.dataPath}");
      } else {
        ui.notifications.error("Error rolling macro");
      }`;
    title = data.title;
  } else if (data.type === "Item") {
    command = `game.lancer.prepareItemMacro("${data.actorId}", "${data.data._id}");`;
    // Talent are the only ones (I think??) that we need to name specially
    if (data.data.type === "talent") {
      command = `game.lancer.prepareItemMacro("${data.actorId}", "${data.itemId}", {rank: ${data.rank}});`;
      title = data.title;
      img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
    } else {
      title = data.data.name;
    }
    // Pick the image for the hotbar
    switch (data.data.type) {
      case "skill":
        img = `systems/lancer/assets/icons/macro-icons/skill.svg`;
        break;
      case "talent":
        img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
        break;
      case "core_bonus":
        img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
        break;
      case "pilot_gear":
        img = `systems/lancer/assets/icons/macro-icons/generic_item.svg`;
        break;
      case "pilot_weapon":
      case "mech_weapon":
        img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case "mech_system":
        img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
        break;
      case "npc_feature":
        switch (data.data.data.feature_type) {
          case NpcFeatureType.Reaction:
            img = `systems/lancer/assets/icons/macro-icons/reaction.svg`;
            break;
          case NpcFeatureType.System:
            img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
            break;
          case NpcFeatureType.Trait:
            img = `systems/lancer/assets/icons/macro-icons/trait.svg`;
            break;
          case NpcFeatureType.Tech:
            img = `systems/lancer/assets/icons/macro-icons/tech_quick.svg`;
            break;
          case NpcFeatureType.Weapon:
            img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
            break;
        }
        break;
    }
  } else if (data.type === "Text") {
    title = data.title;
    command = `game.lancer.prepareTextMacro("${data.actorId}", "${data.title}", {rank: ${data.description}})`;
  } else if (data.type === "Core-Active") {
    title = data.title;
    command = `game.lancer.prepareCoreActiveMacro("${data.actorId}")`;
    img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
  } else if (data.type === "Core-Passive") {
    title = data.title;
    command = `game.lancer.prepareCorePassiveMacro("${data.actorId}")`;
    img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
  } else if (data.type === "overcharge") {
    title = data.title;
    command = `game.lancer.prepareOverchargeMacro("${data.actorId}")`;
    img = `systems/lancer/assets/icons/macro-icons/overcharge.svg`;
  } else {
    // Let's not error or anything, since it's possible to accidentally drop stuff pretty easily
    return;
  }

  // Until we properly register commands as something macros can have...
  // @ts-ignore
  let macro = game.macros.entities.find(
    (m: Macro) => m.name === title && (m.data as any).command === command
  );
  if (!macro) {
    Macro.create(
      {
        command,
        name: title,
        type: "script",
        img: img,
      },
      { displaySheet: false }
    ).then(macro => game.user.assignHotbarMacro(macro as Macro, slot));
  } else {
    game.user.assignHotbarMacro(macro, slot).then();
  }
});

/**
 * Performs our version validation
 * Uses window.FEATURES to check theoretical Foundry compatibility with our features
 * Also performs system version checks
 */
async function versionCheck() {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(LANCER.sys_name, LANCER.setting_migration);

  // If it's 0 then it's a fresh install
  if (currentVersion === "0") {
    await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
    return;
  }

  // Modify these constants to set which Lancer version numbers need and permit migration.
  const NEEDS_MIGRATION_VERSION = "0.1.7";
  const COMPATIBLE_MIGRATION_VERSION = "0.1.6";
  let needMigration = currentVersion ? compareVersions(currentVersion, NEEDS_MIGRATION_VERSION) : 1;

  // Check whether system has been updated since last run.
  if (compareVersions(currentVersion, game.system.data.version) != 0 && game.user.isGM) {
    // Un-hide the welcome message
    await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, false);

    if (needMigration <= 0) {
      if (currentVersion && compareVersions(currentVersion, COMPATIBLE_MIGRATION_VERSION) < 0) {
        // System version is too old for migration
        ui.notifications.error(
          `Your LANCER system data is from too old a version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
          { permanent: true }
        );
      }
      // Perform the migration
      await migrations.migrateWorld();
    }
    // Set the version for future migration and welcome message checking
    await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
  }

  // Use the new FEATURES dict to see if we can assume that there will be issues
  // I think this is up to date with all currently in use, but we'll need to keep it updated
  // https://gitlab.com/foundrynet/foundryvtt/-/issues/3959#note_441254976
  let supportedFeatures = {
    ACTORS: 2,
    CHAT: 2,
    COMPENDIUM: 2,
    ENTITIES: 4,
    ITEMS: 2,
    MACROS: 1,
    SETTINGS: 2,
    TOKENS: 3,
  };

  for (const k in supportedFeatures) {
    // This is fine so...
    //@ts-ignore
    if (supportedFeatures[k] !== window.FEATURES[k]) {
      console.log(`Major version error for feature ${k}`);
      ui.notifications.error(
        `Warning: A major version incompatibility has been detected. You may experience issues, please return to a supported version.`
      );
    }
  }
}

async function showChangelog() {
  // Show welcome message if not hidden.
  if (!game.settings.get(LANCER.sys_name, LANCER.setting_welcome)) {
    let renderChangelog = (changelog: string) => {
      new Dialog(
        {
          title: `Welcome to LANCER v${game.system.data.version}`,
          content: WELCOME(changelog),
          buttons: {
            dont_show: {
              label: "Do Not Show Again",
              callback: async () => {
                await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, true);
              },
            },
            close: {
              label: "Close",
            },
          },
          default: "Close",
        },
        {
          width: 700,
        }
      ).render(true);
    };

    // Get an automatic changelog for our version
    let req = $.get(
      `https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/v${game.system.data.version}/CHANGELOG.md`
    );
    req.done((data, status) => {
      // Regex magic to only grab the first 25 lines
      let r = /(?:[^\n]*\n){25}/;
      let trimmedChangelog = data.match(r)[0];

      // Grab the position of the last H1 and trim to that to ensure we split along version lines
      // But also set a min so we're keeping at least one version
      let lastH1Pos = trimmedChangelog.lastIndexOf("\n# ");
      if (lastH1Pos < 20) lastH1Pos = trimmedChangelog.length;

      trimmedChangelog = trimmedChangelog.substring(0, lastH1Pos);

      let changelog = marked(trimmedChangelog);

      renderChangelog(changelog);
    });

    req.fail((data, status) => {
      let errorText = `<h2>Error retrieving changelog</h2>`;

      renderChangelog(errorText);
    });
  }
}

function addSettingsButtons(app: Application, html: HTMLElement) {
  const faqButton = $(`<button id="triggler-form" data-action="triggler">
            <i class="fas fa-robot"></i>LANCER Help
        </button>`);

  $(html).find("#settings-documentation").append(faqButton);
    
  faqButton.click(async ev => {
    let helpContent = await renderTemplate("systems/lancer/templates/window/lancerHelp.html",{});

    new Dialog(
      {
        title: `LANCER Help`,
        content: helpContent,
        buttons: {
          close: {
            label: "Close",
          },
        },
        default: "Close",
      },
      {
        width: 600,
      }
    ).render(true);
  })
}