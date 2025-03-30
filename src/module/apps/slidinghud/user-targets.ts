import { readable } from "svelte/store";
import type { LancerToken } from "../../token";

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
  Hooks.on<Hooks.UpdateDocument<typeof TokenDocument>>("updateToken", token => {
    // If there's an anmiation, update when it finishes, otherwise just update
    CanvasAnimation.getAnimation(token.object?.animationName!)?.promise.then(() => updateData()) ?? updateData();
  });
});
