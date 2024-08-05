<svelte:options accessors={true} />

<script lang="ts">
  import type { DamageHudWeapon, DamageHudBase, DamageHudTarget } from "./index";

  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher } from "svelte";

  import DamageInput from "./DamageInput.svelte";
  import MiniProfile from "../components/MiniProfile.svelte";
  import HudCheckbox from "../components/HudCheckbox.svelte";

  import type { LancerItem } from "../../item/lancer-item";
  import DamageTarget from "./DamageTarget.svelte";
  import { DamageType } from "../../enums";
  import HitRadio from "./HitRadio.svelte";

  export let weapon: DamageHudWeapon;
  export let base: DamageHudBase;
  export let targets: DamageHudTarget[];
  export let title: string;
  export let lancerItem: LancerItem | null;

  $: baseDamage = base.damage;
  $: baseBonusDamage = base.bonusDamage;
  $: weaponDamage = weapon.damage;
  $: weaponBonusDamage = weapon.bonusDamage;
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

  function addBaseDamage() {
    base.damage = [...base.damage, { type: DamageType.Kinetic, val: "1d6" }];
  }

  function addBonusDamage() {
    base.bonusDamage = [...base.bonusDamage, { type: DamageType.Kinetic, val: "1d6" }];
  }

  function removeBaseDamage(idx: number, isBase = true) {
    if (isBase) {
      base.damage = base.damage.filter((_, i) => i !== idx);
    } else {
      weapon.damage = weapon.damage.filter((_, i) => i !== idx);
    }
  }

  function removeBonusDamage(idx: number, isBase = true) {
    if (isBase) {
      base.bonusDamage = base.bonusDamage.filter((_, i) => i !== idx);
    } else {
      weapon.bonusDamage = weapon.bonusDamage.filter((_, i) => i !== idx);
    }
  }

  function toggleAP(event: any) {
    for (const [idx, t] of targets.entries()) {
      t.ap = event.detail;
      targets[idx] = t;
    }
  }
  function toggleParacausal(event: any) {
    for (const [idx, t] of targets.entries()) {
      t.paracausal = event.detail;
      targets[idx] = t;
    }
    if (event.detail) {
      base.ap = true;
      toggleAP(event);
    }
  }
  function toggleHalfDamage(event: any) {
    for (const [idx, t] of targets.entries()) {
      t.halfDamage = event.detail;
      targets[idx] = t;
    }
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
      <h3 class="damage-hud-section lancer-border-primary flexrow">
        Base Damage
        <button class="add-damage-type" type="button" on:click={addBaseDamage}
          ><i class="mdi mdi-plus-thick" data-tooltip="Add a base damage type" /></button
        >
      </h3>
      {#each weaponDamage as damage, i (i)}
        <div>
          <DamageInput bind:damage on:delete={() => removeBaseDamage(i, false)} />
        </div>
      {/each}
      {#each baseDamage as damage, i (i)}
        <div>
          <DamageInput bind:damage on:delete={() => removeBaseDamage(i)} />
        </div>
      {/each}
    </div>
    <div class="bonus-damage">
      <h3 class="damage-hud-section lancer-border-primary flexrow">
        Bonus Damage
        <button class="add-damage-type" type="button" on:click={addBonusDamage}
          ><i class="mdi mdi-plus-thick" data-tooltip="Add a bonus damage type" /></button
        >
      </h3>
      {#each weaponBonusDamage as damage, i (i)}
        <div>
          <DamageInput bind:damage on:delete={() => removeBonusDamage(i, false)} />
        </div>
      {/each}
      {#each baseBonusDamage as damage, i (i)}
        <div>
          <DamageInput bind:damage on:delete={() => removeBonusDamage(i)} />
        </div>
      {/each}
    </div>
  </div>
  <!-- Checkboxes - AP etc... -->
  <div class="damage-hud-options-grid">
    <h3 class="damage-hud-section lancer-border-primary" style="justify-content: center; grid-area: title;">
      Configuration
    </h3>
    <HudCheckbox
      icon="mdi mdi-shield-off-outline"
      label="Armor Piercing (AP)"
      bind:value={base.ap}
      on:change={toggleAP}
      disabled={base.paracausal}
      style="grid-area: ap"
    />
    <HudCheckbox label="Overkill" bind:value={weapon.overkill} style="grid-area: overkill" />
    <HudCheckbox
      icon="mdi mdi-shimmer"
      label="Paracausal"
      bind:value={base.paracausal}
      on:change={toggleParacausal}
      tooltip="For 'cannot be reduced' effects like the Paracausal mod"
      style="grid-area: paracausal"
    />
    <HudCheckbox
      icon="mdi mdi-fraction-one-half"
      label="Half Damage"
      bind:value={base.halfDamage}
      on:change={toggleHalfDamage}
      tooltip="For effects which cause the attacker to deal half damage in addition to resistance, like Heavy Gunner"
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
    {#if targets.length === 1}
      <div class="single-target-container">
        <span class="target-name flexrow lancer-mini-header">🞂<b>{targets[0].target.name}</b>🞀</span>
        <div class="target-body flexrow">
          <img
            class="lancer-hit-thumb accdiff-target-has-dropdown"
            alt={targets[0].target.name ?? undefined}
            src={targets[0].target.actor?.img}
          />
          <HitRadio bind:quality={targets[0].quality} class="damage-target-quality flexcol" />
        </div>
      </div>
    {:else if targets.length > 1}
      {#each targets as target (target.target.id)}
        <div class="target-container {targets.length <= 1 ? 'solo' : ''}" animate:flip={{ duration: 200 }}>
          <DamageTarget {target} />
        </div>
      {/each}
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

<style lang="scss">
  #damage-hud {
    // background-color: var(--background-color);
    // color: var(--dark-text);

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
      min-width: 200px;
    }

    h3 {
      justify-content: space-between;
    }

    .base-damage {
      border-right-width: 1px;
      border-right-style: dashed;
    }

    .add-damage-type {
      max-height: 1.5em;
      max-width: 1.5em;
      line-height: 1.5em;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;

      i {
        margin: 0;
      }
    }

    h3.damage-hud-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.1em;
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
    grid-template-columns: auto auto auto;
    grid-auto-flow: dense;
    grid-row-gap: 0.3em;
    justify-items: center;
    border-top: 1px solid var(--primary-color);
    padding-top: 0.5em;

    .single-target-container {
      grid-column-start: 1;
      grid-column-end: 4;
      width: 65%;
      background-color: var(--darken-1);
      box-shadow: 1px 1px 2px;
      margin-bottom: 0.3em;

      .target-name {
        justify-content: center;
        padding: 0px 0.2em;
        justify-content: space-between;
        b {
          text-align: center;
        }
      }

      .lancer-hit-thumb {
        max-width: 50px;
      }

      .target-body {
        justify-content: center;
        align-items: center;
        img {
          flex-grow: 0;
        }
      }

      :global(.damage-target-quality) {
        flex-grow: 1;
        max-width: fit-content;
        font-size: 0.85em;
        margin-top: 0.2em;
        padding-left: 10px;
        cursor: pointer;
      }
      :global(.damage-target-quality i) {
        vertical-align: middle;
        margin-right: 0.4em;
        margin-top: 0.1em;
        margin-bottom: 0.1em;
      }

      :global(.damage-target-quality span) {
        vertical-align: middle;
      }

      :global(.damage-target-quality label) {
        align-content: center;
      }
    }

    .target-container {
      min-width: 200px;
      max-width: 200px;
    }

    .target-container:has(.damage-hud-target-card .target-bonus-damage-wrapper) {
      grid-column-start: 1;
      grid-column-end: 3;
      max-width: unset;
    }
  }
</style>
