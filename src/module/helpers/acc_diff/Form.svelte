<script lang="ts">
 import type { AccDiffWeapon, AccDiffBase, AccDiffTarget } from './index';
 import { createEventDispatcher } from 'svelte';

 import Plugin from './Plugin.svelte';
 import Cover from './Cover.svelte';
 import ConsumeLockOn from './ConsumeLockOn.svelte';
 import Total from './Total.svelte';
 import PlusMinusInput from './PlusMinusInput.svelte';

 export let weapon: AccDiffWeapon;
 export let base: AccDiffBase;
 export let targets: AccDiffTarget[];

 // unused data — this suppresses the svelte-check warnings
 // unfortunately this generates runtime warnings in dev-mode
 // it's not currently possible to suppress both of those
 export const title: any = undefined;
 export const lancerItem: any = undefined;

 let baseTotalId: string;
 let targetTotalIds: string[] = [];

 // tell svelte of externally computed dependency arrows
 $: {
   // i.e., base depends on weapon
   weapon;
   base = base;
 };

 $: {
   // i.e., targets depend on weapon and base
   weapon;
   base;
   targets = targets;
 }

 const dispatch = createEventDispatcher();
</script>

<form id="accdiff" on:submit={e => {e.preventDefault(); dispatch('submit')}}>
  <div id="accdiff-dialog" style="padding:4px">
    <div class="accdiff-grid">
      <div style="width:100%;padding:4px;border-right: 1px dashed #782e22;">
        <h3>
          <i class="cci cci-accuracy i--m i--dark" style="vertical-align:middle;border:none"></i>
          Accuracy
        </h3>
        <label class="container">
          Accurate (+1)
          <input type="checkbox" bind:checked={weapon.accurate} />
          <span class="checkmark"></span>
        </label>
        <label class="container">
          Seeking (*)
          <input type="checkbox" bind:checked={weapon.seeking} />
          <span class="checkmark"></span>
        </label>
        {#each Object.keys(weapon.plugins) as key}
          <Plugin bind:data={weapon.plugins[key]} />
        {/each}
        {#if targets.length == 1}
          <label class="container" for="base-consume-lockon">
            Consume Lock On (+1)
            <ConsumeLockOn bind:lockOn={targets[0]} id="base-consume-lockon" />
            <span class="checkmark"></span>
          </label>
          {#each Object.keys(targets[0].plugins) as key}
            <Plugin bind:data={targets[0].plugins[key]} />
          {/each}
        {/if}
      </div>
      <div style="width:100%;padding:4px;">
        <h3>
          <i class="cci cci-difficulty i--m i--dark" style="vertical-align:middle;border:none"></i>
          Difficulty
        </h3>
        <label class="container">
          Inaccurate (-1)
          <input type="checkbox" bind:checked={weapon.inaccurate} />
          <span class="checkmark"></span>
        </label>
        <label class="container">
          Impaired (-1)
          <input type="checkbox" checked={!!weapon.impaired} disabled />
          <span class="checkmark"></span>
        </label>
        {#if targets.length == 0}
          <Cover bind:cover={base.cover} class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
        {:else if targets.length == 1}
          <Cover bind:cover={targets[0].cover} class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
        {/if}
      </div>
    </div>
    <label class="flexrow accdiff-footer accdiff-weight" for="accdiff-other-sources">
      Other Sources
    </label>
    <div id="accdiff-other-sources" class="accdiff-grid">
      <div class="accdiff-other-grid" style="border-right: 1px dashed #782e22;">
        <PlusMinusInput bind:value={base.accuracy} id="accdiff-other-acc" />
      </div>
      <div class="accdiff-other-grid">
        <PlusMinusInput bind:value={base.difficulty} id="accdiff-other-diff" />
      </div>
    </div>
    {#if targets.length == 0}
      <label class="flexrow accdiff-footer accdiff-weight" for={baseTotalId}>
        Total
      </label>
      <Total bind:target={base} bind:id={baseTotalId} />
    {:else if targets.length == 1}
      <label class="flexrow accdiff-footer accdiff-weight" for={baseTotalId}>
        Total vs {targets[0].target.data.name}
      </label>
      <div class="flexrow flex-center lancer-consume-lockon">
        <Total bind:target={targets[0]} bind:id={baseTotalId} onlyTarget={true}/>
      </div>
    {:else}
      <div class="accdiff-footer accdiff-weight accdiff-target-row">
        {#each targets as data, index}
          <div class="flexcol card accdiff-target">
            <label class="flexrow flex-center card" for={targetTotalIds[index]}>
              {data.target.data.name}
            </label>
            <div class="flexrow lancer-consume-lockon">
              <ConsumeLockOn bind:lockOn={data} />
              <Total bind:target={data} bind:id={targetTotalIds[index]} />
            </div>
            <div class="flexrow">
              <button
                class="i--m no-grow"
                type="button"
                on:click={() => data.accuracy = data.accuracy + 1}
              >
                <i class="cci cci-accuracy i--m" style="border:none"></i>
              </button>
              <input
                style="display: none"
                type="number"
                bind:value={data.accuracy}
                min="0"
                />
              <Cover bind:cover={data.cover} disabled={weapon.seeking}
                          class="accdiff-targeted-cover flexrow flex-center" labelClass="i--s" />
              <input
                style="display: none"
                type="number"
                bind:value={data.difficulty}
                min="0"
              />
              <button
                class="i--m no-grow"
                type="button"
                on:click={() => data.difficulty = data.difficulty + 1}
              >
                <i class="cci cci-difficulty i--m" style="border:none"></i>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="dialog-buttons flexrow">
    <button class="dialog-button submit default" data-button="submit" type="submit">
      <i class="fas fa-check"></i>
      Roll
    </button>
    <button class="dialog-button cancel"
            data-button="cancel" type="button" on:click={() => dispatch('cancel')}>
      <i class="fas fa-times"></i>
      Cancel
    </button>
  </div>
</form>
