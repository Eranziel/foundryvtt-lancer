<script lang="ts">
  import type { AccDiffHudPluginData } from "./plugin";
  import HudCheckbox from "../components/HudCheckbox.svelte";

  export let data: AccDiffHudPluginData;
  export let tooltip: string | null = null;
</script>

{#if data.uiElement == "checkbox" && data.visible}
  <HudCheckbox label={data.humanLabel} bind:value={data.uiState} disabled={data.disabled} {tooltip} />
{/if}
