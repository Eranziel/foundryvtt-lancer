# 0.1.20 (2021-01-20)
## Features
* **Macros**: Add automatic crit damage handling. Thanks, descention!
* **Macros**: Add item and actor IDs to attack cards to increase module support. Thanks, kreisl!

## Bug Fixes
* **NPC Sheet**: Updating an NPC's embedded class also updates the NPC's stats. Closes #127.

# 0.1.19 (2020-12-17)
## Features
* **Macros**: Add options object for attack macros to specify static attack bonus and bonus damage. Partial for #117.

## Bug Fixes
* **Macros**: Fix a bug with structure/overheat macros that displayed the wrong result when multiple 1's are rolled.
* **NPC Sheet**: Fix a bug preventing NPC features from being deleted. Closes #123.

# 0.1.18 (2020-12-15)
## Bug Fixes
* **Macros**: Fix a bug with the structure/overheat macros that decide to declare your mech destroyed if structure/stress are full.

# 0.1.17 (2020-12-15)
## Features
* **Macros**: Structure and Overheat macros have been added. They can be found in the "LANCER Macros" Compendium, and their functionality can be customized using the system settings. Closes #91.
* **Macros**: Macros for placing common AOE templates have been added. They can be found in the "AoE Templates" Compendium.
* **NPC Classes**: Add functionality to NPC Class sheet allowing features from Compendium to be added. Partial for #110.

## Bug Fixes
* **NPCs**: Don't override NPC stat values when duplicating NPCs. Closes #94.
* **Pilot/NPC Sheet**: Fix a bug which overwrites prototype token name even if the Actor's name was not edited. Closes #116.
* **Item Sheets**: Fix some inconsistencies in how range and damage selectors were handled, which caused charge-type systems in particular to lose data when saved. Closes #116.
* **Macros**: Fix and improve Overkill handling for attack macros. 

# 0.1.16 (2020-11-25)
## Bug Fixes
* **Pilot Sheet**: Syncing Comp/Con cloud saves no longer fails with a 401 error. Closes #113. Again.
* **Pilot Sheet**: Fix an issue where some synced pilots caused the pilot sheet to not render after syncing. Closes #115.
* **Macros**: Pilot skill trigger and overcharge macros rolled from the sheet no longer fail if no token is selected.

# 0.1.15 (2020-11-22)
## Features
* **Pilot Sheet**: Syncing Comp/Con cloud saves now sets up mounts and adds weapons to them. Closes #75.

## Bug Fixes
* **Pilot Sheet**: Syncing Comp/Con cloud saves no longer fails with a 401 error. Closes #113.
* **Macros**: Using a macro from the hotbar no longer fails if no token is selected.

# 0.1.14 (2020-11-19)
## Features
* **Pilot Sheet**: Added Overcharge macro. Closes #101.
* **Status Icons**: Added NPC tier icons. Partial work for #92.

## Bug Fixes
* **Compendium Manager**: Fix bug where item name was used instead of item ID when finding items to update from an LCP. Closes #108.
* **Pilot Sheet**: Don't add mech weapons when syncing a Comp/Con pilot.
* **Pilot Sheet**: Fix reversed current and max repairs when syncing a Comp/Con pilot. Closes #109.
* **Item Sheets**: Save new item name into system data so that item previews show the updated name. Closes #111.

# 0.1.13 (2020-11-08)
## Features
* **Pilot Sheet**: Added macros for pilot gear, core bonuses, core actives, and core passives. Closes #10.
* **Pilot Sheet**: Added basic Overcharge tracking. Partial solution for #101.
* **NPC Sheet**: Added macros for systems, traits, and reactions. Closes #10.
* **NPC Sheet**: Added a link beside the class name to open the NPC's class item.
* **NPC Class Sheet**: The Base and Optional Feature sections are now populated with previews of the features. The previews can be dragged onto NPC sheets to add the items to the NPC, without opening any Compendiums. Closes #106.
* **NPC Template Sheet**: Likewise populates the Base and Optional Feature sections with draggable feature previews. Closes #106.
* **Migration**: Migration logic is now more intelligent, avoiding unnecessary migrations each version update.

## Bug Fixes
* **Macros**: NPC Weapon "On Hit" effects now show in chat. Closes #95.
* **NPC Sheet**: Fix a issue causing NPC Templates to be un-deletable. Closes #97.
* **Status Icons**: Improved status icons to include tooltips in the token HUD. Closes #93.
* **General**: Fix an issue causing the system to fail to load on Foundry 0.7.6. Closes #107.

# 0.1.12 (2020-10-21)
## Bug Fixes
* **General**: Fix a bug where some parts of the system tried to load too soon and failed fatally.

# 0.1.11 (2020-10-21)
* **Foundry Core Support**: This update moves the supported Foundry core version to the 0.7 series.

# 0.1.10 (2020-10-11)
## Bug Fixes
* **Pilot Sheet**: Fix bug preventing superheavy weapons from being added to mounts. Closes #88.

# 0.1.9 (2020-10-11)
## Features
* **Pilot Sheet**: Added macros for sending Talents and Mech Systems to chat. Starts #10.
* **Hotbar**: Add drag-to-hotbar macro creation for several items on Pilot and NPC sheets. Closes #53.

## Bug Fixes
* **Pilot Sheet**: Fix bug preventing weapons from being added to Aux/Aux and Main/Aux mounts. Closes #83.
* **Pilot Sheet**: Fix bug causing weapons to become un-rollable after editing. Closes #86.
* **Pilot Sheet**: Fix bug causing History and Notes sections to flicker when hovering over edit button. Closes #87.
* **Status Icons**: Added white versions of status/condition icons for use on tokens.
* **Status Icons**: Fix an issue preventing status icons from being shown on Firefox.

# 0.1.8 (2020-10-04)
## Features
* **Everywhere**: Hide default increment/decrement arrows on number inputs, which were causing issues. Some number inputs now use new, larger increment/decrement buttons. Partial fix for #48.
* **Pilot Sheet**: Add a core power toggle. Closes #52.
* **Attack Macros**: Add single-depth Overkill rerolling, and a button to roll another d6 if needed.
* **Status Icons**: Add status and condition icons from Comp/Con icon set. Closes #24.

## Bug Fixes
* **Pilot Sheet**: Fixed an issue preventing Aux/Aux and Main/Aux mounts from being created. Closes #73.
* **Pilot Sheet**: Cloud import now properly sets the Actor name. Closes #79.
* **Pilot Sheet**: Fix drag-and-drop item sorting.
* **NPC Sheet**: Fixed a bug preventing NPC HASE macros from rolling. Closes #76.
* **Compendiums**: Fixed a bug causing modified items in the Lancer compendiums to prevent the system from loading properly. Closes #78.
* **Compendium Manager**: Removed the setting to create system-wide compendiums, which caused issues with pilot imports. Closes #80.

# 0.1.7 (2020-09-27)
Hotfix to correct new issue with pilot sheet not loading. 

# 0.1.6 (2020-09-27)
## General
* **Pilot Sheet**: Move the cloud sync tab to leftmost, rename to "RM-4://SYNC" to mirror Comp/Con UI.
* **Pilot Sheet**: Record and display the last time the pilot was downloaded from cloud save.

## Bug Fixes
* **Pilot Sheet**: Fix bug where charge effects' HTML wasn't closed properly, resulting in the cloud import UI elements not showing on affected pilot sheets. Closes #72.
* **Comp/Con Cloud Save Import**: Fix bug where pilots with custom skills would not import. Closes #71.

# 0.1.5 (2020-09-27)
## Features
* **LCP Import**: It's finally here! The Lancer Compendium Manager is your new friend for building/updating Compendiums with Lancer core data and LCPs. Closes #15.
* **Comp/Con Cloud Save Import**: Pilots can now pull data from a Comp/Con cloud share code, automatically building the pilot and their mech (except for weapons) and calculating stats. Partial work for #23.

## Bug Fixes
* **NPC Sheet**: Fix bug where ranges weren't shown on NPC weapon previews. Closes #68.

# 0.1.4 (2020-09-12)
## Bug Fixes
* **NPC Feature Sheet:** Fix bug where new NPC weapons only show 1 damage field. Closes #64.
* **Item Import/Duplication:** Fix issue where duplicated/imported items had properties overwritten. Closes #65.

# 0.1.3 (2020-09-07)
## General
* Updated Foundry Core compatibility version to 0.6.6.
* Standardized a lot of sheet components to make appearance and future development better.
* Changed default grid distance and unit to 1 unitless, instead of 10 feet.
* Greatly reduced the file size of the faction logos.

## Features
* **Mech Systems/Weapons:** Added effects rendering for all effect types currently supported in Comp/Con. They are rendered on pilot sheet and in chat when a weapon macro is used. Closes #22.
* **Mech Systems:** Added editability for Basic, AI, Bonus, and Charge-type effects. 
* **Frame Sheet:** Improve appearance and editability of Frame sheet. Core system description, passive effect, and active effect can now all be edited even if not currently present on the Frame.

## Bug Fixes
* **Pilot Sheet:** Fixed custom frames (user-created Item) not showing their name on pilot sheets. Closes #57.
* **Usability:** Removed functionality which deleted weapons or systems from a Pilot on right-click. Closes #56.
* **Tokens:** Fixed a bug which caused NPC and Deployable prototype token images to be overwritten when the parent sheet image was changed. Closes #61.
* **Macros:** Character sheet macro rollers now always use the sheet's Actor as the speaker.

# 0.1.2 (2020-07-29)
## Bug Fixes
* **General:** Fix a bug which could cause Item data to be lost during version migration or duplication.
* **NPC Sheet:** Editing the name field now renames the Actor and prototype token, closes #55.

# 0.1.1 (2020-07-26)
## Bug Fixes
* **Macros:** Add "Cancel" button to accuracy prompt. Clicking cancel or closing the prompt will abort the roll. Closes #45.
* **Macros:** Fix NPC weapon macros, closes #47.
* **Frame sheet:** Fixed adding traits and mounts, closes #44. (Thanks, Grygon!)
* **NPCs:** New NPCs start at 0 heat, closes #49.
* **NPCs:** Increase NPC class sheet default width, part of #48.

## Features
* **Macros:** Add HASE macro buttons to mech tab of pilot sheet, closes #54.
* **Macros:** Add NPC tech attack macros.
* **Pilot sheet:** Render charge effects in systems previews, closes #46. (Thanks, Grygon!)
* **Frame sheet:** Improve core system editability.
* **NPC Features:** Add support for all feature types to feature sheet and NPC sheet, closes #36. 

# 0.1.0 (2020-07-19)
## Alpha release!
A huge thank you and shout-out to Animu36, Grygon, and Staubz, without whose help this initial release would have taken many more weeks!

The system is bare-bones, but should be stable for play. Features existing as of this release:
* Compendiums containing all of the Core Book player-side content.
* Pilot sheet with sorted Items, mount handling (thanks, Animu!), support for frame swapping by drag-and-drop, and some macro buttons.
* NPC sheet with support for class swapping by drag-and-drop (thanks, Staubz!), and some macro buttons.
* Editable sheets for each Item type (thanks, Grygon!):
  * Skill Triggers
  * Talents
  * Core Bonuses
  * Pilot Armor, Weapons, and Gear
  * Mech Frames
  * Mech Weapons
  * Mech Systems
  * NPC Classes
  * NPC Templates
  * NPC Features

## Recommended Companion Modules
* Lancer Condition Icons - status/condition icon sets tailored towards Lancer.
* Hex Size Support - Improves Hex grid snapping, movement, and ruler measurement for hex tokens larger than size 1.
* Popcorn Initiative - Add-on popcorn initiative management system.

## Known Issues
* Weapons, systems, and NPC features do not render all of their effects yet. Since the Compendiums are generated using `lancer-data` (the same data library that Comp/Con uses), the effects are broken down into the special types that Comp/Con supports. Implementing proper rendering and then editability for special effects types will be added soon. This may be delayed until the recently announced changes to the data are complete on the Comp/Con side.
* No NPCs included! As the Core Book NPCs are part of the paid content for Lancer, they cannot be included in the system upon install. An LCP import tool is coming, which will allow you to use the Comp/Con NPC pack (download from the [Core Book itch.io page](https://massif-press.itch.io/corebook-pdf)) to automatically build/update NPC Compendiums. For now, NPC stats will need to be entered manually.
* Does not include [Long Rim](https://massif-press.itch.io/the-long-rim) or Wallflower player content. Again, LCP import is coming!
