<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { ContentSummary, generateLcpSummary, LCPData } from "./massif-content-map";

  export let lcpData: LCPData[];

  const dispatch = createEventDispatcher();

  let officialContentSelect: Record<string, boolean> = {};
  for (const pack of lcpData) {
    officialContentSelect[pack.id] = true;
  }
  $: selectAllOfficial = Object.values(officialContentSelect).every(v => v);

  function toggleSelectAllOfficial() {
    for (const pack of lcpData) {
      officialContentSelect[pack.id] = !selectAllOfficial;
    }
  }

  let hoveredRow: string | null = null;

  function onMouseenterRow(id: string) {
    console.log("enter", id);
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
        console.log("== leave", id);
        hoveredRow = null;
        dispatch("lcpHovered", null);
      }
    }, 100);
  }
</script>

<div class="lcp-table flexcol" style={$$restProps.style}>
  <div class="lancer-header clipped-top lancer-primary major">Official LANCER Content</div>
  <!-- Official LCPs -->
  <div id="massif-data">
    <div class="row header">
      <div>
        <input
          class="header content-checkbox"
          name="select-all"
          type="checkbox"
          bind:checked={selectAllOfficial}
          on:click={toggleSelectAllOfficial}
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
      <div class="row" on:mouseenter={() => onMouseenterRow(pack.id)} on:mouseleave={() => onMouseleaveRow(pack.id)}>
        <input class="content-checkbox" name={pack.id} type="checkbox" bind:checked={officialContentSelect[pack.id]} />
        <span class="content-label">
          {pack.title}
        </span>
        <span class="content-label">
          {pack.author}
        </span>
        <span class="content-label">
          {#if pack.url}
            <a href={pack.url} target="_blank" rel="noopener noreferrer">
              <i class="fas fa-external-link-alt" />
            </a>
          {/if}
        </span>
        <span class="curr-version">{pack.currentVersion}</span>
        <span class="content-icon">
          {#if pack.currentVersion === pack.availableVersion}
            <i class="fas fa-check" />
          {:else if officialContentSelect[pack.id]}
            <i class="fas fa-arrow-right" />
          {:else}
            <i class="fas fa-lock" />
          {/if}
        </span>
        <span class="avail-version">{pack.availableVersion}</span>
      </div>
    {/each}
  </div>

  <button type="button" class="lcp-bulk-import" title="Import/Update Selected" tabindex="-1" style="margin: 5px 10px">
    <i class="cci cci-content-manager i--m" />
    Import/Update Selected
  </button>
</div>

<style lang="scss">
  .lcp-table {
    & * {
      flex-grow: 0;
    }
  }
  button {
    margin: 10px;
    width: auto;
  }

  #massif-data {
    display: grid;

    .row {
      display: grid;
      grid-template-columns: 3em 2fr 2fr auto 1fr 3em 1fr;

      &:not(.header):hover {
        background-color: var(--darken-1);
      }
    }

    .header {
      font-weight: bold;
      border-bottom: 2px solid var(--secondary-color);
      align-content: center;
    }

    .content-checkbox {
    }

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
  .lcp-bulk-import {
    max-height: 3em;
  }
</style>
