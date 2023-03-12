<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import { LancerActor } from "../../actor/lancer-actor.js";
  import { encodeMacroData } from "../../macros/encode.js";

  // Props
  export let name: string;
  export let classes: string = "";
  export let icon: string = "fas fa-dice-d20";
  export let args: Array<any> = [];

  const actor: Readable<LancerActor> = getContext("actor");
  let macroData: string;
  $: macroData = encodeMacroData({
    title: "TODO: MAKE A FUNCTION TO LOOKUP NAMES FOR MACROS",
    fn: name,
    args: [$actor.uuid, ...args],
  });
</script>

<span class="i--dark i--sm {classes} lancer-macro" data-macro="${macroData}">
  <i class={icon} />
</span>`;

<style lang="scss">
  span {
    cursor: pointer;
  }
</style>
