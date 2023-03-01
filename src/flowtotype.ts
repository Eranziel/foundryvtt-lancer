/*
If we do end up going with a FlowState class / family of classes, i  propose
- `actor.flow() -> FlowState` to generate a FlowState based around that actor
- `flow.execSequence("weaponAttack")` to execute more generic, globally defined `Flow`s (where flows are just a composition of `Step`s)
Each `Step` is ultimately just a logically discrete part of using an item or whatever.
As far as the internals/specifics of Steps... idk. I have ideas and opinions. In general each needs to do some of the following
- Edit 

export namespace Flow {
    export const StepRegistry = new Map<string, Step>;

    export const SequenceRegistry = new Map<string, Sequence>;

    // A basic unit of work
    export interface Step {
        successors(f: BaseState): Array<BaseState>;
    }

    // A dummy entry step that does nothing
    export const ENTRY: Step = {
        successors: (f) => [f]
    }

    // To take advantage of pre-defined steps, we allow usage of strings or custom steps for all arguments.
    // This convenience function allows us to look one up
    export type StepLike = Step | string;
    export function resolveStep(step: StepLike): Step {
        if(typeof step == "string") {
            let result = StepRegistry.get(step);
            if(!result) throw new Error(`Undefined step: ${step}`);
            return result;
        } 
        return step;
    }



    // A defined sequence of steps and how they flow into each other
    export class Sequence {
        readonly entry: Step = ENTRY;
        readonly flow: Map<Step, Step[]> = new Map();

        // Set a Step to be succeeded by one or more other steps
        bind(outpipe: StepLike, inpipes: StepLike | StepLike[]) {
            outpipe = resolveStep(outpipe);
            let resolved_inpipes = (Array.isArray(inpipes) ? inpipes : [inpipes]).map(resolveStep);
            let arr = this.flow.get(outpipe) ?? [];
            arr.push(...resolved_inpipes);
            this.flow.set(outpipe, arr);
        }

        // Insert a new step to hijack another steps outputs
        // So, we get behavior like the following
        // A -> [B, C]
        // insertAfter(A, D)
        // A -> D -> [B, C]
        insertAfter(step: StepLike, follower: StepLike) {

        }

        insertBefore(step: StepLike, follower: StepLike) {
            
        }
    }

    // For building simple linear sequences
    export class SequenceBuilder {
        private seq = new Sequence();
        private last = ENTRY;

    }


    export abstract class BaseState {
        execFlow(name: string) {
            Flow
        }
    }

    export class ErrorFlowState

}

class LanccrActrr {
    flow(): Flo
}


// Example uses

*/
