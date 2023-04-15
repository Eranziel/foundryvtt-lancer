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

  // Other things to parse as
  export let integer: boolean = false;
  export let float: boolean = false;

  // Current value
  let value: string;
  $: value = resolve_dotpath(document, path) ?? "";

  // Change callback
  const onChange = (e: Event & { currentTarget: EventTarget & HTMLInputElement; }) => {
    let newValueStr: string = e.currentTarget.value;
    let newValueNum: number = NaN;
    if(integer && float) console.error("Cannot be both integer and float");
    if(integer) newValueNum = parseInt(newValueStr);
    if(float) newValueNum = parseFloat(newValueStr);
    if(integer || float) {
      if(isNaN(newValueNum)) {
        ui.notifications!.warn("Field value must be numeric! Resetting...");
        value = value;
        return;
      } else {
        // Update as num
        document.update({
            [path]: newValueNum
        });
      }
    } else {
      // Update as str
      document.update({
          [path]: newValueStr
      });
    }
  };

</script>

<input class="{$$props.class}" style="{style}" on:change={onChange} value="{value}" type="{integer || float ? 'number' : 'text'}" />

<style lang="scss">

</style>
