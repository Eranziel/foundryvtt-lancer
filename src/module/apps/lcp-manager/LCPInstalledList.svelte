<script lang="ts">
  import { LCPIndex } from "../lcp-manager";

  export let lcps: LCPIndex;
</script>

<div style={$$restProps.style}>
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
</style>
