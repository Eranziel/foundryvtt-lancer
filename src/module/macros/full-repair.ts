// Import TypeScript modules
import { LANCER } from "../config";
import { getMacroSpeaker } from "./_util";
import { prepareTextMacro } from "./text";

const lp = LANCER.log_prefix;

export function fullRepairMacro(a: string) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return Promise.reject();

  return new Promise<boolean>((resolve, reject) => {
    new Dialog({
      title: `FULL REPAIR - ${actor?.name}`,
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

            await actor.full_repair();
            prepareTextMacro(a, "REPAIRED", `Notice: ${actor.name} has been fully repaired.`);
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
