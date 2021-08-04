<script lang="ts">
 import type { AccDiffPluginData } from './plugin';
 export let data: AccDiffPluginData;
</script>

{#if data.uiElement == "checkbox" && data.visible}
  <label class="container">
    {data.humanLabel}
    <input type="checkbox" bind:checked={data.uiState} disabled={data.disabled} />
    <span class="checkmark"></span>
  </label>
{/if}
