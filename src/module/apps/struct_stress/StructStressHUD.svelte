<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { LancerActor } from "../../actor/lancer-actor";
  import type { StructStressData } from "./data.svelte";

  let {
    data,
  }: {
    data: StructStressData;
  } = $props();

  const title = $derived(data.title);
  const stat = $derived(data.stat);

  const lancerActor = $derived(getActor(data.actorUuid));
  const rollerName = $derived(lancerActor ? ` -- ${lancerActor.token?.name || lancerActor.name}` : "");
  const icon = $derived(stat === "stress" ? ("reactor" as const) : stat);
  const current = $derived(getCurrent(lancerActor));
  const damage = $derived(getDamage(lancerActor));

  const dispatch = createEventDispatcher();

  function getActor(uuid?: string) {
    if (!uuid) return null;
    try {
      return LancerActor.fromUuidSync(uuid);
    } catch {
      return null;
    }
  }

  function focus(el: HTMLElement) {
    el.focus();
  }

  function getCurrent(a: LancerActor | null) {
    if (!a || (!a.is_mech() && !a.is_npc())) return 0;
    return Math.max(a.system[stat].value - 1, 0);
  }

  function getDamage(a: LancerActor | null) {
    if (!a || (!a.is_mech() && !a.is_npc())) return 0;
    return a.system[stat].max - getCurrent(a);
  }
</script>

<form
  id="structstress"
  class="lancer-hud structstress window-content"
  onsubmit={event => {
    event.preventDefault();
    dispatch("submit");
  }}
>
  <div class="lancer-header lancer-primary medium">
    <i class="cci cci-{icon} i--4 i--light"></i>
    <span>{title}{rollerName}</span>
  </div>
  {#if lancerActor && (lancerActor.is_mech() || lancerActor.is_npc())}
    <div class="lancer-hud-body">
      <h4>{lancerActor?.name ?? "UNKNOWN MECH"} has taken {icon} damage!</h4>
      <div class="damage-preview">
        {#each { length: current } as _}
          <i class="cci cci-{icon} i--4 damage-pip"></i>
        {/each}
        {#each { length: damage } as _}
          <i class="mdi mdi-hexagon-outline i--4 damage-pip damaged"></i>
        {/each}
      </div>
      <p class="message">
        Roll {damage}d6 to determine what happens.
      </p>
    </div>
  {/if}
  <div class="lancer-hud-buttons flexrow">
    <button class="dialog-button submit default" data-button="submit" type="submit" use:focus>
      <i class="fas fa-check"></i>
      Roll
    </button>
    <button class="dialog-button cancel" data-button="cancel" type="button" onclick={() => dispatch("cancel")}>
      <i class="fas fa-times"></i>
      Cancel
    </button>
  </div>
</form>

<style>
  @layer lancer {
    @layer applications {
      .lancer-hud-body h4 {
        margin-bottom: 0;
        font-size: 1rem;
      }

      .damage-preview {
        text-align: center;
      }

      .damaged {
        opacity: 30%;
      }
    }
  }
</style>
