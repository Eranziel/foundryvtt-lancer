<svelte:options accessors={true} />

<script lang="ts">
  import type { AccDiffHudWeapon, AccDiffHudBase, AccDiffHudTarget } from "./index";

  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { createEventDispatcher } from "svelte";

  import Plugin from "./Plugin.svelte";
  import Cover from "./Cover.svelte";
  import ConsumeLockOn from "./ConsumeLockOn.svelte";
  import Total from "./TotalAccuracy.svelte";
  import PlusMinusInput from "./PlusMinusInput.svelte";
  import MiniProfile from "../components/MiniProfile.svelte";
  import { fade } from "../slidinghud";

  import type { LancerItem } from "../../item/lancer-item";
  import { NpcFeatureType, RangeType } from "../../enums";
  import { WeaponRangeTemplate } from "../../pixi/weapon-range-template";
  import { targetsFromTemplate } from "../../flows/_template";
  import type { LancerActor } from "../../actor/lancer-actor";
  import HudCheckbox from "../components/HudCheckbox.svelte";
  import { LancerToken } from "../../token";

  export let weapon: AccDiffHudWeapon;
  export let base: AccDiffHudBase;
  export let targets: AccDiffHudTarget[];
  export let title: string;
  export let lancerItem: LancerItem | null;
  export let lancerActor: LancerActor | null;

  export let kind: "hase" | "attack";

  // tell svelte of externally computed dependency arrows
  // @ts-expect-error i.e., base depends on weapon
  $: base = (weapon, base);
  // @ts-expect-error i.e., targets depend on weapon and base
  $: targets = (weapon, base, targets);
  $: profile = lancerItem ? findProfile() : null;
  $: ranges = lancerItem ? findRanges() : null;

  const dispatch = createEventDispatcher();
  let submitted = false;

  function focus(el: HTMLElement) {
    el.focus();
  }

  function targetHoverIn(event: MouseEvent, target: LancerToken) {
    // Ignore target hovering after the form has been submitted, to avoid flickering when
    // the UI slides down.
    if (submitted) return;
    // @ts-expect-error Infinite recursion?
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

  function gritSign() {
    console.log(typeof base.grit);
    if (base.grit > 0) return "+";
    return "";
  }

  function findProfile() {
    return lancerItem?.currentProfile() ?? { range: [], damage: [] };
  }

  function findRanges() {
    return lancerItem?.rangesFor([RangeType.Blast, RangeType.Burst, RangeType.Cone, RangeType.Line]) ?? [];
  }

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
      <span>{title}</span>
    </div>
  {/if}
  {#if profile}
    <MiniProfile {profile} />
  {/if}
  <div id="{kind}-accdiff-dialog" style="padding:4px">
    <div class="accdiff-grid">
      <div
        class="lancer-border-primary"
        style="width:100%;padding:4px;border-right-width: 1px;border-right-style: dashed;min-width:180px"
      >
        <h3 class="lancer-border-primary">
          <i class="cci cci-accuracy i--m" style="vertical-align:middle;border:none" />
          Accuracy
        </h3>
        <HudCheckbox label="Accurate (+1)" bind:value={weapon.accurate} />
        {#if kind == "attack"}
          <HudCheckbox label="Seeking (*)" bind:value={weapon.seeking} />
        {/if}
        {#if kind == "attack" && (Object.values(weapon.plugins).length > 0 || targets.length == 1)}
          <div transition:slide>
            <h3
              class="lancer-border-primary"
              style="border-top-width: 1px;border-top-style: dashed; padding-right: 4px; padding-top: 16px; margin-top: 16px;"
            >
              <i class="cci cci-reticule i--m" style="vertical-align:middle;border:none" />
              &nbsp;Misc
            </h3>
            {#each Object.keys(weapon.plugins) as key}
              <Plugin data={weapon.plugins[key]} />
            {/each}
            {#if targets.length == 1}
              <label class="container" for="base-consume-lockon">
                <ConsumeLockOn bind:lockOn={targets[0]} id="base-consume-lockon" />
                Consume Lock On (+1)
              </label>
              {#each Object.keys(targets[0].plugins) as key}
                <Plugin data={targets[0].plugins[key]} />
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      <div style="width:100%;padding:4px;min-width:180px">
        <h3 class="lancer-border-primary">
          <i class="cci cci-difficulty i--m" style="vertical-align:middle;border:none" />
          Difficulty
        </h3>
        <HudCheckbox label="Inaccurate (-1)" bind:value={weapon.inaccurate} />
        <HudCheckbox label="Impaired (-1)" value={!!weapon.impaired} disabled />
        {#if kind == "attack"}
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
    <label class="flexrow accdiff-footer accdiff-weight lancer-border-primary" for="accdiff-other-sources">
      Other Sources
    </label>
    <div id="accdiff-other-sources" class="accdiff-grid">
      <div class="accdiff-other-grid lancer-border-primary" style="border-right-width: 1px;border-right-style: dashed;">
        <PlusMinusInput bind:value={base.accuracy} id="accdiff-other-acc" />
      </div>
      <div class="accdiff-other-grid">
        <PlusMinusInput bind:value={base.difficulty} id="accdiff-other-diff" />
      </div>
    </div>
    {#if isAttack()}
      <label class="flexrow accdiff-footer accdiff-weight lancer-border-primary" for="accdiff-flat-bonus">
        Flat Modifier
      </label>
      <div id="accdiff-flat-bonus" class="accdiff-grid">
        <div class="accdiff-other-grid lancer-border-primary">
          <span><b>{gritLabel()}:</b> {gritSign()}{base.grit}</span>
        </div>
        <div class="accdiff-other-grid">
          <PlusMinusInput bind:value={base.flatBonus} id="accdiff-flat-mod" />
        </div>
      </div>
    {/if}
    <div class="flex-col accdiff-footer lancer-border-primary">
      {#if ranges && ranges.length > 0}
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
      {/if}
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
                        class="i--m no-grow accdiff-button lancer-dark-gray"
                        type="button"
                        on:click={() => (data.accuracy = data.accuracy + 1)}
                      >
                        <i class="cci cci-accuracy i--m" style="border:none" />
                      </button>
                      <input style="display: none" type="number" bind:value={data.accuracy} min="0" />
                      <Cover
                        bind:cover={data.cover}
                        disabled={weapon.seeking}
                        class="accdiff-targeted-cover flexrow flex-center"
                        labelClass="i--s"
                      />
                      <input style="display: none" type="number" bind:value={data.difficulty} min="0" />
                      <button
                        class="i--m no-grow accdiff-button lancer-dark-gray"
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
    <button class="dialog-button submit default" data-button="submit" type="submit" use:focus>
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
  :global(.accdiff-grid) {
    display: flex;
    justify-content: space-between;
  }

  #accdiff :global(.container) {
    display: flex;
    position: relative;
    // padding-left: 30px;
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.9em;
    user-select: none;
    align-items: center;
    cursor: pointer;
  }

  #accdiff :global(.container:has(input[disabled])) {
    cursor: unset;
    opacity: 0.5;
  }

  .accdiff-other-grid {
    width: 100%;
    padding-left: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  :global(.accdiff-weight) {
    justify-content: center;
    font-weight: bold;
  }
  .accdiff-footer {
    padding-top: 8px;
    padding-bottom: 4px;
    margin-top: 12px;
    border-top-width: 1px;
    border-top-style: solid;
  }

  .accdiff-grid :global(.accdiff-base-cover) {
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.85em;
    padding-left: 10px;
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
    grid-row-gap: 12px;
    max-height: 320px;
    overflow-y: scroll;
  }

  .accdiff-target {
    box-shadow: 1px 1px 2px;
    max-width: 12em;

    .target-name {
      justify-content: center;
      padding: 0px 0.2em;
    }

    .accdiff-target-body {
      padding: 0.2em;
    }
  }

  .accdiff-total {
    flex-wrap: nowrap;
    padding: 4px 10px 4px 10px;
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
      border: none;
      background-color: var(--dark-gray-color);
      &:hover i,
      &:active i {
        text-shadow: 0px 0px 8px var(--color-shadow-primary);
      }
      &:active {
        transform: translateX(2px) translateY(2px);
        box-shadow: -1px -1px 1px var(--primary-color);
      }
    }
  }

  #accdiff .lancer-weapon {
    span {
      margin-right: 1em;
      margin-left: 1em;
    }
  }
</style>
