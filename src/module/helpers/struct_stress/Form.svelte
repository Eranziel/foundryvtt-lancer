<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LancerActor } from "../../actor/lancer-actor";

  export let title: string;
  export let stat: "structure" | "stress";
  export let lancerActor: LancerActor | null;

  const dispatch = createEventDispatcher();

  function focus(el: HTMLElement) {
    el.focus();
  }

  function getIcon(kind: "structure" | "stress") {
    if (kind === "stress") return "reactor";
    return kind;
  }
</script>

<form
  id="structstress"
  class="structstress window-content"
  on:submit|preventDefault={() => {
    dispatch("submit");
  }}
>
  <div class="lancer-header medium">
    <i class="cci cci-{getIcon(stat)} i--m i--light" />
    <span>{title}</span>
  </div>
  <div class="message-body">
    <h3>{lancerActor?.name ?? "UNKNOWN MECH"} has taken {getIcon(stat)} damage!</h3>
    <p class="message">
      {#if lancerActor && (lancerActor.is_mech() || lancerActor.is_npc())}
        Roll {lancerActor.data.data.derived[stat].max - lancerActor.data.data.derived[stat].value + 1}d6 to determine
        what happens.
      {/if}
    </p>
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
  .message-body {
    margin: 8px 4px;
  }
</style>
