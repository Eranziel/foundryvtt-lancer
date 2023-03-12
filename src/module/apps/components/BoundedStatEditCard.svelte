<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../actor/lancer-actor.js";
  import Card from "./Card.svelte";
  import DocStringField from "./DocStringField.svelte";

  import { resolve_dotpath } from "../../helpers/commons.js";
  import type { SystemTemplates } from "../../system-template.js";

  // Props
  export let label: string;
  export let path: string;
  export let icon: string | null = null;

  const actor: Readable<LancerActor> = getContext("actor");
  let stat: SystemTemplates.BoundedValue;
  $: stat = resolve_dotpath($actor, path);
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
