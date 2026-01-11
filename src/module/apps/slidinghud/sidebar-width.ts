import { readable } from "svelte/store";

export const sidebarWidth = readable(0, update => {
  const sidebar = document.getElementById("sidebar");

  async function setWidth() {
    if (!sidebar) return;
    // Delay until transition is done
    await new Promise(resolve => setTimeout(resolve, 200));
    // console.log(sidebar.offsetWidth);
    update(sidebar.offsetWidth || 0);
  }

  setWidth();
  Hooks.on("collapseSidebar", setWidth);
});
