/**
 * COMP/CON LID                Translation Map
 *       │ normalizeSlug() ┌─► [normalized LID]
 *       ▼                 │   │
 * [normalized LID] ───────┘   └►[normalized dotpath]
 *       ▲                       │
 *       │ normalizeSlug()       └►[translated text]
 * Foundry LID
 * ---------(shout out to my GOAT asciiflow.com)----------
 * It exists this way because of say, deployable LIDs and by extension, their paths:
 * COMP/CON - `mf_hydra.core_system.deployable_guardian_orochi_drone.name`
 * Foundry - `dep_guardian_(orochi_drone).name`
 * LLP Index (you are here) - As a special exception `rekeyDeployables()` rips apart the LLP path and normalizes it into `dep_guardian_orochi_drone.name`
 *
 * It's a little overengineered, but I did this because of three things:
 * 1. This lets localization be a completely isolated in case either COMP/CON or the system dramatically changes LIDs/dotpathing/whatever
 * 2. Trying to key directly to Foundry's dotpath from here means I have to know the shape of the data model ahead of time, which is a headache when the models can completely differ from one another (we're still on V2 but I'm checking against LLP's V3-derived data; fml)
 * 3. Changing how Foundry LIDs are parsed will fuck up everything and I really don't want to handle migration and neither can I ask beef to change his slugifiers
 *
 * The actual translation functions in `llp-map.ts` will then generate their likely candidates which `lookupTranslation()` will normalize before checking the index.
 */
import { LANCER } from "../../config";
import { EntryType } from "../../enums";
import { get_pack_id } from "../doc";
import { getInstalledPatches, normalizeLanguageCode } from "./llp-import";

const lp = LANCER.log_prefix + " LLP |";

//---

/**
 * Every LID the world's Lancer compendiums hold, both verbatim and in normalized spelling.
 * Could be a single Set, idk
 */
type LIDIndex = {
  exact: Set<string>;
  normalized: Map<string, string>; // normalized LID -> exact LID
};

/**
 * Merged translations for the active language, keyed by normalized LID and then by normalized LLP subpath
 * (e.g. `{"ms___scorpion_v70_1": {"action_activate_scorpion.detail": "bonjour world"}}`). Every document resolves its
 * text through this map via `lookupTranslation(lid, path)`; anything that cannot be keyed by its own LID must be rekeyed
 * into that form during `rebuildLLPIndex` (see: `rekeyDeployables`).
 */
let translations: Map<string, Map<string, string>> = new Map(); // normalized LID -> (normalized subpath -> translation)

//---

/**
 * Collapses a slug/LID/path segment to lowercase `[a-z0-9]` strings joined by `_`, so spellings from the Lancer system's
 * `slugify` (see: top of this file) and from COMP/CON's slugifier can be compared.
 * @param s
 */
export function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Normalizes each segment of an LLP subpath.
 */
export function normalizePath(path: string): string {
  return path.split(".").map(normalizeSlug).join(".");
}

/**
 * Sweeps every Lancer compendium for the LIDs they hold.
 */
export async function buildLIDIndex(): Promise<LIDIndex> {
  const start = performance.now();
  const lids: LIDIndex = {
    exact: new Set(),
    normalized: new Map(),
  };

  const packIDs = new Set(Object.values(EntryType).map(get_pack_id));
  let sweptPacks = 0;
  for (const id of packIDs) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    await pack.getIndex(); // Compendium indices are lazy-loaded, so this needs to be here so we can read them
    sweptPacks++;

    pack.index.forEach(entry => {
      // Grab LIDs of all compendium entries and add them to the index
      const lid = (entry as { system?: { lid?: string } }).system?.lid;
      if (lid) {
        lids.exact.add(lid);
        lids.normalized.set(normalizeSlug(lid), lid);
      }
    });
  }

  console.debug(
    `${lp} Indexed ${lids.exact.size} compendium LIDs across ${sweptPacks}/${packIDs.size} packs in
    ${(performance.now() - start).toFixed(0)}ms.`
  );
  return lids;
}

/**
 * Splits a patch key into its LID and subpath by pruning down from the full length against known LIDs.
 * @param key - CC's patch key (e.g. `ms___scorpion_v70.1.action_activate_scorpion.detail`)
 * @param lids - The built LID Index
 * @return null when no head of the key is a known LID (target not installed, or a key like `GMS.name`/`act_*`, sitreps, etc),
 * otherwise returns an object like
 * ```
 * {
 *   lid: "ms___scorpion_v70.1", // This is an LID as this system understands it
 *   path: "action_activate_scorpion.detail" // This is CC's/the LLP's dotpath
 * }
 * ```
 */
export function splitPatchKey(key: string, lids: LIDIndex): { lid: string; path: string } | null {
  const parts = key.split(".");
  // Thanks to shit like `ms___scorpion_v70.1` it is better to read the tail as the head
  for (let i = parts.length - 1; i > 0; i--) {
    const head = parts.slice(0, i).join(".");
    const path = parts.slice(i).join(".");

    if (lids.exact.has(head)) {
      return {
        lid: head,
        path: path,
      };
    }
  }

  return null;
}

/**
 * Rebuilds the runtime translation index: merges every installed patch matching the user's language into the LID-keyed
 * store, then rekeys exceptions/special cases into entries of their own.
 *
 * Run this whenever the LLP cache is changed.
 */
export async function rebuildLLPIndex(): Promise<void> {
  const start = performance.now();
  translations = new Map();

  const lang = normalizeLanguageCode(game.i18n.lang);
  const installed = getInstalledPatches();
  const patches = installed.filter(patch => normalizeLanguageCode(patch.lang) === lang);
  console.log(
    `${lp} Rebuilding translation index for '${lang}': ${patches.length}/${installed.length} installed patches match.`
  );
  if (!patches.length) {
    console.log(`${lp} No patches for '${lang}'; compendium text will render untranslated.`);
    return;
  }

  const lids = await buildLIDIndex();

  // Find and store translations for LIDs of the index
  let stored = 0;
  const discarded: { key: string; value: string }[] = []; // Store for potential rekeying
  for (const patch of patches) {
    for (const [key, value] of Object.entries(patch.data)) {
      const hit = splitPatchKey(key, lids);
      if (!hit) {
        discarded.push({ key, value });
        continue;
      }

      storeTranslation(hit.lid, hit.path, value);
      stored++;
    }
  }

  // Rekey common patterns that require special handling and store their translations for LIDs we know
  const rekeyedDeployables = rekeyDeployables();
  const rekeyedCounters = rekeyCounters(discarded);
  const rekeyedTags = rekeyTags(discarded);
  // const rekeyedBonds = TODO when beeftime extracts bond strings to compcon-locale

  console.debug(
    `${lp} Stored ${stored} translations for ${translations.size} LIDs (rekeyed: ${rekeyedDeployables} deployables,
    ${rekeyedCounters} counters, ${rekeyedTags} tags) in ${(performance.now() - start).toFixed(0)}ms;
    ${discarded.length} keys matched no LID.`
  );
  if (discarded.length) {
    console.debug(`${lp} ${discarded.length} unmatched patch keys`);
    // console.groupCollapsed(`${lp} ${discarded.length} unmatched patch keys`);
    // const sorted = discarded.sort((a, b) => a.key.localeCompare(b.key));
    // for (const entry of sorted) {
    //   console.log(entry.key);
    // }
    // console.groupEnd();
  }
}

/**
 * Stores the translation by its `normalized LID -> (normalized subpath -> translation)`
 * @param lid
 * @param path
 * @param value
 * @remarks
 * e.g.
 * ```
 * "ms_scorpion_v70_1": { { action_activate_scorpion.trigger: "bonjour world" } } // Note how we don't store the actual LID (ms_scorpion_v70_1 vs ms_scorpion_v70.1)
 * ```
 */
function storeTranslation(lid: string, path: string, value: string): void {
  const lidKey = normalizeSlug(lid);
  let paths = translations.get(lidKey);
  if (!paths) translations.set(lidKey, (paths = new Map()));
  paths.set(normalizePath(path), value);
}

/**
 * Special exception handler rekeying deployable subtrees
 * @return Number of entries copied
 * @remarks Copies rather than moves — owners still resolve the nested text for their own rendering
 */
function rekeyDeployables(): number {
  const aliases: { lid: string; path: string; value: string }[] = [];
  /**
   * In CC deployable text nests under the owning item (`reserve_deployable_shield.deployable_deployable_shield_reserve.name`)
   * while the actor is unpacked with `lid: "dep_" + slugify(name)`, which can produce lids like `dep_deployable_shield_(reserve)`.
   * Copy every `deployable_<slug>` subtree to an entry under `dep_<slug>`, so deployable actors resolve through the same
   * `lookupTranslation` as everything else.
   */
  for (const paths of translations.values()) {
    for (const [path, value] of paths) {
      const parts = path.split(".");
      const at = parts.findIndex(part => part.startsWith("deployable_"));
      if (at === -1) continue;
      const rest = parts.slice(at + 1).join(".");
      if (!rest) continue; // Malformed key ending at the segment itself

      aliases.push({ lid: "dep_" + parts[at].slice("deployable_".length), path: rest, value });
    }
  }

  for (const alias of aliases) {
    storeTranslation(alias.lid, alias.path, alias.value);
  }

  return aliases.length;
}

/**
 * Special exception handler rekeying counters
 * @param discarded - Entries the main pass matched no LID for; rekeyed entries are removed in place
 * @return Number of entries rekeyed
 */
function rekeyCounters(discarded: { key: string; value: string }[]): number {
  return rekeyDotlessLIDs(discarded, "ctr_");
}

/**
 * Special exception handler rekeying tags
 * @param discarded - Entries the main pass matched no LID for; rekeyed entries are removed in place
 * @return Number of entries rekeyed
 */
function rekeyTags(discarded: { key: string; value: string }[]): number {
  return rekeyDotlessLIDs(discarded, "tg_");
}

/**
 * Stores discarded keys whose LIDs matching a given prefix have no subtrees
 * @param discarded - Entries the main pass matched no LID for; rekeyed entries are removed in place
 * @param prefix - LID prefix whose keys are safe to split at the first dot (e.g. `tg_`/`ctr_`)
 * @return Number of entries rekeyed
 */
function rekeyDotlessLIDs(discarded: { key: string; value: string }[], prefix: string): number {
  let rekeyed = 0;
  for (let i = discarded.length - 1; i >= 0; i--) {
    const { key, value } = discarded[i];
    const [head, ...rest] = key.split(".");
    if (!head.startsWith(prefix) || !rest.length) continue;

    storeTranslation(head, rest.join("."), value);
    discarded.splice(i, 1);
    rekeyed++;
  }

  return rekeyed;
}

/**
 * Looks up a translation for a document's LID and an LLP subpath (e.g. `name`, `description`). This function normalizes
 * both inputs.
 * @return undefined when no translation is installed for the active language
 * @param lid
 * @param path
 */
export function lookupTranslation(lid: string, path: string): string | undefined {
  return translations.get(normalizeSlug(lid))?.get(normalizePath(path));
}

/**
 * @return Whether any translations are loaded for the active language
 */
export function hasTranslations(): boolean {
  return translations.size > 0;
}

/**
 *
 * @param lid
 * @return Whether any translations are loaded for the given LID
 */
export function hasTranslationsFor(lid: string): boolean {
  return translations.has(normalizeSlug(lid));
}
