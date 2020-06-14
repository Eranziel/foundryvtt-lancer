
import { LancerPilotActorData, LancerNPCActorData, LancerDeployableActorData } from '../interfaces'

/**
 * Extend the Actor class for Lancer Pilot-type actors.
 */
export class LancerPilot extends Actor {
  data: LancerPilotActorData;


}


/**
 * Extend the Actor class for Lancer NPC-type actors.
 */
export class LancerNPC extends Actor {
  data: LancerNPCActorData;


}

/**
 * 
 */
export class LancerDeployable extends Actor {
  data: LancerDeployableActorData;


}
