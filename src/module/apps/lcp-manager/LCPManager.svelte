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
  export let cp: any;
  export let lcps: LCPIndex;

  // console.log(`${lp} LCP Manager 2.0 mounted`);

  // TODO: bring in LCP management logic from the old LCP manager
  function lcpLoaded(event: CustomEvent<{ cp: any; manifest: any }>) {
    manifest = event.detail.manifest;
    cp = event.detail.cp;
    console.log(`${lp} LCP loaded`, cp, manifest);
  }
</script>

<div class="main-layout">
  <!-- TODO: event when clicking a package row to show details -->
  <MassifContent {officialData} style="grid-area: massif-content" />
  <!-- TODO: event when selecting a new manifest -->
  <LcpSelector style="grid-area: lcp-selector" />

  <LcpDetails {manifest} style="grid-area: lcp-details" />

  <LcpInstalledList {lcps} style="grid-area: lcp-installed" />
</div>

<style lang="scss">
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      "massif-content lcp-selector"
      "lcp-details lcp-installed";
    gap: 10px;
  }
</style>
