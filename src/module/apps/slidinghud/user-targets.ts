import { readable } from "svelte/store";

export const userTargets = readable([] as Token.Implementation[], update => {
  function updateData() {
    update(Array.from(game!.user!.targets));
  }

  Hooks.on("targetToken", (user, _token, _isNewTarget) => {
    if (user.isSelf) {
      updateData();
    }
  });
  Hooks.on("createActiveEffect", updateData);
  Hooks.on("deleteActiveEffect", updateData);
  // updateToken triggers on things like token movement (spotter) and probably a lot of other things
  Hooks.on("updateToken", token => {
    // If there's an animation, update when it finishes, otherwise just update
    CanvasAnimation.getAnimation(token.object?.animationName!)?.promise.then(() => updateData()) ?? updateData();
  });
});
