// Import TypeScript modules
import { prepareTextMacro } from "./text";
import { LancerActor } from "../actor/lancer-actor";

export function prepareFullRepairMacro(actor_: string | LancerActor) {
  // Determine which Actor to speak as
  let actor = LancerActor.fromUuidSync(actor_);

  return new Promise<boolean>((resolve, reject) => {
    new Dialog({
      title: `FULL REPAIR - ${actor.name}`,
      content: `<h3>Are you sure you want to fully repair the ${actor?.type} ${actor?.name}?`,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Yes",
          callback: async _dlg => {
            // Gotta typeguard the actor again
            if (!actor) {
              return reject();
            }

            await actor.loadoutHelper.fullRepair();
            prepareTextMacro(actor, "REPAIRED", `Notice: ${actor.name} has been fully repaired.`);
            resolve(true);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "No",
          callback: async () => resolve(false),
        },
      },
      default: "submit",
      close: () => resolve(false),
    }).render(true);
  });
}
