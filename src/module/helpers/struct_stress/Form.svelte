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

  function getDamage(a: LancerActor) {
    if (!a.is_mech() && !a.is_npc()) return 0;
    return a.data.data.derived[stat].max - a.data.data.derived[stat].value + 1;
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
  {#if lancerActor && (lancerActor.is_mech() || lancerActor.is_npc())}
    <div class="message-body">
      <h3>{lancerActor?.name ?? "UNKNOWN MECH"} has taken {getIcon(stat)} damage!</h3>
      <div class="damage-preview">
        {#each { length: lancerActor.data.data.derived[stat].value - 1 } as _}
          <i class="cci cci-{getIcon(stat)} i--m damage-pip" />
        {/each}
        {#each { length: getDamage(lancerActor) } as _}
          <i class="mdi mdi-hexagon-outline i--m damage-pip damaged" />
        {/each}
      </div>
      <p class="message">
        Roll {getDamage(lancerActor)}d6 to determine what happens.
      </p>
    </div>
  {/if}
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

  .damage-preview {
    text-align: center;
  }

  .damaged {
    opacity: 30%;
  }
</style>
