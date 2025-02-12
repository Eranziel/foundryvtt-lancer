import { LancerActor } from "../actor/lancer-actor";

/**
 *
 * @param compendiumActor The document you want to import
 * @param owner Who the import is for
 */
export async function requestImport(compendiumActor: LancerActor, owner: LancerActor) {
  if (game.user?.can("ACTOR_CREATE")) {
    // Do it ourselves
    return fulfillImportActor(compendiumActor, owner);
  }

  let content = `<button class="chat-button self-destruct"
      data-action="importActor"
      data-import-id="${compendiumActor.uuid}"
      data-target-id="${owner.uuid}"
    >
      IMPORT ${compendiumActor.name} FOR ${owner.name}?
    </button>`;

  ChatMessage.create({
    blind: true,
    whisper: game.users?.filter((u: User) => u.isGM).map(u => u.id),
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
  if (!compDeployable || !forActor) throw new Error("Invalid actor(s) provided for import!");

  const actorData = compDeployable.toObject() as any;
  actorData.system.owner = forActor.uuid;
  actorData.name = deployableName(actorData.name!, forActor);
  actorData.folder = forActor.folder?.id;
  actorData.ownership = foundry.utils.duplicate(forActor.ownership);
  return LancerActor.create(actorData);
}

// Returns a name for a deployable that includes its owners name or callsign as appropriate
export function deployableName(baseName: string, owner: LancerActor | null): string {
  if (!owner) return baseName;
  let ownerName = owner.name;
  if (owner.is_pilot()) {
    ownerName = owner.system.callsign || owner.name;
  } else if (owner.is_mech() && owner.system.pilot?.status == "resolved") {
    ownerName = owner.system.pilot.value.system.callsign || owner.system.pilot.value.name;
  }

  return `${baseName} [${ownerName}]`;
}
