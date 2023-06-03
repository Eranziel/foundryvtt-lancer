// @ts-nocheck
// We do not care about this file being super rigorous
import { LANCER } from "./config";
import { LancerActor } from "./actor/lancer-actor";
import { LancerItem } from "./item/lancer-item";
import { core_update, LCPManager, updateCore } from "./apps/lcp-manager";
import { LancerTokenDocument } from "./token";
import { lookupLID } from "./util/lid";
import { PackedNpcClassStats } from "./util/unpacking/packed-types";

export type MigrationVersion = "breaking" | "2.0";

/**
 * DataModels should internally handle any migrations across versions.
 * However, it can be helpful for efficiency to occasionally "write all" to world objects that are
 * consistently prepared
 */
export async function commitDataModelMigrations() {
  // Commit all world documents. Don't bother with packs.
  await Item.updateDocuments(game.items._source, { diff: false, recursive: false, noHook: true });
  await Actor.updateDocuments(game.actors._source, { diff: false, recursive: false, noHook: true });
  await Scene.updateDocuments(game.scenes._source, { diff: false, recursive: false, noHook: true }); // Will innately handle unlinked tokens
  ui.notifications?.info("All world documents models re-committed to database");
}

/**
 * Some changes aren't neatly handleable via DataModels,
 * such as changes to prototype tokens or flags.
 * Instead handle these via migrateWorld.
 */
export async function migrateWorld() {
  // Update World Compendium Packs, since updates comes with a more up to date version of lancerdata usually
  await updateCore(core_update);

  if (game.settings.get(game.system.id, LANCER.setting_core_data) === core_update) {
    // Open the LCP manager for convenience.
    new LCPManager().render(true);

    // Compendium migration succeeded, prompt to migrate actors.
    new Dialog(
      {
        title: `Migration Details`,
        content: `
<h1>Lancer 2.0 Migration - Now with 100% more data validation!</h1>
<div class="desc-text">
<span class="horus--subtle" style="white-space: pre">
WELCOME, LANCER.
     PLEASE STAND BY WHILE WE MAKE SOME CHANGES.
                                  (this won't hurt a bit)
</span></div>
<p>The Lancer system has undergone a fairly significant since the 1.x versions, including simplifications of most of
of the data model, as well as the removal of our machine-minds. More importantly, foundry has evolved significantly 
as a platform, allowing us to do a lot of nice cleanup in how we store and work with data. As such, we once again need 
to migrate! Improvements in how foundry tracks and validates data should make this a fairly painless operation, and luckily 
the chance of your world being bricked are lower than ever though possible!.

<h2>Migration is in progress!</h2>

Migration of Actors, Items, Scenes, and Tokens is ongoing in the background. <b>DO NOT LOG OFF OR CLOSE THE GAME</b>
until you see the notification "LANCER System Migration to version ${game.system.version} completed".</p>
<h2>New version breaking changes</h2>
After lengthy debate, we have trimmed some of the fat in our data models. 
As such, the following item types are now deprecated:
<ul>
<li>"tag"s - which are now tracked via the world settings for efficiency and consistency.</li>
<li>"manufacturer"s - which never really warranted an "item", and are now just a string on licensed items.</li>
<li>"sitreps"s - which were barely supported to begin with, and didn't make sense to keep as an item.</li>
<li>"environments"s - which may see an eventual return, were not supported or implemented to our liking.</li>
<li>"factions"s - which may see an eventual return as a journal entry type when those are supported</li>
<li>"quirks"s - which seemed to fit better as just a text box.</li>
</ul>
`,
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
          callback: async () => {
            ui.notifications.info("Page reloading in 3...");
            await sleep(1000);
            ui.notifications.info("2...");
            await sleep(1000);
            ui.notifications.info("1...");
            await sleep(1000);
            window.location.reload(false);
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
  let all_scene_updates = await Promise.all(game.scenes.contents.map(migrateScene));
  await Scene.updateDocuments(all_scene_updates);

  // Set world as having migrated successfully
  await game.settings.set(game.system.id, LANCER.setting_migration, game.system.version);

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
  console.log(`Migrated all ${docName} entities from Compendium ${pack.collection}`);
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
    system: actor._source, // To commit any datamodel migrations
  };

  let currVersion = game.settings.get(game.system.id, LANCER.setting_migration);
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
    system: item._source, // To commit any datamodel migrations
  };

  let currVersion = game.settings.get(game.system.id, LANCER.setting_migration);
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
      let updateData = await migrateActor(token.actor, ver);
      await token.actor.update(updateData);
    }

    await token.migrateTokenDocument(token, ver);
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
  const updateData = {};

  let currVersion = game.settings.get(game.system.id, LANCER.setting_migration);
  if (foundry.utils.isNewerVersion("2.0", currVersion)) {
    // ...
  }

  // Return update
  return updateData;
}

// ----------------- UTILITY FUNCTIONS -----------------------

// Used in many datamodel migrations. Imperfect, but we can only do this sync, so fuck us I guess lmao
export function regRefToUuid(doc_type: "Item" | "Actor", rr: any): null | string {
  // Handle null case
  if (!rr) return null;
  if (typeof rr == "string") return rr;
  if (rr.reg_name == "comp_core" && rr.fallback_lid) {
    return null; // Nothing we could do, dude
    // await lookupLID(rr.fallback_lid); -- if we had time for async, we would async
  } else if (rr.reg_name == "game") {
    // World entities are quite simple
    return `${doc_type}.${rr.id}`;
  } else {
    console.error("Failed to process regref", rr);
    return null; // Unhandled
  }
}

export function regRefToLid(rr: any): null | string {
  // Handle null case
  if (!rr) return null;
  if (typeof rr == "string") return rr;
  return rr.fallback_lid || null;
}

// Returns a corrected bar attribute or, if one could not be deduced, just hp
// Used for fixing old derived.* attrs
export function correctLegacyBarAttribute(attr_name: string | null): string {
  attr_name = attr_name || ""; // sanity
  if (attr_name.includes("heat")) {
    return "heat";
  } else if (attr_name.includes("hp")) {
    return "hp";
  } else if (attr_name.includes("shield")) {
    return "overshield";
  } else if (attr_name.includes("burn")) {
    return "burn";
  } else if (attr_name.includes("struct")) {
    return "structure";
  } else if (attr_name.includes("stress")) {
    return "stress";
  } else if (attr_name.includes("rep")) {
    return "repairs";
  } else {
    return "hp"; // a safe alternative
  }
}

/** Converts a stat array from compcon/old lancer standard to modern standards */
export function convertNpcStats(
  bs: Partial<PackedNpcClassStats>,
  shim_missing: boolean
): SourceData.NpcClass["base_stats"] {
  let stats: SourceData.NpcClass["base_stats"] = [];

  // Go through either all keys, or present keys, depending on shim_missing
  let keys = shim_missing
    ? [
        "activations",
        "agility",
        "armor",
        "edef",
        "engineering",
        "evade",
        "heatcap",
        "hp",
        "hull",
        "save",
        "sensor",
        "size",
        "speed",
        "stress",
        "structure",
        "systems",
      ]
    : Array.from(Object.keys(bs));

  for (let i = 0; i < 3; i++) {
    // Extreme data coersion go! We can accept any of number, number[], or number[][]
    const giv = (key: string) => {
      let x: number | number[] | number[][] = bs[key] ?? [0];
      if (!(typeof x == "number" || Array.isArray(x))) return 0; // Sanity check
      x = Array.isArray(x) ? x : [x]; // number -> number[]
      x = x.length == 0 ? [0] : x; // [] -> [0]
      let y = i >= x.length ? x[x.length - 1] : x[i]; // get closest element of x to our tier index
      let z = Array.isArray(y) ? y[0] : y; // if it's still an array (e.g. original was number[][]), just take first element. we don't handle that
      if (typeof z != "number") return 0; // Second sanity check
      return z;
    };

    // Go through either all keys, or present keys
    let record = {};
    for (let k of keys) {
      record[k] = giv(k);
    }
    stats.push(record);
  }
  return stats;
}
