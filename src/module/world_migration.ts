// @ts-nocheck
// We do not care about this file being super rigorous
import { LancerActor } from "./actor/lancer-actor";
import { LCPManager } from "./apps/lcp-manager/lcp-manager";
import { clearCompendiumData, importCP } from "./comp-builder";
import { LANCER } from "./config";
import { EntryType } from "./enums";
import { LancerItem } from "./item/lancer-item";
import { LancerTokenDocument } from "./token";
import { get_pack, get_pack_id } from "./util/doc";
import { getBaseContentPack } from "./util/lcps";
import { version as coreUpdate } from "@massif/lancer-data/package.json";

const { log_prefix: lp } = LANCER;

/**
 * DataModels should internally handle any migrations across versions.
 * However, it can be helpful for efficiency to occasionally "write all" to world objects that are
 * consistently prepared.
 *
 * Call this when new versions happen, perhaps?
 */
export async function commitDataModelMigrations() {
  // Commit all world documents. Don't bother with packs.
  await Item.updateDocuments(game.items._source, { diff: false, recursive: false, noHook: true });
  await Actor.updateDocuments(game.actors._source, { diff: false, recursive: false, noHook: true });
  await Scene.updateDocuments(game.scenes._source, { diff: false, recursive: false, noHook: true }); // Will innately handle unlinked tokens
  ui.notifications?.info("All world Actors, Items, and Scenes migrated and data models cleaned.");
}

const migrationProgressBarLabel = () => `Migration to v${game.system.version} in progress...`;
let toMigrate = 1;
let migrated = 0;
/**
 * Update the progress bar for the migration
 */
function migrationProgress(count: number) {
  migrated += count;
  const percent = Math.floor((migrated / toMigrate) * 100);
  SceneNavigation.displayProgressBar({ label: migrationProgressBarLabel(), pct: percent });
}

/**
 * Some changes aren't neatly handleable via DataModels,
 * such as changes to prototype tokens or flags.
 * Instead handle these via migrateWorld.
 */
export async function migrateWorld() {
  const curr_version = game.settings.get(game.system.id, LANCER.setting_migration_version);

  // Migrate from the pre-2.0 compendium structure the combined compendiums
  if (foundry.utils.isNewerVersion("2.0.0", curr_version)) {
    console.log(`${lp} World is coming from 1.X. Show the migration journal and clear compendiums.`);
    // Show the migration journal if the world is coming from 1.X.
    const journals = await game.packs.get("lancer.lancer_info")?.getDocuments({ name: "LANCER System Information" });
    if (journals.length) {
      const systemInfo = journals[0] as JournalEntry;
      const migrationPage = systemInfo.pages.find(p => p.name.startsWith("Migrating"));
      await systemInfo.sheet?.render(true);
      const showPage = async () => {
        while (!systemInfo.sheet?.rendered) {
          await new Promise(r => setTimeout(r, 100));
        }
        // await new Promise(r => setTimeout(r, 3000));
        systemInfo.sheet?.goToPage(migrationPage._id);
      };
      showPage();
    }
    await clearCompendiumData({ v1: true });
    await migrateCompendiumStructure();
  }
  // Update World Compendium Packs, since updates comes with a more up to date version of lancerdata usually
  const coreData = await getBaseContentPack();
  await importCP(coreData.cp);
  await game.settings.set(game.system.id, LANCER.setting_core_data, coreData.availableVersion);

  // For some reason the commitDataModelMigrations call clears the progress bar, so we delay showing it.
  setTimeout(() => SceneNavigation.displayProgressBar({ label: migrationProgressBarLabel(), pct: 0 }), 1000);
  // Clean out old data fields so they don't cause issues
  await commitDataModelMigrations();

  if (game.settings.get(game.system.id, LANCER.setting_core_data) !== coreUpdate) {
    // Compendium migration failed.
    new Dialog({
      title: `Compendium Migration Failed`,
      content: `
<p>Something went wrong while attempting to build the core data Compendiums for the new Lancer system.
Please refresh the page to try again.</p>`,
      buttons: {
        accept: {
          label: "Refresh",
          callback: () => {
            ui.notifications.info("Page reloading in 3 seconds...");
            setTimeout(() => window.location.reload(false), 3000);
          },
        },
        cancel: {
          label: "Close",
        },
      },
      default: "accept",
    }).render(true);
  }

  function reduceScene(total: number, scene: Scene) {
    return (
      total +
      scene.tokens.contents.reduce((t2, token) => {
        t2 += 1; // Always count the token
        if (!token.isLinked) {
          // Add the actor and items
          t2 += 1 + (token.actor?.items.size || 0);
        }
        return t2;
      }, 0)
    );
  }

  // TODO: this count isn't accurate, but I'm not sure what is missing.
  // Gather up the total number of documents needing migration
  toMigrate = game.items.size;
  toMigrate += game.actors!.reduce((total, actor) => (total += 1 + actor.items.size), 0);
  toMigrate += game.scenes!.reduce(reduceScene, 0);
  for (const pack of game.packs.contents) {
    if (pack.metadata.type === "Item") toMigrate += pack.index.size;
    else if (pack.metadata.type === "Actor") {
      await pack.getDocuments();
      toMigrate += pack.contents.reduce((t2, actor) => (t2 += 1 + actor.items.size), 0);
    } else if (pack.metadata.type === "Scene") {
      await pack.getDocuments();
      toMigrate += pack.contents.reduce(reduceScene, 0);
    }
  }
  console.log(`Migrating approximately ${toMigrate} documents`);

  // Migrate compendiums
  for (let p of game.packs.contents) {
    if (p.metadata.packageType === "world") {
      await migrateCompendium(p);
    }
  }
  // Migrate World Actors
  let all_actor_updates = (await Promise.all(game.actors.contents.map(migrateActor))).filter(u => u && !!u._id);
  await Actor.updateDocuments(all_actor_updates);

  // Migrate World Items
  let all_item_updates = (await Promise.all(game.items.contents.map(migrateItem))).filter(u => u && !!u._id);
  await Item.updateDocuments(all_item_updates);

  // Migrate World Scenes
  await Promise.all(game.scenes.contents.map(migrateScene));

  // Set world as having migrated successfully
  await game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);
  // Update the progress bar to 100%
  migrationProgress(toMigrate);

  // Set the version for future migration and welcome message checking
  ui.notifications.info(`LANCER System Migration to version ${game.system.version} completed!`, {
    permanent: true,
  });
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 */
export async function migrateCompendium(pack: Compendium) {
  // Determine prior locked status
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  if (pack.locked) return ui.notifications.error(`Could not migrate ${pack.collection}: unable to unlock`);

  // Destroy packs we no longer support
  let name = pack.metadata.name;
  if (["sitrep", "environment", "faction", "tag", "quirk", "manufacturer"].includes(name)) {
    await pack.deleteCompendium();
    return;
  }

  await pack.migrate();

  // Iterate over compendium entries - applying fine-tuned migration functions
  if (pack.documentName == "Actor") {
    try {
      let documents = (await pack.getDocuments()) as LancerActor[];
      let updates = (await Promise.all(documents.map(migrateActor))).filter(u => u && !!u._id);
      await Actor.updateDocuments(updates, { pack: pack.collection, diff: false, recursive: false, noHook: true });
    } catch (e) {
      const packLabel = game.i18n.localize(pack.metadata.label);
      console.error(`Error while migrating actor compendium ${packLabel}:`, e);
      ui.notifications?.error(`Error while migrating actor compendium ${packLabel}. Check the console for details.`);
    }
  } else if (pack.documentName == "Item") {
    try {
      let documents = (await pack.getDocuments()) as LancerItem[];
      let updates = (await Promise.all(documents.map(migrateItem))).filter(u => u && !!u._id);
      await Item.updateDocuments(updates, { pack: pack.collection, diff: false, recursive: false, noHook: true });
    } catch (e) {
      const packLabel = game.i18n.localize(pack.metadata.label);
      console.error(`Error while migrating item compendium ${packLabel}:`, e);
      ui.notifications?.error(`Error while migrating item compendium ${packLabel}. Check the console for details.`);
    }
  } else if (pack.documentName == "Scene") {
    try {
      let documents = (await pack.getDocuments()) as Scene[];
      let updates = await Promise.all(documents.map(migrateScene));
      await Scene.updateDocuments(updates, { pack: pack.collection, diff: false, recursive: false, noHook: true });
    } catch (e) {
      const packLabel = game.i18n.localize(pack.metadata.label);
      console.error(`Error while migrating scene ${packLabel}:`, e);
      ui.notifications?.error(`Error while migrating scene ${packLabel}. Check the console for details.`);
    }
  } else {
    // We don't migrate macros or journals
  }

  // Re-lock if necessary
  await pack.configure({ locked: wasLocked });
  console.log(`Migrated all ${pack.documentName} entities from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to the specified version.
 * Internally asynchronously migrates all items, as it is not generally possible to batch this operation
 * @param actor   The actor to update
 * @return The updateData to apply to the provided actor
 */
export async function migrateActor(actor: LancerActor): Promise<object> {
  try {
    // Scaffold our update data
    const updateData = {
      _id: actor.id,
      // @ts-expect-error
      system: actor.system.toObject(true), // To commit any datamodel migrations
    };

    let currVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
    if (foundry.utils.isNewerVersion("2.0", currVersion)) {
      // ...
    }

    // Migrate Owned Items
    let itemUpdates = (await Promise.all(actor.items.contents.map(migrateItem))).filter(u => u && !!u._id);
    await actor.updateEmbeddedDocuments("Item", itemUpdates);
    migrationProgress(1);
    return updateData;
  } catch (e) {
    console.error(`Error while migrating actor [${actor.id} | ${actor.name}]:`, e);
    ui.notifications?.error(`Error while migrating actor ${actor.name}. Check the console for details.`);
    return {};
  }
}

/**
 * Migrate a single Item document to incorporate latest data model changes.
 * Currently does not need to be async, however, this will in the future allow us to migrate active effects if necessary
 * @param item The item to create an update payload for
 * @return The updateData to apply to the provided item
 */
export async function migrateItem(item: LancerItem): Promise<object> {
  try {
    const updateData = {
      _id: item.id,
      // @ts-expect-error
      system: item.system.toObject(true), // To commit any datamodel migrations
    };

    let currVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
    if (item.type === "license") {
      // #687 was a bug until 2.1.1. If the data is from before that, we need to fix it.
      if (foundry.utils.isNewerVersion("2.1.1", currVersion)) {
        console.log(`Fixing license lid for ${item.system.key}`);
        updateData.system.lid = `lic_${item.system.key}`;
      }
    }

    migrationProgress(1);
    // Return the migrated update data
    return updateData;
  } catch (e) {
    console.error(`Error while migrating item ${item.id} ${item.name}:`, e);
    return {};
  }
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides.
 * Doesn't actually update the scene, in most cases, just its embedded documents
 * @param scene  The Scene data to update
 */
export async function migrateScene(scene: Scene) {
  try {
    for (let token of scene.tokens.contents) {
      try {
        // Migrate unlinked token actors
        if (!token.isLinked && token.actor) {
          console.log(`Migrating unlinked token actor ${token.actor.name}`);
          let updateData = await migrateActor(token.actor);
          await token.actor.update(updateData);
        }
      } catch (e) {
        console.error(
          `Error while migrating unlinked token [${token.id} | ${token.name}] in scene [${scene.id} | ${scene.name}]:`,
          e
        );
        ui.notifications?.error(
          `Error while migrating unlinked token ${token.name} in scene ${scene.name}. Check the console for details.`
        );
      }
    }

    // Migrate all token documents
    let tokenUpdates = (await Promise.all(scene.tokens.contents.map(migrateTokenDocument))).filter(u => u && !!u._id);
    await scene.updateEmbeddedDocuments("Token", tokenUpdates);
  } catch (e) {
    console.error(`Error while migrating scene [${scene.id} | ${scene.name}]:`, e);
    ui.notifications?.error(`Error while migrating scene ${scene.name}. Check the console for details.`);
  }
}

/**
 * Migrates a TokenDocument (not the actor! just the token!).
 * @param token The token document to create an update payload for
 * @return The updateData to apply to the provided item
 */
export async function migrateTokenDocument(token: LancerTokenDocument): Promise<object> {
  try {
    const updateData = {
      _id: token.id,
    };

    let currVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
    if (foundry.utils.isNewerVersion("2.0", currVersion)) {
      // ...
    }

    migrationProgress(1);
    // Return update
    return updateData;
  } catch (e) {
    console.error(`Error while migrating token [${token.id} | ${token.name}]:`, e);
    return {};
  }
}

/**
 * Migrate pre 2.0 Compendium structure to the post-2.0 structure.
 * This operates on ALL compendiums that correspond to the old format and migrates them without confirmation
 */
export async function migrateCompendiumStructure() {
  await Promise.all(Object.values(EntryType).map(v => game.packs.get(`world.${v}`)?.configure({ locked: false })));

  // Delete all empty packs
  await Promise.all(
    Object.values(EntryType).map(v => {
      const p = game.packs.get(`world.${v}`);
      if (p && p.index.contents.length == 0) return p.deleteCompendium();
    })
  );

  const ets = Object.values(EntryType);
  for (let et of ets) {
    const documents = (await game.packs.get(`world.${et}`)?.getDocuments()) ?? [];
    console.log(`Moving ${documents.length} ${et} documents`);
    if (documents.length === 0) continue;
    const pack = await get_pack(et);
    const folder: Folder | undefined = [EntryType.NPC, EntryType.STATUS].includes(et)
      ? undefined
      : pack.folders.find(f => f.getFlag(game.system.id, "entrytype") === et) ??
        (await Folder.create(
          {
            name: game.i18n.localize(`TYPES.${pack.metadata.type}.${et}`),
            type: pack.metadata.type,
            [`flags.${game.system.id}.entrytype`]: et,
          },
          { pack: get_pack_id(et) }
        ));
    const doc_data = documents.map(d => ({ ...d.toObject(), folder: folder?.id }));
    const doc_class = documents[0].documentName;

    await CONFIG[doc_class].documentClass.createDocuments(doc_data, { pack: get_pack_id(et) });
    await game.packs.get(`world.${et}`)?.deleteCompendium();
  }
}
