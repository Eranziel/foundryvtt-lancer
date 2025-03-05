<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import { ContentSummary } from "../../util/lcps";

  const dispatch = createEventDispatcher();

  export let contentSummary: ContentSummary | null = null;
  export let showImportButton: boolean;
  export let disabled: boolean = false;

  let oldContentSummary: ContentSummary | null = null;
  let fadeDirection: "fade-in" | "fade-out" = "fade-in";
  $: title = oldContentSummary
    ? `${oldContentSummary.name}${oldContentSummary.version ? ` v${oldContentSummary.version}` : ""}`
    : "No LCP Selected";
  $: {
    if (contentSummary !== oldContentSummary) {
      fadeDirection = "fade-out";
      setTimeout(() => {
        oldContentSummary = contentSummary;
        fadeDirection = "fade-in";
      }, 100); // Time must match transition duration
    }
  }
</script>

<!-- Show LCP name, art, and contents -->
<div class="lcp-details card clipped">
  <div class="lancer-header lancer-primary major"><span class={`transition ${fadeDirection}`}>{title}</span></div>
  <!-- New LCP Manifest -->
  {#if oldContentSummary}
    <div class="lcp-details__content" transition:fade>
      {#if oldContentSummary.website}
        <a href={oldContentSummary.website} class={`medium transition ${fadeDirection}`} style="margin: 5px;"
          >by {oldContentSummary.author}</a
        >
      {:else}
        <div class={`medium transition ${fadeDirection}`} style="margin: 10px;">by {oldContentSummary.author}</div>
      {/if}
      <div class="lcp-description minor desc-text">
        <div class={`transition ${fadeDirection}`}>
          {#if oldContentSummary.image_url}
            <img
              class={`manifest-image transition ${fadeDirection}`}
              src={oldContentSummary.image_url}
              title={oldContentSummary.name}
              alt={oldContentSummary.name}
            />
          {/if}
          <span>Contents:</span>
          <ul>
            {#if oldContentSummary.skills}
              <li><span class="lcp-manifest-badge">{oldContentSummary.skills}</span> pilot skills</li>
            {/if}
            {#if oldContentSummary.talents}
              <li><span class="lcp-manifest-badge">{oldContentSummary.talents}</span> talents</li>
            {/if}
            {#if oldContentSummary.bonds}
              <li><span class="lcp-manifest-badge">{oldContentSummary.bonds}</span> bonds</li>
            {/if}
            {#if oldContentSummary.reserves}
              <li><span class="lcp-manifest-badge">{oldContentSummary.reserves}</span> reserves</li>
            {/if}
            {#if oldContentSummary.gear}
              <li><span class="lcp-manifest-badge">{oldContentSummary.gear}</span> pilot gear</li>
            {/if}
            {#if oldContentSummary.frames}
              <li><span class="lcp-manifest-badge">{oldContentSummary.frames}</span> frames</li>
            {/if}
            {#if oldContentSummary.systems}
              <li><span class="lcp-manifest-badge">{oldContentSummary.systems}</span> mech systems</li>
            {/if}
            {#if oldContentSummary.weapons}
              <li><span class="lcp-manifest-badge">{oldContentSummary.weapons}</span> mech weapons</li>
            {/if}
            {#if oldContentSummary.mods}
              <li><span class="lcp-manifest-badge">{oldContentSummary.mods}</span> weapon mods</li>
            {/if}
            {#if oldContentSummary.npc_classes}
              <li><span class="lcp-manifest-badge">{oldContentSummary.npc_classes}</span> NPC classes</li>
            {/if}
            {#if oldContentSummary.npc_templates}
              <li><span class="lcp-manifest-badge">{oldContentSummary.npc_templates}</span> NPC templates</li>
            {/if}
            {#if oldContentSummary.npc_features}
              <li><span class="lcp-manifest-badge">{oldContentSummary.npc_features}</span> NPC features</li>
            {/if}
          </ul>
          {#if oldContentSummary.description}
            {@html oldContentSummary.description}
          {/if}
        </div>
      </div>
      {#if !showImportButton && !oldContentSummary.aggregate}
        <button
          transition:fade
          type="button"
          class="lcp-import"
          title="Import LCP"
          tabindex="-1"
          {disabled}
          on:click={() => dispatch("importLcp")}
        >
          <i class="cci cci-content-manager i--m" />
          Import LCP
        </button>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .lcp-details.card {
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 0;
    max-height: calc(100% - 5.5em);
  }
  .lcp-details__content {
    display: inline-grid;
    grid-template-rows: auto 1fr auto;
    max-height: calc(100% - 3em);
    overflow-y: hidden;
    .lcp-description {
      overflow-y: scroll;

      & ul {
        margin-top: 0.25em;
      }
    }
  }

  .transition {
    &.fade-in {
      opacity: 1;
      transition: opacity ease-in 0.333s;
    }
    &.fade-out {
      opacity: 0;
      transition: opacity ease-in 0.1s;
    }
  }
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
