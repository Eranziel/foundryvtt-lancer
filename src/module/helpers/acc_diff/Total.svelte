<script context="module">
 let lockonCounter = 0;
 let counter = 0;
</script>

<script lang="ts">
 import type { AccDiffBase, AccDiffTarget } from './index';

 import { onMount } from 'svelte';
 import tippy from "tippy.js";

 import Plugin from './Plugin.svelte';
 import ConsumeLockOn from './ConsumeLockOn.svelte';

 export let target: AccDiffBase | AccDiffTarget;
 export let onlyTarget: boolean = false;

 function isTarget(v: any): v is AccDiffTarget {
   return v?.target;
 }

 export const id = `accdiff-total-display-${counter++}`;
 let lockonId = isTarget(target) ? `accdiff-total-display-consume-lockon-${lockonCounter++}` : '';

 let imgElement: HTMLElement;
 let dropdownElement: HTMLElement;

 onMount(() => {
   if (imgElement && dropdownElement) {
     tippy(imgElement, {
       content: dropdownElement,
       interactive: true,
       allowHTML: true,
       trigger: 'click mouseenter',
     });
   }
 })
</script>

{#if isTarget(target)}
  <div class="accdiff-grid">
    <img class="lancer-hit-thumb accdiff-target-has-dropdown"
         alt={target.target.data.name}
         src={target.target.data.img} bind:this={imgElement} />
    <label for={lockonId} class:checked={target.usingLockOn} class:disabled={!target.lockOnAvailable}
           title="Consume Lock On (+1)">
      <i class="cci cci-condition-lock-on"></i>
      <ConsumeLockOn bind:lockOn={target} visible={false} id={lockonId} />
    </label>
  </div>
  {#if !onlyTarget}
    <div class="accdiff-target-dropdown" bind:this={dropdownElement}>
      {#each Object.keys(target.plugins) as key}
        <Plugin bind:data={target.plugins[key]} />
      {/each}
    </div>
  {/if}
{/if}
<div class="accdiff-grid accdiff-weight">
  <div>
    <div id={id} class="card clipped total" class:accurate={target.total > 0} class:inaccurate={target.total < 0}>
      <span>{Math.abs(target.total)}</span>
      <i class="cci i--m i--dark white--text middle"
         class:cci-accuracy={target.total >= 0}
         class:cci-difficulty={target.total < 0} ></i>
    </div>
  </div>
</div>

<style>
 .total {
     background-color: #443c3c;
 }
 .total.accurate {
     background-color: #017934;
 }
 .total.inaccurate {
     background-color: #9c0d0d
 }
 i {
     border: none;
 }
</style>
