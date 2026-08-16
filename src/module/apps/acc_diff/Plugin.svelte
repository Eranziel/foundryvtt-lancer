<script lang="ts">
  import type { AccDiffHudPluginData } from "./plugin";
  import HudCheckbox from "../components/HudCheckbox.svelte";

  export let data: AccDiffHudPluginData;

  $: label = game.i18n.has(data.humanLabel) ? game.i18n.localize(data.humanLabel) : data.humanLabel;
</script>

{#if data.uiElement == "checkbox" && data.visible}
  <HudCheckbox {label} bind:value={data.uiState} disabled={data.disabled} />
{/if}
