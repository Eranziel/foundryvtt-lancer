<script lang="ts">
  import { slide } from "svelte/transition";
  import type { AccDiffPluginData } from "./plugin";
  export let data: AccDiffPluginData;
</script>

{#if data.uiElement == "checkbox" && data.visible}
  <label class="container" transition:slide|local>
    <input type="checkbox" bind:checked={data.uiState} disabled={data.disabled} />
    {data.humanLabel}
  </label>
{/if}
