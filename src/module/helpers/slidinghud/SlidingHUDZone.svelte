<svelte:options accessors={true} />

<script lang="ts">
 import type SvelteComponent from "*.svelte";

 import { flip } from 'svelte/animate';
 import { slide } from 'svelte/transition';
 import { createEventDispatcher } from 'svelte';

 import { sidebarWidth } from './sidebar-width';
 import AccDiffForm from '../acc_diff/Form.svelte';

 let dispatch = createEventDispatcher();

 let dialogs: { [key: string]: typeof SvelteComponent } = {
   hase: AccDiffForm,
   attack: AccDiffForm,
 }

 // @hmr:keep
 let huds: {
   [key: string]: {
     open: number | null,
     data?: any,
   }
 } = {
   hase: { open: null },
   attack: { open: null }
 };

 export function open(key: string, data: any) {
   dispatch(`${key}.cancel`);
   huds[key].open = (new Date()).getTime();
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
   if (huds[key] && huds[key].data) { return huds[key].data; }
 }

 export function isOpen(key: string) {
   return huds[key] && huds[key].open;
 }

 export let components: { [key: string]: SvelteComponent } = {};

 function forward(key: string, event: string, data?: any | undefined) {
   dispatch(`${key}.${event}`, data ? data : undefined);
   // no matter why we get an event from a child, we should close it, it's _done_
   huds[key].open = null;
   huds[key].data = null;
 }

 $: visibleHudsKeys =
   Object.keys(huds).filter(key => huds[key].open).sort((a,b) => huds[b].open! - huds[a].open!);
</script>

<div id="hudzone" class="window-app" style="bottom: 0; right: {$sidebarWidth}px">
  {#each visibleHudsKeys as key (key)}
    <div class="component grid-enforcement" transition:slide animate:flip>
      <svelte:component
        this={dialogs[key]}
        bind:this={components[key]}
        kind={key}
        {...huds[key].data}
        redrawItem={huds[key].data.title}
        on:submit={() => forward(key, "submit", huds[key].data)}
        on:cancel={() =>  forward(key, "cancel")}
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
     transition: right 600ms;
 }

 #hudzone > .component {
     padding-right: 10px;
     pointer-events: initial;
     flex: unset;
 }
</style>
