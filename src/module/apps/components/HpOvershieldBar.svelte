<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from "svelte/store";
  import { LancerActor } from '../../actor/lancer-actor.js';
  import { resolve_dotpath } from '../../helpers/commons.js';
  import LinearProgress from '@smui/linear-progress';

  const actor: Readable<LancerActor> = getContext("actor");
  console.log(actor);
  let hp: { min: number, max: number, value: number };
  let os: { min: number, max: number, value: number };
  let hpProgress: number;
  let osProgress: number;
  //@ts-expect-error
  $: hp = actor.system.hp ?? {min: 0, max: 1, value: 0};
  $: hpProgress = (hp.value) / (hp.max || 1);
  //@ts-expect-error
  $: os = actor.system.overshield ?? {min: 0, max: 1, value: 0};
  $: osProgress = (os.value) / (os.max || 1);
</script>

<div class="lancer-hpos-bar flexrow">
  <i class="mdi mdi-heart-outline i--s"></i>
  <div class="flexcol">
    <LinearProgress progress={osProgress} />
    <LinearProgress progress={hpProgress} />
  </div>
</div>

<style lang="scss">
  @use '@material/linear-progress/index' as linear-progress;
  @use '@material/theme/index' as theme;

  .lancer-hpos-bar {
    text-align: left;
    align-items: center;

    & i {
      margin-right: 0.25em;
    }
  }

  
</style>