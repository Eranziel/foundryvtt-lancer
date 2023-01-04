<svelte:options accessors={true} />

<script lang="ts">
 import type { AccDiffWeapon, AccDiffBase, AccDiffTarget } from './index';

 import { slide } from 'svelte/transition';
 import { flip } from 'svelte/animate';
 import { createEventDispatcher } from 'svelte';

 import Plugin from './Plugin.svelte';
 import Cover from './Cover.svelte';
 import ConsumeLockOn from './ConsumeLockOn.svelte';
 import Total from './Total.svelte';
 import PlusMinusInput from './PlusMinusInput.svelte';
 import type { LancerItem } from '../../item/lancer-item';
 import { RangeType } from 'machine-mind';
 import { WeaponRangeTemplate } from '../../pixi/weapon-range-template';
 import { fade } from '../slidinghud';
 import { targetsFromTemplate } from '../../macros';

 export let weapon: AccDiffWeapon;
 export let base: AccDiffBase;
 export let targets: AccDiffTarget[];
 export let title: string;
 export let lancerItem: LancerItem | null;

 export let kind: "hase" | "attack";

 // tell svelte of externally computed dependency arrows
 // @ts-ignore i.e., base depends on weapon
 $: base = (weapon, base);
 // @ts-ignore i.e., targets depend on weapon and base
 $: targets = (weapon, base, targets);

 const dispatch = createEventDispatcher();

 function focus(el: HTMLElement) { el.focus(); }

 function escToCancel(_el: HTMLElement) {
   function escHandler(ev: KeyboardEvent) {
     if (ev.key === 'Escape') {
       ev.preventDefault();
       dispatch('cancel');
     }
   }

   window.addEventListener('keydown', escHandler);
   return { destroy() { window.removeEventListener('keydown', escHandler); } }
 }

 function findRanges() {
   return lancerItem?.rangesFor([
     RangeType.Blast,
     RangeType.Burst,
     RangeType.Cone,
     RangeType.Line,
   ]) ?? [];
 }

 function deployTemplate(range: WeaponRangeTemplate['range']) {
   const creator = lancerItem?.parent;
   const token = (
     creator?.token?.object ??
     creator?.getActiveTokens().shift() ??
     undefined
   ) as Token | undefined;
   const t = WeaponRangeTemplate.fromRange(range, token);
   if (!t) return;
   fade('out');
   // @ts-expect-error v10
   t.document.updateSource({ [`flags.${game.system.id}.isAttack`]: true });
   t.placeTemplate()
     .catch(e => {
       console.warn(e);
       return;
     })
     .then(t => {
       if (t) targetsFromTemplate(t.id!);
       fade('in');
     });
 }
</script>

<form id="accdiff" class="accdiff window-content" use:escToCancel
  on:submit|preventDefault={() => dispatch('submit')}>
  {#if title != ''}
    <div class="lancer-header mech-weapon medium">
      {#if kind == "attack"}
        <i class="cci cci-weapon i--m i--light"></i>
        {#if lancerItem}
          {#each findRanges() as range}
            <button
              class="range-button"
              type="button"
              on:click={() => deployTemplate(range)}
            >
              <i class="cci cci-{range.type.toLowerCase()} i--m i--light"></i>
            </button>
          {/each}
        {/if}
      {:else if kind == "hase"}
        <i class="fas fa-dice-d20 i--m i--light"></i>
      {/if}
      <span>{title}</span>
    </div>
  {/if}
  <div id="{kind}-accdiff-dialog" style="padding:4px">
    <div class="accdiff-grid">
      <div style="width:100%;padding:4px;border-right: 1px dashed #782e22;min-width:180px">
        <h3>
          <i class="cci cci-accuracy i--m i--dark" style="vertical-align:middle;border:none"></i>
          Accuracy
        </h3>
        <label class="container">
          Accurate (+1)
          <input type="checkbox" bind:checked={weapon.accurate} />
          <span class="checkmark"></span>
        </label>
        {#if kind == "attack"}
          <label class="container">
            Seeking (*)
            <input type="checkbox" bind:checked={weapon.seeking} />
            <span class="checkmark"></span>
          </label>
        {/if}
        {#if kind == "attack" && (Object.values(weapon.plugins).length > 0 || targets.length == 1)}
          <div transition:slide>
            <h3 style="border-top: 1px dashed #782e22; padding-right: 4px; padding-top: 16px; margin-top: 16px;">
              <i class="cci cci-reticule i--m i--dark" style="vertical-align:middle;border:none"></i>
              &nbsp;Misc
            </h3>
            {#each Object.keys(weapon.plugins) as key}
              <Plugin data={weapon.plugins[key]} />
            {/each}
            {#if targets.length == 1}
              <label class="container" for="base-consume-lockon">
                Consume Lock On (+1)
                <ConsumeLockOn bind:lockOn={targets[0]} id="base-consume-lockon" />
                <span class="checkmark"></span>
              </label>
              {#each Object.keys(targets[0].plugins) as key}
                <Plugin data={targets[0].plugins[key]} />
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      <div style="width:100%;padding:4px;min-width:180px">
        <h3>
          <i class="cci cci-difficulty i--m i--dark" style="vertical-align:middle;border:none"></i>
          Difficulty
        </h3>
        <label class="container">
          Inaccurate (-1)
          <input type="checkbox" bind:checked={weapon.inaccurate} />
          <span class="checkmark"></span>
        </label>
        <label class="container">
          Impaired (-1)
          <input type="checkbox" checked={!!weapon.impaired} disabled />
          <span class="checkmark"></span>
        </label>
        {#if kind == "attack"}
          <div class="grid-enforcement">
            {#if targets.length == 0}
              <div transition:slide|local>
                <Cover bind:cover={base.cover}
                       class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
              </div>
            {:else if targets.length == 1}
              <div transition:slide|local>
                <Cover bind:cover={targets[0].cover}
                       class="accdiff-base-cover flexcol" disabled={weapon.seeking} />
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <label class="flexrow accdiff-footer accdiff-weight" for="accdiff-other-sources">
      Other Sources
    </label>
    <div id="accdiff-other-sources" class="accdiff-grid">
      <div class="accdiff-other-grid" style="border-right: 1px dashed #782e22;">
        <PlusMinusInput bind:value={base.accuracy} id="accdiff-other-acc" />
      </div>
      <div class="accdiff-other-grid">
        <PlusMinusInput bind:value={base.difficulty} id="accdiff-other-diff" />
      </div>
    </div>
    <div class="grid-enforcement accdiff-footer">
      <div class="accdiff-total">
        {#if targets.length < 2}
          {#key targets.length}
            <label transition:slide
              class="accdiff-weight flex-center flexrow total-label" for="total-display-0">
              Total
              {#if targets.length > 0}
                vs {targets[0].target.name}
              {/if}
            </label>
          {/key}
        {/if}
        <div class="grid-enforcement">
          {#if targets.length == 0}
            <div
              class="flexrow flex-center accdiff-total">
              <Total target={base} id="total-display-0" />
            </div>
          {:else if targets.length == 1}
            <div
              class="flexrow flex-center accdiff-total">
              <Total bind:target={targets[0]} id="total-display-0" onlyTarget={true}/>
            </div>
          {:else}
            <div class="accdiff-weight accdiff-target-row">
              {#each targets as data, i (data.target.id)}
                <div
                  in:slide={{delay:100, duration:300}} out:slide={{duration: 100}}
                  animate:flip={{duration: 200}}
                  class="flexcol card accdiff-target">
                  <label class="flexrow flex-center card card-title" for={data.target.id}>
                    {data.target.document.name}
                  </label>
                  <div class="flexrow accdiff-total">
                    <Total bind:target={data} id={`total-display-${i}`} />
                  </div>
                  <div class="flexrow">
                    <button
                      class="i--m no-grow accdiff-button"
                      type="button"
                      on:click={() => data.accuracy = data.accuracy + 1}
                    >
                      <i class="cci cci-accuracy i--m" style="border:none"></i>
                    </button>
                    <input
                      style="display: none"
                      type="number"
                      bind:value={data.accuracy}
                      min="0"
                    />
                    <Cover bind:cover={data.cover} disabled={weapon.seeking}
                      class="accdiff-targeted-cover flexrow flex-center" labelClass="i--s" />
                    <input
                      style="display: none"
                      type="number"
                      bind:value={data.difficulty}
                      min="0"
                    />
                    <button
                      class="i--m no-grow accdiff-button"
                      type="button"
                      on:click={() => data.difficulty = data.difficulty + 1}
                    >
                      <i class="cci cci-difficulty i--m" style="border:none"></i>
                    </button>
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
      <i class="fas fa-check"></i>
      Roll
    </button>
    <button class="dialog-button cancel"
      data-button="cancel" type="button" on:click={() => dispatch('cancel')}>
      <i class="fas fa-times"></i>
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
    padding-left: 30px;
    margin-top: 12px;
    margin-bottom: 4px;
    font-size: 0.9em;
    user-select: none;
    align-items: center;
  }

  /* Hide the browser's default checkbox */
  #accdiff :global(.container input) {
    position: absolute;
    opacity: 0 !important;
    height: 0;
    width: 0;
  }

  #accdiff :global(.checkmark) {
    position: absolute;
    left: 5px;
    height: 20px;
    width: 20px;
    background-color: #a9a9a9;
    cursor: pointer;
  }

  #accdiff :global(input[disabled] ~ .checkmark) {
    opacity: 0.5;
    cursor: unset;
  }

  #accdiff :global(.container:hover input:not([disabled]) ~ .checkmark) {
    background-color: #757575;
  }

  #accdiff :global(.container input:checked ~ .checkmark) {
    background-color: var(--main-theme-color, fuchsia);
  }

  #accdiff :global(.checkmark:after) {
    content: "";
    position: absolute;
    display: none;
  }
  #accdiff :global(.container input:checked ~ .checkmark:after) {
    display: block;
  }

  .accdiff-other-grid {
    width: 100%;
    padding-left: 5px;
    display: flex;
    justify-content: center;
  }
  :global(.accdiff-weight) {
    justify-content: center;
    font-weight: bold;
  }
  .accdiff-footer {
    padding-top: 8px;
    padding-bottom: 4px;
    margin-top: 12px;
    border-top: 1px solid #782e22;
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

  /* there's a very specific EMU rule that adds some margin here
     because it assumes all icons in buttons are followed by text, I think */
  #accdiff .accdiff-target-row button > i, #accdiff .mech-weapon button > i {
    margin-inline-end: 0;
  }

  .accdiff-target-row {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-row-gap: 12px;
  }

  .accdiff-target {
    padding: 5px;
    box-shadow: 1px 1px 2px;
  }

  .accdiff-total  {
    flex-wrap: nowrap;
    padding: 4px 10px 4px 10px;
  }

  .total-label {
    white-space: nowrap;
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
      box-shadow: 1px 1px 1px var(--main-theme-color);
      &:hover, &:focus {
        box-shadow: 1px 1px 1px var(--main-theme-color);
      }
      &:hover {
        background-color: var(--main-theme-text);
      }
      &:active {
        transform: translateX(2px) translateY(2px);
        box-shadow: -1px -1px 1px var(--main-theme-color);
      }
      & i {
        text-shadow: none;
        color: rgba(var(--color-text-lightest), 1);
      }
    }
  }

  .accdiff-target-row .card-title {
    background-color: #00000000;
  }

  #accdiff .mech-weapon {
    span {
      margin-right: 1em;
      margin-left: 1em;
    }
    .range-button {
      cursor: pointer;
      box-shadow: 1px 1px 1px 0.6px rgba(0, 0, 0, 0.7);
      border: none;
      text-align: left;
      flex: 0 0;
      margin-left: 8px;
      margin-right: 0px;
      margin-top: 5px;
      margin-bottom: 7px;
      padding: 0;
      background-color: var(--main-theme-color);
      &:hover, &:focus {
        box-shadow: 1px 1px 1px 0.6px rgba(0, 0, 0, 0.7);
      }
      &:hover {
        background-color: var(--protocol-color);
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
</style>
