<script lang="ts">
  import { LANCER } from "../../config";
  import { AccDiffHudBase, AccDiffHudTarget, AccDiffHudWeapon } from "../acc_diff";
  import Plugin from "../acc_diff/Plugin.svelte";
  import { DamageHudTarget } from "../damage";

  export let targets: AccDiffHudTarget[] | DamageHudTarget[] | undefined;
  export let base: AccDiffHudBase;
  export let weapon: AccDiffHudWeapon;
  export let kind: string;

  $: if (kind !== "hase" && kind !== "attack" && kind !== "damage")
    console.warn(`${LANCER.log_prefix} Talent window called for unknown kind of HUD: ${kind}`);

  $: visibleTalents = determineTalents(targets);

  function determineTalents(targets: AccDiffHudTarget[] | DamageHudTarget[] | undefined) {
    if (targets === undefined) return [];

    //Maybe eventually have a small checklist under targets for target-specific talents

    const basePlugins = Object.values(base.plugins);
    const weaponPlugins = Object.values(weapon.plugins);

    let targetPlugins = [];
    if (targets.length > 0) targetPlugins = Object.values(targets[0].plugins);
    const targetSlugs = targetPlugins.map(plugin => plugin.slug);

    //If a targeted version of a weapon plugin exists, remove the weapon duplicate
    let baseTargetPlugins = targetPlugins;
    for (const plugin of basePlugins) {
      if (!targetSlugs.includes(plugin.slug)) baseTargetPlugins.push(plugin);
    }

    const totalPlugins = baseTargetPlugins.concat(weaponPlugins);
    console.log(totalPlugins);
    //Should we filter duplicates? Invisibility appears multiple times but doesn't seem to matter
    const talentPlugins = totalPlugins
      .filter(plugin => plugin.category === "talentWindow")
      .filter(plugin => plugin.kind === kind);

    const visibleTalents = talentPlugins.filter(plugin => plugin.visible);
    return visibleTalents;
  }
</script>

{#if visibleTalents.length != 0}
  <form id="talent_window" class="lancer-hud window-content">
    <label class="flexrow accdiff-weight lancer-border-primary talent-title" for="talent_checkboxes">Talents</label>

    <!-- Talent Checkboxes -->
    <div class="talent-column-container" id="talent_checkboxes">
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
