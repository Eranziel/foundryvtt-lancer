<svelte:options accessors={true} />

<script lang="ts">
  import {
    AccDiffHudWeapon,
    AccDiffHudBase,
    AccDiffHudTarget,
    AccDiffHudPluginData,
    AccDiffHudTalents,
    AccDiffHudData,
  } from "./index";

  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher } from "svelte";

  import Plugin from "./Plugin.svelte";
  import Cover from "./Cover.svelte";
  import Total from "./TotalAccuracy.svelte";
  import MiniProfile from "../components/MiniProfile.svelte";
  import { fade } from "../slidinghud";

  import type { LancerItem, LancerMECH_WEAPON, LancerNPC_FEATURE, LancerPILOT_WEAPON } from "../../item/lancer-item";
  import { NpcFeatureType, RangeType } from "../../enums";
  import { WeaponRangeTemplate } from "../../canvas/weapon-range-template";
  import { targetsFromTemplate } from "../../flows/_template";
  import type { LancerActor } from "../../actor/lancer-actor";
  import HudCheckbox from "../components/HudCheckbox.svelte";
  import { LancerToken } from "../../token";
  import AccDiffInput from "./AccDiffInput.svelte";
  import { SystemTemplates } from "../../system-template";
  import Vanguard_1 from "./vanguard";

  export let talents: AccDiffHudTalents;
  console.log("TALENTS:");
  console.log(talents);
  export let weapon: AccDiffHudWeapon;
  export let base: AccDiffHudBase;
  export let targets: AccDiffHudTarget[];
  export let title: string;
  export let lancerItem: LancerItem | null;
  export let lancerActor: LancerActor | null;

  let total = targets[0].total;
  $: total = targets[0].total;
  console.log(total);
  export let kind: "hase" | "attack";

  // tell svelte of externally computed dependency arrows
  // @ts-expect-error i.e., base depends on weapon
  $: base = (weapon, base);
  // @ts-expect-error i.e., targets depend on weapon and base
  $: targets = (targets[0].plugins["Handshake Etiquette"].uiState, weapon, base, targets);
  $: profile = lancerItem ? findProfile() : null;
  $: ranges = lancerItem ? findRanges() : null;
  $: flatTotal = kind === "attack" ? base.grit + base.flatBonus : 0;

  $: accWeaponPlugins = Object.values(weapon.plugins).filter(plugin => plugin.category === "acc");
  $: diffWeaponPlugins = Object.values(weapon.plugins).filter(plugin => plugin.category === "diff");
  $: accTargetPlugins =
    targets.length === 1 ? Object.values(targets[0].plugins).filter(plugin => plugin.category === "acc") : [];
  $: diffTargetPlugins =
    targets.length === 1 ? Object.values(targets[0].plugins).filter(plugin => plugin.category === "diff") : [];

  $: console.log(targets);

  const dispatch = createEventDispatcher();
  let submitted = false;

  let rollerName = lancerActor ? ` -- ${lancerActor.token?.name || lancerActor.name}` : "";

  // Initialize engaged
  if (kind === "attack" && lancerItem && !isTech()) {
    let ranges: RangeType[] = [];
    if (
      lancerItem.is_pilot_weapon() ||
      (lancerItem.is_npc_feature() && lancerItem.system.type === NpcFeatureType.Weapon)
    ) {
      ranges = (lancerItem.system as SystemTemplates.NPC.WeaponData).range.map(r => r.type);
    } else if (lancerItem.is_mech_weapon()) {
      ranges = (lancerItem.system.active_profile?.range || []).map(r => r.type);
    }
    // If the weapon has any range type other than Threat or Thrown, it is affected by engaged.
    if (ranges.some(r => ![RangeType.Threat, RangeType.Thrown].includes(r))) {
      weapon.engaged = !!weapon.engagedStatus;
    }
  }

  function focus(el: HTMLElement) {
    el.focus();
  }

  function targetHoverIn(event: MouseEvent, target: LancerToken) {
    // Ignore target hovering after the form has been submitted, to avoid flickering when
    // the UI slides down.
    if (submitted) return;
    const thtModule = game.modules.get("terrain-height-tools");
    if (!thtModule?.active || foundry.utils.isNewerVersion("0.3.3", thtModule.version)) {
      // @ts-expect-error not supposed to use a private method
      target._onHoverIn(event);
    } else {
      drawLos(target);
    }
  }

  function targetHoverOut(event: MouseEvent, target: LancerToken) {
    const thtModule = game.modules.get("terrain-height-tools");
    if (!thtModule?.active || foundry.utils.isNewerVersion("0.3.3", thtModule.version)) {
      // @ts-expect-error not supposed to use a private method
      target._onHoverOut(event);
    } else {
      clearLos();
    }
  }

  function drawLos(target: Token) {
    const tokens = lancerActor?.getActiveTokens(true) ?? lancerItem?.actor?.getActiveTokens(true);
    const attacker = tokens?.shift();
    if (!attacker || attacker === target) return;
    terrainHeightTools!.drawLineOfSightRaysBetweenTokens(attacker, target);
  }

  function clearLos() {
    const thtModule = game.modules.get("terrain-height-tools");
    if (!thtModule?.active || foundry.utils.isNewerVersion("0.3.3", thtModule.version)) return;
    terrainHeightTools!.clearLineOfSightRays();
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

  function isAttack() {
    return kind === "attack";
  }

  function isTech() {
    if (!lancerItem) return title.toLowerCase() === "tech attack";
    if (lancerItem.is_mech_weapon()) return false;
    if (lancerItem.is_pilot_weapon()) return false;
    if (lancerItem.is_npc_feature() && lancerItem.system.type === NpcFeatureType.Weapon) return false;
    return true;
  }

  function gritLabel() {
    // This is a tech attack
    if (isTech()) {
      if (lancerItem?.is_npc_feature() && lancerItem.system.type === NpcFeatureType.Tech) {
        return "Tech Item Base";
      }
      return "Tech Attack";
    }
    // Not a tech attack and we have an item. Base the label on the item type.
    if (lancerItem) {
      if (lancerItem.is_mech_weapon() || lancerItem.is_pilot_weapon()) {
        return "Grit";
      }
      if (lancerItem.is_npc_feature() && lancerItem.system.type === NpcFeatureType.Weapon) {
        return "Weapon Base";
      }
    }
    // Not a tech attack and we have no item. Base the label on the actor type.
    if (lancerActor) {
      if (lancerActor.is_npc()) {
        return "Tier";
      }
      if (lancerActor.is_mech() || lancerActor.is_pilot() || lancerActor.is_deployable()) {
        return "Grit";
      }
    }
    // Default fallback
    return "Grit";
  }

  function flatSign(val: number) {
    if (val > 0) return "+";
    return "";
  }

  function findProfile() {
    return lancerItem?.currentProfile() ?? { range: [], damage: [] };
  }

  function findRanges() {
    return lancerItem?.rangesFor([RangeType.Blast, RangeType.Burst, RangeType.Cone, RangeType.Line]) ?? [];
  }

  // function findTalents(): CheckmarkAccuracyTalents[] {
  //   if (!lancerActor?.is_mech()) return [];

  //   let pilotTalents = lancerActor?.system.pilot?.value?.items.filter(i => i.is_talent()).map(talent => talent.name);
  //   console.log(pilotTalents);

  //   // @ts-expect-error not sure why but accJson is wrapped in .default
  //   let accCheckmarkTalents: CheckmarkAccuracyTalents[] = accJson.default;
  //   accCheckmarkTalents = accCheckmarkTalents.filter(accTalent => {
  //     return pilotTalents?.includes(accTalent.talentName);
  //   });

  //   return accCheckmarkTalents;
  // }

  function deployTemplate(range: WeaponRangeTemplate["range"]) {
    const creator = lancerItem?.parent;
    const token = (creator?.token?.object ?? creator?.getActiveTokens().shift() ?? undefined) as Token | undefined;
    const t = WeaponRangeTemplate.fromRange(range, token);
    if (!t) return;
    fade("out");
    t.document.updateSource({ [`flags.${game.system.id}.isAttack`]: true });
    t.placeTemplate()
      .catch(e => {
        console.warn(e);
        return;
      })
      .then(t => {
        if (t) targetsFromTemplate(t.id!);
        fade("in");
      });
  }
</script>

<form
  id="accdiff"
  class="lancer lancer-hud accdiff window-content"
  use:escToCancel
  on:submit|preventDefault={() => {
    submitted = true;
    dispatch("submit");
  }}
>
  {#if title != ""}
    <div class="lancer-header {isTech() ? 'lancer-tech' : 'lancer-weapon'} medium">
      {#if kind == "attack"}
        {#if isTech()}
          <i class="cci cci-tech-quick i--m i--light" />
        {:else}
          <i class="cci cci-weapon i--m i--light" />
        {/if}
      {:else if kind == "hase"}
        <i class="fas fa-dice-d20 i--m i--light" />
      {/if}
      <span>{title}{rollerName}</span>
    </div>
  {/if}
  {#if profile}
    <MiniProfile {profile} />
  {/if}
  <div id="{kind}-accdiff-dialog" style="padding:0.3em">
    <!-- Flat attack bonus -->
    {#if isAttack()}
      <label class="flexrow accdiff-weight lancer-border-primary" for="accdiff-flat-bonus"> Flat Modifier </label>
      <div class="accdiff-grid accdiff-flat-bonus">
        <div class="accdiff-other-grid">
          <span><b>{gritLabel()}:</b> {flatSign(base.grit)}{base.grit}</span>
        </div>
        <div class="accdiff-other-grid accdiff-flat-mod" style="position: relative;">
          <!-- <PlusMinusInput bind:value={base.flatBonus} id="accdiff-flat-mod" /> -->
          <input class="accdiff-flat-mod__input" type="number" bind:value={base.flatBonus} />
          <button class="accdiff-flat-mod__plus" type="button" on:click={() => (base.flatBonus = base.flatBonus + 1)}
            ><i class="fas fa-plus" /></button
          >
          <button class="accdiff-flat-mod__minus" type="button" on:click={() => (base.flatBonus = base.flatBonus - 1)}
            ><i class="fas fa-minus" /></button
          >
        </div>
        <div class="accdiff-other-grid">
          <span><b>Total:</b> {flatSign(flatTotal)}{flatTotal}</span>
        </div>
      </div>
    {/if}

    <div class="accdiff-grid accdiff-grid__section">
      <!-- Column Headers -->
      <div class="accdiff-grid__column">
        <h4 class="lancer-border-primary">
          <i class="cci cci-accuracy i--m" style="vertical-align:middle;border:none" />
          <strong>Accuracy</strong>
        </h4>
      </div>
      <div class="accdiff-grid__column">
        <h4 class="lancer-border-primary">
          <i class="cci cci-difficulty i--m" style="vertical-align:middle;border:none" />
          <strong>Difficulty</strong>
        </h4>
      </div>
    </div>

    <div class="accdiff-grid accdiff-grid__section">
      <!-- Accuracy column -->
      <div class="accdiff-grid__column">
        <HudCheckbox label="Accurate (+1)" bind:value={weapon.accurate} />
        {#if kind == "attack"}
          <HudCheckbox label="Seeking (*)" bind:value={weapon.seeking} />
          {#each accWeaponPlugins as plugin}
            <Plugin data={plugin} />
          {/each}
        {/if}
      </div>

      <!-- Difficulty column -->
      <div class="accdiff-grid__column">
        <HudCheckbox label="Inaccurate (-1)" bind:value={weapon.inaccurate} />
        <HudCheckbox label="Impaired (-1)" value={!!weapon.impaired} disabled />
        {#if kind == "attack" && !isTech()}
          <HudCheckbox label="Engaged (-1)" bind:value={weapon.engaged} />
          {#each diffWeaponPlugins as plugin}
            <Plugin data={plugin} />
          {/each}
        {/if}
      </div>
    </div>

    {#if kind == "attack" && (Object.values(weapon.plugins).length > 0 || targets.length == 1)}
      <div transition:slide class="accdiff-grid accdiff-grid__section" style="width:100%;">
        <!-- Target-related Accuracy -->
        <div class="accdiff-grid__column">
          {#if targets.length == 1}
            <HudCheckbox style="grid-area: prone;" label="Prone (+1)" bind:value={targets[0].prone} disabled />
            <HudCheckbox label="Stunned (EVA=5)" bind:value={targets[0].stunned} disabled />
            <HudCheckbox
              style="grid-area: lock-on;"
              label="Lock On (+1)"
              checked={!!targets[0].usingLockOn}
              bind:value={targets[0].consumeLockOn}
              disabled={!targets[0].lockOnAvailable}
            />
            {#each accTargetPlugins as plugin}
              <Plugin data={plugin} />
            {/each}
          {/if}
        </div>

        <!-- Target-related Difficulty -->
        <div class="accdiff-grid__column">
          {#each diffTargetPlugins as plugin}
            <Plugin data={plugin} />
          {/each}
          <!-- Cover -->
          {#if !isTech()}
            <div class="grid-enforcement">
              {#if targets.length == 0}
                <div transition:slide|local>
                  <Cover bind:cover={base.cover} class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
                </div>
              {:else if targets.length == 1}
                <div
                  transition:slide|local
                  on:mouseenter={ev => targetHoverIn(ev, targets[0].target)}
                  on:mouseleave={ev => targetHoverOut(ev, targets[0].target)}
                >
                  <Cover bind:cover={targets[0].cover} class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Talent Checkboxes -->
    {#if talents.talents.length != 0}
      <div class="accdiff-talent">
        <label class="flexrow accdiff-weight lancer-border-primary">Talents</label>

        <div transition:slide class="accdiff-grid accdiff-grid__section" style="width:100%;">
          <div class="accdiff-grid__column">
            {#each talents.talents as talent, idx}
              <!-- Odd -->
              {#if idx % 2 != 0}
                <HudCheckbox
                  label={`${talent.rankName} (${talent.acc_bonus.signedString()})`}
                  bind:value={talent.active}
                  tooltip={talent.description}
                />
              {/if}
            {/each}
          </div>
          <div class="accdiff-grid__column">
            {#each talents.talents as talent, idx}
              <!-- Even -->
              {#if idx % 2 == 0}
                <HudCheckbox
                  label={`${talent.rankName} (${talent.acc_bonus.signedString()})`}
                  bind:value={talent.active}
                  tooltip={talent.description}
                />
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Total accuracy / Targets -->
    <div class="flexcol accdiff-grid">
      <div class="flexrow accdiff-grid__section" style="justify-content: space-evenly;">
        <AccDiffInput bind:value={base.accuracy} id="accdiff-manual-adjust" />
      </div>
      {#if ranges && ranges.length > 0}
        <div class="accdiff-grid__section">
          <span class="accdiff-weight flex-center flexrow">Targeting</span>
          <div class="accdiff-ranges flexrow">
            {#each ranges as range}
              <button class="range-button" type="button" on:click={() => deployTemplate(range)}>
                <i class="cci cci-{range.type.toLowerCase()} i--m i--light" />
                {ranges.length && ranges.length < 3 ? range.type.toUpperCase() : ""}
                {range.val}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <div class="flexcol accdiff-footer lancer-border-primary">
      <div class="accdiff-total">
        {#if targets.length < 2}
          {#key targets.length}
            <div class="flexrow flex-center">
              <label transition:slide class="accdiff-weight total-label lancer-mini-header" for="total-display-0">
                🞂 <span
                  >Total
                  {#if targets.length > 0}
                    vs {targets[0].target.name}
                  {/if}</span
                > 🞀
              </label>
            </div>
          {/key}
        {/if}
        <div class="grid-enforcement">
          {#if targets.length == 0}
            <div class="flexrow flex-center accdiff-total">
              <Total target={base} id="total-display-0" />
            </div>
          {:else if targets.length == 1}
            <div
              class="flexrow flex-center accdiff-total"
              on:mouseenter={ev => targetHoverIn(ev, targets[0].target)}
              on:mouseleave={ev => targetHoverOut(ev, targets[0].target)}
            >
              <Total bind:target={targets[0]} id="total-display-0" onlyTarget={true} />
            </div>
          {:else}
            <div class="accdiff-weight accdiff-target-row">
              {#each targets as data, i (data.target.id)}
                <div
                  in:slide={{ delay: 100, duration: 300 }}
                  out:slide={{ duration: 100 }}
                  animate:flip={{ duration: 200 }}
                  class="flexcol card accdiff-target"
                  on:mouseenter={ev => targetHoverIn(ev, data.target)}
                  on:mouseleave={ev => targetHoverOut(ev, data.target)}
                >
                  <label class="target-name flexrow lancer-mini-header" for={data.target.id}>
                    🞂<span>{data.target.document.name}</span>🞀
                  </label>
                  <div class="accdiff-target-body">
                    <div class="flexrow accdiff-total">
                      <Total bind:target={data} id={`total-display-${i}`} />
                    </div>
                    <div class="flexrow">
                      <button
                        class="i--m no-grow accdiff-button"
                        type="button"
                        on:click={() => (data.accuracy = data.accuracy + 1)}
                      >
                        <i class="cci cci-accuracy i--m" style="border:none" />
                      </button>
                      <input style="display: none" type="number" bind:value={data.accuracy} min="0" />
                      {#if !isTech()}
                        <Cover
                          bind:cover={data.cover}
                          disabled={weapon.seeking}
                          class="accdiff-targeted-cover flexrow flex-center"
                          labelClass="i--s"
                        />
                      {:else}
                        <div />
                      {/if}
                      <input style="display: none" type="number" bind:value={data.difficulty} min="0" />
                      <button
                        class="i--m no-grow accdiff-button"
                        type="button"
                        on:click={() => (data.difficulty = data.difficulty + 1)}
                      >
                        <i class="cci cci-difficulty i--m" style="border:none" />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="dialog-buttons flexrow">
    <button
      class="lancer-button lancer-secondary dialog-button submit default"
      data-button="submit"
      type="submit"
      use:focus
    >
      <i class="fas fa-check" />
      Roll
    </button>
    <button
      class="dialog-button cancel"
      data-button="cancel"
      type="button"
      on:click={() => {
        submitted = true;
        dispatch("cancel");
      }}
    >
      <i class="fas fa-times" />
      Cancel
    </button>
  </div>
</form>

<style lang="scss">
  #accdiff :global(.accdiff-grid) {
    display: flex;
    justify-content: space-between;
  }

  .accdiff-flat-bonus {
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--primary-color);
  }

  .accdiff-flat-mod {
    // text-align: center;
    width: 100%;
    height: 1.8em;
    border: 1px solid var(--color-border-light-tertiary);
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.05);
    padding: 0;
    display: flex;
    flex-direction: row;

    & .accdiff-flat-mod__input {
      flex-grow: 2;
      height: 1.35em;
      border: none;
      background: transparent;
      text-align: center;
      padding: 0;
      margin: 0;
      color: var(--color-text-dark-primary);
    }
  }

  .accdiff-flat-mod__plus,
  .accdiff-flat-mod__minus {
    // position: absolute;
    width: 1.75em;
    height: 1.35em;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.15em;
    margin-bottom: 0.1em;

    & i {
      margin: 0;
    }
  }

  .accdiff-other-grid {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    & + .accdiff-other-grid {
      margin-left: 0.5em;
    }
  }
  :global(.accdiff-weight) {
    justify-content: center;
    font-weight: bold;
  }
  .accdiff-footer {
    padding-top: 0.3em;
    padding-bottom: 0.3em;
    border-top-width: 1px;
    border-top-style: solid;
  }

  .accdiff-grid {
    h4 {
      border: none;
      margin-bottom: 0;
    }

    &__section {
      padding: 0.3em 0;
      border-top: 1px solid var(--primary-color);
    }

    &__column {
      width: 100%;
      min-width: 160px;
      padding-left: 1em;

      &:has(.container) {
        // Indent checkbox containers slightly more
        padding-left: 1.3em;
      }

      &:has(+ .accdiff-grid__column) {
        border-right: 1px dashed var(--primary-color);
      }
    }
  }

  .accdiff-grid :global(.accdiff-base-cover) {
    margin-top: 0.5em;
    font-size: 0.85em;
    cursor: pointer;
  }
  .accdiff-grid :global(.accdiff-base-cover i) {
    vertical-align: middle;
  }

  .accdiff-grid :global(.accdiff-base-cover span) {
    vertical-align: middle;
  }

  .accdiff-footer :global(.accdiff-targeted-cover span) {
    opacity: 0;
    position: fixed;
    width: 0;
    visibility: hidden;
  }
  .accdiff-footer :global(.accdiff-targeted-cover i) {
    font-size: 16px;
    vertical-align: top;
  }

  .accdiff-ranges {
    justify-content: space-evenly;
    .range-button {
      cursor: pointer;
      box-shadow: var(--button-shadow);
      border: none;
      flex: 1 0;
      margin-left: 0.25em;
      margin-right: 0.25em;
      margin-top: 0.25em;
      margin-bottom: 0.25em;
      padding: 0;
      max-width: 10em;
      background-color: var(--primary-color);
      color: var(--light-text);

      &:hover,
      &:focus {
        box-shadow: var(--button-shadow);
      }
      &:hover {
        background-color: var(--secondary-color);
      }
      &:active {
        transform: translateX(2px) translateY(2px);
        box-shadow: -1px -1px 1px 0.6px rgba(0, 0, 0, 0.7);
      }
      & i {
        margin: 2px;
        padding: 0;
      }
    }
  }

  /* there's a very specific EMU rule that adds some margin here
     because it assumes all icons in buttons are followed by text, I think */
  #accdiff .accdiff-target-row button > i,
  #accdiff .mech-weapon button > i {
    margin-inline-end: 0;
  }

  .accdiff-target-row {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-row-gap: 1em;
    max-height: 320px;
    overflow-y: scroll;
  }

  .accdiff-target {
    box-shadow: 1px 1px 2px;
    max-width: 12em;

    .target-name {
      justify-content: center;
      padding: 0em 0.2em;
    }

    .accdiff-target-body {
      padding: 0.2em;
    }
  }

  .accdiff-total {
    flex-wrap: nowrap;
    padding: 0.3em 0.7em 0.3em 0.7em;
  }

  .total-label {
    white-space: nowrap;
    min-width: 16em;
    max-width: 16em;
    width: 16em;
    padding: 0 0.2em;
    justify-self: center;
    text-align: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    span {
      text-wrap: wrap;
    }
  }

  #accdiff button {
    transition: 100ms cubic-bezier(0.075, 0.82, 0.165, 1);
  }

  .accdiff-target-row {
    .accdiff-button {
      cursor: pointer;
      align-items: center;
      display: inline-flex;
      justify-content: center;
      margin: 0;
    }
  }

  #accdiff .lancer-weapon {
    span {
      margin-right: 1em;
      margin-left: 1em;
    }
  }

  .accdiff-talent {
    border-top: 2px solid var(--primary-color);
  }
</style>
