<script lang="ts">
  import { AccDiffHudTarget } from "../acc_diff";
  import { LancerActor } from "../../actor/lancer-actor";
  import Plugin from "../acc_diff/Plugin.svelte";

  export let targets: AccDiffHudTarget[];

  $: talentTargetPlugins =
    targets.length === 1 ? Object.values(targets[0].plugins).filter(plugin => plugin.category === "talentWindow") : [];
  $: visibleTalents = talentTargetPlugins.filter(plugin => plugin.visible);
</script>

{#if visibleTalents.length != 0}
  <form id="talent_window" class="lancer-hud window-content">
    <label class="flexrow accdiff-weight lancer-border-primary talent-title">Talents</label>

    <!-- Talent Checkboxes -->
    <div class="talent-column-container">
      <div class="talent-column">
        {#each visibleTalents as plugin, idx}
          <!-- Odd -->
          {#if (idx + 1) % 2 != 0}
            <Plugin data={plugin} tooltip={plugin.tooltip} />
          {/if}
        {/each}
      </div>
      {#if visibleTalents.length > 1}
        <div class="talent-column">
          {#each visibleTalents as plugin, idx}
            <!-- Even -->
            {#if (idx + 1) % 2 == 0}
              <Plugin data={plugin} tooltip={plugin.tooltip} />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </form>
{/if}

<style lang="scss">
  #talent_window {
    //This is about as far as it can go on minimum foundry window size
    max-width: 330px;
    z-index: 1;
    pointer-events: initial;
  }

  .talent-title {
    padding-bottom: 0.3em;
    border-bottom: 2px solid var(--primary-color);
  }

  .talent-column-container {
    display: flex;
    flex-direction: row;
    padding-top: 0.3em;
  }
  .talent-column {
    display: flex;
    flex-direction: column;

    padding-left: 5px;
    padding-right: 5px;
    border-right: 1px dashed var(--primary-color);

    // Slightly smaller to make sure titles fit in minimum window size
    // Should also try ellipsize thing when more talents are implemented
    font-size: 0.85em;
  }
  .talent-column:last-child {
    border: none;
  }
</style>
