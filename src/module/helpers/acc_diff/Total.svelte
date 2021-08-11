<script context="module">
 let lockonCounter = 0;
 let counter = 0;
</script>

<script lang="ts">
 import type { AccDiffBase, AccDiffTarget } from './index';

 import { onMount } from 'svelte';
 import { fly, blur } from 'svelte/transition';

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
      <i class="cci cci-condition-lock-on"
         class:i--click={target.lockOnAvailable}
         class:i--sm={!target.usingLockOn}
         class:i--l={target.usingLockOn}
         ></i>
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
  <div class="grid-enforcement">
    {#key target.total}
      <div id={id} transition:blur
        class="card clipped total" class:accurate={target.total > 0} class:inaccurate={target.total < 0}>
        <span in:fly={{y: -50, duration: 400}} out:fly={{y: 50, duration: 200}}>
          {Math.abs(target.total)}
        </span>
        <i in:fly={{y: -50, duration: 200}} out:fly={{y: 50, duration: 200}}
          class="cci i--m i--dark white--text middle"
          class:cci-accuracy={target.total >= 0}
          class:cci-difficulty={target.total < 0} ></i>
      </div>
    {/key}
  </div>
</div>

<style>
 i { border: none; }

 .accdiff-grid { position: relative }

 /* this + the grid-column and grid-row in .card.clipped forces
    the two cards inside it (during animations) to have the same location */
 .grid-enforcement {
     display: grid;
     overflow: hidden;
 }
 .card.clipped {
     display: flex;
     flex-direction: row;
     align-items: center;
     padding: 8px 8px 8px 16px;
     color: white;
     width: min-content;
     background-color: #443c3c;
     grid-column: 1/2;
     grid-row: 1/2;
 }
 .card.total.accurate { background-color: #017934; }
 .card.total.inaccurate { background-color: #9c0d0d }
 .disabled { opacity: 0.4; }
 .lancer-hit-thumb {
     margin-right: 0px;
     margin-left: 4px;
     margin-bottom: 4px;
 }

 label {
     position: absolute;
     right: -4px;
     top: -4px;
 }

 @keyframes lockon {
     70% {
         text-shadow: 0 0 8px lightgreen;
     }
     80% {
         text-shadow: 0 0 8px green;
     }
     90% {
         text-shadow: 0 0 8px lightgreen;
     }
 }
 .cci-condition-lock-on {
     text-shadow: 0 0 12px white;
     transition: font-size 200ms;
 }
 .cci-condition-lock-on.i--l {
     animation: lockon 800ms linear 1s infinite alternate;
 }

 .accdiff-grid :global(.tippy-box[data-theme~="lancer"]) {
     font-size: 0.8em;
     padding-left: 0px;
     padding-right: 0px;
     padding-top: 4px;
     padding-bottom: 4px;
     transform: none;
 }
 .accdiff-grid :global(.tippy-box[data-theme~="lancer"] .tippy-content) {
     transform: none;
 }
 .accdiff-grid :global(.tippy-box[data-theme~="lancer"] .tippy-content .container) {
     margin: 0px;
 }
 .accdiff-grid :global(.tippy-box[data-theme~="lancer"] .tippy-content .checkmark) {
     height: 12px;
 }
</style>
