import { writable } from "svelte/store";

export const userTargets = writable([] as string[]);

function updateData() {
  userTargets.set(Array.from(game!.user!.targets).map(t => t.id));
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
  foundry.canvas.animation.CanvasAnimation.getAnimation(token.object?.animationName!)?.promise.then(() =>
    updateData()
  ) ?? updateData();
});
