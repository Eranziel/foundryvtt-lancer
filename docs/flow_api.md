## Current Gripes

- There are many functions, some are very long and branching. Logical flow is hard to follow. Entry points are not clear.
- Argument specs are not consistent, and there are several bespoke functions for special cases.
- `getMacroSpeaker` is confusing and fragile.
- Encoding macros into binary to embed in HTML data props is horrible. Next to impossible to troubleshoot/debug, resolution flow is even more confusing.
- "Macros" feels like a misnomer, and is easily confused with user-written macros in Foundry and the compendium of macros in the system.
  - Will rename to Flows & Steps.

## Requirements

- Better maintainability is key, clarity is a big part of that.
- API documentation?
- Flowchart showing entry points and resolution flow?
- Flow API needs to support the following contexts:
  - Sheet functions - flow to call needs to be identifiable by element type & classes, data needs to either come from the sheet document (e.g. the sheet activates a click listener on `button.flow-class` and then inserts its document/ID into the `flow.begin()` call), or from data on HTML (e.g. click listener on `button.flow-class`, retrieve additional context from `data-X` properties to insert into the `flow.begin()` call).
  - TODO - update || Foundry macros: ~~`game.lancer.macroApiFunction(args)`. Either user-written, or dragged to hotbar from a sheet.~~
  - Modules, such as Token Action HUD.
  - System-level automation features, e.g. future action helpers.
  - Rerolling from a chat message - needs to encapsulate all of the state info from the original roll.
- Identify what entry points to each flow are needed, minimize/combine them wherever possible.
  - Make a clear distinction between the "public" parts which are intended to be used directly, and the "private" parts which are used within the API functions themselves to continue the flow towards final output.
- Outputs of all public functions are:
  - Chat card showing the desired info or results of the action.
    - If a roll was involved, there should be a reroll button on the card.
    - If there are follow-up effects (damage, conditions added/removed, further rolls, etc...), the chat card should include buttons to trigger those effects.
  - In some cases, updates to the item and actor data to reflect changes in game state.

## Potential Issues

- Backwards compatibility. Going to have to accept this. Modules like TAH will need new integrations, user macros will need to be rewritten/regenerated.
  - Maybe write a short conversion guide? `prepareAttackMacro` is replaced with `weaponAttackFlow`, args change like so?
- Are there any downsides to using UUIDs and eliminating `getMacroSpeaker`? Doesn't seem like it currently.
- Is there functionality provided by the binary encoding approach that is hard to replace?

## API Spec

Specific flows are implementations of the `Flow` abstract class. Each flow type has a pre-defined list of steps, which are either functions or another flow. Being able to nest flows allows for higher-level flows for future features such as actions, which will be composed of several sub-flows.

Non-Flow steps are simply functions which take the flow's current state and (optionally) additional data, then performs a discrete portion of the flow's logic. For example, each of these is a step: check if a weapon is not destroyed, check if a weapon is loaded, trigger the attack HUD and await its results, print the resulting chat card showing the attack's results. Steps modify the flow's state object and sometimes the originating Item/Actor, so are therefore inherently side-effecty - that's their job!

### Rolls

- **Weapon Attack** - start a melee or ranged attack. Uses the attack HUD. Requires originating item or actor UUID.
  - Add support for non-weapon attacks, i.e. grapple/ram/improvised.
  - Facilitate damage workflow. Function which takes the output of the attack HUD will need to be able to take single/all target bonus damage specifications to embed into results chat card.
  - _Future work_: Add a bonus damage section to the attack HUD (with a single/all target toggle), create a damage application HUD. Damage HUD invoked by clicking buttons on chat card, allows adding post-attack bonus damage, manual overriding resistance/AP/etc...
- **Tech Attack** - start a tech attack. Uses the attack HUD. Requires originating item or actor UUID.
  - If originating item is not provided, assume it is an Invade. In the resolution flow for Invade, show dialog to choose one of their installed invade options for each target hit.
- **Stat Roll** - start a check or save. Uses the check HUD. Requires originating actor UUID and stat attribute path.
- **Overcharge** - use an Overcharge level on a mech, roll resulting heat. Requires originating actor UUID.
- **Structure** - start a structure check for a mech. Uses the structure HUD. Requires originating actor UUID.
  - Implement Monstrosity structure table?
  - **Secondary Structure** - start the roll for system/weapon destruction, requires originating actor UUID. (Any other secondary rolls?)
    - Could be enhanced by showing a dialog to select the system/weapon to destroy and marking the selection as destroyed.
- **Overheat** - start an overheat check for a mech. Uses the overheat HUD. Requires originating actor UUID.
  - Chat card should include buttons to trigger secondary rolls, e.g. Engineering to avoid meltdown.

### Actions

- **Base Action** - use one of the standard actions. Requires originating actor UUID and action key. This ends up being a high-level wrapper which directs resolution into other APIs, such as weapon/tech attack, item activation, text. Several common cases will require a dialog to prompt the user for a further choice, e.g. skirmish.
- **Item Activation** - use an action which is not a weapon/tech attack. Requires originating item or actor UUID. Sends the action to chat, spends an item use or charge if applicable.
  - Has some **complicated cases**:
    - Talent rank actions
    - Frame core powers - active and passive can both have multiple actions
    - Frame trait actions
- **Stabilize** - prompt for stabilize options. Requires originating actor UUID.
- **Full Repair** - restore all resources. Requires originating actor UUID.
- **_Rest_** - start using repairs during a rest. Needs a new rest HUD/dialog. Requires originating actor UUID.

### Miscellaneous

- **Text** - show title, content, and optional tag list in chat. Optional originating item or actor UUID, fallback on OOC chat as player. Provide this as an API to make it easy for user-written macros to output chat cards in system styling.
  - Would be nice to have a guide in the API docs or Wiki to walk through how to use this for non-coders.
- **Show In Chat** - show a chat card with the details for an item or other renderable piece of data (frame trait, etc...). Requires originating item UUID. Should call on the standard rendering functions in the system as much as possible so the item is displayed the same as on sheets, but without interactibility.

### Chopping Block

- **Item** - is this still necessary? Define the difference between Item, Activation, and Text flows.
- **Talent** - show a Talent rank in chat. Wrapper for either an Item or Text flow; could likely be combined with those types.
- **Trigger** - wrapper for a stat roll.
- **Core Active/Passive** - use a mech's core system. Wrapper for an Activation flow, likely does not need to be separate.
- **Frame Trait** - show a frame trait in chat. Wrapper for a Text flow, can be combined.
