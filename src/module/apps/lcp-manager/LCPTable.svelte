<script lang="ts">
  import { onMount } from "svelte";
  import { type ContentSummary, generateLCPSummary, type LCPData } from "../../util/lcps";
  import { generateLLPSummary, type LLPRow, type LLPRows, type LLPSummary } from "../../util/localization/llp-import";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import type { IContentPack, PackedLanguagePatchWrapper } from "../../util/unpacking/packed-types";
  import type { OfficialLocaleHandle } from "../../util/localization/llp-fetch";

  interface Props {
    lcpData: LCPData[];
    llpRows: LLPRows;

    onLCPHovered: (s: ContentSummary | null) => void;
    onLLPHovered: (s: LLPSummary | null) => void;
    onSelectionChanged: (packs: IContentPack[]) => void;
    onLocalesChanged: (locales: OfficialLocaleHandle[]) => void;
    onRemovePatch: (patch: PackedLanguagePatchWrapper) => void;

    disabled: boolean;
  }

  let {
    lcpData,
    llpRows,

    onLCPHovered,
    onLLPHovered,
    onSelectionChanged,
    onLocalesChanged,
    onRemovePatch,

    disabled = false,
  }: Props = $props();

  let expandedRows = new SvelteSet<string>();
  let selectedLocales = new SvelteMap<string, boolean>(); // Keyed by `LLPRow.id`

  let selectableRows = new SvelteSet<string>();
  let selectedRows = new SvelteMap<string, boolean>();
  let allRowsSelected = $derived([...selectableRows].every(id => selectedRows.get(id) === true));

  onMount(() => {
    if (typeof lcpData !== "undefined") {
      for (const pack of lcpData) {
        selectedRows.set(pack.id, pack.availableVersion > pack.currentVersion);
        if (Boolean(pack.availableVersion)) selectableRows.add(pack.id);
      }
    }
    dispatchPack();
  });

  function toggleExpanded(packId: string) {
    if (expandedRows.has(packId)) expandedRows.delete(packId);
    else expandedRows.add(packId);
  }

  function toggleLocale(row: LLPRow) {
    if (!row.fetchHandle) return;
    selectedLocales.set(row.id, !selectedLocales.get(row.id));
    dispatchLocales();
  }

  function dispatchLocales() {
    const selected = [...llpRows.matched.values()]
      .flat()
      .filter(row => selectedLocales.get(row.id) === true)
      .flatMap(row => (row.fetchHandle ? [row.fetchHandle] : []));
    onLocalesChanged(selected);
  }

  function toggleSelectAllOfficial() {
    const toggle = !allRowsSelected;
    for (const pack of lcpData) {
      if (!selectableRows.has(pack.id)) continue;
      selectedRows.set(pack.id, toggle);
    }
  }

  function toggleRow(packId: string) {
    selectedRows.set(packId, !selectedRows.get(packId));
    dispatchPack();
  }

  function dispatchPack() {
    const selected = lcpData.filter(p => selectedRows.get(p.id) === true);
    onSelectionChanged(selected.flatMap(p => (p.cp ? [p.cp] : [])));
  }

  let hoveredRow: string | null = null;
  function onMouseEnterRow(id: string) {
    hoveredRow = id;
    const rowLcp = lcpData.find(p => p.id === id);
    if (!rowLcp || !rowLcp.cp || !rowLcp.cp.data) {
      onLCPHovered(null);
      return;
    }
    const lcpSummary = generateLCPSummary(rowLcp.cp);
    onLCPHovered(lcpSummary);
  }

  function onMouseLeaveRow(id: string) {
    setTimeout(() => {
      if (hoveredRow === id) {
        hoveredRow = null;
        onLCPHovered(null);
      }
    }, 50);
  }
</script>

{#snippet localeRow(row: LLPRow, orphan: boolean)}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="button"
    tabindex="-1"
    class={["row locale-row", orphan && "orphan-row"]}
    title={orphan ? game.i18n.localize("lancer.lcpManager.table.orphanLocale.tooltip") : undefined}
    onmouseenter={() => onLLPHovered(row.patch ? generateLLPSummary(row.patch) : null)}
    onmouseleave={() => onLLPHovered(null)}
    onclick={() => toggleLocale(row)}
  >
    <div class={["content-select"]}>
      {#if row.fetchHandle}
        <input
          class="content-checkbox"
          name={row.id}
          type="checkbox"
          {disabled}
          checked={selectedLocales.get(row.id) === true}
          onchange={() => toggleLocale(row)}
          onclick={e => e.stopPropagation()}
        >
      {:else}
        <span class="content-checkbox"></span>
      {/if}
    </div>
    <span class="content-label">{row.title}</span>
    <span class="content-label">{row.translator}</span>
    <span class="content-label">
      {#if row.url}
        <a
          title={row.url}
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          onclick={e => e.stopPropagation()}
        >
          <i class="fas fa-external-link-alt"></i>
        </a>
      {/if}
    </span>
    <span class="curr-version">{row.currentVersion}</span>
    <span class="content-icon">
      {#if row.currentVersion !== "--"}
        <i class="fas fa-check"></i>
      {:else if selectedLocales.get(row.id)}
        <i class="fas fa-arrow-right"></i>
      {/if}
    </span>
    <span class="avail-version">{row.availableVersion}</span>
    {#if row.patch}
      <button
        type="button"
        class="content-action locale-remove"
        title={game.i18n.localize("lancer.lcpManager.table.removeLlp.tooltip")}
        {disabled}
        tabindex="-1"
        onclick={e => {
          e.stopPropagation();
          onRemovePatch(row.patch!);
        }}
      >
        <i class="fas fa-trash"></i>
      </button>
    {/if}
  </div>
{/snippet}

{#snippet tableRow(pack: LCPData)}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="button"
    tabindex="-1"
    class={["row", pack.availableVersion ?? "has-data"]}
    onmouseenter={() => onMouseEnterRow(pack.id)}
    onmouseleave={() => onMouseLeaveRow(pack.id)}
    onclick={() => toggleRow(pack.id)}
  >
    <div class="content-select">
      {#if selectableRows.has(pack.id)}
        <input
          class="content-checkbox"
          name={pack.id}
          type="checkbox"
          {disabled}
          bind:checked={() => selectedRows.get(pack.id) ?? false, v => selectedRows.set(pack.id, v)}
          onchange={dispatchPack}
          onclick={e => e.stopPropagation()}
        >
      {:else}
        <span class="content-checkbox"></span>
      {/if}
      {#if llpRows.matched.get(pack.id)?.length}
        <button
          type="button"
          class="content-expand"
          title={game.i18n.localize("lancer.lcpManager.table.locale.tooltip")}
          aria-expanded={expandedRows.has(pack.id)}
          tabindex="-1"
          onclick={e => {
            e.stopPropagation();
            toggleExpanded(pack.id);
          }}
        >
          <i class={["fas", expandedRows.has(pack.id) ? "fa-chevron-up" : "fa-chevron-down"]}></i>
        </button>
      {/if}
    </div>
    <span class="content-label">
      {pack.title}
    </span>
    <span class="content-label">
      {pack.author}
    </span>
    <span class="content-label">
      {#if pack.url}
        <a
          title={pack.url}
          href={pack.url}
          target="_blank"
          rel="noopener noreferrer"
          onclick={e => e.stopPropagation()}
        >
          <i class="fas fa-external-link-alt"></i>
        </a>
      {/if}
    </span>
    <span class="curr-version">{pack.currentVersion}</span>
    <span class="content-icon">
      {#if pack.availableVersion}
        {#if pack.currentVersion === pack.availableVersion}
          <i class="fas fa-check"></i>
        {:else if selectedRows.has(pack.id)}
          <i class="fas fa-arrow-right"></i>
        {:else}
          <i class="fas fa-lock"></i>
        {/if}
      {/if}
    </span>
    <span class="avail-version">{pack.availableVersion}</span>
  </div>
{/snippet}

<div class="lcp-table flexcol">
  <div class="lancer-header clipped-top lancer-primary major">
    {game.i18n.localize("lancer.lcpManager.header.availableContent.label")}
  </div>
  <!-- LCP table. Official content is listed first, manually installed content at the end. -->
  <div class="lcp-table__table">
    <div class="lcp-table__rows">
      <div class="row header">
        <div>
          <input
            class="content-checkbox"
            name="select-all"
            type="checkbox"
            {disabled}
            bind:checked={allRowsSelected}
            onclick={toggleSelectAllOfficial}
            onchange={dispatchPack}
          >
        </div>
        <span>{game.i18n.localize("lancer.lcpManager.table.title.label")}</span>
        <span>{game.i18n.localize("lancer.lcpManager.table.author.label")}</span>
        <span></span>
        <span>{game.i18n.localize("lancer.lcpManager.table.current.label")}</span>
        <span></span>
        <span>{game.i18n.localize("lancer.lcpManager.table.available.label")}</span>
        <span></span>
      </div>
      {#each lcpData as pack (pack.id)}
        {@render tableRow(pack)}
        {#if expandedRows.has(pack.id)}
          {#each llpRows.matched.get(pack.id) ?? [] as row (row.id)}
            {@render localeRow(row, false)}
          {/each}
        {/if}
      {/each}
      <!-- Orphaned LLPs -->
      {#each llpRows.orphaned as row (row.id)}
        {@render localeRow(row, true)}
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  @layer lancer {
    @layer applications {
      .lcp-table {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;
      }

      .lcp-table__table {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 0;

        overflow: hidden scroll;
        min-height: 10rem;
        min-width: 20rem;

        input.content-checkbox:disabled {
          --checkbox-disabled-color: var(--darken-5);
          --checkbox-background-color: var(--darken-5) !important; // Sorry, I don't want to touch the global styles
          --checkbox-checked-color: var(--darken-5) !important; // Sorry, I don't want to touch the global styles
          background-color: transparent;
          cursor: default;
        }

        .lcp-table__rows {
          display: grid;
          grid-template-columns: 3em minmax(0, 2fr) minmax(0, 1fr) 1.5em minmax(0, 1fr) 1em minmax(0, 1fr) 2em;
        }

        .row {
          display: grid;
          position: relative;
          grid-column: 1 / -1;
          grid-template-columns: subgrid;
          align-items: center;
          cursor: pointer;

          &:not(.header):nth-of-type(odd) {
            background-color: var(--darken-2);
          }
          &:not(.header):hover {
            background-color: var(--lighten-1);
          }

          & > * {
            padding: 5px 10px;
          }

          & > *:first-child {
            padding: 5px;
          }
        }

        .header {
          min-width: fit-content;
          overflow-wrap: break-word;

          font-weight: bold;
          border-bottom: 2px solid var(--secondary-color);
          background-color: var(--darken-2);
        }

        .content-icon {
          justify-self: center;
        }

        .content-select {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .content-expand {
          padding: 0;
          margin: 0;
          background: none;
          border-radius: 2px;
          width: 1.5em;
          align-self: flex-start;
          box-shadow: unset;

          &:hover {
            color: var(--primary-color);
          }
        }

        .content-action {
          padding: 0;
          margin: 0;
          background: none;
          border-radius: 2px;
          width: 1.5em;
          box-shadow: unset;

          &:hover:not(:disabled) {
            color: var(--primary-color);
          }
          &:disabled {
            color: var(--darken-5);
            cursor: default;
          }
        }

        .locale-row {
          background-color: var(--darken-1);
          font-size: 0.9em;
        }

        .orphan-row {
          font-size: unset;
          font-style: italic;
        }
      }
    }
  }
</style>
