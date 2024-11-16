import { readable } from "svelte/store";

export const userTargets = readable([] as Token[], update => {
  function updateData() {
    update(Array.from(game!.user!.targets));
  }

  Hooks.on("targetToken", (user: User, _token: Token, _isNewTarget: boolean) => {
    if (user.isSelf) {
      updateData();
    }
  });
  Hooks.on("createActiveEffect", updateData);
  Hooks.on("deleteActiveEffect", updateData);
  // updateToken triggers on things like token movement (spotter) and probably a lot of other things
  Hooks.on("updateToken", updateData);
});
