<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from "svelte/store";
  import { LancerActor } from '../../actor/lancer-actor.js';
  import { resolve_dotpath } from '../../helpers/commons.js';
  import LinearProgress from '@smui/linear-progress';
  import "./stat-bar.scss";

  const actor: Readable<LancerActor> = getContext("actor");
  
  // Props
  export let path: string;
  export let icon: string;

  let stat: { min: number, max: number, value: number };
  let progress: number;
  let hp: boolean;
  let heat: boolean;
  
  $: stat = resolve_dotpath($actor, path) ?? {min: 0, max: 1, value: 0};
  $: progress = (stat.value) / (stat.max || 1);
  $: hp = path.includes("hp");
  $: heat = path.includes("heat");
</script>

<div class="lancer-stat-bar flexrow">
  <i class="{icon} i--s"></i>
  <span class="lancer-stat-bar-text">{stat.value} / {stat.max}</span>
  <LinearProgress {progress} class={hp ? "hp-bar" : (heat ? "heat-bar" : "")} />
</div>

<style lang="scss">
  .lancer-stat-bar {
    text-align: left;
    align-items: center;
    transition: height 0.5s;

    & i {
      margin-right: 0.25em;
    }
    .lancer-stat-bar-text {
      margin-left: 0.25em;
      margin-right: 0.25em;
      flex: 0.5;
    }
  }

</style>