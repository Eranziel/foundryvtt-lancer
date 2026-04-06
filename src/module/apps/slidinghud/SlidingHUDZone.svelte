<script lang="ts">
  import type SvelteComponent from "*.svelte";

  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import { createEventDispatcher } from "svelte";

  import { sidebarWidth } from "./sidebar-width";
  import { isDragging } from "./is-dragging";
  import AccDiffHud from "../acc_diff/AccDiffHUD.svelte";
  import DamageHud from "../damage/DamageHUD.svelte";
  import StructStressHud from "../struct_stress/StructStressHUD.svelte";

  let {
    faded,
  }: {
    faded: boolean;
  } = $props();

  let dispatch = createEventDispatcher();

  let dialogs: { [key: string]: typeof SvelteComponent } = $state({
    hase: AccDiffHud,
    attack: AccDiffHud,
    damage: DamageHud,
    struct: StructStressHud,
    stress: StructStressHud,
  });

  // @hmr:keep
  let huds: {
    [key: string]: {
      open: number | null; // Time of opening, if applicable
      data?: any;
    };
  } = $state({
    hase: { open: null },
    attack: { open: null },
    damage: { open: null },
    struct: { open: null },
    stress: { open: null },
  });

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

  export function fade(dir: "in" | "out") {
    faded = dir == "out";
  }

  function forward(key: string, event: string, data?: any | undefined) {
    dispatch(`${key}.${event}`, data ? data : undefined);
    // no matter why we get an event from a child, we should close it, it's _done_
    huds[key].open = null;
    huds[key].data = null;
  }

  const visibleHudsKeys = $derived(
    Object.keys(huds)
      .filter(key => huds[key].open)
      .sort((a, b) => huds[b].open! - huds[a].open!)
  );
</script>

<div
  id="hudzone"
  class="lancer-hud-zone"
  class:faded={faded || $isDragging}
  style="bottom: 0; right: {$sidebarWidth}px"
>
  {#each visibleHudsKeys as key (key + huds[key].data.title)}
    {@const Dialog = dialogs[key]}
    <div class="component grid-enforcement" animate:flip transition:slide|global>
      <Dialog
        kind={key}
        // {...huds[key].data}
        data={huds[key].data}
        on:submit={() => forward(key, "submit", huds[key].data)}
        on:cancel={() => forward(key, "cancel")}
      />
    </div>
  {/each}
</div>

<style>
  @layer lancer {
    @layer applications {
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
    }
  }
</style>
