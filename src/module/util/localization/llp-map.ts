/**
 * Stuff here actually applies the translations. The `translateFoobar` functions navigate each
 * document's data model, use its LID and possible LLP paths to look up translations from `llp-index`, and directly replace
 * the corresponding fields on the document's prepared data.
 *
 * Overrides (through the localization settings submenu) are applied directly using Foundry's `setProperty` function since
 * they should have fully qualified dotpaths.
 *
 * ---
 *
 * There are three key-value sources frankensteined here (and in turn llp-cards.ts) that I try to be semantically consistent with:
 *  - COMP/CON; also known as LCP Language Patches or LLPs for short - these are sourced from string extractors built by beeftime, third-party sources, and the COMP/CON output repo for C/C's Weblate stuff
 *  - Foundry; also known as game.i18n or 'the system' - these are sourced from locale files in `src/public/lang`, and whatever shipped with Foundry and other user modules.
 *  - Index; also known as 'the indexer' - is everything in src/util/localization, sourced from `translations` in llp-index.ts, as well as `overrides` and `translationCandidates` in llp-map.ts
 *
 * All of which naturally have their own dotpaths (not to be confused with Foundry data model dotpaths)
 */
import type { LancerActor, LancerDEPLOYABLE } from "../../actor/lancer-actor";
import { LANCER } from "../../config";
import type {
  LancerFRAME,
  LancerItem,
  LancerMECH_WEAPON,
  LancerNPC_FEATURE,
  LancerTALENT,
} from "../../item/lancer-item";
import type { ActionData } from "../../models/bits/action";
import type { CounterData } from "../../models/bits/counter";
import type { LLPLocalizationIndexOverrides } from "../../settings";
import { slugify } from "../lid";
import {
  hasTranslations,
  hasTranslationsFor,
  lookupTranslation,
  lookupTranslationCandidates,
  normalizePath,
  normalizeSlug,
  rebuildLLPIndex,
} from "./llp-index";
import { CORE_PATCH_TARGET, getInstalledPatches, normalizeLanguageCode } from "./llp-import";
import { EntryType } from "../../enums";
import { get_pack_id } from "../doc";

const lp = LANCER.log_prefix + " LLP |";

let llpSources = new Map<string, { lid: string; paths: Set<string> }>();

let translationsAreReady: () => void;
/**
 * Await this when you need to wait for the localization map but you're for some reason requesting earlier than it can finish (e.g. chat cards).
 *
 * This is a super basic implementation and does not cover when the index gets rebuilt but uh we'll cross that bridge when we get there
 */
export const translationsReady = new Promise<void>(r => {
  translationsAreReady = r;
});

/**
 * Keyed by Foundry object dotpath to translated value. Built in `rebuildOverrides`
 */
let overrides = new Map<string, string>();

//--- Debug

const stats = {
  applied: 0,
  documents: new Set<string>(),
  missed: new Set<string>(),
};

const reportStats = foundry.utils.debounce(() => {
  const sum = Array.from(stats.missed).reduce(
    (sum, lid) => sum + (llpSources.get(normalizeSlug(lid))?.paths.size ?? 0),
    0
  );
  // console.log(
  //   `${lp} Applied ${stats.applied} translations across ${stats.documents.size} documents; ${sum} fields of translated LIDs matched no key.`
  // );
  if (sum) {
    console.groupCollapsed(`${lp} ${sum} unresolved LLP paths`);
    for (const lid of stats.missed) {
      const source = llpSources.get(normalizeSlug(lid));
      if (!source?.paths.size) continue;

      console.groupCollapsed(`Foundry LID: ${lid}; LLP LID: ${source.lid}; Index LID: ${normalizeSlug(lid)}`);
      for (const path of source.paths) {
        console.log(path);
      }
      console.groupEnd();
    }
    console.groupEnd();
  }
  stats.applied = 0;
  stats.documents.clear();
  stats.missed.clear();
}, 2000);

//--- Foundry entry points for localization index

/**
 * Converts a Foundry data path to a positional path understood by the LLP index. Collapses indexed actions/profiles/etc into how it's represented in LLP data.
 * @param path
 * @returns
 * @remarks
 * This function helps anything requesting localization by the indexer from Foundry by just letting it give a path to return for
 * `lookupTranslation`
 *
 * This is jank because it loops around to converting Foundry paths into LLP paths into indexer but uh idk
 */
export function normalizeFoundryPath(path: string): string {
  return normalizePath(
    path
      // system.foo -> foo
      .replace(/^system\./, "")
      // profiles.0 -> profile_0
      .replace(/\bprofiles\.(\d+)/g, "profile_$1")
      // ranks.0 -> rank_0
      .replace(/\branks\.(\d+)/g, "rank_$1")
      // traits.0 -> trait_0
      .replace(/\btraits\.(\d+)/g, "trait_$1")
      // actions.0, active_actions.0, or passive_actions.0 -> action_0
      .replace(/\b(?:active_actions|passive_actions|actions)\.(\d+)/g, "action_$1")
      // synergies.0, active_synergies.0, or passive_synergies.0 -> synergy_0
      .replace(/\b(?:active_synergies|passive_synergies|synergies)\.(\d+)/g, "synergy_$1")
  );
}

/**
 * Some obj with string key properties keyed to a map of Foundry dotpaths keyed to an array of LLP dotpaths.
 */
const translationCandidates = new WeakMap<object, Map<string, string[]>>();

/**
 * @param foundryPath - Foundry data model dotpath
 * @candidates - Possible indexer candidates
 * @param format - Unholy matrimony of the indexer and Foundry for inserting translations retrieved from
 * the indexer into Foundry's `game.i18n.format` function (see `lookupFoundryTranslation`). Refer to actual implementation for further clarification
 * @remarks yo dawg I heard you like keys so I added another key map into your keys for your other keys to key off of
 */
export type TranslationRef = {
  foundryPath: string;
  candidates: string[];
  format?: {
    // Foundry system i18n stuff NOT indexer or LLP keys; DO NOT MIX THEM UP
    key: string; // game.i18n keys (e.g. `lancer.chatCard.title.coreActivation.label` -> "Core Activation :: {title}")
    data: Record<string, string | null>; // placeholder keys inside game.i18n keys (e.g. `title` in "Core Activation :: {title}") mapped to a replacement string. `null` placeholders receive the resolved LLP translation instead (e.g. indexer resolved string, "Bongo Blast", would replace "Core Activation :: {title}" entirely)
  };
};

/**
 * Stores an object with its possible candidate paths in the candidates cache
 * @param obj -
 * @param field -
 * @param candidates - Possible indexer candidates
 * @remarks Since candidates are stored per-object, something like say a mech system may exist as:
 *  - compendium item
 *  - world item
 *  - embedded item on actor x/y/z
 *
 * which is why I used a [WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
 * so that if the object gets discarded/reset/whatever garbate collection can remove their candidate entries automatically instead
 * of us. Technically means there may be dozens of the same copy but I don't see it being an issue.
 *
 * It is written this way because `apply` is designed to not have to know the exact dotpath.
 */
function storeTranslationCandidates(obj: object, field: string, candidates: string[]): void {
  let fields = translationCandidates.get(obj);
  if (!fields) {
    fields = new Map();
    translationCandidates.set(obj, fields);
  }

  fields.set(field, candidates);
}

/**
 * Given some object, searches the cached translation candidates for that object and returns its candidates.
 * @param obj - Object created during prepareData phase of a document
 * @param field - Property on `obj` that will receive the translated text; same as `apply`
 * @param foundryPath - Full Foundry system dotpath
 * @returns `TranslationRef` object. See implementation for more details
 */
export function createTranslationRef(
  obj: object | null | undefined,
  field: string,
  foundryPath: string
): TranslationRef {
  const candidates = obj && translationCandidates.get(obj)?.get(field);
  return {
    foundryPath,
    candidates: candidates ?? [normalizeFoundryPath(foundryPath)],
  };
}

/**
 * Looks up a translation for a document's LID and a Foundry subpath (e.g. `system.name`). This function normalizes
 * both inputs.
 * @param lid - Document LID
 * @param source - Foundry subpath
 * @returns undefined when no translation is installed for the active language
 */
export function lookupFoundryTranslation(lid: string, source: string | TranslationRef): string | undefined {
  const reference: TranslationRef =
    typeof source === "string" ? { foundryPath: source, candidates: [normalizeFoundryPath(source)] } : source;

  const override = overrides.get(`${lid}.${reference.foundryPath}`);
  const translation = override ?? lookupTranslationCandidates(lid, reference.candidates)?.value;
  if (translation === undefined) return undefined;

  if (!reference.format) return translation;
  const formatData = Object.fromEntries(
    Object.entries(reference.format.data).map(([key, value]) => [key, value ?? translation])
  );
  return game.i18n.format(reference.format.key, formatData);
}

// ---

function resolveLLPPath(lid: string, path: string): void {
  const source = llpSources.get(normalizeSlug(lid));
  if (!source) return;

  const normalizedPath = normalizePath(path);
  for (const sourcePath of source.paths) {
    if (normalizePath(sourcePath) === normalizedPath) source.paths.delete(sourcePath);
  }
}

function removeLLPKey(key: string): void {
  const parts = key.split(".");
  for (let i = 1; i < parts.length; i++) {
    const lid = parts.slice(0, i).join(".");
    const source = llpSources.get(normalizeSlug(lid));
    const path = parts.slice(i).join(".");
    source?.paths.delete(path);
  }
}

/**
 * Attempts to find a translation hit against given paths/subpaths and applies it to the object given at the target field.
 * @param lid - LID of the target
 * @param obj - Object document (`LancerItem`, `LancerActor`, `system`, whatever)
 * @param field - Property on `obj` that will receive the translated text
 * @param paths - LLP path containing the translated text to apply onto `obj`[`field`]
 */
function apply(lid: string, obj: unknown, field: string, paths: string[]): void {
  if (!obj || typeof obj !== "object") return;

  const target = obj as Record<string, unknown>; // Not actually what it is, just to allow easy string dereferencing
  storeTranslationCandidates(target, field, paths);
  if (typeof target?.[field] !== "string" || !target[field]) return;

  const hit = lookupTranslationCandidates(lid, paths);
  if (hit) {
    target[field] = hit.value;
    resolveLLPPath(lid, hit.path);
    stats.applied++;
    stats.documents.add(lid);
    return;
  }

  if (hasTranslationsFor(lid)) stats.missed.add(lid);
}

/**
 * Builds string segments of array items in CC's syntax
 * @param container
 * @param name
 * @param index
 * @return Normalized slug candidate(s) of a container; name and index
 * @remarks for CC's `action_0` syntax, where anything with a _0 and its siblings are actually an array item
 */
function entrySegments(container: string, name: string | undefined, index: number): string[] {
  const segments: string[] = [];
  if (name) segments.push(`${container}_${slugify(name)}`);
  segments.push(`${container}_${index}`);
  return segments;
}

/**
 * Joins every parent prefix with every segment
 * @param parents
 * @param segments
 * @return Cross product of every parent with every segment; "" on either side yields the other side alone at that level
 */
function join(parents: string[], segments: string[]): string[] {
  return parents.flatMap(parent =>
    segments.map(segment => (parent && segment ? `${parent}.${segment}` : parent || segment))
  );
}

//---

/**
 * Applies translations for `LancerItem`s
 * @param item
 */
export function translateItem(item: LancerItem): void {
  if (!hasTranslations() && !overrides.size) return;
  const lid = (item.system as { lid?: string }).lid;
  if (!lid) return;

  translateCommon(lid, item);

  if (item.is_frame()) {
    translateFrame(lid, item);
  } else if (item.is_talent()) {
    translateTalent(lid, item);
  } else if (item.is_mech_weapon()) {
    translateMechWeapon(lid, item);
  } //else if (item.is_npc_feature()) { TODO when beeftime extracts npc locales out
  //translateNPCFeature(lid, item);
  //}

  translateOverrides(lid, item);

  reportStats();
}

/**
 * Applies translations to common leaf nodes that all items share
 * @param lid
 * @param item
 */
function translateCommon(lid: string, item: LancerItem): void {
  const sys = item.system as Record<string, unknown>;
  apply(lid, item, "name", ["name"]);
  apply(lid, sys, "description", ["description"]);
  apply(lid, sys, "effect", ["effect"]);
  apply(lid, sys, "detail", ["detail"]); // Skills
  apply(lid, sys, "terse", ["terse"]); // Talents
  apply(lid, sys, "effects", ["effects"]); // Statuses
  apply(lid, sys, "mounted_effect", ["mounted_effect"]); // Core bonuses
  translateActions(lid, [""], sys.actions as ActionData[] | undefined);
  translateSynergies(lid, [""], sys.synergies as { detail: string }[] | undefined);
  translateCounters(sys.counters as CounterData[] | undefined);
}

/**
 *
 * @param lid
 * @param item
 */
function translateFrame(lid: string, item: LancerFRAME) {
  const cs = item.system.core_system;
  apply(lid, cs, "name", ["core_system.name"]);
  apply(lid, cs, "description", ["core_system.description"]);
  apply(lid, cs, "active_name", ["core_system.active_name"]);
  apply(lid, cs, "active_effect", ["core_system.active_effect"]);
  apply(lid, cs, "passive_name", ["core_system.passive_name"]);
  apply(lid, cs, "passive_effect", ["core_system.passive_effect"]);
  translateActions(lid, ["core_system"], cs.active_actions, ["action", "active_effect", "active"]);
  translateActions(lid, ["core_system"], cs.passive_actions, ["action", "passive_effect", "passive"]);
  // @ts-ignore TODO remove when types aren't borked
  translateSynergies(lid, ["core_system"], cs.active_synergies);
  // @ts-ignore TODO remove when types aren't borked
  translateSynergies(lid, ["core_system"], cs.passive_synergies);
  translateCounters(cs.counters);
  item.system.traits.forEach((trait, index) => {
    const prefixes = entrySegments("trait", trait.name, index);
    apply(lid, trait, "name", join(prefixes, ["name"]));
    apply(lid, trait, "description", join(prefixes, ["description"]));
    translateActions(lid, prefixes, trait.actions);
    // @ts-ignore TODO remove when types aren't borked
    translateSynergies(lid, prefixes, trait.synergies);
    translateCounters(trait.counters);
  });
}

/**
 *
 * @param lid
 * @param item
 */
function translateTalent(lid: string, item: LancerTALENT): void {
  item.system.ranks.forEach((rank, index) => {
    const prefixes = entrySegments("rank", rank.name, index);
    apply(lid, rank, "name", join(prefixes, ["name"]));
    apply(lid, rank, "description", join(prefixes, ["description"]));
    translateActions(lid, prefixes, rank.actions, ["action", "active_effect"]);
    // @ts-ignore TODO remove when types aren't borked
    translateSynergies(lid, prefixes, rank.synergies);
    translateCounters(rank.counters);
  });
}

/**
 *
 * @param lid
 * @param parents
 * @param synergies
 */
function translateSynergies(lid: string, parents: string[], synergies: { detail: string }[] | undefined): void {
  synergies?.forEach((synergy, index) => {
    apply(lid, synergy, "detail", join(parents, [`synergy_${index}.detail`]));
  });
}

/**
 *
 * @param counters
 * @remarks keyed by their own top-level LID
 */
function translateCounters(counters: CounterData[] | undefined): void {
  for (const counter of counters ?? []) {
    if (counter.lid) apply(counter.lid, counter, "name", ["name"]);
  }
}

/**
 * Builds the prefixes with `parents` to given `actions` and applies translations to each action
 * @param lid
 * @param parents
 * @param actions
 * @param containers
 * @remarks Named array entries are singularized slugged elements (`action_[slug of source name]`) of the system ones (`actions[i]`),
 * with a positional fallback (`action_[i]`) for unnamed entries like system actions (`ms_aceso_stabilizer.action_[i]`.
 */
function translateActions(
  lid: string,
  parents: string[],
  actions: ActionData[] | undefined,
  containers = ["action"]
): void {
  actions?.forEach((action, index) => {
    const prefixes = join(
      parents,
      containers.flatMap(container => entrySegments(container, action.name, index))
    );
    apply(lid, action, "name", join(prefixes, ["name"]));
    apply(lid, action, "detail", join(prefixes, ["detail"]));
    apply(lid, action, "trigger", join(prefixes, ["trigger"]));
    apply(lid, action, "terse", join(prefixes, ["terse"]));
  });
}

/**
 *
 * @param lid
 * @param item
 */
function translateMechWeapon(lid: string, item: LancerMECH_WEAPON): void {
  item.system.profiles.forEach((profile, index) => {
    const prefixes = [...entrySegments("profile", profile.name, index), ""];
    apply(lid, profile, "name", join(prefixes, ["name"]));
    apply(lid, profile, "description", join(prefixes, ["description"]));
    apply(lid, profile, "effect", join(prefixes, ["effect"]));
    apply(lid, profile, "on_attack", join(prefixes, ["on_attack.detail"]));
    apply(lid, profile, "on_hit", join(prefixes, ["on_hit.detail"]));
    apply(lid, profile, "on_crit", join(prefixes, ["on_crit.detail"]));
    translateActions(lid, prefixes, profile.actions);
    // @ts-ignore TODO remove when types aren't borked
    translateSynergies(lid, prefixes, profile.synergies);
    translateCounters(profile.counters);
  });
}

// TODO when beeftime extracts npc locales out also test
function translateNPCFeature(lid: string, item: LancerNPC_FEATURE): void {
  const sys = item.system as unknown as Record<string, unknown>;
  apply(lid, sys, "trigger", ["trigger"]);
  apply(lid, sys, "on_hit", ["on_hit.detail"]);
}

/**
 * Applies translations on `LancerActor`s
 * @param actor
 */
export function translateActor(actor: LancerActor): void {
  if (!hasTranslations() && !overrides.size) return;
  const lid = actor.system.lid;
  if (!lid) return;
  if (actor.is_deployable()) {
    translateDeployable(lid, actor);
  }

  translateOverrides(lid, actor);
  reportStats();
}

/**
 * Applies manual overrides from the settings menu to the document dotpath it specifies
 * @param lid
 * @param document
 */
function translateOverrides(lid: string, document: LancerItem | LancerActor): void {
  const lidPrefix = `${lid}.`;
  let applied = 0;
  for (const [destination, value] of overrides) {
    if (!destination.startsWith(lidPrefix)) continue;
    const destinationPath = destination.slice(lidPrefix.length);

    foundry.utils.setProperty(document, destinationPath, value);
    applied++;
  }

  if (!applied) return;
  stats.applied += applied;
  stats.documents.add(lid);
}

/**
 * Loads any missing preset override maps and persists them in the database
 */
async function loadOverrides(): Promise<LLPLocalizationIndexOverrides> {
  const configured = game.settings.get(game.system.id, LANCER.setting_localization_llp_index_override);

  // The actual name dictated by the lcp_manifest is preferred here because that's how it shows up in the override manager
  const overrides = {
    [CORE_PATCH_TARGET]: "lancer-data.json", // Except CRB data, but "lancer-data" is good enough lol since core data has no lcp_manifest
    "Lancer Long Rim Data": "long-rim-data.json",
    "Lancer Wallflower Data": "wallflower-data.json",
    "Operation Solstice Rain Data": "osr-data.json",
    "LANCER: Dustgrave": "dustgrave-data.json",
    "Siren's Song, A Mountain's Remorse": "ssmr-data.json",
    //"Operation Winter Scar": data is actually perfect,
    "Shadow of the Wolf": "sotw-data.json",
    "Lancer KTB Data": "ktb-data.json",
  };
  const loaded = { ...configured };
  const installedTargets = new Set(getInstalledPatches().map(patch => patch.target));
  for (const [target, file] of Object.entries(overrides)) {
    if (!installedTargets.has(target) || target in loaded) continue;

    const response = await fetch(`systems/${game.system.id}/llp-overrides/${file}`);
    loaded[target] = (await response.json()) as Record<string, string>;
  }

  if (game.user?.isGM && Object.keys(loaded).length !== Object.keys(configured).length) {
    await game.settings.set(game.system.id, LANCER.setting_localization_llp_index_override, loaded);
  }

  return loaded;
}

/**
 * (Re)builds the `overrides` map
 * @param loadedOverrides
 */
function rebuildOverrides(loadedOverrides: LLPLocalizationIndexOverrides): void {
  overrides = new Map();
  llpSources = new Map();
  const activeLanguage = normalizeLanguageCode(game.i18n.lang);

  for (const patch of getInstalledPatches()) {
    if (normalizeLanguageCode(patch.lang) !== activeLanguage) continue;

    for (const key of Object.keys(patch.data)) {
      const parts = key.split(".");
      for (let i = 1; i < parts.length; i++) {
        const lid = parts.slice(0, i).join(".");
        const path = parts.slice(i).join(".");
        const source = llpSources.get(normalizeSlug(lid)) ?? { lid, paths: new Set<string>() };

        source.paths.add(path);
        llpSources.set(normalizeSlug(lid), source);
      }
    }

    const packOverrides = loadedOverrides[patch.target];
    if (!packOverrides) continue;

    for (const [destination, source] of Object.entries(packOverrides)) {
      if (!source) continue;

      const sourceKeys = source.split(",").filter(Boolean);
      const translatedValues = sourceKeys.map(key => patch.data[key]);
      if (!sourceKeys.length || translatedValues.some(value => value === undefined)) continue;

      overrides.set(destination, translatedValues.join("<br><br>"));

      for (const key of sourceKeys) {
        removeLLPKey(key);
      }
    }
  }
}

/**
 * Applies translations from all the indexing built in llp-index onto Deployables
 * @param lid
 * @param actor
 * @remarks Deployables don't get their direct translations from their own LID, instead resolved through `rekeyDeployableSubtrees`
 */
function translateDeployable(lid: string, actor: LancerDEPLOYABLE): void {
  apply(lid, actor, "name", ["name"]);
  apply(lid, actor.system, "detail", ["detail"]);
  translateActions(lid, [""], actor.system.actions);
  // @ts-ignore TODO remove when types aren't borked
  translateSynergies(lid, [""], actor.system.synergies);
  translateCounters(actor.system.counters);
}

/**
 * Applies (or restores) the translated name on a single pack index entry
 * @param entry
 * @return Whether the entry's name changed
 * @remarks
 */
function translateIndexEntry(entry: unknown): boolean {
  interface IndexEntry {
    name?: string;
    system?: { lid?: string };
    _sourceName?: string;
  }

  const indexed = entry as IndexEntry;
  const lid = indexed?.system?.lid;
  if (!lid || typeof indexed.name !== "string") return false;

  const source = (indexed._sourceName ??= indexed.name);
  const next = lookupTranslation(lid, "name") ?? source;
  if (indexed.name === next) return false;
  indexed.name = next;

  return true;
}

/**
 * Applies (or restores) translated entry names on a pack's cached index
 * @param pack
 * @return Number of entry names changed
 * @remarks Modify the actual compendium indices so that they remain searchable
 */
export function translatePackIndex(pack: foundry.documents.collections.CompendiumCollection.Any): number {
  let applied = 0;
  for (const entry of pack.index) {
    if (translateIndexEntry(entry)) applied++;
  }

  return applied;
}

/**
 * Patches `CompendiumCollection` so index entries are translated:
 * - `getIndex`, for entries fetched from the server
 * - `indexDocument`, for entries during LCP import, and every document load (`CompendiumCollection#set` keeps reverting `name` to the source language)
 * @remarks A little jank. It technically overrides the getter for non-system compendiums as well, but should be fine since
 * `translateIndexEntry` checks each entry for the appropriate structure, so things like journals shouldn't be hit, as
 * they have no LID
 */
export function patchGetIndex(): void {
  const proto = foundry.documents.collections.CompendiumCollection.prototype;

  const ogGetIndex = proto.getIndex;
  proto.getIndex = async function (options) {
    const index = await ogGetIndex.call(this, options);
    translatePackIndex(this);
    return index;
  };

  const ogIndexDocument = proto.indexDocument;
  proto.indexDocument = function (document) {
    ogIndexDocument.call(this, document);
    translateIndexEntry(this.index.get(document.id));
  };
}

/**
 * Rebuilds the LLP index and rerenders open Foundry documents.
 *
 * Run every time documents need to swap translations.
 * @remarks
 */
export async function refreshLLPTranslations(): Promise<void> {
  await rebuildLLPIndex();
  rebuildOverrides(await loadOverrides());

  const start = performance.now();
  let reset = 0;
  // Reset the actors and items
  for (const item of game.items ?? []) {
    item.reset();
    reset++;
  }
  for (const actor of game.actors ?? []) {
    actor.reset();
    reset++;
  }

  // Reset compendium entries; `game.packs`/compendium entries are lazy loaded
  for (const id of new Set(Object.values(EntryType).map(get_pack_id))) {
    const pack = game.packs.get(id);
    for (const doc of pack?.contents ?? []) {
      doc.reset();
      reset++;
    }
  }

  // Signal that the index, overrides, and translation candidates are ready.
  translationsAreReady();

  // Retranslate (or restore, on removal) every cached pack index so listings and search match the new state
  let renamed = 0;
  for (const pack of game.packs) {
    renamed += translatePackIndex(pack);
  }

  // Rerender open documents
  let rendered = 0;
  for (const app of foundry.applications.instances.values()) {
    // ApplicationV2
    if (app.element?.querySelector(".svelte-app-mount")) continue; // Do not touch Svelte apps
    await app.render();
    rendered++;
  }
  for (const app of Object.values(ui.windows)) {
    // ApplicationV1
    app.render(false);
    rendered++;
  }

  console.debug(
    `${lp} Reset ${reset} documents, renamed ${renamed} index entries, and re-rendered ${rendered} windows in
    ${(performance.now() - start).toFixed(0)}ms.`
  );
}

// ---

/**
 * Jank-ass debounce to cover the case where an LLP is installed before its LCP is present and the compendium indices need to be updated
 * @remarks Soon™
 */
export const refreshLLPTranslationsSoon = foundry.utils.debounce(() => refreshLLPTranslations(), 1000);
