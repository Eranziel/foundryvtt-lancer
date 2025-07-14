<script lang="ts">
  import { AccDiffHudTarget } from "../acc_diff";
  import { LancerActor } from "../../actor/lancer-actor";
  import Plugin from "../acc_diff/Plugin.svelte";
  import { slugify } from "../../util/lid";

  export let targets: AccDiffHudTarget[];
  export let actor: LancerActor;

  $: talentTargetPlugins =
    targets.length === 1 ? Object.values(targets[0].plugins).filter(plugin => plugin.category === "talentWindow") : [];
  $: availableTalentPlugins = findAvailableTalents(actor, talentTargetPlugins);

  //Should replace any[]
  function findAvailableTalents(lancerActor: LancerActor, plugins: any[]): any[] {
    //Figure out applicable talent names
    if (!lancerActor?.is_mech() || !lancerActor?.system.pilot?.value?.is_pilot()) {
      return [];
    }

    //THE lancer
    const pilot = lancerActor.system.pilot.value;
    let talents = pilot.items.filter(i => i.is_talent());

    //Get the slugs of all the available talent ranks
    let talentSlugs: string[] = [];
    for (const talent of talents) {
      let rank_num = talent.system.curr_rank;
      for (let i = 0; i < rank_num; i++) {
        const rank_name = talent.system.ranks[i].name;
        talentSlugs.push(slugify(rank_name, "-"));
      }
    }

    //Return only talents used by pilot
    return plugins.filter(plugin => talentSlugs.includes(plugin.slug));
  }
</script>

<form id="talent_window" class="lancer-hud window-content">
  {#if availableTalentPlugins.length != 0}
    <label class="flexrow accdiff-weight lancer-border-primary talent-title">Talents</label>

    <!-- Talent Checkboxes -->
    <div class="talent-column-container">
      <div class="talent-column">
        {#each availableTalentPlugins as plugin, idx}
          <!-- Odd -->
          {#if idx + (1 % 2) != 0}
            <Plugin data={plugin} tooltip={plugin.tooltip} />
          {/if}
        {/each}
      </div>
      {#if availableTalentPlugins.length > 1}
        <div class="talent-column">
          {#each availableTalentPlugins as plugin, idx}
            <!-- Even -->
            {#if idx + (1 % 2) == 0}
              <Plugin data={plugin} tooltip={plugin.tooltip} />
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
