# FoundryVTT - Lancer
A Foundry VTT system for the [Lancer RPG](https://massif-press.itch.io/corebook-pdf) by [Massif Press](https://massif-press.itch.io/). 

## Attribution and Acknowledgements
The Lancer universe and all related setting materials are copyright Massif Press, used by permission.

This project incorporates several resources and open source software (either in part or in whole). Without these, this project would be much poorer, and might not even exist in the first place. A huge thank you to all those who use their time and skills to enrich the world with their creations!
* [Comp/Con](https://compcon.app), the incredible companion app for Lancer, created by beeftime and ari. ([Github](https://github.com/massif-press/compcon))
* Comp/Con icons, created by megane.
* Some icons are adapted from Font Awesome - see [Icon Attributions](dist/assets/icons/ATTRIBUTION.md).
* [lancer-data](https://github.com/massif-press/lancer-data), a JSON library of Lancer content.
* [Foundry Project Creator](https://gitlab.com/foundry-projects/foundry-pc) by NickEast, without which this project would have taken much longer to find its feet!
* [Material Design Icons](https://materialdesignicons.com/), open source community-led iconography.

Additionally, a huge thank you and shout out to Animu36, Staubz, and Grygon for their help getting the alpha release brought up to speed and out the door!

## Feature Demos
### Lancer Compendium Manager (aka LCP Importer)
The Lancer Compendium Manager is used to create and update Compendiums of Lancer items. It is used both to update the core data and to import additional items from Comp/Con data packs (.lcp files). After core data or an LCP is converted to Compendiums the first time, updating or re-importing will update the matching items in the Compendiums. The item types which can currently be imported are:
* Pilot skill triggers (including custom skills)
* Talents
* Core bonuses
* Pilot equipment (armor, weapons, gear)
* Mech frames
* Mech systems
* Mech weapons
* NPC classes
* NPC templates
* NPC features

Open the Lancer Compendium Manager using the button at the bottom of the Compendium tab. Core data comes packaged within the Lancer system; when new data is available the update button will be visible next to the core data version.

![Lancer Compendium Manager](https://i.imgur.com/R5Iw2x4.png)

The Import/Update LCP area can be used to select an LCP file and import it. Once a file is selected, a preview showing the name of the LCP, version, author, description is given. Finally, the Clear LANCER Compendium Data can be used to erase all data from your Lancer Compendiums (after a confirmation prompt - no single-click deletions!), in case something goes wrong or you want to start from a fresh slate.

![LCP Import](https://i.imgur.com/ibFhiIw.png)

### Comp/Con Cloud Save Importing
Pilot sheets now have a fourth tab - <RM-4://SYNC> - where new pilots can enter a Comp/Con cloud share code and click the download button to import your Comp/Con pilot into Foundry! Mech mounts and weapons are not yet imported and will need to be manually added as before.

![Comp/Con Import](https://i.imgur.com/Nm0mMIB.gif)

## System Installation
**NOTE: This system is in Alpha! While technically released, it is not feature complete. There are probably bugs! If you find some, please submit an issue so we can keep track of it.**

To install, click "Install System" in the Foundry setup menu and enter this URL in the "Manifest URL" box: https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/master/src/system.json, then click "Install". 

Once the system is downloaded, create a world which uses it and go exploring!

## Development Setup

[See here](https://github.com/Eranziel/foundryvtt-lancer/wiki/Development-Setup)
