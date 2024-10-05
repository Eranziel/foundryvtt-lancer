<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";

  import HudCheckbox from "../components/HudCheckbox.svelte";
  import { DamageHudTarget, HitQuality } from "./data";
  import DamageInput from "./DamageInput.svelte";
  import { DamageType } from "../../enums";
  import HitRadio from "./HitRadio.svelte";

  const dispatch = createEventDispatcher();

  export let target: DamageHudTarget;

  let imgElement: HTMLElement;

  $: hitQualityClass =
    target.quality === HitQuality.Hit
      ? "target-hit"
      : target.quality === HitQuality.Crit
      ? "target-crit"
      : "target-miss";

  function addBonusDamage() {
    target.bonusDamage = [...target.bonusDamage, { type: DamageType.Kinetic, val: "1d6" }];
  }

  function removeBonusDamage(idx: number) {
    target.bonusDamage = target.bonusDamage.filter((_, i) => i !== idx);
  }

  function toggleAP(event: any) {
    dispatch("ap", event.detail);
  }

  function toggleParacausal(event: any) {
    dispatch("paracausal", event.detail);
    if (event.detail) {
      target.ap = true;
    }
  }

  function toggleHalfDamage(event: any) {
    dispatch("halfDmg", event.detail);
  }
</script>

<div
  class={`damage-hud-target-card card ${hitQualityClass}`}
  in:slide={{ delay: 100, duration: 300 }}
  out:slide={{ duration: 100 }}
>
  <span class="target-name flexrow lancer-mini-header">🞂<b>{target.target.name}</b>🞀</span>
  <div class="flexrow">
    <img
      class="lancer-hit-thumb accdiff-target-has-dropdown"
      alt={target.target.name ?? undefined}
      src={target.target.actor?.img}
      bind:this={imgElement}
    />
    <!-- Add bonus damage for this target -->
    <div class="card clipped target-bonus-damage">
      <span class="flexrow" style="width: 100%">
        <b class="target-bonus-damage-title">Bonus</b>
        {#if target.bonusDamage.length}
          <button
            class="lancer-button add-damage-type small"
            type="button"
            on:click={addBonusDamage}
            data-tooltip="Add a bonus damage type for only this target"
          >
            <i class="mdi mdi-plus-thick" />
          </button>
        {/if}
      </span>
      {#each target.bonusDamage as damage, i (i)}
        <div class="target-bonus-damage-wrapper">
          <DamageInput bind:damage on:delete={() => removeBonusDamage(i)} />
        </div>
      {/each}
      {#if !target.bonusDamage.length}
        <button
          class="lancer-button add-damage-type"
          type="button"
          on:click={addBonusDamage}
          data-tooltip="Add a bonus damage type for only this target"
        >
          <i class="mdi mdi-plus-thick" />
        </button>
      {/if}
    </div>
  </div>
  <!-- Checkboxes for damage config -->
  <!-- Horizontal radio for Crit/Hit/Miss -->
  <div class="hit-quality">
    <HitRadio bind:quality={target.quality} class="damage-target-quality flexrow" />
  </div>
  <div class="flexrow damage-target-config">
    <HudCheckbox
      icon="mdi mdi-shield-off-outline"
      bind:value={target.ap}
      on:change={toggleAP}
      tooltip="Armor Piercing (AP)"
      disabled={target.paracausal}
    />
    <HudCheckbox
      icon="cci cci-large-beam"
      bind:value={target.paracausal}
      on:change={toggleParacausal}
      tooltip="For 'cannot be reduced' effects like the Paracausal mod"
      style="margin: 0 0.3em;"
    />
    <HudCheckbox
      icon="mdi mdi-fraction-one-half"
      bind:value={target.halfDamage}
      on:change={toggleHalfDamage}
      tooltip="For effects which cause the attacker to deal half damage in addition to resistance, like Heavy Gunner"
    />
  </div>
</div>

<style lang="scss">
  .damage-hud-target-card {
    background-color: var(--darken-1);
    box-shadow: 1px 1px 2px;
    margin: 0.3em 0.3em;
    max-width: 100%;
    height: calc(100% - 0.6em);
    justify-content: space-between;
    transition: all 0.3s ease;

    &.target-miss {
      opacity: 70%;
    }

    .target-name {
      justify-content: center;
      padding: 0px 0.2em;
    }

    .lancer-hit-thumb {
      margin: 0.2em;
      flex-grow: 0;
      object-fit: contain;
    }

    .target-bonus-damage {
      background-color: var(--darken-3);
      align-content: center;
      align-items: center;
      padding: 0.3em;

      .target-bonus-damage-title {
        display: flex;
        justify-content: center;
      }
    }
    .add-damage-type {
      max-height: 2em;
      max-width: 2em;
      display: flex;
      justify-content: center;
      align-items: center;
      i {
        margin: 0;
      }

      &.small {
        max-height: 1.5em;
        max-width: 1.5em;
        line-height: 1.5em;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .damage-target-config {
      margin: 0 0.3em;
    }
  }

  .hit-quality {
    margin-top: 0.4em;
    justify-content: space-around;

    :global(.damage-target-quality i) {
      font-size: 16px;
      vertical-align: top;
    }
  }
</style>
