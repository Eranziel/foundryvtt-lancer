<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from "svelte/store";
  import { LancerActor } from '../../actor/lancer-actor.js';
  import { resolve_dotpath } from '../../helpers/commons.js';
  import LinearProgress from '@smui/linear-progress';

  const actor: Readable<LancerActor> = getContext("actor");
  
  // Props
  export let path: string;
  export let icon: string;
  
  let stat: { min: number, max: number, value: number };
  let progress: number;
  $: stat = resolve_dotpath($actor, path) ?? {min: 0, max: 1, value: 0};
  $: progress = (stat.value) / (stat.max || 1);
</script>

<div class="lancer-stat-bar flexrow">
  <i class="{icon} i--s"></i>
  <LinearProgress {progress} />
</div>

<style lang="scss">
  @use '@material/linear-progress/index' as linear-progress;
  @use '@material/theme/index' as theme;

  .lancer-stat-bar {
    text-align: left;
    align-items: center;

    & i {
      margin-right: 0.25em;
    }
  }

  
</style>