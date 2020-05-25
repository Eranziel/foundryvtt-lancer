
import { LancerPilotData, LancerNPCData, LancerDeployableData } from '../interfaces'

/**
 * Extend the Actor class for Lancer PC-type actors.
 */
export class LancerPilot extends Actor {
  data: LancerPilotData;


}


/**
 * Extend the Actor class for Lancer NPC-type actors.
 */
export class LancerNPC extends Actor {
  data: LancerNPCData;


}

/**
 * 
 */
export class LancerDeployable extends Actor {
  data: LancerDeployableData;


}
