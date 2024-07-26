<svelte:options accessors={true} />

<script lang="ts">
  import type SvelteComponent from "*.svelte";

  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import { createEventDispatcher } from "svelte";

  import { sidebarWidth } from "./sidebar-width";
  import { isDragging } from "./is-dragging";
  import { userTargets } from "./user-targets";
  import AccDiffForm from "../acc_diff/AccDiffHUD.svelte";
  import DamageForm from "../damage/DamageHUD.svelte";
  import StructStressForm from "../struct_stress/Form.svelte";

  let dispatch = createEventDispatcher();

  let dialogs: { [key: string]: typeof SvelteComponent } = {
    hase: AccDiffForm,
    attack: AccDiffForm,
    damage: DamageForm,
    struct: StructStressForm,
    stress: StructStressForm,
  };

  // @hmr:keep
  let huds: {
    [key: string]: {
      open: number | null; // Time of opening, if applicable
      data?: any;
    };
  } = {
    hase: { open: null },
    attack: { open: null },
    damage: { open: null },
    struct: { open: null },
    stress: { open: null },
  };

  // this indirection means that only actual changes to huds.attack.data trigger the following update
  $: attackData = huds.attack.data;
  $: {
    if (attackData) {
      attackData.replaceTargets($userTargets);
      attackData = attackData;
    }
  }

  $: damageData = huds.damage.data;
  $: {
    if (damageData) {
      damageData.replaceTargets($userTargets);
      damageData = damageData;
    }
  }

  export function open(key: string, data: any) {
    dispatch(`${key}.cancel`); // Re-opening closes the previous instance of this hud
    huds[key].open = new Date().getTime();
    huds[key].data = data;
  }

  export function close(key: string) {
    dispatch(`${key}.cancel`);
    huds[key].open = null;
    huds[key].data = null;
  }

  export function refresh(key: string, data: any) {
    huds[key].data = data;
  }

  export function data(key: string) {
    if (huds[key] && huds[key].data) {
      return huds[key].data;
    }
  }

  export function isOpen(key: string): boolean {
    return (huds[key] && huds[key].open) !== null;
  }

  export let faded: boolean = false;
  export function fade(dir: "in" | "out") {
    faded = dir == "out";
  }

  export let components: { [key: string]: SvelteComponent } = {};

  function forward(key: string, event: string, data?: any | undefined) {
    dispatch(`${key}.${event}`, data ? data : undefined);
    // no matter why we get an event from a child, we should close it, it's _done_
    huds[key].open = null;
    huds[key].data = null;
  }

  $: visibleHudsKeys = Object.keys(huds)
    .filter(key => huds[key].open)
    .sort((a, b) => huds[b].open! - huds[a].open!);
</script>

<div id="hudzone" class="window-app" class:faded={faded || $isDragging} style="bottom: 0; right: {$sidebarWidth}px">
  {#each visibleHudsKeys as key (key + huds[key].data.title)}
    <div class="component grid-enforcement" animate:flip transition:slide>
      <svelte:component
        this={dialogs[key]}
        bind:this={components[key]}
        kind={key}
        {...huds[key].data}
        on:submit={() => forward(key, "submit", huds[key].data)}
        on:cancel={() => forward(key, "cancel")}
      />
    </div>
  {/each}
</div>

<style>
  #hudzone {
    position: absolute;
    display: flex;
    align-items: flex-end;
    background-color: transparent;
    border: none;
    box-shadow: none;
    flex-direction: row-reverse;
    pointer-events: none;
    transition: right 600ms, opacity 200ms;
    z-index: 999;
  }

  #hudzone > .component {
    padding-right: 12px;
    pointer-events: initial;
    flex: unset;
    filter: drop-shadow(0.4rem 0.4rem 0.6rem #333);
  }

  #hudzone.faded {
    opacity: 0.2;
  }

  #hudzone.faded > .component {
    pointer-events: unset;
  }
</style>
