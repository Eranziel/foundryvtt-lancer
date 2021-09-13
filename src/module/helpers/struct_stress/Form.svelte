<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LancerActor } from "../../actor/lancer-actor";

  export let title: string;
  export let kind: "structure" | "stress";
  export let lancerActor: LancerActor | null;

  const dispatch = createEventDispatcher();

  function focus(el: HTMLElement) {
    el.focus();
  }
</script>

<form
  id="structstress"
  class="structstress window-content"
  on:submit|preventDefault={() => {
    dispatch("submit");
  }}
>
  <h2>{title}</h2>
  <h3>{lancerActor?.name ?? "UNKNOWN MECH"} has taken {kind.capitalize()} damage!</h3>
  <div class="message">
    {#if lancerActor && (lancerActor.is_mech() || lancerActor.is_npc())}
      Roll {lancerActor.data.data.derived[kind].max - lancerActor.data.data.derived[kind].value + 1}d6 to determine what
      happens.
    {/if}
  </div>
  <div class="dialog-buttons flexrow">
    <button class="dialog-button submit default" data-button="submit" type="submit" use:focus>
      <i class="fas fa-check" />
      Roll
    </button>
    <button class="dialog-button cancel" data-button="cancel" type="button" on:click={() => dispatch("cancel")}>
      <i class="fas fa-times" />
      Cancel
    </button>
  </div>
</form>

<style>
  h2 {
    background-color: var(--main-theme-color, fuscia);
    text-align: center;
  }
</style>
