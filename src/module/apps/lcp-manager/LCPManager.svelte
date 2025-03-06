<svelte:options accessors={true} />

<script lang="ts">
  import { fade } from "svelte/transition";
  import { LANCER } from "../../config";
  import Spinner from "../components/Spinner.svelte";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import { ContentSummary, getOfficialData, LCPData, mergeOfficialDataAndLcpIndex } from "../../util/lcps";
  import LCPTable from "./LCPTable.svelte";
  import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
  import { clearCompendiumData, importCP } from "../../comp-builder";
  import { LCPIndex } from "./lcp-manager";
  const lp = LANCER.log_prefix;

  // injectedContentSummary is only here to facilitate tours
  export let injectedContentSummary: ContentSummary | null = null;
  export let loading: boolean = true;
  let lcpData: LCPData[] = [];
  let contentPacks: IContentPack[] = [];
  let fileContentSummary: ContentSummary | null = null;
  let hoveredContentSummary: ContentSummary | null = null;
  let aggregateContentSummary: ContentSummary | null = null;
  let importingLcp: IContentPack | null = null;
  let importing: boolean = false;
  let importingMany: boolean = false;
  let clearing: boolean = false;
  let barWidth: number = 0;
  let secondBarWidth: number = 0;
  let deselectTable: () => void;
  let deselectFiles: () => void;

  $: busy = importing || importingMany || clearing;
  $: contentSummary = injectedContentSummary ?? hoveredContentSummary ?? fileContentSummary ?? aggregateContentSummary;
  $: showImportButton = hoveredContentSummary !== null && !contentSummary?.aggregate;
  $: coreVersion = lcpData.find(lcp => lcp.id === "core")?.currentVersion;

  async function init() {
    loading = true;
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    const officialData = await getOfficialData(index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    loading = false;
  }
  init();

  function lcpLoaded(event: CustomEvent<{ contentPacks: IContentPack[]; contentSummary: ContentSummary }>) {
    if (!event.detail) {
      contentPacks = [];
      fileContentSummary = null;
      return;
    }
    fileContentSummary = event.detail.contentSummary;
    contentPacks = event.detail.contentPacks;
    deselectTable();
  }

  function lcpHovered(event: CustomEvent<ContentSummary>) {
    hoveredContentSummary = event.detail;
  }

  function updateAggregateSummary(event: CustomEvent<ContentSummary>) {
    aggregateContentSummary = event.detail;
    contentPacks = [];
    fileContentSummary = null;
    deselectFiles();
  }

  async function updateLcpIndex(manifest: IContentPackManifest) {
    const lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpIndex.updateManifest(manifest);
    await game.settings.set(game.system.id, LANCER.setting_lcps, lcpIndex);
    const updatedLcp = lcpData.find(lcp => lcp.title === manifest.name && lcp.author === manifest.author);
    if (updatedLcp) updatedLcp.currentVersion = manifest.version;
    else
      lcpData.push({
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
      ui.notifications!.warn(`Only GM can modify the Compendiums.`);
      return false;
    }
    if (!coreVersion) {
      ui.notifications!.warn(`Please update the Core data before importing LCPs.`);
      return false;
    }
    return true;
  }

  async function importLcp(cp: IContentPack | null = null) {
    if (!cp) {
      ui.notifications.error(`You must select an LCP file before importing.`);
      return;
    }
    if (!_canImportLcp()) return;

    const manifest = cp.manifest;
    if (!cp || !manifest) return;

    ui.notifications!.info(`Starting import of ${cp.manifest.name} v${cp.manifest.version}. Please wait.`);
    importing = true;
    barWidth = 0;
    importingLcp = cp;
    updateProgressBar(0, 1);
    console.log(`${lp} Starting import of ${cp.manifest.name} v${cp.manifest.version}.`);
    console.log(`${lp} Parsed content pack:`, cp);
    await importCP(cp, (x, y) => updateProgressBar(x, y));
    updateProgressBar(1, 1);
    console.log(`${lp} Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);
    importing = false;
    setTimeout(() => {
      if (!importing && !importingMany) importingLcp = null;
    }, 1000);

    if (cp.manifest.name === "Lancer Core Book Data" && cp.manifest.author === "Massif Press") {
      await game.settings.set(game.system.id, LANCER.setting_core_data, cp.manifest.version);
    }
    updateLcpIndex(manifest);
  }

  async function importManyLcps(lcps: IContentPack[] | null = null) {
    if (!lcps) lcps = contentPacks;
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

  function updateProgressBar(done: number, outOf: number) {
    const percent = Math.min(Math.ceil((done / outOf) * 100), 100);
    SceneNavigation.displayProgressBar({ label: "Importing...", pct: percent });
    barWidth = percent;
  }

  async function clearCompendiums() {
    // Confirmation prompt
    const answer = await foundry.applications.api.DialogV2.confirm({
      // @ts-expect-error This should expect a partial, not a complete window configuration.
      window: { title: "Clear Compendiums", icon: "fas fa-triangle-exclamation" },
      content: `<p>Are you sure you want to delete all actors and items from the Lancer compendiums?</p>
        <p><i class="fas fa-triangle-exclamation i--m"></i> This action cannot be undone!</p>`,
    });
    if (!answer) return;
    clearing = true;
    await clearCompendiumData();
    const officialData = await getOfficialData();
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    deselectFiles();
    clearing = false;
  }
</script>

<div class="lcp-manager">
  {#if loading}
    <div class="flexrow" style="margin: 5em;">
      <Spinner><span class="monospace">Loading data, please wait…</span></Spinner>
    </div>
  {:else}
    <div class="flexrow lcp-manager__main-content" style="flex: 1 1;">
      <LCPTable
        {lcpData}
        bind:disabled={busy}
        bind:deselect={deselectTable}
        on:lcpHovered={lcpHovered}
        on:aggregateSummary={updateAggregateSummary}
        on:installManyLcps={event => importManyLcps(event.detail)}
        on:clearCompendiums={clearCompendiums}
      />
      <div class="lcp-manager__detail-column">
        <LcpSelector bind:disabled={busy} bind:deselect={deselectFiles} on:lcpLoaded={lcpLoaded} />
        <LcpDetails bind:disabled={busy} {contentSummary} {showImportButton} on:importLcp={() => importManyLcps()} />
      </div>
    </div>
    <div class="lcp-manager__progress-area">
      <div class="lcp-manager__progress">
        {#if importing || importingMany}
          <span transition:fade class="monospace"
            >{`${importingLcp?.manifest.name} v${importingLcp?.manifest.version}`} {barWidth}%</span
          >
          <div transition:fade class="lcp-manager__progress-bar" style="width: {barWidth}%" />
        {/if}
        {#if importingMany}
          <div transition:fade class="lcp-manager__progress-bar" style="width: {secondBarWidth}%" />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .lcp-manager {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;

    .lcp-manager__main-content {
      align-items: normal;
      max-height: calc(100% - 50px);
    }

    .lcp-manager__detail-column {
      padding-left: 10px;
      padding-right: 10px;
      max-height: 100%;
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
</style>
