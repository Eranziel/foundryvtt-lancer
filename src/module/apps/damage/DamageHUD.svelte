<svelte:options accessors={true} />

<script lang="ts">
  import type { DamageHudWeapon, DamageHudBase, DamageHudTarget } from "./index";

  import { slide } from "svelte/transition";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher } from "svelte";

  import DamageInput from "./DamageInput.svelte";
  import MiniProfile from "../components/MiniProfile.svelte";
  import HudCheckbox from "../components/HudCheckbox.svelte";

  import type { LancerItem } from "../../item/lancer-item";
  import DamageTarget from "./DamageTarget.svelte";
  import { DamageType } from "../../enums";

  export let weapon: DamageHudWeapon;
  export let base: DamageHudBase;
  export let targets: DamageHudTarget[];
  export let title: string;
  export let lancerItem: LancerItem | null;

  $: baseDamage = base.total.damage;
  $: baseBonusDamage = base.total.bonusDamage;
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

  function reliableType(): DamageType {
    const allowedTypes = [DamageType.Kinetic, DamageType.Energy, DamageType.Explosive];
    const preferred = weapon.damage.find(d => allowedTypes.includes(d.type));
    if (preferred) {
      return preferred.type;
    }
    if (weapon.damage.length) {
      return weapon.damage[0].type;
    }
    return DamageType.Kinetic;
  }
</script>

<form
  id="damage-hud"
  class="lancer lancer-hud damage-hud window-content"
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

  <!-- Damage types and values -->
  <div class="damage-grid">
    <div class="base-damage lancer-border-primary">
      <h3 class="lancer-border-primary">Base Damage</h3>
      {#each baseDamage as damage}
        <DamageInput bind:damage />
      {/each}
      <button class="lancer-button"><i class="i--s mdi mdi-plus-thick" /></button>
    </div>
    <div class="bonus-damage">
      <h3 class="lancer-border-primary">Bonus Damage</h3>
      {#each baseBonusDamage as damage}
        <DamageInput bind:damage />
      {/each}
      <button class="lancer-button"><i class="i--s mdi mdi-plus-thick" /></button>
    </div>
  </div>
  <!-- Checkboxes - AP etc... -->
  <div class="damage-hud-options-grid">
    <h3 class="damage-hud-section lancer-border-primary" style="grid-area: title">Configuration</h3>
    <HudCheckbox label="Armor Piercing (AP)" bind:value={base.ap} style="grid-area: ap" />
    <HudCheckbox label="Overkill" bind:value={weapon.overkill} style="grid-area: overkill" />
    <HudCheckbox
      label="Paracausal"
      bind:value={base.paracausal}
      tooltip="Use this for 'cannot be reduced' effects"
      style="grid-area: paracausal"
    />
    <HudCheckbox
      label="Half Damage"
      bind:value={base.halfDamage}
      tooltip="Use this for effects which cause the attacker to deal half damage in addition to resistance. For example, Heavy Gunner or Scylla-class AI."
      style="grid-area: halfdamage"
    />
    <div class="flexrow" style="grid-area: reliable; align-items: center;">
      <HudCheckbox
        label="Reliable"
        bind:value={weapon.reliable}
        style="grid-area: reliable; max-width: fit-content; padding-right: 0.5em;"
      />
      {#if weapon.reliable}
        <i
          class="cci i--sm cci-{reliableType().toLowerCase()} damage--{reliableType().toLowerCase()}"
          data-tooltip={reliableType()}
          transition:fade
        />
        <input class="reliable-value" type="number" bind:value={weapon.reliableValue} transition:fade />
      {/if}
    </div>
  </div>
  <!-- Target cards -->
  <div class="damage-hud-targets">
    {#each targets as target (target.target.id)}
      <div animate:flip={{ duration: 200 }}>
        <DamageTarget {target} />
      </div>
    {/each}
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

<style lang="scss">
  #damage-hud {
    // background-color: var(--background-color);
    // color: var(--dark-text);

    select,
    input {
      color: unset;
    }

    .group-box {
      border: 1px solid var(--primary-color);
      border-radius: 5px;
    }

    .damage-grid {
      display: flex;
      justify-content: space-between;
    }

    .base-damage,
    .bonus-damage {
      width: 100%;
      padding: 0.2em;
      min-width: 180px;
    }

    .base-damage {
      border-right-width: 1px;
      border-right-style: dashed;
    }

    h1.damage-hud-section,
    h2.damage-hud-section,
    h3.damage-hud-section,
    h4.damage-hud-section {
      display: flex;
      justify-content: center;
    }

    .damage-hud-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto auto auto;
      grid-template-areas:
        "title title"
        "ap overkill"
        "paracausal reliable"
        "halfdamage empty";
      margin-bottom: 0.5em;

      .reliable-value {
        width: 5em;
        max-width: 5em;
      }
    }
  }

  .damage-hud-targets {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto;
  }
</style>
