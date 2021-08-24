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
   // @ts-ignore this syntax is meaningful to svelte
   base = (weapon, base);
 };

 $: {
   // i.e., targets depend on weapon and base
   // @ts-ignore this syntax is meaningful to svelte
   targets = (weapon, base, targets);
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
      <div class="flexrow flex-center accdiff-total">
        <Total bind:target={targets[0]} bind:id={baseTotalId} onlyTarget={true}/>
      </div>
    {:else}
      <div class="accdiff-footer accdiff-weight accdiff-target-row">
        {#each targets as data, index}
          <div class="flexcol card accdiff-target">
            <label class="flexrow flex-center card" for={targetTotalIds[index]}>
              {data.target.data.name}
            </label>
            <div class="flexrow accdiff-total">
              <ConsumeLockOn bind:lockOn={data} visible={false} />
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

<style>
  :global(.accdiff-grid) {
    display: flex;
    justify-content: space-between;
  }

  #accdiff :global(.container) {
    display: flex;
    position: relative;
    padding-left: 30px;
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.9em;
    user-select: none;
    align-items: center;
  }

  /* Hide the browser's default checkbox */
  #accdiff :global(.container input) {
    position: absolute;
    opacity: 0 !important;
    height: 0;
    width: 0;
  }

  #accdiff :global(.checkmark) {
    position: absolute;
    left: 5px;
    height: 20px;
    width: 20px;
    background-color: #a9a9a9;
    cursor: pointer;
  }

  #accdiff :global(input[disabled] ~ .checkmark) {
    opacity: 0.5;
    cursor: unset;
  }

  #accdiff :global(.container:hover input:not([disabled]) ~ .checkmark) {
    background-color: #757575;
  }

  #accdiff :global(.container input:checked ~ .checkmark) {
    background-color: var(--main-theme-color, fuchsia);
  }

  #accdiff :global(.checkmark:after) {
    content: "";
    position: absolute;
    display: none;
  }
  #accdiff :global(.container input:checked ~ .checkmark:after) {
    display: block;
  }

  .accdiff-other-grid {
    width: 100%;
    padding-left: 5px;
    display: flex;
    justify-content: center;
  }
  :global(.accdiff-weight) {
    justify-content: center;
    font-weight: bold;
  }
  .accdiff-footer {
    padding-top: 8px;
    padding-bottom: 4px;
    margin-top: 12px;
    border-top: 1px solid #782e22;
  }

  .accdiff-grid :global(.accdiff-base-cover) {
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.85em;
    user-select: none;
    padding-left: 5px;
    line-height: 2;
    cursor: pointer;
  }
  .accdiff-grid :global(.accdiff-base-cover i) {
    vertical-align: baseline;
  }

  .accdiff-footer :global(.accdiff-targeted-cover span) {
    opacity: 0;
    position: fixed;
    width: 0;
    visibility: hidden;
  }
  .accdiff-footer :global(.accdiff-targeted-cover i) {
    font-size: 16px;
    vertical-align: top;
  }

  /* there's a very specific foundry rule that adds some margin here
     because it assumes all icons in buttons are followed by text, I think */
  #accdiff .accdiff-target-row button > i {
    margin-inline-end: 0;
  }

  .accdiff-target-row {
    display: grid;
    grid-template-columns: auto auto auto;
  }

  .accdiff-target {
    padding: 4px;
  }

  .accdiff-total  {
    flex-wrap: nowrap;
    padding: 4px 10px 4px 10px;
  }
</style>
