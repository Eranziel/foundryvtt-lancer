<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../actor/lancer-actor.js";
  import Card from "./Card.svelte";
  import DocStringField from "./DocStringField.svelte";

  import { resolve_dotpath } from "../../helpers/commons.js";
  // TODO: troubleshoot why this import doesn't work once built.
  // import { BoundedNum } from "../../source-template.js";

  // Props
  export let label: string;
  export let path: string;
  export let icon: string | null = null;

  const actor: Readable<LancerActor> = getContext("actor");
  // TODO: stat should use the BoundedNum type
  let stat: { min?: number, max?: number, value: number };
  $: stat = resolve_dotpath($actor, path) ?? { value: 0 };
</script>

<Card flat={true}>
  <svelte:fragment slot="header">
    {#if icon}<i class="i--s i--light {icon}" />{/if}
    {label}
  </svelte:fragment>

  <div class="flexrow flex-center no-wrap">
    <DocStringField
      document={$actor}
      integer={true}
      path="{path}.value"
    />
    <span>/</span>
    <span class="lancer-stat">{stat.max}</span>
  </div>
</Card>

<style lang="scss">
</style>
