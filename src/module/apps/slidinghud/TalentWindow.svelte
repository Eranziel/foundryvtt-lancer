<script lang="ts">
  import { AccDiffHudBase, AccDiffHudTalents, AccDiffHudTarget, AccDiffHudWeapon } from "../acc_diff";
  import { LancerItem } from "../../item/lancer-item";
  import { LancerActor } from "../../actor/lancer-actor";
  import HudCheckbox from "../components/HudCheckbox.svelte";
  import { CheckmarkAccuracyTalent } from "../acc_diff/data";
  import Plugin from "../acc_diff/Plugin.svelte";

  export let targets: AccDiffHudTarget[];
  export let talents: AccDiffHudTalents;

  $: talentTargetPlugins =
    targets.length === 1 ? Object.values(targets[0].plugins).filter(plugin => plugin.category === "talentWindow") : [];
  $: availableTalentPlugins = talentTargetPlugins.filter(x => talents.findWithSlug(x.slug) !== undefined);
  $: talentUiData = availableTalentPlugins
    .map(plugin => talents.findWithSlug(plugin.slug))
    .filter(x => x !== undefined); //This should never happen but we check for typing

  // export let weapon: AccDiffHudWeapon;
  // export let base: AccDiffHudBase;
  // export let targets: AccDiffHudTarget[];
  // export let title: string;
  // export let lancerItem: LancerItem | null;
  // export let lancerActor: LancerActor | null;
</script>

<form id="talent_window" class="lancer-hud window-content">
  {#if talentUiData.length != 0}
    <label class="flexrow accdiff-weight lancer-border-primary talent-title">Talents</label>

    <!-- Talent Checkboxes -->
    <div class="talent-column-container">
      <div class="talent-column">
        {#each talentUiData as talent, idx}
          <!-- Odd -->
          {#if idx + (1 % 2) != 0}
            <Plugin data={availableTalentPlugins[idx]} tooltip={talent.description} />
          {/if}
        {/each}
      </div>
      {#if talentUiData.length > 1}
        <div class="talent-column">
          {#each talentUiData as talent, idx}
            <!-- Even -->
            {#if idx + (1 % 2) == 0}
              <Plugin data={availableTalentPlugins[idx]} tooltip={talent.description} />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</form>

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
