<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import { ContentSummary, getOfficialData, LCPData, mergeOfficialDataAndLcpIndex } from "./massif-content-map";
  import LCPTable from "./LCPTable.svelte";
  import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
  import { importCP } from "../../comp-builder";
  import { LCPIndex } from "./lcp-manager-2";
  const lp = LANCER.log_prefix;

  export let lcpData: LCPData[];
  let contentPack: IContentPack | null = null;
  let fileContentSummary: ContentSummary | null = null;
  let hoveredContentSummary: ContentSummary | null = null;
  let aggregateContentSummary: ContentSummary | null = null;

  $: temporarySummary = hoveredContentSummary !== null;
  $: contentSummary = hoveredContentSummary ?? fileContentSummary ?? aggregateContentSummary;
  $: coreVersion = lcpData.find(lcp => lcp.id === "core")?.currentVersion;

  // TODO: bring in LCP management logic from the old LCP manager
  function lcpLoaded(event: CustomEvent<{ cp: IContentPack; contentSummary: ContentSummary }>) {
    fileContentSummary = event.detail.contentSummary;
    contentPack = event.detail.cp;
    console.log(`${lp} LCP loaded`, contentPack, fileContentSummary);
  }

  function lcpHovered(event: CustomEvent<ContentSummary>) {
    hoveredContentSummary = event.detail;
  }

  async function updateLcpIndex(manifest: IContentPackManifest) {
    const lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    lcpIndex.updateManifest(manifest);
    await game.settings.set(game.system.id, LANCER.setting_lcps, lcpIndex);
    // TODO: Rebuild the LCP list
    // const officialData = await getOfficialData();
    // lcpData = mergeOfficialDataAndLcpIndex(officialData, lcpIndex);
  }

  async function importLcp() {
    if (!contentPack) return;
    console.log(`${lp} Importing LCP`, contentPack);

    if (!game.user?.isGM) {
      ui.notifications!.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!coreVersion) {
      ui.notifications!.warn(`Please update the Core data before importing LCPs.`);
      return;
    }
    if (!contentPack) {
      ui.notifications!.error(`You must select an LCP file before importing.`);
      return;
    }

    const cp = contentPack;
    const manifest = contentPack.manifest;
    if (!cp || !manifest) return;

    ui.notifications!.info(`Starting import of ${cp.manifest.name} v${cp.manifest.version}. Please wait.`);
    updateProgressBar(0, 1);
    console.log(`${lp} Starting import of ${cp.manifest.name} v${cp.manifest.version}.`);
    console.log(`${lp} Parsed content pack:`, cp);
    await importCP(cp, (x, y) => updateProgressBar(x, y));
    updateProgressBar(1, 1);
    console.log(`${lp} Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);

    updateLcpIndex(manifest);
  }

  function updateProgressBar(done: number, outOf: number) {
    let percent = Math.ceil((done / outOf) * 100);
    SceneNavigation.displayProgressBar({ label: "Importing...", pct: percent });
  }
</script>

<div class="lcp-manager flexrow">
  <!-- TODO: event when clicking a package row to show details -->
  <LCPTable
    {lcpData}
    style="grid-area: massif-content"
    on:lcpHovered={lcpHovered}
    on:aggregateSummary={event => (aggregateContentSummary = event.detail)}
  />
  <div class="lcp-manager__detail-column">
    <!-- TODO: event when selecting a new manifest -->
    <LcpSelector {contentPack} style="grid-area: lcp-selector" on:lcpLoaded={lcpLoaded} />
    <LcpDetails {contentSummary} {temporarySummary} style="grid-area: lcp-details" on:importLcp={importLcp} />
  </div>
</div>

<style lang="scss">
  .lcp-manager {
    .lcp-manager__detail-column {
      padding-left: 10px;
      padding-right: 10px;
    }

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
  }
</style>
