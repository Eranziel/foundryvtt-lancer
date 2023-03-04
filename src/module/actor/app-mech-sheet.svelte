<script lang="ts">
   import { scale }                 from 'svelte/transition';
   import { TJSApplicationShell }   from '@typhonjs-fvtt/runtime/svelte/component/core';
   export let elementRoot = void 0;

   function clicker() {
      alert("Foo");
   }

</script>

<svelte:options accessors={true}/>

<TJSApplicationShell bind:elementRoot transition={scale} transitionOptions={{duration: 1000}}>
   <main>
      <h1>New Mech Sheet</h1>
      <section>
      <button on:click={clicker}>Hello</button>
      </section>
   </main>
</TJSApplicationShell>

<style lang="scss">
   main {
      text-align: center;
      display: flex;
      flex-direction: column;
      h1 {
         color: #ff3e00;
         text-transform: uppercase;
         font-size: 1.0em;
         font-weight: 80;
      }
   }
</style>