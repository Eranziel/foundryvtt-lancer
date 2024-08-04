<script lang="ts">
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  import HudCheckbox from "../components/HudCheckbox.svelte";
  import { DamageHudTarget } from "./data";
  import DamageInput from "./DamageInput.svelte";
  import { DamageType } from "../../enums";

  export let target: DamageHudTarget;

  let imgElement: HTMLElement;

  function addBonusDamage() {
    target.bonusDamage = [...target.bonusDamage, { type: DamageType.Kinetic, val: "1d6" }];
  }

  function removeBonusDamage(idx: number) {
    target.bonusDamage = target.bonusDamage.filter((_, i) => i !== idx);
  }
</script>

<div class="damage-hud-target-card card" in:slide={{ delay: 100, duration: 300 }} out:slide={{ duration: 100 }}>
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
      <span class="flexrow">
        <b>Bonus</b>
        {#if target.bonusDamage.length}
          <button class="lancer-button add-damage-type" type="button" on:click={addBonusDamage}>
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
        <button class="lancer-button add-damage-type" type="button" on:click={addBonusDamage}
          ><i class="mdi mdi-plus-thick" /></button
        >
      {/if}
    </div>
  </div>
  <!-- Checkboxes for damage config -->
  <div class="flexrow damage-target-config">
    <HudCheckbox label="AP" bind:value={target.ap} tooltip="Armor Piercing" />
    <HudCheckbox
      label="PCSL"
      bind:value={target.paracausal}
      tooltip="Paracausal - use this for 'cannot be reduced' effects"
      style="margin: 0 0.3em;"
    />
    <HudCheckbox
      label="½"
      bind:value={target.halfDamage}
      tooltip="Half Damage - Use this for effects which cause the attacker to deal half damage in addition to resistance. For example, Heavy Gunner or Scylla-class AI."
    />
  </div>
  <!-- Horizontal radio for Crit/Hit/Miss -->
</div>

<style lang="scss">
  .damage-hud-target-card {
    background-color: var(--darken-1);
    box-shadow: var(--button-shadow);
    margin: 0.3em 0.3em;
    max-width: 12em;
    height: calc(100% - 0.6em);
    justify-content: space-between;

    &:has(.target-bonus-damage .target-bonus-damage-wrapper) {
      max-width: 100%;
    }
    .target-name {
      justify-content: center;
      padding: 0px 0.2em;
      border-bottom: 1px solid var(--primary-color);
    }

    .lancer-hit-thumb {
      margin: 0.2em;
      flex-grow: 0;
      object-fit: contain;
    }

    .target-bonus-damage {
      background-color: var(--darken-2);
      align-content: center;
      align-items: center;
      padding: 0.3em;
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
    }

    .damage-target-config {
      margin: 0 0.3em;
    }
  }
</style>
