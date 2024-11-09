<script lang="ts">
  export let lockOn: {
    consumeLockOn: boolean;
    usingLockOn: any | null;
    lockOnAvailable: any | null;
  };
  export let visible: boolean = true;
  export let id: string = "";

  function handleClick(e: { currentTarget: HTMLInputElement }) {
    lockOn.consumeLockOn = e.currentTarget.checked;
  }
</script>

<input
  type="checkbox"
  class:invisible={!visible}
  {id}
  checked={!!lockOn.usingLockOn}
  on:input={handleClick}
  disabled={!lockOn.lockOnAvailable}
/>

<style>
  input.invisible {
    display: none;
    opacity: 0;
    position: absolute;
    width: 0;
  }
</style>
