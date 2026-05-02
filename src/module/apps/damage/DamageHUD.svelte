<script lang="ts">
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher, onMount, onDestroy } from "svelte";

  import DamageInput from "./DamageInput.svelte";
  import MiniProfile from "../components/MiniProfile.svelte";
  import HudCheckbox from "../components/HudCheckbox.svelte";
  import DamageTarget from "./DamageTarget.svelte";
  import HitRadio from "./HitRadio.svelte";

  import { DamageHudData, HitQuality } from "./data.svelte";
  import type { CurrentProfile } from "../../item/lancer-item";
  import { DamageType } from "../../enums";
  import { LancerToken } from "../../token";
  import { tokenDocFromUuidSync } from "../../util/misc";

  /* ===== PROPS ===== */

  let {
    data,
    kind,
    // TODO: remove event dispatcher, use callback props instead
    // cancel,
    // submit,
  }: {
    data: DamageHudData;
    kind: "hase" | "attack";
    // cancel: Function;
    // submit: Function;
  } = $props();

  /* ===== STATE ===== */

  const dispatch = createEventDispatcher();
  let submitted = $state(false);
  let partialAP = $state(false);
  let partialParacausal = $state(false);
  let partialHalfDamage = $state(false);
  const hookCallbacks: Record<string, number> = {};

  /* ===== DERIVED VALUES ===== */

  const title = $derived(data.title);
  const lancerItem = $derived(data.lancerItem);
  const lancerActor = $derived(data.lancerActor);
  const base = $derived(data.base);
  const weapon = $derived(data.weapon);
  const targets = $derived(data.targets);

  const rollerName = $derived(lancerActor ? ` -- ${lancerActor.token?.name || lancerActor.name}` : "");
  const baseDamage = $derived(data.base.damage);
  const baseBonusDamage = $derived(data.base.bonusDamage);
  const weaponDamage = $derived(data.weapon.damage);
  const weaponBonusDamage = $derived(data.weapon.bonusDamage);
  const profile = $derived(lancerItem ? findProfile() : null);
  const targetHitQualityClass = $derived(
    !targets.length || targets[0]?.quality === HitQuality.Hit
      ? "target-hit"
      : targets[0]?.quality === HitQuality.Crit
        ? "target-crit"
        : "target-miss"
  );

  /* ===== FUNCTIONS ===== */

  onMount(() => {
    // Register hook callbacks for updating targeted tokens
    hookCallbacks.targetToken = Hooks.on("targetToken", (user, _token, _isNewTarget) => {
      if (user.isSelf) {
        updateTargets();
      }
    });
    hookCallbacks.createActiveEffect = Hooks.on("createActiveEffect", updateTargets);
    hookCallbacks.deleteActiveEffect = Hooks.on("deleteActiveEffect", updateTargets);
    // updateToken triggers on things like token movement (spotter) and probably a lot of other things
    hookCallbacks.updateToken = Hooks.on("updateToken", token => {
      // If there's an animation, update when it finishes, otherwise just update
      foundry.canvas.animation.CanvasAnimation.getAnimation(token.object?.animationName!)?.promise.then(() =>
        updateTargets()
      ) ?? updateTargets();
    });
  });

  onDestroy(() => {
    // Unregister hook callbacks
    for (const key in hookCallbacks) {
      Hooks.off(key, hookCallbacks[key]);
    }
  });

  function focus(el: HTMLElement) {
    el.focus();
  }

  function updateTargets() {
    if (!data) return;
    data.replaceTargets(Array.from(game!.user!.targets).map(t => t.document.uuid));
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

  function findProfile(): CurrentProfile {
    return lancerItem?.currentProfile() ?? { range: [], damage: [] };
  }

  function reliableType(): DamageType {
    const allowedTypes = [DamageType.Kinetic, DamageType.Energy, DamageType.Explosive];
    const preferred = weapon?.damage.find(d => allowedTypes.includes(d.type));
    if (preferred) {
      return preferred.type;
    }
    if (weapon?.damage.length) {
      return weapon?.damage[0].type;
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
    } else if (weapon) {
      weapon.damage = weapon.damage.filter((_, i) => i !== idx);
    }
  }

  function removeBonusDamage(idx: number, isBase = true) {
    if (isBase) {
      base.bonusDamage = base.bonusDamage.filter((_, i) => i !== idx);
    } else if (weapon) {
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

  function updateTargetModifiers() {
    // Check for partial/all AP
    if (targets.every(t => t.ap)) {
      base.ap = true;
      partialAP = false;
    } else if (targets.some(t => t.ap)) {
      base.ap = false;
      partialAP = true;
    } else {
      base.ap = false;
      partialAP = false;
    }

    // Check for partial/all paracausal
    if (targets.every(t => t.paracausal)) {
      base.paracausal = true;
      partialParacausal = false;
    } else if (targets.some(t => t.paracausal)) {
      base.paracausal = false;
      partialParacausal = true;
    } else {
      base.paracausal = false;
      partialParacausal = false;
    }

    // Check for partial/all half damage
    if (targets.every(t => t.halfDamage)) {
      base.halfDamage = true;
      partialHalfDamage = false;
    } else if (targets.some(t => t.halfDamage)) {
      base.halfDamage = false;
      partialHalfDamage = true;
    } else {
      base.halfDamage = false;
      partialHalfDamage = false;
    }
  }

  function targetHoverIn(event: any, targetUuid: string) {
    const target = tokenDocFromUuidSync(targetUuid, { strict: true })?.object;
    if (!target) return;
    // Ignore target hovering after the form has been submitted, to avoid flickering when
    // the UI slides down.
    if (submitted) return;
    // @ts-expect-error not supposed to use a private method
    target._onHoverIn(event);
  }
  function targetHoverOut(event: any, targetUuid: string) {
    const target = tokenDocFromUuidSync(targetUuid, { strict: true })?.object;
    if (!target) return;
    // @ts-expect-error not supposed to use a private method
    target._onHoverOut(event);
  }
</script>

<form
  id="damage-hud"
  class="lancer lancer-hud damage-hud window-content"
  use:escToCancel
  onsubmit={event => {
    event.preventDefault();
    submitted = true;
    dispatch("submit");
  }}
>
  {#if title != ""}
    <div class="lancer-header lancer-weapon medium">
      <i class="cci cci-large-beam i--4 i--light"></i>
      <span>{title}{rollerName}</span>
    </div>
  {/if}
  {#if profile}
    <MiniProfile {profile} />
  {/if}

  <div class="lancer-hud-body">
    <!-- Damage types and values -->
    <div class="damage-grid">
      <div class="base-damage lancer-border-primary">
        <h4 class="damage-hud-section lancer-border-primary flexrow">
          Base Damage
          <button class="add-damage-type" type="button" aria-label="Add new base damage type" onclick={addBaseDamage}>
            <i class="mdi mdi-plus-thick" data-tooltip="Add a base damage type"></i>
          </button>
        </h4>
        {#each weaponDamage as _damage, i}
          <div>
            <DamageInput bind:damage={weaponDamage[i]} on:delete={() => removeBaseDamage(i, false)} />
          </div>
        {/each}
        {#each baseDamage as _damage, i}
          <div>
            <DamageInput bind:damage={baseDamage[i]} on:delete={() => removeBaseDamage(i)} />
          </div>
        {/each}
      </div>
      <div class="bonus-damage">
        <h4 class="damage-hud-section lancer-border-primary flexrow">
          Bonus Damage
          <button class="add-damage-type" type="button" aria-lable="Add new bonus damage type" onclick={addBonusDamage}>
            <i class="mdi mdi-plus-thick" data-tooltip="Add a bonus damage type"></i>
          </button>
        </h4>
        {#each weaponBonusDamage as _damage, i}
          <div>
            <DamageInput bind:damage={weaponBonusDamage[i]} on:delete={() => removeBonusDamage(i, false)} />
          </div>
        {/each}
        {#each baseBonusDamage as _damage, i}
          <div>
            <DamageInput bind:damage={baseBonusDamage[i]} on:delete={() => removeBonusDamage(i)} />
          </div>
        {/each}
      </div>
    </div>
    <!-- Checkboxes - AP etc... -->
    <div class="damage-hud-options-grid">
      <h4 class="damage-hud-section lancer-border-primary" style="justify-content: center; grid-area: title">
        Configuration
      </h4>
      <HudCheckbox
        icon="mdi mdi-shield-off-outline"
        label="Armor Piercing (AP)"
        bind:value={base.ap}
        bind:partial={partialAP}
        on:change={toggleAP}
        disabled={base.paracausal}
        style="grid-area: ap"
      />
      <HudCheckbox label="Overkill" bind:value={weapon.overkill} style="grid-area: overkill" />
      <HudCheckbox
        icon="cci cci-large-beam"
        label="Cannot be Reduced"
        bind:value={base.paracausal}
        bind:partial={partialParacausal}
        on:change={toggleParacausal}
        tooltip="For 'cannot be reduced' effects like the Paracausal mod"
        style="grid-area: paracausal"
      />
      <HudCheckbox
        icon="mdi mdi-fraction-one-half"
        label="Half Damage"
        bind:value={base.halfDamage}
        bind:partial={partialHalfDamage}
        on:change={toggleHalfDamage}
        tooltip="For effects which cause the attacker to deal half damage in addition to resistance, like Heavy Gunner"
        style="grid-area: halfdamage"
      />
      <div class="flexrow" style="grid-area: reliable; align-items: center">
        <HudCheckbox
          label="Reliable"
          bind:value={weapon.reliable}
          style="grid-area: reliable; max-width: fit-content; padding-right: 0.5em"
        />
        {#if weapon.reliable}
          <i
            class="cci i--2 cci-{reliableType().toLowerCase()} damage--{reliableType().toLowerCase()}"
            data-tooltip={reliableType()}
            transition:fade|global
          ></i>
          <input
            class="lancer-input reliable-value"
            type="text"
            data-dtype="string"
            bind:value={weapon.reliableValue}
            transition:fade|global
          >
        {/if}
      </div>
    </div>
    <!-- Target cards -->
    <div class="damage-hud-targets">
      {#if targets.length === 1}
        <div
          role="radiogroup"
          tabindex="0"
          class={`single-target-container ${targetHitQualityClass}`}
          onmouseenter={ev => targetHoverIn(ev, targets[0].targetUuid)}
          onmouseleave={ev => targetHoverOut(ev, targets[0].targetUuid)}
        >
          <span class="target-name flexrow lancer-mini-header">🞂<b>{targets[0].targetName}</b>🞀</span>
          <div class="target-body flexrow">
            <img
              class="lancer-hit-thumb accdiff-target-has-dropdown"
              alt={targets[0].targetName}
              src={targets[0].targetImg}
            >
            <HitRadio bind:quality={targets[0].quality} class="damage-target-quality flexcol" />
          </div>
        </div>
      {:else if targets.length > 1}
        {#each targets as target (target.targetUuid)}
          <div
            role="radiogroup"
            tabindex="0"
            class="target-container {targets.length <= 1 ? 'solo' : ''}"
            animate:flip={{ duration: 200 }}
            onmouseenter={ev => targetHoverIn(ev, target.targetUuid)}
            onmouseleave={ev => targetHoverOut(ev, target.targetUuid)}
          >
            <DamageTarget
              {target}
              on:ap={updateTargetModifiers}
              on:paracausal={updateTargetModifiers}
              on:halfDmg={updateTargetModifiers}
            />
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="lancer-hud-buttons flexrow">
    <button
      class="lancer-button lancer-secondary dialog-button submit default"
      data-button="submit"
      type="submit"
      use:focus
    >
      <i class="fas fa-check"></i>
      Roll
    </button>
    <button class="dialog-button cancel" data-button="cancel" type="button" onclick={() => dispatch("cancel")}>
      <i class="fas fa-times"></i>
      Cancel
    </button>
  </div>
</form>

<style lang="scss">
  @layer lancer {
    @layer applications {
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
          border-bottom: 1px solid var(--primary-color);
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

        h4.damage-hud-section {
          display: flex;
          justify-content: space-between;
          padding-bottom: 0.3em;
          margin: 0.2em 0 0.2em;
          font-size: 1rem;
          border-bottom: 1px solid var(--primary-color);
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
          border-top: 1px solid var(--primary-color);

          i:has(+ .reliable-value) {
            min-height: 1rem;
            max-height: 1rem;
            vertical-align: middle;
          }
          .reliable-value {
            width: 5em;
            max-width: 5em;
            max-height: 1.5em;
            margin: 0 0.4em 0;
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
          transition: all 0.3s ease;

          &.target-miss {
            opacity: 70%;
          }

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
    }
  }
</style>
