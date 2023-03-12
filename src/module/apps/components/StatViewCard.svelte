<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../actor/lancer-actor.js";

  import { resolve_dotpath } from "../../helpers/commons.js";
  import Card from "./Card.svelte";
  import MacroButton from "./MacroButton.svelte";

  // Props
  export let label: string;
  export let path: string;
  export let icon: string | null = null;
  export let macro: boolean = false;
  export let clipped: boolean = false;

  const actor: Readable<LancerActor> = getContext("actor");
</script>

<Card clipped={clipped}>
  <svelte:fragment slot="header">
    {#if icon}<i class="i--m i--light {icon}" />{/if}
    {label}
  </svelte:fragment>

  {#if macro}<MacroButton name="prepareStatMacro" />{/if}
  <span>{resolve_dotpath($actor, path)}</span>
</Card>

<style lang="scss">
  i {
    float: left;
  }

</style>
