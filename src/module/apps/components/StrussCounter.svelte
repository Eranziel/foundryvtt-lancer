<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from "svelte/store";
  import { LancerActor } from '../../actor/lancer-actor.js';
  import { resolve_dotpath } from '../../helpers/commons.js';
  
  const actor: Readable<LancerActor> = getContext("actor");

  export let path: string;
  export let icon: string;

  let stat: { min: number, max: number, value: number };
  let counter: string[];
  
  const updateCtr = function (newData: { min: number, max: number, value: number }) {
    const arr: string[] = [];
    for (let i = newData.min || 1; i <= newData.max; i++) {
      arr.push(i <= newData.value ? "white" : "gray");
    }
    return arr;
  }

  $: stat = resolve_dotpath($actor, path) ?? {min: 0, max: 1, value: 0};
  $: counter = updateCtr(stat);
</script>


<div class="lancer-struss-counter">
  {#each counter as ctr}
    <i class="{icon} i--s" style="color: {ctr}"></i>
  {/each}
</div>

<style lang="scss">
  .lancer-struss-counter {
    text-align: left;
    align-items: center;

    & i {
      margin-right: 0.25em;
    }
  }

</style>