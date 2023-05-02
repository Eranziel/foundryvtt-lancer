<script lang="ts">
  import { LancerActor } from "../../actor/lancer-actor.js";
  import Popover from "./Popover.svelte"

  // Props
  export let actor: LancerActor;

  function open() {
    actor.render({force: true});
  }
</script>

<Popover let:popperRef={popperRef}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <img slot="anchor" src={actor.img} alt={actor.name} use:popperRef on:click={open}>
  <div slot="content" class="content">
    <span class="header">{actor.name}</span>
    {#if actor.is_pilot()}
      {actor.system.background} // TODO
    {:else if actor.is_mech()}
      {actor.system.hp.max} // TODO
    {:else if actor.is_deployable()}
      {actor.system.hp.max} // TODO
    {:else if actor.is_npc()}
      {actor.system.hp.max} // TODO
    {:else}
      ERR // NOT RECOGNIZED
    {/if}
  </div>
</Popover>

<style lang="scss">
  img {
    object-fit: cover;
    width: 100px;
    height: 100px;
    border: 0px;
    margin: 5px;
  }

  .content {
    display: flex;
    flex-direction: column;
  }

  .header {
    border-bottom: 1px solid black;
  }
</style>
