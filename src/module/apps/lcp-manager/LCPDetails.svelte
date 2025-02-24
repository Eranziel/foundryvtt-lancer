<script lang="ts">
  import { ContentSummary } from "./massif-content-map";

  export let contentSummary: ContentSummary | null = null;
  $: title = contentSummary ? `${contentSummary.name} v${contentSummary.version}` : "No LCP Selected";
</script>

<!-- Show LCP name, art, and contents -->
<div class="lcp-details card clipped" style="{$$restProps.style} grid-column: 1/3;">
  <div class="lancer-header lancer-primary major">{title}</div>
  <!-- New LCP Manifest -->
  {#if contentSummary}
    {#if contentSummary.website}
      <a href={contentSummary.website} class="medium" style="margin: 5px;">by {contentSummary.author}</a>
    {:else}
      <div class="major" style="margin: 10px;">by {contentSummary.author}</div>
    {/if}
    <div class="flexrow" style="margin: 5px;">
      {#if contentSummary.description}
        <div class="lcp-description minor desc-text">
          {#if contentSummary.image_url}
            <img
              class="manifest-image"
              src={contentSummary.image_url}
              title={contentSummary.name}
              alt={contentSummary.name}
            />
          {/if}
          {@html contentSummary.description}
          <p>This LCP contains:</p>
          <ul>
            {#if contentSummary.skills}
              <li><span class="lcp-manifest-badge">{contentSummary.skills}</span> pilot skills</li>
            {/if}
            {#if contentSummary.talents}
              <li><span class="lcp-manifest-badge">{contentSummary.talents}</span> talents</li>
            {/if}
            {#if contentSummary.gear}
              <li><span class="lcp-manifest-badge">{contentSummary.gear}</span> pilot gear</li>
            {/if}
            {#if contentSummary.frames}
              <li><span class="lcp-manifest-badge">{contentSummary.frames}</span> frames</li>
            {/if}
            {#if contentSummary.systems}
              <li><span class="lcp-manifest-badge">{contentSummary.systems}</span> mech systems</li>
            {/if}
            {#if contentSummary.weapons}
              <li><span class="lcp-manifest-badge">{contentSummary.weapons}</span> mech weapons</li>
            {/if}
            {#if contentSummary.mods}
              <li><span class="lcp-manifest-badge">{contentSummary.mods}</span> weapon mods</li>
            {/if}
            {#if contentSummary.npc_classes}
              <li><span class="lcp-manifest-badge">{contentSummary.npc_classes}</span> NPC classes</li>
            {/if}
            {#if contentSummary.npc_templates}
              <li><span class="lcp-manifest-badge">{contentSummary.npc_templates}</span> NPC templates</li>
            {/if}
            {#if contentSummary.npc_features}
              <li><span class="lcp-manifest-badge">{contentSummary.npc_features}</span> NPC features</li>
            {/if}
          </ul>
        </div>
      {:else if contentSummary.image_url}
        <img
          class="manifest-image"
          src={contentSummary.image_url}
          title={contentSummary.name}
          alt={contentSummary.name}
        />
      {/if}
    </div>
    {#if !contentSummary.aggregate}
      <button type="button" class="lcp-import" title="Import LCP" tabindex="-1">
        <i class="cci cci-content-manager i--m" />
        Import LCP
      </button>
    {/if}
  {/if}
</div>

<style lang="scss">
  .manifest-image {
    max-width: 400px;
    max-height: 400px;

    .lcp-description & {
      float: right;
      margin-left: 10px;
      margin-bottom: 10px;
      max-width: 60%;
    }
  }
</style>
