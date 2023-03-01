import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import type { encodeMacroData } from "../macros";

/**
 *
 * @param compendiumActor The document you want to import
 * @param forPilot Who the import is for
 */
export async function requestImport(compendiumActor: LancerActor, forPilot: LancerActor) {
  if (game.user?.isGM) {
    // Do it ourselves
    return fulfillImportActor(compendiumActor, forPilot);
  }

  let macroData = encodeMacroData({
    fn: "importActor",
    args: [compendiumActor.uuid, forPilot.uuid],
    title: `Import ${LancerActor.name}`,
  });

  let content = `<button class="chat-button self-destruct" data-macro="${macroData}">
                        IMPORT ${compendiumActor.name} FOR ${LancerActor.name}?
                    </button>`;

  ChatMessage.create({
    blind: true,
    whisper: game.users?.filter(u => u.isGM).map(u => u.id),
    content,
  });
}

/** Brings an actor from compendium into the world.
 * If for a pilot, gives its name an appropriate prefix (Callsign) and putting it in that pilots folder
 * If for a mech, reroutes to the mechs pilot
 * If for an npc, just imports to same folder, nothing fancy
 *
 * @param compDeployable The actor (or actor UUID) to import
 * @param forActor The actor (or actor UUID) to associate the new deployable with
 */
export async function fulfillImportActor(compDeployable: string | LancerActor, forActor: string | LancerActor) {
  if (!game.user?.hasPermission("ACTOR_CREATE")) throw new Error("You do not have permissions to import an actor!");
  compDeployable = await LancerActor.fromUuid(compDeployable);
  forActor = await LancerActor.fromUuid(forActor);

  // Redirect mech to pilot
  if (forActor.is_mech() && forActor.system.pilot?.status == "resolved") {
    forActor = forActor.system.pilot.value;
  }

  // If pilot, get callsign
  return LancerActor.create({
    ...compDeployable.toObject(),
    "system.owner": forActor.uuid,
    name: deployableName(compDeployable.name!, forActor),
    folder: forActor.folder?.id,
    // @ts-expect-error Should be fixed with v10 types
    ownership: foundry.utils.duplicate(forActor.ownership),
  });
}

// Returns a name for a deployable that includes its owners name or callsign as appropriate
export function deployableName(baseName: string, owner: LancerActor | null): string {
  if (!owner) return baseName;
  let ownerName = owner.name;
  if (owner.is_pilot()) {
    ownerName = owner.system.callsign || owner.name;
  }

  return `${baseName} [${ownerName}]`;
}
