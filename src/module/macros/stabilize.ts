// Import TypeScript modules
import { LANCER } from "../config";
import { StabOptions1, StabOptions2 } from "../enums";
import { getMacroSpeaker } from "./_util";
import { prepareTextMacro } from "./text";

const lp = LANCER.log_prefix;

export async function stabilizeMacro(a: string) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return Promise.reject();

  let template = await renderTemplate(`systems/${game.system.id}/templates/window/promptStabilize.hbs`, {});

  return new Promise<boolean>((resolve, reject) => {
    new Dialog({
      title: `STABILIZE - ${actor?.name}`,
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dlg => {
            // Gotta typeguard the actor again
            if (!actor) return reject();

            let o1 = <StabOptions1>$(dlg).find(".stabilize-options-1:checked").first().val();
            let o2 = <StabOptions2>$(dlg).find(".stabilize-options-2:checked").first().val();

            let text = await actor.stabilize(o1, o2);

            if (!text) return;

            prepareTextMacro(
              a,
              `${actor.name?.capitalize()} HAS STABILIZED`,
              `${actor.name} has stabilized.<br>${text}`
            );
            return resolve(true);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => resolve(false),
        },
      },
      default: "submit",
      close: () => resolve(false),
    }).render(true);
  });
}
