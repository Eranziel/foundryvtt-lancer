<svelte:options accessors={true} />

<script lang="ts">
  import { LANCER } from "../../config";
  const lp = LANCER.log_prefix;
  console.log(`${lp} LCP Manager 2.0 mounted`);
</script>

<div class="flexcol">
  <h1>LCP Manager</h1>
  <div id="massif-data">
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div>4</div>
    <div>5</div>
  </div>
</div>

<style>
  #massif-data {
    display: grid;
    grid-template-columns: 3em 3fr 1fr 3em 1fr;
    grid-gap: 1em;
  }
</style>
