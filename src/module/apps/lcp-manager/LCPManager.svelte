<svelte:options accessors={true} />

<script lang="ts">
  import { fade } from "svelte/transition";
  import { LANCER } from "../../config";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import { ContentSummary, getOfficialData, LCPData, mergeOfficialDataAndLcpIndex } from "../../util/lcps";
  import LCPTable from "./LCPTable.svelte";
  import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
  import { clearCompendiumData, importCP } from "../../comp-builder";
  import { LCPIndex } from "./lcp-manager-2";
  const lp = LANCER.log_prefix;

  export let lcpData: LCPData[];
  let contentPack: IContentPack | null = null;
  let fileContentSummary: ContentSummary | null = null;
  let hoveredContentSummary: ContentSummary | null = null;
  let aggregateContentSummary: ContentSummary | null = null;
  let importingLcp: IContentPack | null = null;
  let importing: boolean = false;
  let barWidth: number = 0;
  let importingMany: boolean = false;
  let secondBarWidth: number = 0;
  let deselectTable: () => void;
  let deselectFiles: () => void;

  $: contentSummary = hoveredContentSummary ?? fileContentSummary ?? aggregateContentSummary;
  $: showImportButton = hoveredContentSummary !== null && !contentSummary?.aggregate;
  $: coreVersion = lcpData.find(lcp => lcp.id === "core")?.currentVersion;

  function lcpLoaded(event: CustomEvent<{ cp: IContentPack; contentSummary: ContentSummary }>) {
    if (!event.detail) {
      contentPack = null;
      fileContentSummary = null;
      return;
    }
    fileContentSummary = event.detail.contentSummary;
    contentPack = event.detail.cp;
    deselectTable();
  }

  function lcpHovered(event: CustomEvent<ContentSummary>) {
    hoveredContentSummary = event.detail;
  }

  function updateAggregateSummary(event: CustomEvent<ContentSummary>) {
    aggregateContentSummary = event.detail;
    contentPack = null;
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
    if (!cp) cp = contentPack;
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

  function updateProgressBar(done: number, outOf: number) {
    const percent = Math.min(Math.ceil((done / outOf) * 100), 100);
    SceneNavigation.displayProgressBar({ label: "Importing...", pct: percent });
    barWidth = percent;
  }

  async function clearCompendiums() {
    await clearCompendiumData();
    const officialData = await getOfficialData();
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    deselectFiles();
  }
</script>

<div class="lcp-manager">
  <div class="flexrow" style="flex: 1 1;">
    <LCPTable
      {lcpData}
      bind:deselect={deselectTable}
      on:lcpHovered={lcpHovered}
      on:aggregateSummary={updateAggregateSummary}
      on:installManyLcps={event => importManyLcps(event.detail)}
      on:clearCompendiums={clearCompendiums}
    />
    <div class="lcp-manager__detail-column">
      <LcpSelector style="grid-area: lcp-selector" bind:deselect={deselectFiles} on:lcpLoaded={lcpLoaded} />
      <LcpDetails
        {contentSummary}
        {showImportButton}
        style="grid-area: lcp-details"
        on:importLcp={event => importLcp()}
      />
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
</div>

<style lang="scss">
  .lcp-manager {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    .lcp-manager__detail-column {
      padding-left: 10px;
      padding-right: 10px;
    }

    // Add a little connector between the hovered table row and the detail column
    :global(.lcp-table .row.has-data:not(.header):hover)::after {
      content: "";
      display: block;
      position: absolute;
      left: 100%;
      background-color: var(--darken-1);
      min-width: 10px;
      max-width: 10px;
      height: calc(100% + 20px);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 20px));
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
