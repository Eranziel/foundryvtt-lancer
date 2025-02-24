<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import MassifContent from "./MassifContent.svelte";
  const lp = LANCER.log_prefix;

  export let lcpData: {
    id: string;
    title: string;
    url?: string;
    currentVersion: string;
    availableVersion: string;
  }[];
  export let manifest: any;
  export let contentPack: any;

  // TODO: bring in LCP management logic from the old LCP manager
  function lcpLoaded(event: CustomEvent<{ cp: any; manifest: any }>) {
    manifest = event.detail.manifest;
    contentPack = event.detail.cp;
    console.log(`${lp} LCP loaded`, contentPack, manifest);
  }
</script>

<div class="main-layout">
  <!-- TODO: event when clicking a package row to show details -->
  <MassifContent {lcpData} style="grid-area: massif-content" />
  <div>
    <!-- TODO: event when selecting a new manifest -->
    <LcpSelector {contentPack} style="grid-area: lcp-selector" />
    <LcpDetails {manifest} style="grid-area: lcp-details" />
  </div>
</div>

<style lang="scss">
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    grid-template-areas: "massif-content lcp-selector";
    gap: 10px;
  }
</style>
