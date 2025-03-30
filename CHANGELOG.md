# 2.8.0 (2025-03-30)

## Features

- #763 - Dragging a Status/Condition item onto an actor sheet or token will add the corresponding status to the token. You can also drag them from chat messages, like the structure/stress results!
- #793 - Attack HUD Spotter integration now detects and uses the range increase from House Guard 1.
- Existing Premade NPCs (in the compendium) are now updated when the corresponding LCP is re-imported.

## Bug Fixes

- #846 - Fix issues around manually creating & populating NPC classes, templates, and features. (Hopefully.)
- #848 - Change default NPC heatcap to 0 so that NPCs without a heatcap (squads, monstrosity, etc...) get created with heatcap 0 instead of 5.
- #849 - Change the "tech_attack" bonus type to directly add to the tech attack stat, instead of adding to a semi-hidden bonus field that only shows up in the attack HUD.

# 2.7.2 (2025-03-11)

## Bug Fixes

- #818 - Fix pilot import from Comp/Con JSON when using Cyrillic (and other non-ASCII) characters.
- #837 - Show pilot armor descriptions, and pilot armor and weapon tags.
- #839 - Fix rendering NPC sheets with no class role, and fix saving NPC Class roles.
- Fix error messages when building premade NPCs during LCP import.
- Fix showing an LCP file's description, image, etc... when only one is selected in the Compendium Manager.
- Improve license display on item sheets.

# 2.7.1 (2025-03-05)

## Bug Fixes

- Fix a bug causing reserves from manually selected LCP files to not be imported.
- Fix a bug causing the system update chat message to be duplicated every time the game page loads.

## Misc

- Give the "Clear Compendiums" button distinct styling and a confirmation prompt.
- Update the "Lancer Help" and first launch dialogs to DialogV2.

# 2.7.0 (2025-03-04)

## Features

- #654 - Compendium Manager Revamp. The LANCER Compendium Manager has been completely overhauled, including built-in importing of official data, multi-file select, and a little eye candy. Check out the tour!
- Cut down on the amount of pop-up spam during/after world migration. Move acknowledgements and legal info into the system info journal.

## Bug Fixes

- #431 - Reserves are now imported from LCPs.

# 2.6.2 (2025-03-01)

## Bug Fixes

- #806 - Automatically add flat bonus to attack HUD for "ranged_attack" and "tech_attack" bonus from items.
- #809 - Add Deployable/Drone/Mine tags to items which have the matching kind of deployable, to match Comp/Con's similar functionality.
- #822 - Fix "Scan (Journal)" macro for v12.
- #821 - Add "bolster" and "flying" to all core icon sets for future integration with Lancer Ruler Integration.
- Fix data model errors logged when importing the Shadow of the Wolf LCP.

# 2.6.1 (2025-02-26)

## Bug Fixes

- #823 - Fix a bug causing Emperors to have "NaN" max hp.

# 2.6.0 (2025-02-16)

## Features

- #650 - v12 Support! This release brings support for Foundry v12 and drops support for Foundry v11. Huge thanks to @BoltsJ for doing the heavy lifting!

## Bug Fixes

- Fix a bug during import causing pilots to be set as the deployer of their mech's deployables.

# 2.5.0 (2025-02-08)

This will be the final release for Foundry v11, barring any critical bug fixes.

## Features

- #799 - Add a space for configurable flat attack bonuses in the attack HUD. This also adds a display for non-configurable flat bonuses, such as Grit or Tech Attack. Thanks, @eamondo2!

## Misc

- #753 - Add an Intangible icon to Hayley's Condition & Status icon set. Thanks for providing the icon, @DirkMcThermot!
- Change the Comp/Con login dialog to say "Comp/Con Email" instead of "Comp/Con Username" to reduce confusion.
- Use the "Down and Out" status icon for the defeated state, instead of the default skull icon. If you wish to keep the old skull icon instead, make a "Down and Out" status item in your world and assign it the image path `icons/svg/skull.svg`.

## Bug Fixes

- #781 - Fix some styling so "undo damage" buttons do not bleed out of the chat card area.
- #801 - Fix automation for consuming lock on with attacks. The lock on status will once again be removed after the attack, as long as a GM user is logged in.
- #812 - Show limited uses indicator on NPC reactions and tech items.
- #814 - Fix a bug causing the `cheap_struct` and `cheap_stress` bonus types to add to structure/stress repair cost, instead of overriding it.
- Use actor image instead of token image for attack/damage targets in chat. This prevents broken images in chat when targeting an animated token.

# 2.4.3 (2024-11-30)

## Bug Fixes

- #798 - Fix a bug which could allow floating text to appear over tokens with no change. e.g. "-0 HP".
- Fix a bug preventing migrations from completing.
- Fix a bug causing errors due to the "base" type actors/items which some modules apparently to create.
- Fix a bug preventing mech sheets from opening in the case where they have a pilot assigned and then that pilot is deleted.

# 2.4.2 (2024-11-22)

## Bug Fixes

- #782 - Drastically improve the legibility of the system settings windows (status icon config, automation config, action tracker config).
- #791 - Fix a bug preventing targetless damage rolls from being displayed in chat.
- Migration improvements and bug fixes
  - Journal is shown immediately to better inform users what is happening and show the troubleshooting steps.
  - Errors when migrating each document should now be caught so that the rest of the migration can continue. Notifications and console logs are generated to inform the user that there was a problem.
  - Display progress bar during migration.
- Fix a bug causing compendium actor sheets to take up the full screen.

## Improvements

- Improve legibility of kinetic damage icons on any buttons.
- Add tooltips to attack/damage target names in chat so that the full name can be read if it is too long for the available space.
- Add on-hover highlighting of attack and damage targets, making the associated token behave as though it were being hovered (show token border, show name and/or bars if configured). This applies to both the attack/damage HUDs and chat cards.

# 2.4.1 (2024-11-14)

## Bug Fixes

- #587 - New scenes will have token vision and fog of exploration disabled by default. Congrats @sealtrowitz on your first (code) contribution!
- #779 - Undoing end-of-turn burn ticks no longer lowers the actor's burn counter.
- All flow classes are now available in `game.lancer.flows`, for easier access for macro/mod devs.
- Properly register damage flow and refactor general damage button to follow the convention of other general flow buttons.

# 2.4.0 (2024-11-10)

## Features

- #776 - Add an undo button in damage chat messages.
- #777 - Add buttons to open the damage HUD without an attack first.
  - All actors have a generic "Damage" button next to the "Basic Attack" button, this opens the HUD with no damage configuration.
  - Weapon damage type displays have been converted to a button, clicking this will open the damage HUD with that weapon's damage.
- Add more tooltips to weapon cards - attack buttons, range type, NPC attack bonus/accuracy/difficulty, damage buttons.

# 2.3.0 (2024-11-09)

## Features

- #189 - Damage application is here! For the time being this only applies to weapon attacks. Tech attacks will be able to use the damage roller/application in the future, but still need some rework to support it.
  - #379 - Attack and damage rolling steps are now separate. Attack results have a "roll damage" button which shows a damage configuration HUD, which will then roll for damage and print a separate card to chat.
  - #535 - Configurable bonus damage as part of the damage flow. Bonus damage can be configured globally for the attack, or added to specific targets. (Anyone Nuclear Cavaliers out there?) The hit quality for each target (crit, hit, or miss) can also be modified in the HUD, in case manual adjustments or additional targets are needed.
  - Damage configuration includes toggles for AP, cannot-be-reduced (like from the Paracausal mod), and half-damage (like from Heavy Gunner). These can each be applied to the entire damage roll or to specific targets.
  - The damage roll chat card has a button for each target to apply damage to that target. There is also a drop-down for each target to pick whether this damage should be applied at 1x, 2x, or be resisted.
  - Resistance statuses have been added for each damage type. Tokens which have these statuses will resist the appropriate damage type as long as the damage was not configured as cannot-be-reduced.
  - #497 - Automatic burn handling at end of turn. Actors with burn will be prompted to make their Engineering save at the end of their turn, and if they fail a damage card will be printed.
  - Stats changes to tokens can show floating numbers above the token, e.g. "-5 HP". There is a new system setting to enable these numbers. The setting is separate for each client and is off by default.

# 2.2.6 (2024-10-26)

## Bug Fixes

- #727 - Show active effects table on all actor sheets. (Partial fix for #727, but some of the requested functionality is not implemented yet.)
- #767 - Terrain Height Tools integration - Do not draw LOS lines between attacker and target after Roll or Cancel is clicked on the attack HUD.
- #768 - Correct Legendary NPC evaluation of crushing hits/irreversible meltdown. There is still a case where Foundry can select the less favourable result, causing the output to be crushing hit/irreversible meltdown, but this will be much more rare.
- #771 - limited uses/loading/charged status on items are filled up when they are added to an actor.
- #772 - Fix bugs in status population. The priority for status names, descriptions, and images are now: selected icon set in settings > world items > compendium items.

## Misc

- Improved the styling of sheet tabs, adding a highlight on hover and a small animation when switching.

# 2.2.5 (2024-10-19)

## Bug Fixes

- #751 - Fix/restore the action tracker so it's usable again.
- Hide deleted pilots in Comp/Con import drop-down list.
- Fix monospace font for non-Windows machines.

## Misc

- #749 - Status-type items in the Items tab are automatically added to the token status menu options.
- #765 - Descriptions for token statuses are now populated from Status-type items in the Items tab and the Statuses/Conditions compendium.
- Add missing sheet applications to `game.lancer.applications` for intrepid module developers.
- Remove redundant error logger (Foundry core logs these now).

# 2.2.4 (2024-08-13)

## Bug Fixes

- #640 - Fix dragging NPC Features out of NPC Class sheets on Chrome.
- #745 - Prevent errors when reading loadout items to build pilot/mech sheets.
- #747 - Prevent adding the same feature to an NPC class/template feature list more than once.
- #748 - Fix positioning of activations icon in popped-out initiative window.
- #750 - Fix extra tall description boxes in Roll Table editor.
- On import, if a pilot has no active mechs, set the first mech as active.
- Add grappled, destroyed, and intangible icons to Tommy's icon set. (Thanks, Tommy!)

# 2.2.3 (2024-08-04)

## Bug Fixes

- Fix overflowing text with a single target in the attack HUD.

# 2.2.2 (2024-08-04)

## Bug Fixes

- Fix custom styling for Carousel Combat Tracker. The styles were not being properly applied.
- Add a required version check for Terrain Height Tools in a place that was missed.
- Improve attack HUD styling. Target names are coloured, and selected cover options have a glow to make them more obvious.
- Combat tracker improvements. Activation icons are only shown for turns which haven't yet been taken; the icon to deactivate the current turn is now different than the one to start a turn; and an icon is added to each combatant to show their maximum activations.

# 2.2.1 (2024-07-29)

## Bug Fixes

- #740 - Fix "X"'s floating outside of the checkboxes in attack/check HUDs.
- Fix required Terrain Height Tools version for LOS checks to 0.3.3.

# 2.2.0 (2024-07-28)

## Features

- Attack LOS preview with Terrain Height Tools integration. If Terrain Height Tools > 3.0 is installed and activated in your world, hovering over attack targets or cover UI in the attack HUD will have THT draw LOS from the attacking token to the target.
- Move the targetting template buttons to make them more discoverable. They are now between the acc/diff section and the targets section.
- #485 - Add a small summary of the weapon/tech attack's stats to the attack HUD and attack chat cards.

## Bug Fixes

- Fix the double "Edit" options in NPC feature 3-dot menus.
- Remove non-functional 3-dot menus from Bond stress and XP counters.

# 2.1.8 (2024-07-21)

## Bug Fixes

- #646 - Allow removing Bond burdens and clocks, and remove an extra "Edit" entry in their context menus.
- #729 - Remove unnecessary notification when all of an NPC's features are charged at the start of their turn.
- #730 - Ensure that deployable, frame, and NPC class size stats are either 0.5 or an integer number.
- #735 - Fix bug breaking pilot weapon sheets when they had the Loading tag.
- Prevent errors which could occur with token size automation.
- Fix tech attacks not consuming Lock On.
- Fix "Ruin" macro to include Valk's updates from 1.6.X.
- Fix default art for Kobold and Lich.

## Misc

- Improve accessibility of checkboxes in sliding HUD UIs.
- Allow Scan chat messages to be popped out into floating windows.
- Add default art for Genghis Mk I and Ranger Swallowtail. Update default art for Iskander.

# 2.1.7 (2024-07-10)

## Bug Fixes

- #712 - Show an empty Aux slot on Flex mounts with only one Aux mounted, and allow populating it with drag-drop.

# 2.1.6 (2024-07-10)

## Bug Fixes

- #117 - Automatically add +1 attack bonus for Death's Head ranged attacks.
- #546 - Add an automation setting to control whether NPCs automatically roll for recharge at start of turn.
- #714 - Do not refill hp after losing last structure.
- #721 - Fix LCP imports missing Statuses.
- #723 - Fix missing import of superheavy mount from Comp/Con pilots, for those who have the Superheavy Mounting core bonus.

## Misc

- Add configuration options in the "Scan" and "Scan (Journal)" macros to modify scan target permissions (for example, so you can give all players Observer permission after scanning).
- Add custom styling for Carousel Combat Tracker tooltips.
- Center all icon SVGs in `systems/lancer/assets/icons/`
- Add white versions of all icons in `systems/lancer/assets/icons/white/`
- Add text files to system assets folders which hopefully will warn some people to not upload custom assets to those folders.
- Add documentation about the development workflow for contributing to the system macros compendium

# 2.1.5 (2024-06-28)

## Bug Fixes

- #634 - Allow editing and deleting actions on items.
- #653 - Fix 2nd non-functional "Edit" option in 3-dot menu for active effects on mech sheets.
- #700 - Avoid unnecessary errors by ensuring only one client runs certain code on NPC and mech updates.
- #707 - Fix bug causing GM-initiated hp/heat changes from triggering structure/stress prompts for connected players.
- #709 - Fix size 0.5 PC tokens breaking the attack HUD.
- #712 - Properly import 2nd+ weapons on mounts (aux/aux and flex) during Comp/Con import.
- #713 - Remove non-functional "EFFECT" field from Status/Condition sheets.

# 2.1.4 (2024-06-19)

## Bug Fixes

- #696 - Use actor image instead of token image in attack HUD and attack chat cards to avoid broken images with animated tokens.
- #697 - Fix NPC tech attack features being modified to non-attacks after attacking.
- #698 - Fix Bond context menu on pilot sheets.
- #674 - Attempt to fix adding custom NPC features to NPC classes/templates by using the item ID as a default LID.
- #692 - Hide superheavy bracing warning for integrated superheavy weapons.
- #673 - Fix invade actions from Hacker talent.

# 2.1.3 (2024-06-16)

## Bug Fixes

- Fix some visual issues with NPC feature limited, loading, and charged cards.

# 2.1.2 (2024-06-16)

## Bug Fixes

- #688 - Fix issues interacting with items after drag-and-drop sorting. Item context menus, limited uses, loading, and charged toggles affected the wrong items; this is now fixed.
- #690 - Fix parsing of quick tech / full tech actions during LCP import. You will need to rebuild/re-import your LCPs to repair the affected items.

# 2.1.1 (2024-06-15)

## Misc

- Add a migration troubleshooting section to welcome journal.
- Add a banner image for the system card on the setup screen.
- Add default sprites for Calendula, Empakaai, Stortebeker, Orchis, Viceroy, Tempest, and Leech. Thanks, Retrograde!
- Update default sprites for Goblin, Pegasus, Nelson, Vlad, Metalmark, and Swallowtail. Thanks, Retrograde!

## Bug Fixes

- #676 - Fix import of NPC "on hit" effects. Requires re-importing LCPs to update compendium data.
- #679 - Ensure weapon damage can be edited on new NPC features.
- #678 - Fix bug causing all NPC tech actions to be treated as attacks. Requires re-importing LCPs to update compendium data.
- #683 - Include weapon mods in used SP calculation for mechs.
- #669 - Fix deployable stats reverting to defaults on refresh.
- #687 - Fix issues re-importing some third-party LCPs.
- #677 - Fix drag-and-drop sorting of mech systems and NPC features on actor sheets.
- Ensure bonuses are propagated to mechs and deployables when pilot or deployer are set.

# 2.1.0 (2024-06-08)

## Features

- #360 - Add tooltips to tags in chat and Actor sheets.
- Add localization for status names.

## Bug Fixes

- #638 - Fix an issue which caused automation settings to be disabled when migrating worlds from v10.
- #666 - Fix the tag editor not having the current tag selected by default.

# 2.0.4 (2024-06-06)

## Bug Fixes

- #644 - Enable limited system bonus from pilot gear (Integrated Ammo Feeds core bonus).
- #647 - Fix actor image mangling when importing actors from compendiums or moving them between compendiums.
- #655 - Enable overcharge sequence bonuses (Heatfall core bonus).
- #660 - Fix parsing of custom skills when importing pilots from Comp/Con.
- #662 - Fix broken links in Lancer Help dialog.
- #663 - Fix error when using the first power in a bond.
- #664 - Allow repairs to be used as a bar resource again.
- #665 - Increase background/text contrast in HA (purple) and GALSIM (orange) themes.
- #668 - Import pilot skills from LCPs. Also added item type counts to LCP description pre-import.
- #670 - Disable core Foundry vision mechanics attached to special status names ("Invisible" and "Blind").
- #672 - Fix bug causing all new actors to have name display as "Hovered by Anyone" regardless of core token defaults settings.

# 2.0.3 (2024-06-05)

## Bug Fixes

- #657 - Fix an issue causing nearly all actions to be imported as Quick.

# 2.0.2 (2024-06-04)

## Bug Fixes

- Make some improvements to the public `Flow` API for module developers to use.
- Fix pilot import tour. It was not updated after the Comp/Con login button was moved.
- Fix editing the "Notes" field on NPC actors.

# 2.0.1 (2024-06-03)

## Bug Fixes

- #641 - Fix error thrown on combat creation.
- #643 - Fix display of NPC Class flavour and tactics fields on the item sheet.
- Add `templates` property to NPC system data, to match the existing `class` property.
- Remove a duplicate and typo'd status name.
- Gracefully handle verbose action names during LCP import. (e.g. "Full Action" instead of "Full".)
- Fix an issue causing LCP import progress bar to finish too early if the LCP includes NPCs.

# 2.0.0 (2024-06-02)

_IT'S FINALLY HERE!_

This update to the system has been a long labour of love for myself and the rest of the team. Of course this includes long-awaited support for Foundry v11, but also a large refactor of the bones of the system. Largely this will be invisible to you as users, but it will make for easier maintenance of the system, development of modules to support Lancer, and expansions of the system automation. We hope you all enjoy!

Here is a summary of the changes, though in any refactor this large some items will get missed.

## Features

- #577 - Support for Foundry v11! We recommend using the latest stable version, 11.315+.
- #429 - The system's data model has been migrated away from the bespoke `machine-mind` library, now using Foundry's standardized `DataModel` framework. This will make future development, maintenance, module development, and macro writing much easier and Foundry-standard.
- #412 - Bond support! We now fully support the Bonds system, introduced in "Field Guide to the Karrakin Trade Baronies". Bond items can be added to Pilot actors. This includes some light automation for tallying XP. You can also select Stress and XP as token bar resources on pilot tokens.
- System automation rework. We designed and implemented a framework we call `Flows` for handling automation sequences, which is designed to be flexible and extensible. This will make adding to the automation in the future easier, as well as allow module developers to make targeted alterations to the automation, or even replace entire Flows wholesale. We are very excited to see what the community does with these!
- #574 - We now have themes! These echo the themes in Comp/Con and include: GMS Red (default, theme from 1.X and earlier), GMS Dark (same, but with dark background and light text), MSMC Solarized, HORUS Terminal, Harrison Armory Ras Shamra, SSC Constellar Congress, IPS-N Carina, FORECAST/GALSIM.
- #328 - When importing an LCP which includes NPC classes, basic actors for each of those classes are generated inside the "Premade NPCs" compendium.
- #475 - We have added Tours for the main features of the Lancer system.
- #573 - The compendiums have fancy custom banners!
- #580 - The compendiums have been condensed to make use of folders, reducing clutter.
- #496 - Counters on pilot sheets can now be deleted.
- #550 - The create actor dialog defaults to NPC now as it is the most common actor type to create, saving GMs a couple clicks.
- #582 - Lancer's measured templates now properly support gridless scenes.
- #601 - Tokens and prototype tokens automatically have the appropriate size set when the actor's frame or class changes.
- #605 - Carousel Combat Tracker integration.
- #594 - Structure and Overheat results now include a button to roll for Cascade if the mech has a system with the AI tag.
- Added a `fromLidMany` helper for use in chat messages and journals, allowing quick creation of references to Lancer compendium items.
- Removed the Sitrep, Environment, Manufacturer, and Quirk item types. These all either had poor support in the system, or were better served as simple text fields. Sitreps and Environments may see a return as Journals one day.
- Tags have been moved from a compendium of items to a system-level setting. This allows more consistent and tightly-bound behaviour.

## Bug Fixes

- #311 - Tech actions which are not tech attacks no longer trigger an attack roll.
- #324 - The Engineering mech skill no longer gives bonus uses to pilot gear.
- #338 - Integrated weapons are properly copied to mechs on import, instead of referring back to the uneditable compendium copy of the item.
- #350 - Added save target and sensors (for searching) to pilot stats.
- #352 - Text-only NPC features now consume charge/uses when used.
- #372 - Re-importing an LCP now updates the relevant items in the compendiums, instead of ignoring them.
- #399 - Dragging a Pilot, Mech, or NPC actor onto a Deployable updates the deployer correctly.
- #403 - Deployable cards shown on pilot and mech sheets now list all of their associated actions correctly, fixing the long-standing issue of Jericho displaying a full action to deploy.
- #416 - Chat message right-click menu is no longer hidden.
- #424 - Removing a class or template from an NPC now also removes all related features.
- #432 - Importing an LCP with special characters in an item ID (e.g. the Störtebeker) now correctly preserves those characters. Importing pilots who use the affected items should now import those items correctly.
- #489 - Pilot armor can now be increased past 1.
- #597 - Mech armor is no longer capped at 4, for all you White Witch pilots.
- #498 - Actions from mech core system actives/passives can now be used properly.
- #513 - dragging a weapon onto an occupied mount slot will now replace the original weapon.
- #524 - Reserves now save categories other than "resources".
- #549 - The Lock On status is now automatically removed from tokens when consumed during a tech attack.
- #581 - Improved the performance of target acquisition when placing Lancer measured templates.
- #616 - Weapons with the Limited tag now show a uses tracker on mech sheets.
- Actions inside mech weapons are now rendered on mech sheets.

# 1.6.1 (2023-07-16)

## Bug Fixes

- #570 - If no icon sets are selected, enable the default set.

# 1.6.0 (2023-07-15)

## Features

- Added status icons for dispersal shield to the "Hayley NPC" set.
- Last release should have been 1.6.0, so I'm fixing the version number now. 😉

## Bug Fixes

- The "Scan (Journal)" macro now correctly updates existing journals. You will need to drag a new copy of the macro out of the compendium.

# 1.5.5 (2023-07-13)

## Features

- Lancer Condition Icons is now integrated into the system. LCI settings are automatically migrated to the corresponding system settings.
- Status icon setting changes are applied live.
- Verified compatibility bump to 10.303.

# 1.5.4 (2023-04-26)

## Bug Fixes

- Fix a compatibility issue between CUB and the "consume lock on" feature.

# 1.5.3 (2023-03-31)

## Bug Fixes

- #529 - Fix issues with syncing pilot/mech images.
- Make the new Ruin macro actually show up in the compendium.

# 1.5.2 (2023-03-30)

## Features

- Add a reload macro to the compendium, courtesy of Valk.
- Update the ruin macro in the compendium, courtesy of Valk. Now searches for wreck images, and ignores biologicals.
- Add an `attackData` flag to attack roll `ChatMessage`s. Not user-visible, but contains data which may be useful to module devs.

## Bug Fixes

- #528 - Make Comp/Con login email case-insensitive. (Thanks Archiver#1883!)
- #397 - Partial fix for consume lock on bug. Lock on is removed when consumed if a GM user is logged in when the attack is rolled.

# 1.5.1 (2023-02-12)

## Bug Fixes

- #521 - Fix chat button macro for reserves.
- #522 - "Resources" was listed twice in reserve type selector.
- Fix bug in Scan (Journal) compendium macro which caused it to fail if the token actor name had been modified.

# 1.5.0 (2023-02-11)

## Features

- #268 - Add Reserves to Pilot sheets! Thanks to dodgepong for a lot of the heavy lifting on this one!
- #509 - Add role to NPC Class sheet.
- Added "Scan to Journal" macro to compendium - thanks Valkyrion and Vixiea!
- Updated "Custom Paint Job" macro for CUB/Triggler to work with v10 - thanks CSMcFarland!
- Added feature to embed references to Lancer items from compendiums. e.g. @LancerID[mw_shotgun] - thanks Bolts! Examples:
  - `@LancerID[mf_blackbeard]` - reference to the Blackbeard frame item.
  - `@LancerID[mw_shotgun]{Boomstick}` - reference to the GMS Shotgun mech weapon, with the embed button saying "Boomstick".
- Use Foundry's built-in scene progress bar for displaying LCP import progress.

## Bug Fixes

- #469 - Fix max value on NPC Class sheet stats.
- #486 - Fix misleading message when overheating single-stress NPCs.
- #494 - Fix displaying bonus data twice on Core Bonus Sheet.
- #520 - Fix bug causing actor and prototype token images to desync.
- Migrate v9-format compendiums to v10 format.
- Fix some errors during Comp/Con import.

# 1.4.2 (2023-01-21)

## Features

- #507 - Update README and welcome message to use the Lancer 3rd Party License.

## Bug Fixes

- #510 & #512 - Fix issues preventing Comp/Con import.
- #511 - Fix issue causing token images to be overwritten with actor image on every edit to the actor.
- #516 - Fix bug preventing actor Size changes from automatically configuring prototype token dimensions.

# 1.4.1 (2023-01-17)

## Bug Fixes

- #500 - Fix activation icon size in popout combat tracker.
- #503 - Fix bug causing new item creation to fail.
- #506 - Fix bug causing some tokens to be automatically resized on load.

# 1.4.0-beta.1 (2023-01-03)

## Features

- Beta release for Foundry v10 compatibility!
- Several QOL updates to Scan macro including better organization and hiding Exotic features.
- Added `game.lancer.fromLid` and `game.lancer.fromLidSync` functions to allow module and macro devs easier lookups in Lancer compendiums.

# 1.3.1 (2022-09-04)

## Bug Fixes

- #463 - Add missing delete button for range types in NPC features.
- Add a section with basic attack macro buttons to all actor sheets (including pilots and deployables).
- Update core data to lancer-data version 3.0.46.

# 1.3.0 (2022-09-03)

## Features

- #23 - Added JSON import for pilots
- #396 - Added settings for alternate measurement modes on square grids. Options include 1-1-1 (default, diagonals cost 1), 1-2-1 (diagonals alternate between costing 1 and 2), 2-2-2 (Manhattan distance), and rounded Euclidean distance.
- #425 - "Wreck" macro now removes target from the combat tracker.
- #426 - Improve action tracker. Non-functional buttons on mech sheet removed, tracker refreshes on turn start, added refresh button.
- #442 - The basic attack HUD no longer pops up when targeting a token.
- #451 - Add integration and support for the Combat Carousel module.
- Added buttons on mech sheets for common macros: Stabilize, full repair, structure, and overheat.

## Bug Fixes

- #408 - Counters with max values greater than 10 no longer show hexes so that they don't overflow the sheet.
- #417 - Fix 404's caused during Comp/Con import in some situations involving duplicated pilots.
- #420 - Fix the counter editor to make it fully functional.
- #434 - Fix typo in the "destabilized power plant" overheat result which stated electric damage instead of energy.
- #435 - Fix bug when removing features from an NPC Class or Template item. The feature is now removed from the class/template's list instead of attempting to delete the feature from the world or compendium.
- #449 - Fix bug preventing drag-drop of weapon mods in browsers other than Firefox. The mod location is now always shown when empty, allowing mods to be dropped onto the location.
- Add missing delete button for damage types in NPC features.
- Fix Dice So Nice integration to correctly show damage dice on non-critical hits. Attack and damage dice are now staggered as well.
- Counters from talents can have their values edited correctly from either the pilot or talent sheet.

# 1.2.0 (2022-04-19)

## Features

- Update the pilot import system to use Comp/Con's new share code system. "Vault" and "cloud" style codes are no longer supported.
- Update Lancer Initiative to take advantage of Foundry v9 features, eliminating the "Dummy Combatant".
- Added Custom Paint Job macro from \[REDACTED\] to the Macros compendium.
- Added Scan macro from Jazzy (and speck and Valkyrion) to the Macros compendium.
- Added Mimic Gun macro from Infalle to the Macros compendium.

## Bug Fixes

- #249 - Imported Mechs with multiple copies of weapons/systems now create unique instances of each.
- #391 - Selecting "clear burn" in the Stabilize macro now automatically clears burn on the actor.
- #392 - Structure/Stress macro no longer locks up when run manually on an actor with 0 remaining.
- Full Repair macro now clears conditions, burn, and overshield.
- Condition renamed from "SLOW" to "SLOWED" to match the core rulebook. CUB-users will need to update their conditions to match.

# 1.1.0 (2022-01-25)

## Features

- #378 - Full compatibility with Foundry v9.
- #5 - Lancer Initiative has been rolled into the system, so it no longer needs to be installed separately!
- #62, #129 - Added generic tech attack roller to NPC sheets.
- #70 - Integrated weapon and system details are now shown on mech frame item sheets.
- #228 - Remaining generic item reference boxes have been replaced with more informative cards on all sheets.
- Added more information on weapon mod previews. They should be more useful now!
- Added a setting under system automation for limited systems uses tracking.
- Improved tracking for limited systems uses in several areas.
- Improved tracking and editing for counters in several areas.
- Added chat macro for frame traits.

## Bug Fixes

- #313 - Fix issue causing duplicate weapon tags on LCP import.
- #335 - Fix issue causing custom-selected token art to be overwritten during sync.
- #346, #362 - Edit locations for effect, on-hit, on-attack, and on-crit added to mech weapon sheet.
- #353 - NPC weapons now correctly apply self heat.
- #354 - NPC basic attacks now correctly use tier as attack bonus.
- #363 - Mech weapon sheet loading tracking is now functional.
- #367 - NPC feature drag and drop functions are repaired on NPC actor sheet and NPC class & template sheets.
- #368 - Overcharge counter is now reset by the full repair macro.
- #381 - Fix issue causing NPC tech attacks to not initialize the attack roller with their innate accuracy.
- #387 - Core systems on mech sheets show actions.
- #389 - Fix issue causing non-roll macros to always be whispered to GM.
- Fix missing Blast 1 macro in AOE Templates compendium.
- Several error messages now provide more useful information.
- Overheat automation now correctly states that single-stress actors are exposed, instead of stating they melt down.

# 1.0.3 (2021-09-22)

## Features

- Reorganized system automation settings into their own sub-menu.
- Structure/stress macros now use a HUD similar to attacks, improved logic, and automatically trigger (unless disabled via automation settings) when hp <= 0 and heat > max.
- #229 - Weapons with the self heat tag now apply heat to the owner when used.
- Add context menus to item preview cards with options to edit, remove, and mark as destroyed/repaired. Replaces the static delete buttons and "click _almost_ anywhere to open the item" functionality.

## Bug Fixes

- #309 - Adding Fomorian Frame to size 1/2 mechs correctly sets size to 1 instead of 1.5.
- #334 - Fix a local caching issue when retrieving pilot data from Comp/Con vaults.
- Fix file pickers for actor images rendering behind actor sheets instead of in front.
- Fix token bars not rendering in Foundry v9.
- Fix NPC recharge macro sometimes not firing at start of turn.

# 1.0.2 (2021-09-08)

## Features

- #120 - Mechs and NPCs which do not have custom artwork set will now use a set of defaults from [Retrograde Minis](https://www.retrogrademinis.com). Thanks a ton to Retrograde for letting us use their fantastic artwork!
- #122 - Changing the size of Mech and NPC Actors will set the appropriate square token size and Hex Size Support configuration, if that module is installed and enabled.
- #178 - Add handling for "overcharge" bonuses on pilot & mech items. Heatfall CB (and any homebrew LCPs that affect overcharge) now correctly modify the overcharge roll sequence.
- #292 - Add active mech management to pilot sheet, including list of inactive mechs.
- The Pilot sheet has been reorganized to be more similar to Comp/Con. The NARRATIVE tab now contains pilot-centric data (LL, grit, skill triggers, and pilot gear), and the TACTICAL tab contains things which affect mechs (Counters, HASE, Talents, Licenses, Core Bonuses).

## Bug Fixes

- #298 - Fixed remaining cases where macros rolled from an unlinked token's sheet did not use that token's state for the roll.
- #300 - Fix CORS issues with default token images by packaging defaults (Retrograde artwork) within the system.
- #301 - Fix issue causing imported mechs' tokens to default to unlinked and hostile.
- #310 - Fix issue erroneously preventing macros from linked mech/pilot token sheets.
- Fix issue preventing use of talent rank macros from mech sheet.
- Fix issue causing irregularities with Sensor Sight token detection radius.
- Fix issue preventing display of size 1/2 icon on various sheets.
- Crit damage rolls now comply with Lancer RAW procedure, re-using the normal damage roll results.

# 1.0.1 (2021-09-02)

## Features

- Bolts has added a button to the attack HUD for placing templates according to the weapon's profile! Tokens under the template will be automatically targeted, updating the attack HUD.
- The AoE Macros compendium has been updated so that the templates automatically target tokens they are placed upon.

## Bug Fixes

- #297 - Impaired is now applied to tech attacks as well.
- #298 - Macros rolled from an unlinked token's sheet will use that token's name in chat.
- #299 - Invisibility applies before any other attack modifiers, and spotter now correctly rerolls the entire attack roll.
- #307 - Fixed talent action macros on mech sheets.

# 1.0.0 (2021-08-31)

If you are coming here from Lancer v0.1.x / Foundry 0.7.x, welcome! For you, nearly everything is new; the changes listed below accounts for changes from the latest version of the beta release.

## Features

- The accuracy/difficulty prompt has been completely revamped as an attack prompt and a check prompt, thanks to sohum! The new version is more informative and responsive, allows setting acc/diff individually on multi-target attacks, and automatically adjusts based on the Impaired status on the attacker and Lock On status on the target.
- The template macros in the AoE Macros compendium have been repaired and updated, thanks to Bolts! For now, there are no user-visible changes, but the groundwork is laid for integrating them with the new attack prompt, including automatic targeting of tokens under the laid template.

## Bug Fixes

- #233 - We no longer override the token data on new Actors, allowing the Foundry configuration for default settings to work as expected.
- #260 - Dice So Nice (and other modules that trigger on dice rolls) will once again trigger on skill check rolls.
- #262 - Importing an Actor from a compendium no longer overwrites the imported data with defaults.
- #271 - Actor attribute names have been standardized. Pilots now have burn and overshield, and the unnecessary `current_` prefix on many attributes have been removed.
- #276 - Fix a small formatting issue on the secondary roll button in structure/stress chat messages.
- #278 - Add capability to rename and delete weapon profiles via right click menu.
- #280 - Show talent actions alongside talents in pilot/mech sheets.
- #288 - Remove an unnecessary warning displayed during structure/stress macros.
- #293 - Fix the action editor.

# 0.9.6 (2021-08-10)

## Features

- #128 - Better COMP/CON Sync UI

## Bug Fixes

- #222 - Better readiness trackers
- #252 - Calculate overkill correctly
- #261 - Fix structure/stress macros
- Add a minimum height to the tags section non-tagged items can be dropped on
- Fix action trackers
- Fix token attributes for HP and Heat
- Import pilot and mech images
- Re-add the core passive macro

## Bug Fixes

- #222 - Better readiness trackers
- #252 - Calculate overkill correctly
- #261 - Fix structure/stress macros
- Add a minimum height to the tags section non-tagged items can be dropped on
- Fix action trackers
- Fix token attributes for HP and Heat
- Import pilot and mech images
- Re-add the core passive macro

# 0.9.5 (2021-07-11)

## Features

- #235 - Importing Status & Conditions compendium now
- #70 - Partially resolved, will show the _first_ integrated weapon on the sheet
- #176 - Better item sorting
- Superheavies can now be braced
- Can now track your inventory to see what you don't have equipped!
- Initial localization work--while we still only have English, any volunteer translators can begin translating to other languages!

## Bug Fixes

- #174 - Should now remove NPC Features on Class removal in all cases
- #234 - NPC Notes are now saved
- #231 - Tweak roll display for better usability
- #230 - Can now roll Loading weapons
- #226 - Template Macros fixed
- #236 - Can now use Talent sheets
- #243 - Temporary fix for wobbling text

# 0.9.4 (2021-06-16)

## Features

- #174 - NPCs now tie into their classes more closely, removing Features as Classes are removed
- #132 - Structure and Stress rolls now prompt in chat for sub-rolls
- More robust drag & dropping everywhere!
- Simple COMP/CON Vault importing has been implemented. A more robust/prettier version to come!
- Compatible with 0.8.7
- Derive Speed for use with Drag Ruler or other modules

## Bug Fixes

- #110 - NPC Classes now fully support feature adding/removal
- #207 - License Preview now opens license sheet on click
- #210 - Tokens now let you edit HP/Heat again!
- #211 - Crits don't double flat values anymore
- #212 - Overkill heat applied again
- #213 - Applying conditions no longer reset token HP values
- #214 - Can now overcharge again
- #215 - Custom counters now allow greater control
- #217 - Can drag & drop NPC features from compendiums onto sheets again
- #219 - Can safely import items and actors from compendiums again
- #221 - NPC Templates add Structure/Stress again

# 0.9.3 (2021-06-02)

## Features

- Now supporting FoundryVTT version v0.8!
- Improved action manager

## Bug Fixes

- #199 - Better NPC Feature Sizing
- #197 - Allow rolling of weapons without damage
- #195 - Fixes to the action tracker
- #187 - Allow for user-breaking of systems
- #185 - UI for limited weapons
- #180 - Better mount selection
- #179 - Can alter license ranks
- #175 - Can add NPC Features to tokens
- #173 - Grit rolls for mechs and NPC rank rolls for NPCs
- #172 - Better roll logic, especially for crits
- #166, #62 - Fix NPC Tech actions
- #163 - Active mech loadout

# 0.9.2 (2021-05-08)

## Features

- **Player Charges**: Add support for LIMITED, LOADING, and USES tags for systems and some weapons. This allows for proper tracking of resources on actor sheets, and if combat automation is enabled in the settings, then this will also tie into the combat roll workflow (Unloaded weapons can't be fired, etc.).
- **NPC Charges**: Add NPC sheet support uses and RECHARGE abilities. If combat automation is enabled, at the start of an NPC turn a Recharge roll will be made and report which systems made the roll, and automatically charge them.
- **Weapon Profiles**: Add profiles to weapons in tabs.
- **Action Manager**: First draft of the action manager. While controlling a token, a (movable) HUD will appear. If you've used Comp/Con's active mode, this will be very similar to the action bar at the bottom right. Currently actions need to be manually spent for actions (When done moving, click the move action button, etc.). The core workflows of the action system is there:
  - When starting a turn, a token's actions are refreshed.
  - When ending a turn, all remaining actions are wasted (minus Reaction, which is immediately refreshed at every turn).
  - When spending a Quick action and a Full action is available, the Full action is spent instead (represents the 2 Quick = 1 Full conversion).
- **Action Editing**: First draft of action editing on all manner of items, first step towards homebrew and ease-of-use UX.
- (0.9.1 but not documented) Right clicking weapon icons will toggle destroyed state. This will eventually be folded into a proper context menu.

## Bug Fixes

- Fixes for NPC tech and attack macros.
- Fixes for attack card.
- Fixes for FLEX mounts showing extra possible slots in some situations.
- #183 - NPC sheet path fixes.
- Lots of refinement and styling fixes.
- Fixes for drag drop and previews.

# 0.9.1 (2021-04-30)

## Features

- **Attacks**: Now auto-calculates if a targeted attack hits.
- **Macros**: #145 Added Stabilize and Full Repair Macros

## Bug Fixes

- #147 - Correctly calculates Max Uses of a system
- #154 - Fixed weapon data being pulled in incorrectly
- #156 - Structure/Stress Rolling again
- #157 - NPCs can now roll again
- Added HASE buttons to NPCs
- NPC Classes now show more data
- #161 - Macros now support the proper chat privacy selection

# 0.9.0 (2021-04-22)

## Features

System completely rebuilt from the ground up to support the new COMP/CON data structure!

# 0.1.21 (2021-08-18)

- **Version Warning**: Add a warning when run on Foundry 0.8.x stating incompatibility and what options are available.
- **Mech Sheet**: Fix for missing core power icon.

# 0.1.20 (2021-01-20)

## Features

- **Macros**: Add automatic crit damage handling. Thanks, descention!
- **Macros**: Add item and actor IDs to attack cards to increase module support. Thanks, kreisl!

## Bug Fixes

- **NPC Sheet**: Updating an NPC's embedded class also updates the NPC's stats. Closes #127.

# 0.1.19 (2020-12-17)

## Features

- **Macros**: Add options object for attack macros to specify static attack bonus and bonus damage. Partial for #117.

## Bug Fixes

- **Macros**: Fix a bug with structure/overheat macros that displayed the wrong result when multiple 1's are rolled.
- **NPC Sheet**: Fix a bug preventing NPC features from being deleted. Closes #123.

# 0.1.18 (2020-12-15)

## Bug Fixes

- **Macros**: Fix a bug with the structure/overheat macros that decide to declare your mech destroyed if structure/stress are full.

# 0.1.17 (2020-12-15)

## Features

- **Macros**: Structure and Overheat macros have been added. They can be found in the "LANCER Macros" Compendium, and their functionality can be customized using the system settings. Closes #91.
- **Macros**: Macros for placing common AOE templates have been added. They can be found in the "AoE Templates" Compendium.
- **NPC Classes**: Add functionality to NPC Class sheet allowing features from Compendium to be added. Partial for #110.

## Bug Fixes

- **NPCs**: Don't override NPC stat values when duplicating NPCs. Closes #94.
- **Pilot/NPC Sheet**: Fix a bug which overwrites prototype token name even if the Actor's name was not edited. Closes #116.
- **Item Sheets**: Fix some inconsistencies in how range and damage selectors were handled, which caused charge-type systems in particular to lose data when saved. Closes #116.
- **Macros**: Fix and improve Overkill handling for attack macros.

# 0.1.16 (2020-11-25)

## Bug Fixes

- **Pilot Sheet**: Syncing Comp/Con cloud saves no longer fails with a 401 error. Closes #113. Again.
- **Pilot Sheet**: Fix an issue where some synced pilots caused the pilot sheet to not render after syncing. Closes #115.
- **Macros**: Pilot skill trigger and overcharge macros rolled from the sheet no longer fail if no token is selected.

# 0.1.15 (2020-11-22)

## Features

- **Pilot Sheet**: Syncing Comp/Con cloud saves now sets up mounts and adds weapons to them. Closes #75.

## Bug Fixes

- **Pilot Sheet**: Syncing Comp/Con cloud saves no longer fails with a 401 error. Closes #113.
- **Macros**: Using a macro from the hotbar no longer fails if no token is selected.

# 0.1.14 (2020-11-19)

## Features

- **Pilot Sheet**: Added Overcharge macro. Closes #101.
- **Status Icons**: Added NPC tier icons. Partial work for #92.

## Bug Fixes

- **Compendium Manager**: Fix bug where item name was used instead of item ID when finding items to update from an LCP. Closes #108.
- **Pilot Sheet**: Don't add mech weapons when syncing a Comp/Con pilot.
- **Pilot Sheet**: Fix reversed current and max repairs when syncing a Comp/Con pilot. Closes #109.
- **Item Sheets**: Save new item name into system data so that item previews show the updated name. Closes #111.

# 0.1.13 (2020-11-08)

## Features

- **Pilot Sheet**: Added macros for pilot gear, core bonuses, core actives, and core passives. Closes #10.
- **Pilot Sheet**: Added basic Overcharge tracking. Partial solution for #101.
- **NPC Sheet**: Added macros for systems, traits, and reactions. Closes #10.
- **NPC Sheet**: Added a link beside the class name to open the NPC's class item.
- **NPC Class Sheet**: The Base and Optional Feature sections are now populated with previews of the features. The previews can be dragged onto NPC sheets to add the items to the NPC, without opening any Compendiums. Closes #106.
- **NPC Template Sheet**: Likewise populates the Base and Optional Feature sections with draggable feature previews. Closes #106.
- **Migration**: Migration logic is now more intelligent, avoiding unnecessary migrations each version update.

## Bug Fixes

- **Macros**: NPC Weapon "On Hit" effects now show in chat. Closes #95.
- **NPC Sheet**: Fix a issue causing NPC Templates to be un-deletable. Closes #97.
- **Status Icons**: Improved status icons to include tooltips in the token HUD. Closes #93.
- **General**: Fix an issue causing the system to fail to load on Foundry 0.7.6. Closes #107.

# 0.1.12 (2020-10-21)

## Bug Fixes

- **General**: Fix a bug where some parts of the system tried to load too soon and failed fatally.

# 0.1.11 (2020-10-21)

- **Foundry Core Support**: This update moves the supported Foundry core version to the 0.7 series.

# 0.1.10 (2020-10-11)

## Bug Fixes

- **Pilot Sheet**: Fix bug preventing superheavy weapons from being added to mounts. Closes #88.

# 0.1.9 (2020-10-11)

## Features

- **Pilot Sheet**: Added macros for sending Talents and Mech Systems to chat. Starts #10.
- **Hotbar**: Add drag-to-hotbar macro creation for several items on Pilot and NPC sheets. Closes #53.

## Bug Fixes

- **Pilot Sheet**: Fix bug preventing weapons from being added to Aux/Aux and Main/Aux mounts. Closes #83.
- **Pilot Sheet**: Fix bug causing weapons to become un-rollable after editing. Closes #86.
- **Pilot Sheet**: Fix bug causing History and Notes sections to flicker when hovering over edit button. Closes #87.
- **Status Icons**: Added white versions of status/condition icons for use on tokens.
- **Status Icons**: Fix an issue preventing status icons from being shown on Firefox.

# 0.1.8 (2020-10-04)

## Features

- **Everywhere**: Hide default increment/decrement arrows on number inputs, which were causing issues. Some number inputs now use new, larger increment/decrement buttons. Partial fix for #48.
- **Pilot Sheet**: Add a core power toggle. Closes #52.
- **Attack Macros**: Add single-depth Overkill rerolling, and a button to roll another d6 if needed.
- **Status Icons**: Add status and condition icons from Comp/Con icon set. Closes #24.

## Bug Fixes

- **Pilot Sheet**: Fixed an issue preventing Aux/Aux and Main/Aux mounts from being created. Closes #73.
- **Pilot Sheet**: Cloud import now properly sets the Actor name. Closes #79.
- **Pilot Sheet**: Fix drag-and-drop item sorting.
- **NPC Sheet**: Fixed a bug preventing NPC HASE macros from rolling. Closes #76.
- **Compendiums**: Fixed a bug causing modified items in the Lancer compendiums to prevent the system from loading properly. Closes #78.
- **Compendium Manager**: Removed the setting to create system-wide compendiums, which caused issues with pilot imports. Closes #80.

# 0.1.7 (2020-09-27)

Hotfix to correct new issue with pilot sheet not loading.

# 0.1.6 (2020-09-27)

## General

- **Pilot Sheet**: Move the cloud sync tab to leftmost, rename to "RM-4://SYNC" to mirror Comp/Con UI.
- **Pilot Sheet**: Record and display the last time the pilot was downloaded from cloud save.

## Bug Fixes

- **Pilot Sheet**: Fix bug where charge effects' HTML wasn't closed properly, resulting in the cloud import UI elements not showing on affected pilot sheets. Closes #72.
- **Comp/Con Cloud Save Import**: Fix bug where pilots with custom skills would not import. Closes #71.

# 0.1.5 (2020-09-27)

## Features

- **LCP Import**: It's finally here! The Lancer Compendium Manager is your new friend for building/updating Compendiums with Lancer core data and LCPs. Closes #15.
- **Comp/Con Cloud Save Import**: Pilots can now pull data from a Comp/Con cloud share code, automatically building the pilot and their mech (except for weapons) and calculating stats. Partial work for #23.

## Bug Fixes

- **NPC Sheet**: Fix bug where ranges weren't shown on NPC weapon previews. Closes #68.

# 0.1.4 (2020-09-12)

## Bug Fixes

- **NPC Feature Sheet:** Fix bug where new NPC weapons only show 1 damage field. Closes #64.
- **Item Import/Duplication:** Fix issue where duplicated/imported items had properties overwritten. Closes #65.

# 0.1.3 (2020-09-07)

## General

- Updated Foundry Core compatibility version to 0.6.6.
- Standardized a lot of sheet components to make appearance and future development better.
- Changed default grid distance and unit to 1 unitless, instead of 10 feet.
- Greatly reduced the file size of the faction logos.

## Features

- **Mech Systems/Weapons:** Added effects rendering for all effect types currently supported in Comp/Con. They are rendered on pilot sheet and in chat when a weapon macro is used. Closes #22.
- **Mech Systems:** Added editability for Basic, AI, Bonus, and Charge-type effects.
- **Frame Sheet:** Improve appearance and editability of Frame sheet. Core system description, passive effect, and active effect can now all be edited even if not currently present on the Frame.

## Bug Fixes

- **Pilot Sheet:** Fixed custom frames (user-created Item) not showing their name on pilot sheets. Closes #57.
- **Usability:** Removed functionality which deleted weapons or systems from a Pilot on right-click. Closes #56.
- **Tokens:** Fixed a bug which caused NPC and Deployable prototype token images to be overwritten when the parent sheet image was changed. Closes #61.
- **Macros:** Character sheet macro rollers now always use the sheet's Actor as the speaker.

# 0.1.2 (2020-07-29)

## Bug Fixes

- **General:** Fix a bug which could cause Item data to be lost during version migration or duplication.
- **NPC Sheet:** Editing the name field now renames the Actor and prototype token, closes #55.

# 0.1.1 (2020-07-26)

## Bug Fixes

- **Macros:** Add "Cancel" button to accuracy prompt. Clicking cancel or closing the prompt will abort the roll. Closes #45.
- **Macros:** Fix NPC weapon macros, closes #47.
- **Frame sheet:** Fixed adding traits and mounts, closes #44. (Thanks, Grygon!)
- **NPCs:** New NPCs start at 0 heat, closes #49.
- **NPCs:** Increase NPC class sheet default width, part of #48.

## Features

- **Macros:** Add HASE macro buttons to mech tab of pilot sheet, closes #54.
- **Macros:** Add NPC tech attack macros.
- **Pilot sheet:** Render charge effects in systems previews, closes #46. (Thanks, Grygon!)
- **Frame sheet:** Improve core system editability.
- **NPC Features:** Add support for all feature types to feature sheet and NPC sheet, closes #36.

# 0.1.0 (2020-07-19)

## Alpha release!

A huge thank you and shout-out to Animu36, Grygon, and Staubz, without whose help this initial release would have taken many more weeks!

The system is bare-bones, but should be stable for play. Features existing as of this release:

- Compendiums containing all of the Core Book player-side content.
- Pilot sheet with sorted Items, mount handling (thanks, Animu!), support for frame swapping by drag-and-drop, and some macro buttons.
- NPC sheet with support for class swapping by drag-and-drop (thanks, Staubz!), and some macro buttons.
- Editable sheets for each Item type (thanks, Grygon!):
  - Skill Triggers
  - Talents
  - Core Bonuses
  - Pilot Armor, Weapons, and Gear
  - Mech Frames
  - Mech Weapons
  - Mech Systems
  - NPC Classes
  - NPC Templates
  - NPC Features

## Recommended Companion Modules

- Lancer Condition Icons - status/condition icon sets tailored towards Lancer.
- Hex Size Support - Improves Hex grid snapping, movement, and ruler measurement for hex tokens larger than size 1.
- Popcorn Initiative - Add-on popcorn initiative management system.

## Known Issues

- Weapons, systems, and NPC features do not render all of their effects yet. Since the Compendiums are generated using `lancer-data` (the same data library that Comp/Con uses), the effects are broken down into the special types that Comp/Con supports. Implementing proper rendering and then editability for special effects types will be added soon. This may be delayed until the recently announced changes to the data are complete on the Comp/Con side.
- No NPCs included! As the Core Book NPCs are part of the paid content for Lancer, they cannot be included in the system upon install. An LCP import tool is coming, which will allow you to use the Comp/Con NPC pack (download from the [Core Book itch.io page](https://massif-press.itch.io/corebook-pdf)) to automatically build/update NPC Compendiums. For now, NPC stats will need to be entered manually.
- Does not include [Long Rim](https://massif-press.itch.io/the-long-rim) or Wallflower player content. Again, LCP import is coming!
