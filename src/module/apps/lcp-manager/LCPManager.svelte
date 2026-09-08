<script lang="ts">
  import { fade } from "svelte/transition";
  import { LANCER } from "../../config";
  import Spinner from "../components/Spinner.svelte";
  import LCPDetails from "./LCPDetails.svelte";
  import LLPDetails from "./LLPDetails.svelte";
  import LCPSelector from "./LCPSelector.svelte";
  import {
    type ContentSummary,
    type LCPData,
    getOfficialData,
    mergeOfficialDataAndLcpIndex,
    summarizeStagedPacks,
  } from "../../util/lcps";
  import {
    buildLLPRows,
    storeLanguagePatches,
    getInstalledPatches,
    getLanguageLabel,
    type LLPSummary,
    summarizeStagedLanguagePatches,
    unstoreLanguagePatch,
  } from "../../util/localization/llp-import";
  import {
    downloadOfficialLocales,
    listOfficialLocales,
    type OfficialLocaleHandle,
  } from "../../util/localization/llp-fetch";
  import { refreshLLPTranslations } from "../../util/localization/llp-map";
  import LCPTable from "./LCPTable.svelte";
  import LCPActions from "./LCPActions.svelte";
  import type { IContentPack, IContentPackManifest, PackedLanguagePatchWrapper } from "../../util/unpacking/packed-types";
  import { clearCompendiumData, importCP } from "../../comp-builder";
  import { LCPIndex } from "./lcp-manager";
  const lp = LANCER.log_prefix;

  interface Props {
    loading?: boolean;
  }

  let { loading = $bindable(true) }: Props = $props();

  let lcpData = $state<LCPData[]>([]);
  let llpData = $state<PackedLanguagePatchWrapper[]>([]); // Language patches from the database cache

  let llpsAvailable = $state<OfficialLocaleHandle[]>([]); // Locales fetchable from compcon-locales
  let llpRows = $derived(buildLLPRows(lcpData, llpData, llpsAvailable));

  let tablePacks = $state<IContentPack[]>([]); // This is batched with filePacks
  let filePacks = $state<IContentPack[]>([]); // to generate one summary and one import call
  let stagedPacks = $derived([...tablePacks, ...filePacks]);

  let tablePatches = $state<PackedLanguagePatchWrapper[]>([]); // Same as packs but with LCP Language Patches
  let filePatches = $state<PackedLanguagePatchWrapper[]>([]);
  let stagedPatches = $derived([...tablePatches, ...filePatches]);

  // Hovering a table row previews that row on top of the staged summary; it stages nothing
  let stagedContentSummary = $derived(summarizeStagedPacks(tablePacks, filePacks));
  let hoveredContentSummary = $state<ContentSummary | null>(null);
  let injectedContentSummary = $state<ContentSummary | null>(null); // Is only here to facilitate tours
  let contentSummary: ContentSummary | null = $derived(
    injectedContentSummary ?? hoveredContentSummary ?? stagedContentSummary
  );

  let stagedPatchSummary = $derived(summarizeStagedLanguagePatches(tablePatches, filePatches));
  let hoveredPatchSummary = $state<LLPSummary | null>(null);
  let patchSummary: LLPSummary | null = $derived(hoveredPatchSummary ?? stagedPatchSummary);

  let canImport = $derived(stagedPacks.length > 0 || stagedPatches.length > 0);
  let canClear = $derived(lcpData.some(lcp => lcp.currentVersion !== "--"));

  let coreVersion = $derived(lcpData.find(lcp => lcp.id === "core")?.currentVersion);
  let importingLcp = $state<IContentPack | null>(null);
  let importing = $state(false);
  let importingMany = $state(false);
  let clearing = $state(false);
  let downloadingLocale = $state(false);
  let importingLlps = $state(false);
  let removingLlp = $state(false);
  let busy = $derived(importing || importingMany || clearing || importingLlps || downloadingLocale || removingLlp);
  let barWidth = $state(0);
  let secondBarWidth = $state(0);

  export function injectContentPack(content: ContentSummary | null) {
    // Is only here to facilitate tours
    injectedContentSummary = content;
  }

  async function init() {
    loading = true;
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    const officialData = await getOfficialData(index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    llpData = getInstalledPatches();
    loading = false;
    llpsAvailable = await listOfficialLocales(lcpData);
  }

  const initPromise = init();
  export function ready() {
    // Is only here to facilitate tours
    return initPromise;
  }

  function lcpsLoaded(packs: IContentPack[]) {
    filePacks = packs;
  }

  function llpsLoaded(patches: PackedLanguagePatchWrapper[]) {
    filePatches = patches;
  }

  function lcpHovered(summary: ContentSummary | null) {
    hoveredContentSummary = summary;
  }

  function llpHovered(summary: LLPSummary | null) {
    hoveredPatchSummary = summary;
  }

  // Download locales only when table rows are checked
  async function llpSelectionChanged(locales: OfficialLocaleHandle[]) {
    if (!locales.length) {
      tablePatches = [];
      return;
    }
    downloadingLocale = true;
    tablePatches = await downloadOfficialLocales(locales, lcpData);
    downloadingLocale = false;
  }

  function lcpSelectionChanged(packs: IContentPack[]) {
    tablePacks = packs;
  }

  async function updateLcpIndex(manifest: IContentPackManifest) {
    const lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpIndex.updateManifest(manifest);
    await game.settings.set(game.system.id, LANCER.setting_lcps, lcpIndex);
    const updatedLcp = lcpData.find(lcp => lcp.title === manifest.name && lcp.author === manifest.author);
    if (updatedLcp) updatedLcp.currentVersion = manifest.version;
    else
      lcpData.push({
        ...manifest,
        title: manifest.name,
        author: manifest.author,
        currentVersion: manifest.version,
        availableVersion: "",
        url: manifest.website,
        id: manifest.item_prefix || manifest.name.replace(/\s/g, "-").toLowerCase(),
      });
    lcpData = [...lcpData];
  }

  function _canImportLcp(): boolean {
    if (!game.user?.isGM) {
      ui.notifications!.warn(game.i18n.localize("lancer.notifications.warning.lcpManagerImportPrivileges"));
      return false;
    }
    if (!coreVersion) {
      ui.notifications!.warn(game.i18n.localize("lancer.notifications.warning.lcpManagerCoreVersionRequired"));
      return false;
    }
    return true;
  }

  async function importLcp(cp: IContentPack | null = null) {
    if (!cp) {
      ui.notifications.error(game.i18n.localize("lancer.notifications.error.lcpManagerFileNotSelected"));
      return;
    }
    if (!_canImportLcp()) return;

    const manifest = cp.manifest;
    if (!cp || !manifest) return;

    importing = true;
    barWidth = 0;
    importingLcp = cp;
    updateProgressBar(0, 1);
    console.log(
      `${lp} Starting import of '${$state.snapshot(cp.manifest.name)} v${$state.snapshot(cp.manifest.version)}'.`
    );
    console.log(`${lp} Parsed content pack:`, $state.snapshot(cp));
    await importCP(cp, (x, y) => updateProgressBar(x, y));
    updateProgressBar(1, 1);
    console.log(
      `${lp} Import of ${$state.snapshot(cp.manifest.name)} v${$state.snapshot(cp.manifest.version)} complete.`
    );
    importing = false;
    setTimeout(() => {
      if (!importing && !importingMany) importingLcp = null;
    }, 1000);

    if (cp.manifest.name === "Lancer Core Book Data" && cp.manifest.author === "Massif Press") {
      await game.settings.set(game.system.id, LANCER.setting_core_data, cp.manifest.version);
    }
    await updateLcpIndex(manifest);
  }

  async function importManyLcps(lcps: IContentPack[]) {
    if (!_canImportLcp()) return;
    importingMany = true;
    secondBarWidth = 0;
    for (const [index, cp] of lcps.entries()) {
      if (!cp) continue;
      secondBarWidth = Math.min(Math.ceil((index / lcps.length) * 100), 100);
      await importLcp(cp);
    }
    importingMany = false;
  }

  function _canImportLlp(): boolean {
    if (!game.user?.isGM) {
      ui.notifications!.warn(game.i18n.localize("lancer.notifications.warning.lcpManagerImportPrivileges"));
      return false;
    }
    return true;
  }

  async function importManyLlps(llps: PackedLanguagePatchWrapper[]) {
    if (!_canImportLlp()) return;
    importingLlps = true;
    console.log(`${lp} Starting import of ${llps.length} language patch(es).`, $state.snapshot(llps));
    const { stored, replaced } = await storeLanguagePatches($state.snapshot(llps));
    llpData = getInstalledPatches(); // Refresh table
    console.log(`${lp} Import of ${stored} language patch(es) complete.`);
    importingLlps = false;

    if (!stored) return;
    const message = [game.i18n.format("lancer.notifications.info.lcpManagerLlpImported", { count: `${stored}` })];
    if (replaced)
      message.push(game.i18n.format("lancer.notifications.info.lcpManagerLlpReplaced", { count: `${replaced}` }));
    ui.notifications?.info(message.join(" "));
  }

  async function importStaged() {
    if (stagedPacks.length) await importManyLcps(stagedPacks);
    if (stagedPatches.length) await importManyLlps(stagedPatches);

    if (stagedPacks.length || stagedPatches.length) await refreshLLPTranslations();
  }

  function updateProgressBar(done: number, outOf: number) {
    const percent = Math.min(done / outOf, 1);
    barWidth = Math.floor(percent * 100);
  }

  async function removeLlp(patch: PackedLanguagePatchWrapper) {
    const answer = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "lancer.lcpManager.removeLlp.title",
        icon: "fas fa-triangle-exclamation",
      },
      content: `
        <p>${game.i18n.format("lancer.lcpManager.removeLlp.content.0", { lang: getLanguageLabel(patch.lang), target: patch.target })}</p>\n
        <p>${game.i18n.localize("lancer.lcpManager.removeLlp.content.1")}</p>
      `,
    });
    if (!answer) return;
    removingLlp = true;
    await unstoreLanguagePatch($state.snapshot(patch)); // The setting's onChange retranslates every client
    llpData = getInstalledPatches(); // Refresh the installed-patches table
    removingLlp = false;
  }

  async function clearCompendiums() {
    // Confirmation prompt
    const answer = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "lancer.lcpManager.clearCompendium.title",
        icon: "fas fa-triangle-exclamation",
      },
      content: `
        <p>${game.i18n.localize("lancer.lcpManager.clearCompendium.content.0")}</p>\n
        <p style="text-align: center"><i class=\"fas fa-triangle-exclamation i--4\"></i> ${game.i18n.localize("lancer.lcpManager.clearCompendium.content.1")}
      `,
    });
    if (!answer) return;
    clearing = true;
    await clearCompendiumData();
    await game.settings.set(game.system.id, LANCER.setting_localization_llp_files, {});
    await refreshLLPTranslations();
    llpData = getInstalledPatches(); // Refresh the installed-patches table
    const officialData = await getOfficialData();
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    clearing = false;
  }
</script>

<div class="lcp-manager">
  {#if loading}
    <Spinner><span class="monospace">{game.i18n.localize("lancer.lcpManager.loading.label")}</span></Spinner>
  {:else}
    <div class="flexrow lcp-manager__main-content" style="flex: 1 1">
      <div class="lcp-manager__import-column">
        <LCPTable
          lcpData={lcpData}
          llpRows={llpRows}
          onLCPHovered={lcpHovered}
          onLLPHovered={llpHovered}
          onSelectionChanged={lcpSelectionChanged}
          onLocalesChanged={llpSelectionChanged}
          onRemovePatch={removeLlp}
          disabled={busy}
        />
        <LCPSelector
          disabled={busy}
          onLCPsLoaded={lcpsLoaded}
          onLLPsLoaded={llpsLoaded}
        />
        <LCPActions
          canImport={canImport}
          canClear={canClear}
          onImport={importStaged}
          onClearCompendiums={clearCompendiums}
          disabled={busy}
        />
      </div>
      <div class="lcp-manager__detail-column">
        {#if patchSummary}
          <LLPDetails patchSummary={patchSummary} />
        {/if}
        {#if !patchSummary || contentSummary}
          <LCPDetails contentSummary={contentSummary} />
        {/if}
      </div>
    </div>
    <div class="lcp-manager__progress-area">
      <div class="lcp-manager__progress">
        {#if importing || importingMany}
          <span transition:fade|global class="monospace">{
              `${importingLcp?.manifest.name} v${importingLcp?.manifest.version}`
            }
            {barWidth}%</span>
          <div
            transition:fade|global
            class="lcp-manager__progress-bar"
            style:width={`${barWidth}%`}
          >
          </div>
        {/if}
        {#if importingMany}
          <div
            transition:fade|global
            class="lcp-manager__progress-bar"
            style:width={`${secondBarWidth}%`}
          >
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  @layer lancer {
    @layer applications {
      @container lcp-manager (max-width: 40rem) {
        .lcp-manager__main-content {
          gap: 5px;
        }

        .lcp-manager__import-column {
          max-height: 60%;
        }

        .lcp-manager__detail-column {
          max-height: 40%;
        }
      }

      .lcp-manager {
        container: lcp-manager / inline-size;
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;

        .lcp-manager__main-content {
          align-items: normal;
          max-height: calc(100% - 50px);

          .lcp-manager__import-column,
          .lcp-manager__detail-column {
            height: 100%;
            overflow: hidden;
            overflow-y: auto;
            min-height: 0;
            gap: 5px;
          }

          .lcp-manager__import-column {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            flex-shrink: 0;
            flex-basis: 15rem;

            height: 100%;
            min-width: 25rem;
            padding-left: 5px;
            padding-right: 5px;
          }

          .lcp-manager__detail-column {
            flex-grow: 1;
            flex-shrink: 1;
            flex-basis: 15rem;

            padding-left: 5px;
            padding-right: 5px;
          }
        }

        .lcp-manager__progress-area {
          width: 100%;
          height: 50px;
          position: relative;
          bottom: 0;
          background-color: var(--background-color);
        }

        .lcp-manager__progress {
          width: 100%;
          height: 100%;
          padding: 3px;
          &:has(.lcp-manager__progress-bar) {
            border: 1px solid var(--color-border-light-tertiary);
            border-radius: 5px;
            background-color: var(--darken-2);
          }
          & span {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
          .lcp-manager__progress-bar {
            height: 100%;
            background-color: var(--primary-color);
            border: 1px solid #333;
            transition: width 0.2s;
            /* If we're importing multiple LCPs, show two bars each half height */
            &:not(:last-child) {
              height: 50%;
            }
            & + .lcp-manager__progress-bar {
              height: 50%;
            }
          }
        }
      }
    }
  }
</style>
