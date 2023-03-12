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
  let stat: number;
  $: stat = resolve_dotpath($actor, path);
</script>

<Card clipped={true}>
  <span slot="header">
    {#if icon}<i class="i--m i--light {icon}" />{/if}
    {label}
  </span>

  <div class="flexrow flex-center no-wrap">
    <DocStringField
      document={$actor}
      integer={true}
      path="{path}"
      style="justify-content: left"
    />
  </div>
</Card>

<style lang="scss">
  i {
    float: left;
  }
</style>
