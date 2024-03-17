// @ts-nocheck
// We do not care about this file being super rigorous
import { LancerActor } from "./actor/lancer-actor";
import { core_update, LCPManager, updateCore } from "./apps/lcp-manager";
import { LANCER } from "./config";
import { EntryType } from "./enums";
import { LancerItem } from "./item/lancer-item";
import { LancerTokenDocument } from "./token";
import { get_pack, get_pack_id } from "./util/doc";

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
  ui.notifications?.info("All world documents models re-committed to database");
}

/**
 * Get the version messages from previous version to this version
 */
function getMigrationMessage() {
  const currentVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
  // @ts-expect-error
  const newVersion = game.system.version;
  let message = `<h1>Lancer ${currentVersion} -> ${newVersion}  Migration</h1>
<div class="desc-text">
  <span class="horus--subtle" style="white-space: pre">
  WELCOME, LANCER.
      PLEASE STAND BY WHILE WE MAKE SOME CHANGES.
                                    (this won't hurt a bit)
  </span>
</div>
<p>
  Migration of Actors, Items, Scenes, and Tokens is ongoing in the background. 
  <b>DO NOT LOG OFF OR CLOSE THE GAME</b>
  until you see the notification "LANCER System Migration to version ${game.system.version} completed".
</p>
`;

  if (foundry.utils.isNewerVersion("2.0.0", currentVersion)) {
    message += `<h2>New version breaking data changes</h2>
<p>The Lancer system has undergone a fairly significant change since the 1.x versions, including
simplifications of most of of the data model, as well as the removal of our machine-minds. More importantly, Foundry
has evolved significantly as a platform, allowing us to do a lot of nice cleanup in how we store and work with data.
As such, we once again need to migrate! Improvements in how foundry tracks and validates data should make this a
fairly painless operation, and luckily the chance of your world being bricked are lower than ever though possible!</p>

<p>After lengthy debate, we have trimmed some of the fat in our data models. As such, the following item types are now
deprecated:</p>
<ul>
  <li><code>tag</code>s - which are now tracked via the world settings for efficiency and consistency.</li>
  <li><code>manufacturer</code>s - which never really warranted an "item", and are now just a string on licensed items.</li>
  <li><code>sitreps</code>s - which were barely supported to begin with, and didn't make sense to keep as an item.</li>
  <li><code>environments</code>s - which may see an eventual return, were not supported or implemented to our liking.</li>
  <li><code>factions</code>s - which may see an eventual return as a journal entry type when those are supported</li>
  <li><code>quirks</code>s - which seemed to fit better as just a text box.</li>
</ul>`;
  }

  return message;
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
    await migrateCompendiumStructure();
  }
  // Update World Compendium Packs, since updates comes with a more up to date version of lancerdata usually
  await updateCore(core_update);

  if (game.settings.get(game.system.id, LANCER.setting_core_data) === core_update) {
    // Open the LCP manager for convenience.
    new LCPManager().render(true);

    // Compendium migration succeeded, prompt to migrate actors.
    new Dialog(
      {
        title: `Migration Details`,
        content: getMigrationMessage(),
        buttons: {
          accept: { label: "Ok" },
        },
      },
      {
        width: 800,
      }
    ).render(true);
  } else {
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

  // Migrate compendiums
  for (let p of game.packs.contents) {
    if (p.metadata.packageType === "world") {
      await migrateCompendium(p);
    }
  }
  // Migrate World Actors
  let all_actor_updates = await Promise.all(game.actors.contents.map(migrateActor));
  await Actor.updateDocuments(all_actor_updates);

  // Migrate World Items
  let all_item_updates = await Promise.all(game.items.contents.map(migrateItem));
  await Item.updateDocuments(all_item_updates);

  // Migrate World Scenes
  await Promise.all(game.scenes.contents.map(migrateScene));

  // Set world as having migrated successfully
  await game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);

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
    let documents = (await pack.getDocuments()) as LancerActor[];
    let updates = await Promise.all(documents.map(migrateActor));
    await Actor.updateDocuments(updates, { pack: pack.collection });
  } else if (pack.documentName == "Item") {
    let documents = (await pack.getDocuments()) as LancerItem[];
    let updates = await Promise.all(documents.map(migrateItem));
    await Item.updateDocuments(updates, { pack: pack.collection });
  } else if (pack.documentName == "Scene") {
    let documents = (await pack.getDocuments()) as Scene[];
    let updates = await Promise.all(documents.map(migrateScene));
    await Scene.updateDocuments(updates, { pack: pack.collection });
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
  let itemUpdates = await Promise.all(actor.items.contents.map(migrateItem));
  await actor.updateEmbeddedDocuments("Item", itemUpdates);
  return updateData;
}

/**
 * Migrate a single Item document to incorporate latest data model changes.
 * Currently does not need to be async, however, this will in the future allow us to migrate active effects if necessary
 * @param item The item to create an update payload for
 * @return The updateData to apply to the provided item
 */
export async function migrateItem(item: LancerItem): Promise<object> {
  const updateData = {
    _id: item.id,
    // @ts-expect-error
    system: item.system.toObject(true), // To commit any datamodel migrations
  };

  let currVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
  if (foundry.utils.isNewerVersion("2.0", currVersion)) {
    // ...
  }

  // Return the migrated update data
  return updateData;
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides.
 * Doesn't actually update the scene, in most cases, just its embedded documents
 * @param scene  The Scene data to update
 */
export async function migrateScene(scene: Scene) {
  for (let token of scene.tokens.contents) {
    // Migrate unlinked token actors
    if (!token.isLinked) {
      console.log(`Migrating unlinked token actor ${token.actor.name}`);
      let updateData = await migrateActor(token.actor);
      await token.actor.update(updateData);
    }
  }

  // Migrate all token documents
  let tokenUpdates = await Promise.all(scene.tokens.contents.map(migrateTokenDocument));
  await scene.updateEmbeddedDocuments("Token", tokenUpdates);
}

/**
 * Migrates a TokenDocument (not the actor! just the token!).
 * @param token The token document to create an update payload for
 * @return The updateData to apply to the provided item
 */
export async function migrateTokenDocument(token: LancerTokenDocument): Promise<object> {
  const updateData = {
    _id: token.id,
  };

  let currVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);
  if (foundry.utils.isNewerVersion("2.0", currVersion)) {
    // ...
  }

  // Return update
  return updateData;
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
