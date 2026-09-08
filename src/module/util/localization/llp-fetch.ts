// Temporary solution probably going to be turned into a permanent solution to not having any official way of accessing
// locale `data` built by CC's Weblate pipeline that funnels into compcon-locales
import { LANCER } from "../../config";
import type { LCPData } from "../lcps";
import { normalizeLanguageCode, patchTargetsFor } from "./llp-import";
import type { PackedLanguagePatchWrapper } from "../unpacking/packed-types";

const lp = LANCER.log_prefix + " LLP |";

const REPO = "massif-press/compcon-locales";
const REF = "master";
const MANIFEST_URL = `https://data.jsdelivr.com/v1/packages/gh/${REPO}@${REF}?structure=flat`; // File tree with a size and hash per entry, so empty locales are detectable without downloading
const CDN_URL = `https://cdn.jsdelivr.net/gh/${REPO}@${REF}`;

/**
 * `content/<dir>/` is `${LCPData.id}-data`, with the core book as the sole exception
 */
const PACK_DIRECTORIES: Record<string, string> = { core: "lancer-data" };

/**
 * `{}` are empty files that are 3 bytes and need to be thrown out
 */
const EMPTY_FILE_BYTES = 3;

/**
 * English is the auto-generated source locale files are translated from
 */
const SOURCE_LANGUAGE = "en";

/**
 * Fake, copied from build-lcp.mjs. Hopefully will eventually have something proper to actually fetch
 */
const TRANSLATION_VERSION = "0.1.0";

type JsDelivrFile = { name: string; hash: string; size: number };

/**
 * Handle with everything for pulling from [compcon-locales](https://github.com/massif-press/compcon-locales)
 * @param packId - Matches `LCPData.id`
 * @param code - Language as the repo names it (`pt_BR`), which is the more accurate of the two
 * spellings and the one localization handlers can parse. Run it through `normalizeLanguageCode`
 * for the code a patch is cached under
 * @param ref - Path to the file within the repo
 * @param version - Currently fake
 */
export type OfficialLocaleHandle = {
  packId: string;
  code: string;
  ref: string;
  version?: string;
};

function directoryFor(packId: string): string {
  return PACK_DIRECTORIES[packId] ?? `${packId}-data`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} responded ${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

/**
 * Everything compcon-locales offers as valid resources for building LLP wrappers off of official data
 * @param packs - Every pack the table lists
 * @return Empty when the repo is unreachable
 */
export async function listOfficialLocales(packs: LCPData[]): Promise<OfficialLocaleHandle[]> {
  try {
    const { files } = await fetchJson<{ files?: JsDelivrFile[] }>(MANIFEST_URL);
    const packsByDirectory = new Map(packs.map(pack => [directoryFor(pack.id), pack.id]));
    const locales: OfficialLocaleHandle[] = [];

    for (const file of files ?? []) {
      const match = /^\/content\/([^/]+)\/([^/]+)\.json$/.exec(file.name);
      if (!match) continue;
      const [, directory, code] = match;
      const packId = packsByDirectory.get(directory);
      // Directories with no row in the table (lancer-srd) have nothing to attach to,
      // and a language with no translations should be ignored
      if (!packId || code === SOURCE_LANGUAGE || file.size <= EMPTY_FILE_BYTES) continue;

      locales.push({
        packId,
        code,
        version: TRANSLATION_VERSION,
        ref: file.name,
      });
    }

    return locales.sort((a, b) => a.packId.localeCompare(b.packId) || a.code.localeCompare(b.code));
  } catch (err) {
    console.warn(`${lp} compcon-locales is unavailable.`, err);
    return [];
  }
}

/**
 *
 * @param locales - Handles from `listOfficialLocales`
 * @param packs - Every pack the table lists to name each LLP's target
 */
export async function downloadOfficialLocales(
  locales: OfficialLocaleHandle[],
  packs: LCPData[]
): Promise<PackedLanguagePatchWrapper[]> {
  const patches = await Promise.all(locales.map(locale => downloadOfficialLocale(locale, packs)));
  return patches.filter(patch => patch !== null);
}

/**
 * Fetches one translation and wraps it the way build-lcp.mjs would.
 * @param locale
 * @param packs
 * @remarks
 * https://github.com/massif-press/compcon-locales/blob/master/build-lcp.mjs
 */
async function downloadOfficialLocale(
  locale: OfficialLocaleHandle,
  packs: LCPData[]
): Promise<PackedLanguagePatchWrapper | null> {
  const pack = packs.find(p => p.id === locale.packId);
  const target = patchTargetsFor(pack)[0];
  if (!target) {
    console.error(`${lp} '${locale.packId}' has no name a patch could target.`);
    return null;
  }
  const version = pack?.cp?.manifest?.version || pack?.currentVersion || "";

  // This gets refetched every time a table checkbox toggles, but meh
  let data: Record<string, string>;
  try {
    data = await fetchJson<Record<string, string>>(`${CDN_URL}${locale.ref}`);
  } catch (err) {
    console.error(`${lp} Failed to download '${locale.code}' for '${locale.packId}'.`, err);
    ui.notifications?.error(
      game.i18n.format("lancer.notifications.error.lcpManagerLlpFailedDownload", {
        lang: locale.code,
        pack: locale.packId,
      })
    );
    return null;
  }

  return {
    lang: normalizeLanguageCode(locale.code), // Not exactly how the build script does it but close enough
    target,
    target_version: version ? `>=${version}` : "", // at time of writing, build-lcp.mjs omits this when it has no version https://github.com/massif-press/compcon-locales/blob/8c618b1fac117150a712f22f3ed3d4e7f70e271a/build-lcp.mjs#L174
    translation_version: TRANSLATION_VERSION,
    last_update: new Date().toISOString().slice(0, 10),
    translator: "",
    data,
  };
}
