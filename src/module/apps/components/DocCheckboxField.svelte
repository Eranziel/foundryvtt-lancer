<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../actor/lancer-actor.js";
  import type { LancerItem } from "../../item/lancer-item.js";

  import { resolve_dotpath } from "../../helpers/commons.js";

  // Props
  export let document: LancerActor | LancerItem;
  export let path: string;
  export let style: string = "";

  // Current value
  let value: boolean;
  $: value = resolve_dotpath(document, path);

  // Change callback
  const onInput = (e: InputEvent) => {
    let newValue = e.target.checked;
    document.update({
        [path]: newValue
    });
  };
</script>

<input class="{$$props.class}" style="{style}" on:change={onInput} checked={value} type="checkbox" />

<style lang="scss">
  input {
    margin: auto;
  }
</style>
