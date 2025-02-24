<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import { ContentSummary, LCPData } from "./massif-content-map";
  import LCPTable from "./LCPTable.svelte";
  import { IContentPack } from "../../util/unpacking/packed-types";
  const lp = LANCER.log_prefix;

  export let lcpData: LCPData[];
  let fileContentSummary: ContentSummary;
  let contentPack: IContentPack;
  let hoveredContentSummary: ContentSummary;
  $: contentSummary = hoveredContentSummary ?? fileContentSummary;

  // TODO: bring in LCP management logic from the old LCP manager
  function lcpLoaded(event: CustomEvent<{ cp: IContentPack; contentSummary: ContentSummary }>) {
    fileContentSummary = event.detail.contentSummary;
    contentPack = event.detail.cp;
    console.log(`${lp} LCP loaded`, contentPack, fileContentSummary);
  }

  function lcpHovered(event: CustomEvent<ContentSummary>) {
    hoveredContentSummary = event.detail;
    console.log(`${lp} LCP hovered`, hoveredContentSummary);
  }
</script>

<div class="main-layout flexrow">
  <!-- TODO: event when clicking a package row to show details -->
  <LCPTable {lcpData} style="grid-area: massif-content" on:lcpHovered={lcpHovered} />
  <div class="lcp-manager__detail-column">
    <!-- TODO: event when selecting a new manifest -->
    <LcpSelector {contentPack} style="grid-area: lcp-selector" on:lcpLoaded={lcpLoaded} />
    <LcpDetails {contentSummary} style="grid-area: lcp-details" />
  </div>
</div>

<style lang="scss">
  .lcp-manager__detail-column {
    padding-left: 10px;
    padding-right: 10px;
  }
</style>
