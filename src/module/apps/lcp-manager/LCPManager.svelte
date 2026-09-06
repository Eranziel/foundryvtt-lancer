<script lang="ts">
  import { fade } from "svelte/transition";
  import { LANCER } from "../../config";
  import Spinner from "../components/Spinner.svelte";
  import LCPDetails from "./LCPDetails.svelte";
  import LCPSelector from "./LCPSelector.svelte";
  import { type ContentSummary, getOfficialData, type LCPData, mergeOfficialDataAndLcpIndex } from "../../util/lcps";
  import LCPTable from "./LCPTable.svelte";
  import type { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
  import { clearCompendiumData, importCP } from "../../comp-builder";
  import { LCPIndex } from "./lcp-manager";
  const lp = LANCER.log_prefix;

  interface Props {
    loading?: boolean;
  }

  let { loading = $bindable(true) }: Props = $props();

  let lcpData = $state<LCPData[]>([]);
  let contentPacks = $state<IContentPack[]>([]);
  let fileContentSummary = $state<ContentSummary | null>(null);
  let hoveredContentSummary = $state<ContentSummary | null>(null);
  let aggregateContentSummary = $state<ContentSummary | null>(null);
  let importingLcp = $state<IContentPack | null>(null);
  let importing = $state(false);
  let importingMany = $state(false);
  let clearing = $state(false);
  let barWidth = $state(0);
  let secondBarWidth = $state(0);
  let injectedContentSummary = $state<ContentSummary | null>(null); // Is only here to facilitate tours

  let busy = $derived(importing || importingMany || clearing);
  let contentSummary: ContentSummary | null = $derived(
    injectedContentSummary ?? hoveredContentSummary ?? fileContentSummary ?? aggregateContentSummary
  );
  let showImportButton = $derived(hoveredContentSummary !== null && !contentSummary?.aggregate);
  let coreVersion = $derived(lcpData.find(lcp => lcp.id === "core")?.currentVersion);

  export function injectContentPack(content: ContentSummary | null) {
    // Is only here to facilitate tours
    injectedContentSummary = contentSummary;
  }

  async function init() {
    loading = true;
    const index = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    const officialData = await getOfficialData(index);
    lcpData = mergeOfficialDataAndLcpIndex(officialData, index);
    loading = false;
  }

  const initPromise = init();
  export function ready() {
    // Is only here to facilitate tours
    return initPromise;
  }

  function lcpLoaded(packs: IContentPack[] | null, summary: ContentSummary | null) {
    if (!packs || !summary) {
      packs = [];
      fileContentSummary = null;
      return;
    }

    fileContentSummary = summary;
    contentPacks = packs;
  }

  function lcpHovered(summary: ContentSummary | null) {
    hoveredContentSummary = summary;
  }

  function updateAggregateSummary(summary: ContentSummary | null) {
    aggregateContentSummary = summary;
    contentPacks = [];
    fileContentSummary = null;
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
    await updateLcpIndex(manifest);
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
    const percent = Math.min(done / outOf, 1);
    barWidth = Math.floor(percent * 100);
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
        <p style="text-align: center"><i class=\"fas fa-triangle-exclamation i--4\"></i> ${game.i18n.localize("lancer.lcpManager.clearCompendium.content.1")}</p>`,
    });
    if (!answer) return;
    clearing = true;
    await clearCompendiumData();
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
          {lcpData}
          disabled={busy}
          onRowHovered={lcpHovered}
          onAggregateSummary={updateAggregateSummary}
          onImportMany={importManyLcps}
          onClearCompendiums={clearCompendiums}
        />
        <LCPSelector
          disabled={busy}
          onImport={lcpLoaded}
        />
      </div>
      <div class="lcp-manager__detail-column">
        <LCPDetails
          disabled={busy}
          showImportButton={showImportButton}
          contentSummary={contentSummary}
          onImportMany={importManyLcps}
        />
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
