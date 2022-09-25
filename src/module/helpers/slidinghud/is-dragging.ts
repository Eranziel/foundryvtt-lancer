import { derived, readable } from "svelte/store";

export const dataTransfer = readable(null as DataTransfer | null, update => {
  function updateData(e: DragEvent) {
    update(e.defaultPrevented ? null : e.dataTransfer ?? null);
  }

  document.addEventListener(
    "dragstart",
    e => {
      // for now, only check on the next tick
      // all event handlers process on the current tick, right...?
      setTimeout(() => updateData(e), 0);
    },
    {
      capture: true,
      passive: true,
    }
  );

  document.addEventListener(
    "dragend",
    e => {
      update(null);
    },
    {
      capture: true,
      passive: true,
    }
  );
});

export const isDragging = derived(dataTransfer, dt => !!dt);
