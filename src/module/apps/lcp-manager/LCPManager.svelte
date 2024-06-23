<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  import { LCPIndex } from "../lcp-manager";
  import LcpDetails from "./LCPDetails.svelte";
  import LcpInstalledList from "./LCPInstalledList.svelte";
  import LcpSelector from "./LCPSelector.svelte";
  import MassifContent from "./MassifContent.svelte";
  const lp = LANCER.log_prefix;

  export let coreVersion: string;
  export let coreUpdate: string | null;
  export let officialData: {
    id: string;
    name: string;
    url?: string;
    currentVersion: string;
    availableVersion: string;
  }[];
  export let manifest: any;
  export let lcps: LCPIndex;

  // console.log(`${lp} LCP Manager 2.0 mounted`);

  // TODO: bring in LCP management logic from the old LCP manager
</script>

<div class="main-layout">
  <!-- TODO: event when clicking a package row to show details -->
  <MassifContent {coreVersion} {coreUpdate} {officialData} />

  <LcpDetails {manifest} />

  <!-- TODO: event when selecting a new manifest -->
  <LcpSelector />

  <LcpInstalledList {lcps} />
</div>

<style lang="scss">
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      "massif-content lcp-details"
      "lcp-selector lcp-installed";
    gap: 10px;
  }

  .lcp-importer {
    grid-area: lcp-details;
  }

  .lcp-installed {
    grid-area: lcp-installed;
  }

  .lcp-selector {
    grid-area: lcp-selector;
  }

  .massif-content {
    grid-area: massif;
  }
</style>
