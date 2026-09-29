<script lang="ts">
  import { fade } from "svelte/transition";
  import type { LLPSummary } from "../../util/localization/llp-import";

  interface Props {
    patchSummary: LLPSummary | null;
  }

  let { patchSummary }: Props = $props();

  const FADE_MS = 100;

  let title = $derived(
    patchSummary
      ? `${patchSummary.target}${patchSummary.translationVersion ? ` v${patchSummary.translationVersion}` : ""}`
      : game.i18n.localize("lancer.lcpManager.header.noLlpSelected.label")
  );
</script>

{#snippet field(label: string, value: string)}
  <li>
    <span class="llp-field-label">{label}:</span>
    {value}
  </li>
{/snippet}

<div class="llp-details">
  {#key patchSummary}
    <div
      in:fade={{ duration: 333, delay: FADE_MS }}
      out:fade={{ duration: FADE_MS }}
      class="llp-details__fade"
    >
      <div class="lancer-header lancer-primary major clipped-top">
        <span>{title}</span>
      </div>
      {#if patchSummary}
        {#if patchSummary.website}
          <a
            href={patchSummary.website}
            class="medium card clipped"
          >
            {game.i18n.localize("lancer.lcpManager.writtenBy.label")} {patchSummary.translator}
          </a>
        {:else}
          <div class="medium card clipped">
            {game.i18n.localize("lancer.lcpManager.writtenBy.label")} {patchSummary.translator}
          </div>
        {/if}
        <div class="llp-description minor clipped">
          <span>{game.i18n.localize("lancer.lcpManager.contents.label")}:</span>
          <ul>
            <li>
              <span class="lcp-manifest-badge">{patchSummary.lines}</span>
              {game.i18n.localize("lancer.lcpManager.llp.lines.label")}
            </li>
            {@render field(game.i18n.localize("lancer.lcpManager.llp.language.label"), patchSummary.lang)}
            {@render field(game.i18n.localize("lancer.lcpManager.llp.target.label"), patchSummary.target)}
            {#if patchSummary.targetVersion}
              {@render field(game.i18n.localize("lancer.lcpManager.llp.targetVersion.label"), patchSummary.targetVersion)}
            {/if}
            {#if patchSummary.lastUpdate}
              {@render field(game.i18n.localize("lancer.lcpManager.llp.lastUpdate.label"), patchSummary.lastUpdate)}
            {/if}
          </ul>
          {#if patchSummary.entries.length}
            <span>{game.i18n.localize("lancer.lcpManager.llp.included.label")}:</span>
            <ul>
              {#each patchSummary.entries as entry (`${entry.lang}/${entry.target}`)}
                <li>
                  <b>{entry.target}</b>{entry.translationVersion ? ` v${entry.translationVersion}` : ""}
                  ({entry.lang}) &mdash;
                  <span class="lcp-manifest-badge">{entry.lines}</span>
                  {game.i18n.localize("lancer.lcpManager.llp.lines.label")}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  {/key}
</div>

<style lang="scss">
  @layer lancer {
    @layer components {
      .llp-details {
        display: grid;
        overflow: hidden;
      }

      .llp-details__fade {
        display: flex;
        flex-direction: column;
        grid-area: 1/1;

        min-height: 0;
      }

      .llp-description {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;

        min-height: 0;
        min-width: 0;
        overflow-y: auto;

        background-color: var(--darken-1);
        padding: 10px;
      }

      .llp-field-label {
        opacity: 0.75;
      }
    }
  }
</style>
