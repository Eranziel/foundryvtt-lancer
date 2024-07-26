<svelte:options accessors={true} />

<script lang="ts">
  import type { DamageHudWeapon, DamageHudBase, DamageHudTarget } from "./index";

  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher } from "svelte";

  import MiniProfile from "../components/MiniProfile.svelte";

  import type { LancerItem } from "../../item/lancer-item";

  export let weapon: DamageHudWeapon;
  export let base: DamageHudBase;
  export let targets: DamageHudTarget[];
  export let title: string;
  export let lancerItem: LancerItem | null;

  $: profile = lancerItem ? findProfile() : null;

  const dispatch = createEventDispatcher();

  function focus(el: HTMLElement) {
    el.focus();
  }

  function escToCancel(_el: HTMLElement) {
    function escHandler(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dispatch("cancel");
      }
    }

    window.addEventListener("keydown", escHandler);
    return {
      destroy() {
        window.removeEventListener("keydown", escHandler);
      },
    };
  }

  function findProfile() {
    return lancerItem?.currentProfile() ?? { range: [], damage: [] };
  }
</script>

<form
  id="damage-hud"
  class="lancer damage-hud window-content"
  use:escToCancel
  on:submit|preventDefault={() => dispatch("submit")}
>
  {#if title != ""}
    <div class="lancer-header lancer-weapon medium">
      <i class="cci cci-large-beam i--m i--light" />
      <span>{title}</span>
    </div>
  {/if}
  {#if profile}
    <MiniProfile {profile} />
  {/if}

  <!-- Mockup -->
  <div class="damage-grid">
    <div class="base-damage">
      <h3 class="lancer-border-primary">Base Damage</h3>
    </div>
    <div class="bonus-damage">
      <h3 class="lancer-border-primary">Bonus Damage</h3>
    </div>
  </div>
  <!-- End Mockup -->

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

<style lang="scss">
  :global(.damage-grid) {
    display: flex;
    justify-content: space-between;
  }

  .base-damage,
  .bonus-damage {
    width: 100%;
    padding: 4px;
    min-width: 180px;
  }

  .base-damage {
    border-right: 1px dashed;
  }

  #damage-hud :global(.container) {
    display: flex;
    position: relative;
    padding-left: 30px;
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.9em;
    user-select: none;
    align-items: center;
    cursor: pointer;
  }
</style>
