<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  import { LCPIndex } from "../lcp-manager";
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

  // TODO: bring in LCP management logic from the old LCP manager

  // TODO: Compartmentalize the LCP manager into smaller components
  //   - Official content list & build button
  //   - LCP selector & import button
  //   - LCP details view - can show LCP file or official content pack details
  //   - Installed LCPs list
</script>

<div class="flexcol">
  <!-- TODO: create a real layout. Start by imitating old LCP manager. -->
  <!-- Update core data -->
  {#if coreUpdate}
    <div class="card clipped flexcol">
      <div class="lancer-header lancer-primary major">Official LANCER Content</div>
      <div class="form fields flexrow" style="align-items: center">
        <span style="margin: 5px 10px">
          {#if coreVersion}
            Core Data is at v{coreVersion}
          {:else}
            Core Data has not been built yet
          {/if}
        </span>
        {#if coreVersion !== coreUpdate}
          <button type="button" class="lcp-core-update" title="Update Core Data" tabindex="-1" style="margin: 5px 10px">
            <i class="cci cci-content-manager i--m" />
            Update to v{coreUpdate}
          </button>
        {:else}
          <button
            type="button"
            class="lcp-core-update"
            title="Rebuild Core Data"
            tabindex="-1"
            style="margin: 5px 10px"
          >
            <i class="cci cci-content-manager i--m" />
            Rebuild Core Data
          </button>
        {/if}
      </div>
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
          <input
            class="content-checkbox"
            name={pack.id}
            type="checkbox"
            bind:checked={officialContentSelect[pack.id]}
          />
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
    </div>
  {/if}

  <!-- Import New LCP -->
  <div class="lcp-importer card clipped">
    <div class="lancer-header lancer-primary major" style="grid-area: 1/1/2/3;">Import/Update LCP</div>
    <input id="lcp-file" type="file" name="lcp-up" class="lcp-up" accept=".lcp" />
    <!-- New LCP Manifest -->
    {#if manifest}
      <div class="card clipped flexcol" style="grid-column: 1/3;">
        <div class="lancer-header lancer-primary major">{manifest.name} v{manifest.version}</div>
        {#if manifest.website}
          <a href={manifest.website} class="medium" style="margin: 5px;">by {manifest.author}</a>
        {:else}
          <div class="major" style="margin: 10px;">by {manifest.author}</div>
        {/if}
        <button type="button" class="lcp-import" title="Import LCP" tabindex="-1">
          <i class="cci cci-content-manager i--m" />
          Import LCP
        </button>
        <div class="flexrow" style="margin: 5px;">
          {#if manifest.description}
            <div class="minor desc-text">
              {@html manifest.description}
              <p>This LCP contains:</p>
              <ul>
                {#if manifest.skills}
                  <li><span class="lcp-manifest-badge">{manifest.skills}</span> pilot skills</li>
                {/if}
                {#if manifest.talents}
                  <li><span class="lcp-manifest-badge">{manifest.talents}</span> talents</li>
                {/if}
                {#if manifest.gear}
                  <li><span class="lcp-manifest-badge">{manifest.gear}</span> pilot gear</li>
                {/if}
                {#if manifest.frames}
                  <li><span class="lcp-manifest-badge">{manifest.frames}</span> frames</li>
                {/if}
                {#if manifest.systems}
                  <li><span class="lcp-manifest-badge">{manifest.systems}</span> mech systems</li>
                {/if}
                {#if manifest.weapons}
                  <li><span class="lcp-manifest-badge">{manifest.weapons}</span> mech weapons</li>
                {/if}
                {#if manifest.mods}
                  <li><span class="lcp-manifest-badge">{manifest.mods}</span> weapon mods</li>
                {/if}
                {#if manifest.npc_classes}
                  <li><span class="lcp-manifest-badge">{manifest.npc_classes}</span> NPC classes</li>
                {/if}
                {#if manifest.npc_templates}
                  <li><span class="lcp-manifest-badge">{manifest.npc_templates}</span> NPC templates</li>
                {/if}
                {#if manifest.npc_features}
                  <li><span class="lcp-manifest-badge">{manifest.npc_features}</span> NPC features</li>
                {/if}
              </ul>
            </div>
          {/if}
          {#if manifest.image_url}
            <img class="manifest-image" src={manifest.image_url} title={manifest.name} alt={manifest.name} />
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- List installed LCPs -->
  <div class="card clipped-top">
    <div class="lancer-header lancer-primary major">Imported LCPs</div>
    <div class="flexrow">
      <table class="lcp-index">
        <tr class="lcp-index-header">
          <th class="lcp-index">Name</th>
          <th class="lcp-index">Author</th>
          <th class="lcp-index">Version</th>
        </tr>
        {#if lcps}
          {#each lcps.index as lcp, key}
            {#if lcp.name}
              <tr data-id={key}>
                <td class="lcp-index">{lcp.name}</td>
                <td class="lcp-index">{lcp.author}</td>
                <td class="lcp-index">{lcp.version}</td>
              </tr>
            {/if}
          {/each}
        {/if}
      </table>
    </div>
  </div>

  <div class="flexrow medium">
    <button type="button" class="lcp-clear-all" title="Clear Compendiums" tabindex="-1" style="margin: 5px 10px">
      <i class="cci cci-content-manager i--m" />
      Clear LANCER Compendium Data
    </button>
  </div>
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
      border-bottom: 1px solid var(--secondary-color);
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

  .manifest-image {
    max-width: 400px;
    max-height: 400px;
  }
</style>
