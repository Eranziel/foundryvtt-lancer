# Flow API Spec

Specific flows are implementations of the `Flow` abstract class. Each flow type has a pre-defined list of steps, which are either functions or another flow. Being able to nest flows allows for higher-level flows for future features such as actions, which will be composed of several sub-flows.

```ts
// Flows are based around an actor, or an item embedded in an actor. The reference
// can be provided as a UUID string for convenience and to facilitate de/serializing.
source: string | LancerItem | LancerActor;
let f = new Flow(source, stateData);
f.begin(initialData);

// More commonly, flows will be started directly from the item/actor.
let pilot = game.actors.getName("Alfried Matheson"); // A pilot
pilot.beginHaseFlow({ stat: "hull" }); // Start a Hull check
let mech = game.actors.getName("Azrael"); // A mech
mech.beginStructureFlow(); // Start a structure check
let weap = mech.items.getName("Torch"); // A mech weapon
weap.beginAttackFlow(game.user.targets); // Start an attack
```

Non-Flow steps are simply functions which take the flow's current state and (optionally) additional data, then performs a discrete portion of the flow's logic. For example, each of these is a step: check if a weapon is not destroyed, check if a weapon is loaded, trigger the attack HUD and await its results, print the resulting chat card showing the attack's results. Steps modify the flow's state object and sometimes the originating Item/Actor, so are therefore inherently side-effecty - that's their job!

## Extending Flows

Module developers can react to flows in two ways depending on the complexity of their needs

### Traditional Hooks

If your needs are basic, flows provide two Hook events `lancer.preFlow.${flowName}` and `lancer.postFlow.${flowName}`. Both take the flow instance as the first parameter, and the post hook also has a second parameter indicating whether the flow was successful.

```ts
type PreFlowHook = (flow: Flow<any>) => unknown;
type PostFlowHook = (flow: Flow<any>, success: boolean) => unknown;
```

### Custom Steps

If you are doing more advanced thing and need to run in between steps, you can add your own custom flow steps into a flow. In the `lancer.registerFlows` hook, first register your new step in the global registry, then insert the step into the Flows that you are modifying. Two static methods on flows allow you to insert the step `Flow#insertStepAfter` and `Flow#insertStepBefore`. Their first parameter is the existing step name and the second is the name of your custom step.

```ts
Hooks.once(
  "lancer.registerFlows",
  (flowSteps: Map<string, Step<any, any> | Flow<any>>, flows: Map<string, typeof Flow<any>>) => {
    flowSteps.set("testLogStep", async (...args) => {
      console.log(...args);
      return true;
    });
    flows.get("WeaponAttackFlow")?.insertStepAfter("showAttackHUD", "testLogStep");
  }
);
```

There is also a `Flow#removeStep` static method that can delete a step, but be aware that removing steps could interfere with other modules that insert steps relative to the step that you remove.

Finally it is possible to override a step by registering your custom step as the name of the existing step you want to override, but be aware that if another module also overrides that step, there's no defined order for conflict resolution. In general, it is best to add new steps rather than change existing steps wherever possible.

### Custom Flows

The Flow class is available at `game.lancer.Flow` for modules wishing to write custom flows. Flow steps for custom flows need to be registered in the flowSteps mapping in the `lancer.registerFlows` Hook similar to custom steps.
