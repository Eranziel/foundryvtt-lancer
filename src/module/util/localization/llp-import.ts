import { LANCER } from "../../config";
import { CORE_BREW_ID, type LCPData } from "../lcps";
import type { OfficialLocaleHandle } from "./llp-fetch";
import { type IContentPackManifest, type PackedLanguagePatchWrapper } from "../unpacking/packed-types";

/**
 * Summary of an LLP's contents, for use in the LCP Manager app.
 * @param target - LCP the patch translates
 * @param lang
 * @param translator
 * @param translationVersion
 * @param lines - Number of entries under the patch's `data` key
 * @remarks Kept separate so that attribution, target, etc can be preserved in aggregate summaries
 */
export type LLPSummaryEntry = {
  target: string;
  lang: string;
  translator: string;
  translationVersion: string;
  lines: number;
};

/**
 * Summary wrapper for LCP Language Patches, for use in the LCP Manager app.
 * @param targetVersion - Version range of the LCP the translation was written against
 * @param lastUpdate
 * @param website
 * @param entries - Empty if only one summary is being generated
 */
export type LLPSummary = LLPSummaryEntry & {
  targetVersion: string;
  lastUpdate: string;
  website: string;
  entries: LLPSummaryEntry[];
};

/**
 * For LLP table rows represented in the LCP Manager
 * @param id - Composite of `lang` and the `LCPData.id` the patch matched, or its own `target` when it matched nothing,
 * so that we can immediately sort out LLPs targeting the same language and LCP
 * @param title - ISO lang code converted to the actual language name (e.g. `ru` -> `Russian`)
 * @param translator - same as `author`
 * @param currentVersion - `translation_version` of the installed patch, or `--`
 * @param availableVersion - `translation_version` on offer, or `--`
 * @param url - Author `website`
 * @param patch - The current installed patch, for summary previews
 * @param fetchHandle - Fetching metadata
 * @remark
 */
export type LLPRow = {
  id: string;
  title: string;
  translator: string;
  currentVersion: string;
  availableVersion: string;
  url?: string;
  patch?: PackedLanguagePatchWrapper;
  fetchHandle?: OfficialLocaleHandle;
};

/**
 * Wrapper to separate orphaned LLPs
 * @param matched - Rows nested under the pack they translate, keyed by `LCPData.id`
 * @param orphaned - Rows for packs that are not installed to be listed on their own at the end
 */
export type LLPRows = {
  matched: Map<string, LLPRow[]>;
  orphaned: LLPRow[];
};

/**
 * Arbitrary name for Lancer core data so that core data LLPs built here have something to actually target
 */
export const CORE_PATCH_TARGET = "lancer-data";

/**
 * Builds for the LCP Manager rows of installed/available LLPs into one row per language per pack.
 *
 * An LLP targeting an LCP that is not installed is orphaned to a separate area at the bottom of the table and will
 * get adopted when the target pack is installed.
 * @param packs - Every pack the table lists, official and manually installed alike
 * @param installed - Stored patches, from `getInstalledPatches`
 * @param offered - Listing entries, from `listOfficialLocales`
 * @remarks
 */
export function buildLLPRows(
  packs: LCPData[],
  installed: PackedLanguagePatchWrapper[],
  offered: OfficialLocaleHandle[]
): LLPRows {
  const matched = new Map<string, LLPRow[]>();
  const orphaned: LLPRow[] = []; // alms, alms, alms
  const rows = new Map<string, LLPRow>(); // Every single row

  // Row builder
  function rowFor(id: string, title: string, into: LLPRow[]): LLPRow {
    let row = rows.get(id);
    if (!row) {
      row = {
        id: id,
        title: title,
        translator: "",
        currentVersion: "--",
        availableVersion: "--",
      };
      rows.set(id, row);
      into.push(row);
    }
    return row;
  }

  function rowsUnder(packId: string): LLPRow[] {
    let packRows = matched.get(packId);
    if (!packRows) matched.set(packId, (packRows = []));
    return packRows;
  }

  const packsByTarget = new Map<string, string>();
  for (const pack of packs) {
    for (const target of patchTargetsFor(pack)) packsByTarget.set(target, pack.id);
  }

  // Build installed
  for (const patch of installed) {
    const packId = packsByTarget.get(patch.target);
    const langCode = normalizeLanguageCode(patch.lang);
    const langLabel = getLanguageLabel(langCode);
    /**
     * Concatenated `packId` to `lang` instead of `target` because LLP authors arbitrarily pick between
     * item_prefix and name as `target`s, which isn't helpful to know what exactly is being targeted.
     * And because official content right now don't even have `target`s
     *
     * Orphaned LLPs have no pack id to key on and use their own `target` in its place.
     */
    const row = packId
      ? rowFor(`${langCode}/${packId}`, langLabel, rowsUnder(packId))
      : rowFor(`${langCode}/${patch.target}`, `${patch.target} (${langLabel})`, orphaned);
    row.translator = patch.translator || row.translator;
    row.currentVersion = patch.translation_version || "--";
    row.url = patch.website || row.url;
    row.patch = patch;
  }

  // Build official
  for (const locale of offered) {
    const langLabel = getLanguageLabel(locale.code);
    const row = rowFor(`${normalizeLanguageCode(locale.code)}/${locale.packId}`, langLabel, rowsUnder(locale.packId));
    row.title = langLabel;
    row.availableVersion = locale.version || "--";
    row.fetchHandle = locale;
  }

  const byTitle = (a: LLPRow, b: LLPRow) => a.title.localeCompare(b.title);
  for (const packRows of matched.values()) packRows.sort(byTitle);
  orphaned.sort(byTitle); // Group orphans by the pack they are waiting on

  return { matched: matched, orphaned: orphaned };
}

/**
 *
 * @param pack - The pack the patch targets
 * @return Every `target` string a patch could name this pack by. Empty for a pack the table cannot name, which matches nothing
 * @remarks LLPs are specced to only use `item_prefix` or `name`
 */
export function patchTargetsFor(pack: (LCPData & Partial<IContentPackManifest>) | undefined): string[] {
  if (pack?.id === CORE_BREW_ID) return [CORE_PATCH_TARGET];
  const manifest = pack?.cp?.manifest ?? pack;
  const candidates = [manifest?.name, manifest?.item_prefix];
  const targets = new Set(
    // Filter undefined and dupes out (name and item_prefix is the same for w.e reason)
    candidates.filter((target): target is string => !!target)
  );
  return [...targets];
}

/**
 * The bare minimum for usability is `lang` (the language), `target` (LCP target), and `data` (translation content)
 * @param obj
 */
export function isValidLanguagePatch(obj: unknown): obj is PackedLanguagePatchWrapper {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "lang" in obj &&
    typeof obj.lang === "string" &&
    "target" in obj &&
    typeof obj.target === "string" &&
    "data" in obj &&
    typeof obj.data === "object" &&
    obj.data !== null
  );
}

/**
 *
 * @param patch
 * @return Returns the number of locale strings included in the LLP
 */
export function countPatchLines(patch: PackedLanguagePatchWrapper): number {
  return Object.keys(patch.data).length;
}

/**
 *
 * @param patch
 * @return Returns a generated `LLPSummary` for the LCP Manager app
 */
export function generateLLPSummary(patch: PackedLanguagePatchWrapper): LLPSummary {
  return {
    target: patch.target,
    lang: normalizeLanguageCode(patch.lang),
    translator: patch.translator,
    translationVersion: patch.translation_version,
    targetVersion: patch.target_version,
    lastUpdate: patch.last_update,
    lines: countPatchLines(patch),
    website: patch.website ?? "",
    entries: [],
  };
}

/**
 *
 * @param patches
 * @return Returns a generated `LLPSummary` for the LCP Manager app for multiple LLPs.
 */
export function generateMultiLLPSummary(patches: PackedLanguagePatchWrapper[]): LLPSummary {
  const languages = [...new Set(patches.map(patch => normalizeLanguageCode(patch.lang)))].sort();
  const translators = [...new Set(patches.map(patch => patch.translator))];
  return {
    target: game.i18n.localize("lancer.lcpManager.header.selectedLlps.label"),
    lang: languages.join(", "),
    translator: translators.length === 1 ? translators[0] : game.i18n.localize("lancer.lcpManager.various.label"),
    translationVersion: "",
    targetVersion: "",
    lastUpdate: "",
    lines: patches.reduce((total, patch) => total + countPatchLines(patch), 0),
    website: "",
    entries: patches.map(patch => ({
      target: patch.target,
      lang: normalizeLanguageCode(patch.lang),
      translator: patch.translator,
      translationVersion: patch.translation_version,
      lines: countPatchLines(patch),
    })),
  };
}

/**
 * Summarizes `PackedLanguagePatchWrapper`s staged for import via official sources (table) and unofficial sources (patches)
 * @param official - LCP Language Patches from the checked rows of the official content table
 * @param fromFile - LCP Language Patches read from the file selector
 * @return Returns a combined summary, or null when nothing is staged
 * TODO: 'official' LLPs packaged inside the LCPs themselves are not handled currently because I don't want to think about priority patching/load orders. As of writing, official LLP content isn't actually versioned and/because we build it directly from fetching it at compcon-locales, so there's no good way to compare against other than to just let the user figure it out
 */
export function summarizeStagedLanguagePatches(
  official: PackedLanguagePatchWrapper[],
  fromFile: PackedLanguagePatchWrapper[]
): LLPSummary | null {
  if (!fromFile.length && official.length > 1) return generateMultiLLPSummary(official);
  return summarizeLanguagePatches([...official, ...fromFile]);
}

/**
 *
 * @param patches
 * @return Returns an aggregate content summary of the given array of `PackedLanguagePatchWrapper`s or a single content summary if only one is given
 */
export function summarizeLanguagePatches(patches: PackedLanguagePatchWrapper[]): LLPSummary | null {
  if (!patches.length) return null;
  return patches.length === 1 ? generateLLPSummary(patches[0]) : generateMultiLLPSummary(patches);
}

/**
 * Reads from an array of `File`s all assumed to be `.llp`s, returning `PackedLanguagePatchWrapper`s once read for use in the LCP Manager
 * @param files - Array of `.llp` `File` types; non-LLP files are dropped
 */
export async function readLanguagePatches(files: File[]): Promise<PackedLanguagePatchWrapper[]> {
  const patches = await Promise.all(files.map(file => readLanguagePatch(file)));
  return patches.filter(patch => patch !== null);
}

/**
 * Reads from a `File` assumed to be an `.llp`, returning a `PackedLanguagePatchWrapper` after parsing the format (which is just a JSON).
 * @param file - Blob of `.llp` `File` types; non-LLP files are dropped
 */
export async function readLanguagePatch(file: File): Promise<PackedLanguagePatchWrapper | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    ui.notifications?.error(
      game.i18n.format("lancer.notifications.error.lcpManagerLlpFailedParse", { file: file.name })
    );
    return null;
  }
  if (!isValidLanguagePatch(parsed)) {
    ui.notifications?.error(game.i18n.format("lancer.notifications.error.lcpManagerLlpInvalid", { file: file.name }));
    return null;
  }
  return parsed;
}

/**
 * Merges LLPs into the persisted LLP files database. Overrides the current entry when overlapping keys are found.
 * @param patches
 * @remark Stored data object is keyed by language and then LCP target
 */
export async function storeLanguagePatches(
  patches: PackedLanguagePatchWrapper[]
): Promise<{ stored: number; replaced: number }> {
  const llpMap = foundry.utils.deepClone(game.settings.get(game.system.id, LANCER.setting_localization_llp_files));
  let stored = 0;
  let replaced = 0;
  for (const patch of patches) {
    const packs = (llpMap[normalizeLanguageCode(patch.lang)] ??= {});
    if (patch.target in packs) replaced++;
    packs[patch.target] = patch;
    stored++;
  }
  if (stored) await game.settings.set(game.system.id, LANCER.setting_localization_llp_files, llpMap);
  return { stored, replaced };
}

/**
 * Removes one LLP from the persisted LLP files database.
 * @param patch - An installed patch, from `getInstalledPatches`
 * @return Whether the patch was found and removed
 */
export async function unstoreLanguagePatch(patch: PackedLanguagePatchWrapper): Promise<boolean> {
  const llpMap = foundry.utils.deepClone(game.settings.get(game.system.id, LANCER.setting_localization_llp_files));
  const lang = normalizeLanguageCode(patch.lang);
  const packs = llpMap[lang];
  if (!packs || !(patch.target in packs)) return false;

  delete packs[patch.target];
  if (!Object.keys(packs).length) delete llpMap[lang]; // Remove language keys w/ no patch
  await game.settings.set(game.system.id, LANCER.setting_localization_llp_files, llpMap);
  return true;
}

/**
 * @return Returns an array of all installed patches in the Foundry database
 * @remark
 */
export function getInstalledPatches(): PackedLanguagePatchWrapper[] {
  const llpMap = game.settings.get(game.system.id, LANCER.setting_localization_llp_files);
  return Object.values(llpMap).flatMap(packs => Object.values(packs));
}

/**
 *
 * @param lang
 * @return Normalizes potential BCP 47 (Foundry) to ISO locale (e.g. pt_BR`/`pt-br`/whatever -> `pt`)
 */
export function normalizeLanguageCode(lang: string): string {
  const tag = lang.replace(/_/g, "-");
  return tag.toLowerCase().split("-")[0];
}

/**
 *
 * @param lang - Either locale code + country code (e.g. `pt_BR`/`pt-br`/whatever) or locale-only (e.g. `pt`)
 * @return A language code as a name in the reader's own locale (e.g. `pt` -> `Portugeuse`). Returns given `code` on failure.
 */
export function getLanguageLabel(lang: string): string {
  const tag = lang.replace(/_/g, "-");
  try {
    return new Intl.DisplayNames([game.i18n.lang], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * Checks a target version against the proposed range
 * @param version Version right now (e.g. `1.0.0`)
 * @param range Version minimum/required (e.g. `>=1.0.0`)
 * @remarks Not totally clear on what beef meant by 'semver range' in the documentation, so hopefully
 * he didn't literally mean 'range' as in `>= 1.0.0 < 2.0.0`, otherwise this functioned is cooked and needs to be
 * rewritten
 */
export function satisfiesTargetVersion(version: string, range: string): boolean {
  const match = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(range.trim());
  if (!match) return false;
  const op = match[1] ?? "=";
  const target = match[2];

  const newer = foundry.utils.isNewerVersion(version, target); // version > target
  const older = foundry.utils.isNewerVersion(target, version); // version < target

  switch (op) {
    case ">":
      return newer;
    case ">=":
      return !older;
    case "<":
      return older;
    case "<=":
      return !newer;
    default:
      return !newer && !older;
  }
}
