/**
 * Stuff here actually applies the translations. The `translateFoobar` functions navigate each
 * document's data model, use its LID and possible LLP paths to look up translations from `llp-index`, and directly replace
 * the corresponding fields on the document's prepared data.
 *
 * Overrides (through the localization settings submenu) are applied directly using Foundry's `setProperty` function since
 * they should have fully qualified dotpaths.
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
import { hasTranslations, hasTranslationsFor, lookupTranslation, normalizeSlug, rebuildLLPIndex } from "./llp-index";
import { CORE_PATCH_TARGET, getInstalledPatches, normalizeLanguageCode } from "./llp-import";
import { EntryType } from "../../enums";
import { get_pack_id } from "../doc";

const lp = LANCER.log_prefix + " LLP |";

//---

const stats = {
  applied: 0,
  documents: new Set<string>(),
  missed: new Set<string>(),
};

let llpSources = new Map<string, { lid: string; paths: Set<string> }>();

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

//---

/**
 * Keyed by Foundry object dotpath to translated value. Built in `rebuildOverrides`
 */
let overrides = new Map<string, string>();

function normalizePath(path: string): string {
  return path.split(".").map(normalizeSlug).join(".");
}

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
 * @param obj - Object (`LancerItem`, `LancerActor`, `system`, whatever) that directly contains the field being translated
 * @param field - Property on `obj` that will receive the translated text
 * @param paths - LLP path containing the translated text to apply onto `obj`[`field`]
 */
function apply(lid: string, obj: unknown, field: string, paths: string[]): void {
  const target = obj as Record<string, unknown>; // Type cast basically just to satisfy TS as some object with string key properties
  if (typeof target?.[field] !== "string" || !target[field]) return;
  for (const path of paths) {
    const hit = lookupTranslation(lid, path);
    if (!hit) continue;

    target[field] = hit;
    resolveLLPPath(lid, path);
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
