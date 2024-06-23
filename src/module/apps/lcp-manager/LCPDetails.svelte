<script lang="ts">
  export let manifest: any;
</script>

<!-- Import New LCP -->
<div class="lcp-importer card clipped">
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

<style lang="scss">
  .manifest-image {
    max-width: 400px;
    max-height: 400px;
  }
</style>
