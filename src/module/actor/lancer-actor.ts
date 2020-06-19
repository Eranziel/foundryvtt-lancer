
import { LancerPilotData, LancerNPCData, LancerDeployableData } from '../interfaces'

class LancerCharacterActor extends Actor {
}

/**
 * Extend the Actor class for Lancer Pilot-type actors.
 */
 export class LancerPilot extends LancerCharacterActor {
   data: LancerPilotData;


 }


/**
 * Extend the Actor class for Lancer NPC-type actors.
 */
 export class LancerNPC extends LancerCharacterActor {
   data: LancerNPCData;


 }

/**
 * 
 */
 export class LancerDeployable extends Actor {
   data: LancerDeployableData;


 }
