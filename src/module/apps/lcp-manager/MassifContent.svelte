<script lang="ts">
  export let officialData: {
    id: string;
    name: string;
    url?: string;
    currentVersion: string;
    availableVersion: string;
  }[];

  let officialContentSelect: Record<string, boolean> = {};
  for (const pack of officialData) {
    officialContentSelect[pack.id] = true;
  }
  $: selectAllOfficial = Object.values(officialContentSelect).every(v => v);

  function toggleSelectAllOfficial() {
    for (const pack of officialData) {
      officialContentSelect[pack.id] = !selectAllOfficial;
    }
  }
</script>

<div class="flexcol card clipped-bot" style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Official LANCER Content</div>
  <!-- Official LCPs -->
  <div id="massif-data">
    <div class="header">
      <input
        class="header content-checkbox"
        name="select-all"
        type="checkbox"
        bind:checked={selectAllOfficial}
        on:click={toggleSelectAllOfficial}
      />
    </div>
    <span class="header">TITLE</span>
    <span class="header">CURRENT</span>
    <span class="header" />
    <span class="header">AVAILABLE</span>
    {#each officialData as pack}
      <input class="content-checkbox" name={pack.id} type="checkbox" bind:checked={officialContentSelect[pack.id]} />
      <span class="content-label">
        {pack.name}
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
    {/each}
  </div>

  <button type="button" class="lcp-massif-build" title="Import/Update Selected" tabindex="-1" style="margin: 5px 10px">
    <i class="cci cci-content-manager i--m" />
    Import/Update Selected
  </button>
</div>

<style lang="scss">
  button {
    margin: 10px;
    width: auto;
  }

  #massif-data {
    display: grid;
    grid-template-columns: 3em 3fr 1fr 3em 1fr;
    grid-template-rows: auto;

    .header {
      font-weight: bold;
      border-bottom: 2px solid var(--secondary-color);
      align-content: center;
    }

    .content-checkbox {
    }

    .content-label {
      margin: 5px 10px;

      a {
        float: right;
      }
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
</style>
