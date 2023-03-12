<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../actor/lancer-actor.js";
  import type { LancerItem } from "../../item/lancer-item.js";

  import { resolve_dotpath } from "../../helpers/commons.js";

  // Props
  export let document: Readable<LancerActor | LancerItem>;
  export let path: string;
  export let style: string = "";

  // Other things to parse as
  export let integer: boolean = false;
  export let float: boolean = false;

  // Current value
  let value: string;
  $: value = resolve_dotpath($document, path);

  // Change callback
  const onChange = (e: InputEvent) => {
    let newValue = e.target.value;
    if(integer && float) console.error("Cannot be both integer and float");
    if(integer) newValue = parseInt(newValue);
    if(float) newValue = parseFloat(newValue);
    if(isNaN(newValue)) {
      ui.notifications.warn("Field value must be numeric! Resetting...");
      value = value;
      return;
    }
    $document.update({
        [path]: newValue
    });
  };

</script>

<input style="{style}" on:change={onChange} value="{value}" type="{integer || float ? 'number' : 'string'}" />

<style lang="scss">

</style>
