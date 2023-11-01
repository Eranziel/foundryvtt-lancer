import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { LANCER } from "../config";

const lp = LANCER.log_prefix;

/**
 * A Step is a function which is used inside a Flow for a discrete action.
 * Steps are exepcted to modify the provided state object as appropriate for the
 * work they are doing, and often include prompting and processing user input.
 * @returns false if the flow should be aborted after this step.
 */
export type Step<T, U> = (state: FlowState<T>, options?: U) => Promise<boolean>;

/**
 * Encapsulates the current state of a Flow. `data` is a generic object with the data
 * relevant to the specific Flow type.
 */
export interface FlowState<T> {
  name: string;
  actor: LancerActor;
  item: LancerItem | null; // Not all flows involve items. e.g. structure/stress
  currentStep: string;
  data?: T;
}

/**
 * A Flow is a game process composed of one or more Steps. Flows can be triggered
 * by either automation (e.g. structure/stress rolls) or by user interaction
 * (e.g. a weapon attack).
 *
 * Once a flow is triggered, it goes through its Steps in order, gathering
 * data and user input as needed, and generally ends with outputting a chat card.
 *
 * Some Flows' chat cards will contain buttons for rerolling (perform the same
 * Flow again, with data pre-loaded from the state of the Flow which generated
 * the chat card), or buttons which can trigger other flows (e.g. damage
 * application).
 */
export class Flow<StateData> {
  // The Steps involved in this flow. Steps are resolved in the order of insertion.
  steps: Map<string, Step<StateData, any> | Flow<any>>;
  // State tracking object. Passed to each step for it to modify and then return.
  state: FlowState<StateData>;

  constructor(name: string, uuid: UUIDRef | LancerItem | LancerActor, data?: StateData) {
    this.steps = new Map();
    let item: LancerItem | null = null;
    let actor: LancerActor | null = null;
    // If a string uuid is provided, look it up to see what it points to
    if (typeof uuid == "string") {
      const resolved = fromUuidSync(uuid);
      // Check document type, populate item or actor. Throw error if it's not one of those types.
      if (resolved instanceof LancerItem) {
        item = resolved;
      } else if (resolved instanceof LancerActor) {
        actor = resolved;
      } else {
        throw new TypeError(`Flow argument 'uuid' must resolve to an Item or an Actor.`);
      }
    } else if (uuid instanceof LancerItem) {
      item = uuid;
    } else if (uuid instanceof LancerActor) {
      actor = uuid;
    } else {
      throw new TypeError(`Flow argument 'uuid' must be a valid UUID string, an Item, or an Actor.`);
    }

    // If we've gotten an item, see who it belongs to.
    if (item && !actor) {
      actor = item.parent;
      if (!actor)
        throw new TypeError(
          `Flow argument 'uuid' was given an Item which is not owned by an Actor. Only owned Items can be used in Flows.`
        );
    }

    // Final check. If actor is not populated by now, we were given a UUID string which
    // did not successfully resolve to a LancerActor.
    if (!actor) {
      throw new TypeError(`Flow argument 'uuid' did not resolve to an Actor.`);
    }

    this.state = {
      name,
      actor,
      item,
      currentStep: "",
      data,
    };
  }

  /**
   * Retrieve a step function from the global registry in game.lancer.flowSteps.
   * @param stepKey The key of the step to retrieve
   * @returns The step with the given key, or null if no such step exists.
   */
  static getStep(stepKey: string): Step<any, any> | Flow<any> | null {
    return (game.lancer.flowSteps as Map<string, Step<any, any> | Flow<any>>).get(stepKey) ?? null;
  }

  /**
   * Retrieve a step function from the global registry in game.lancer.flowSteps.
   * Convenience access to the static method.
   * @param stepKey The key of the step to retrieve
   * @returns The step with the given key, or null if no such step exists.
   */
  getStep(stepKey: string): Step<any, any> | Flow<any> | null {
    return Flow.getStep(stepKey);
  }

  /**
   * Insert a step into the map, to be executed before an existing step
   * @param key Existing step key to insert newKey before
   * @param newKey New step key
   * @param step New step to insert
   */
  insertStepBefore(key: string, newKey: string, step: Step<StateData, any> | Flow<any>) {
    const newSteps: Map<string, Step<StateData, any> | Flow<any>> = new Map();
    for (const [k, s] of this.steps.entries()) {
      if (k === key) {
        newSteps.set(newKey, step);
        newSteps.set(k, s);
      } else {
        newSteps.set(k, s);
      }
    }
    this.steps = newSteps;
  }

  /**
   * Insert a step into the map, to be executed after an existing step
   * @param key Existing step key to insert newKey after
   * @param newKey New step key
   * @param step New step to insert
   */
  insertStepAfter(key: string, newKey: string, step: Step<StateData, any> | Flow<any>) {
    const newSteps: Map<string, Step<StateData, any> | Flow<any>> = new Map();
    for (const [k, s] of this.steps.entries()) {
      if (k === key) {
        newSteps.set(k, s);
        newSteps.set(newKey, step);
        return;
      } else {
        newSteps.set(k, s);
      }
    }
    this.steps = newSteps;
  }

  /**
   * Remove the given step from the steps to execute
   * @param key Existing step key to delete
   */
  removeStep(key: string) {
    this.steps.delete(key);
  }

  /**
   * Start the flow. Each step is awaited in the order they were inserted to the map.
   * @param data Initial data for the specific flow to populate its state.data.
   */
  async begin(data?: StateData): Promise<boolean> {
    this.state.data = data || this.state.data;
    for (const [key, step] of this.steps.entries()) {
      console.log(`${lp} running flow step ${key}`);
      this.state.currentStep = key;
      if (step instanceof Flow) {
        // Start the sub-flow
        if ((await step.begin()) === false) {
          console.log(`${lp} flow aborted when ${key} returned false`);
          return false;
        }
      } else {
        // Execute the step. The step function will modify the flow state as needed.
        if ((await step(this.state, data)) === false) {
          console.log(`${lp} flow aborted when ${key} returned false`);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Generate a JSON string representing this Flow instance.
   * This is a generic implementation, some Flows will reimplement as needed.
   * @returns JSON string representing this Flow instance.
   */
  serialize(): string {
    return JSON.stringify({
      name: this.state.name,
      uuid: this.state.item ? this.state.item.uuid : this.state.actor.uuid,
      data: this.state.data,
    });
  }

  /**
   * Consume a serialized Flow state JSON to create a hydrated Flow instance
   * This is a generic implementation, some Flows will reimplement as needed.
   * @param json Serialized JSON string of the flow.
   * @returns A new Flow constructed from the JSON data.
   */
  static deserialize(json: string): Flow<any> {
    const hydrated = JSON.parse(json);
    return new Flow(hydrated.name, hydrated.uuid, hydrated.data);
  }
}
