<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { ContentSummary, generateLcpSummary, generateMultiLcpSummary, LCPData } from "../../util/lcps";

  const dispatch = createEventDispatcher();

  export let lcpData: LCPData[];
  export let disabled: boolean = false;
  export const deselect = () => {
    for (const pack of lcpData) {
      rowSelectionTracker[pack.id].checked = false;
    }
  };

  $: selectAllRows = Object.values(rowSelectionTracker).every(v => !v.selectable || v.checked);

  onMount(() => debounceAggregateSummary());

  let rowSelectionTracker: Record<string, { checked: boolean; selectable: boolean }> = {};
  $: {
    if (typeof lcpData !== "undefined") {
      for (const pack of lcpData) {
        if (!rowSelectionTracker[pack.id]) {
          rowSelectionTracker[pack.id] = {
            checked: pack.availableVersion > pack.currentVersion,
            selectable: Boolean(pack.availableVersion),
          };
        }
      }
    }
  }

  function toggleSelectAllOfficial() {
    for (const pack of lcpData) {
      if (!rowSelectionTracker[pack.id].selectable) continue;
      rowSelectionTracker[pack.id].checked = !selectAllRows;
    }
  }

  function toggleRow(packId: string) {
    rowSelectionTracker[packId].checked = !rowSelectionTracker[packId].checked;
    debounceAggregateSummary();
  }

  const aggregateManifest = {
    author: "Massif Press",
    name: "Selected Official Sources",
    version: "1.0.0",
    item_prefix: "",
    description: "",
    website: "https://massif-press.itch.io/",
  };
  function generateAggregateSummary() {
    const selected = lcpData.filter(p => rowSelectionTracker[p.id].checked);
    if (!selected.length) return null;
    if (selected.length === 1) {
      const summary = generateLcpSummary(selected[0].cp);
      summary.aggregate = true;
      return summary;
    }
    return generateMultiLcpSummary(
      aggregateManifest,
      selected.filter(p => Boolean(p.cp)).map(p => p.cp!)
    );
  }

  let aggregateSummaryTimeout: NodeJS.Timeout | null = null;
  function debounceAggregateSummary() {
    if (aggregateSummaryTimeout) {
      clearTimeout(aggregateSummaryTimeout);
    }
    aggregateSummaryTimeout = setTimeout(() => {
      dispatch("aggregateSummary", generateAggregateSummary());
    }, 100);
  }

  let hoveredRow: string | null = null;
  function onMouseenterRow(id: string) {
    hoveredRow = id;
    const rowLcp = lcpData.find(p => p.id === id);
    if (!rowLcp || !rowLcp.cp || !rowLcp.cp.data) {
      dispatch("lcpHovered", null);
      return;
    }
    const lcpSummary = generateLcpSummary(rowLcp.cp);
    dispatch("lcpHovered", lcpSummary);
  }

  function onMouseleaveRow(id: string) {
    setTimeout(() => {
      if (hoveredRow === id) {
        hoveredRow = null;
        dispatch("lcpHovered", null);
      }
    }, 50);
  }

  function dispatchLcpsToInstall() {
    const selected = lcpData.filter(p => rowSelectionTracker[p.id].checked);
    dispatch(
      "installManyLcps",
      selected.map(p => p.cp)
    );
  }

  function clearCompendiums() {
    dispatch("clearCompendiums");
  }
</script>

<div class="lcp-table flexcol" style={$$restProps.style}>
  <div class="lancer-header clipped-top lancer-primary major">Available and Installed Content</div>
  <!-- LCP table. Official content is listed first, manually installed content at the end. -->
  <div id="lcp-table">
    <div class="lcp-table__rows">
      <div class="row header">
        <div>
          <input
            class="content-checkbox"
            name="select-all"
            type="checkbox"
            {disabled}
            bind:checked={selectAllRows}
            on:click={toggleSelectAllOfficial}
            on:change={() => debounceAggregateSummary()}
          />
        </div>
        <span>TITLE</span>
        <span>AUTHOR</span>
        <span />
        <span>CURRENT</span>
        <span />
        <span>AVAILABLE</span>
      </div>
      {#each lcpData as pack}
        <div
          class={`row${pack.availableVersion ? " has-data" : ""}`}
          on:mouseenter={() => onMouseenterRow(pack.id)}
          on:mouseleave={() => onMouseleaveRow(pack.id)}
          on:click={() => toggleRow(pack.id)}
          on:keypress={() => toggleRow(pack.id)}
        >
          {#if rowSelectionTracker[pack.id].selectable}
            <input
              class="content-checkbox"
              name={pack.id}
              type="checkbox"
              {disabled}
              bind:checked={rowSelectionTracker[pack.id].checked}
              on:change={() => debounceAggregateSummary()}
            />
          {:else}
            <span class="content-checkbox" />
          {/if}
          <span class="content-label">
            {pack.title}
          </span>
          <span class="content-label">
            {pack.author}
          </span>
          <span class="content-label">
            {#if pack.url}
              <a href={pack.url} target="_blank" rel="noopener noreferrer" on:click={e => e.stopPropagation()}>
                <i class="fas fa-external-link-alt" />
              </a>
            {/if}
          </span>
          <span class="curr-version">{pack.currentVersion}</span>
          <span class="content-icon">
            {#if pack.availableVersion}
              {#if pack.currentVersion === pack.availableVersion}
                <i class="fas fa-check" />
              {:else if rowSelectionTracker[pack.id]}
                <i class="fas fa-arrow-right" />
              {:else}
                <i class="fas fa-lock" />
              {/if}
            {/if}
          </span>
          <span class="avail-version">{pack.availableVersion}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="lcp-table__buttons">
    <button
      type="button"
      class="lancer-button lcp-bulk-import"
      title="Import/Update Selected"
      tabindex="-1"
      disabled={disabled || !lcpData.some(p => rowSelectionTracker[p.id].checked)}
      on:click={dispatchLcpsToInstall}
    >
      <i class="cci cci-content-manager i--m" />
      Import/Update Selected
    </button>

    <button
      type="button"
      class="lancer-button lcp-clear-all"
      title="Clear Compendium Data"
      tabindex="-1"
      disabled={disabled || !lcpData.some(p => p.currentVersion !== "--")}
      on:click={clearCompendiums}
    >
      <i class="fas fa-trash i--s" />
      Clear Compendium Data
    </button>
  </div>
</div>

<style lang="scss">
  .lcp-table {
    max-height: 100%;
    height: 100%;
    & * {
      flex-grow: 0;
    }
  }
  button {
    margin: 10px;
    width: auto;
  }

  #lcp-table {
    display: grid;
    max-height: calc(100% - 8em);
    flex-grow: 1;
    overflow-y: scroll;
    .lcp-table__rows {
      height: fit-content;
    }

    .row {
      display: grid;
      position: relative;
      grid-template-columns: 2.5em 2fr 2fr 2.5em 1fr 3em 1fr;
      cursor: pointer;

      &:not(.header):nth-of-type(odd) {
        background-color: var(--darken-2);
      }
      &:not(.header):hover {
        background-color: var(--lighten-1);
      }
    }

    .header {
      font-weight: bold;
      border-bottom: 2px solid var(--secondary-color);
      align-content: center;
    }

    // .content-checkbox {
    // }

    .content-label {
      margin: 5px 10px;
    }

    .curr-version {
      margin: 5px 10px;
    }

    .avail-version {
      margin: 5px 10px;
    }

    .content-icon {
      margin: 5px 10px;
    }
  }
  .lcp-table__buttons {
    flex-grow: 0;
    .lcp-bulk-import,
    .lcp-clear-all {
      width: 100%;
      max-height: 3em;
      margin: 0.5em 0;
    }

    .lcp-clear-all {
      background-color: var(--background-color);
      border: 1px solid var(--lighten-5);
      &:hover {
        background-color: var(--color-level-error-bg);
        border: 1px solid var(--color-level-error-border);
      }
    }
  }
</style>
