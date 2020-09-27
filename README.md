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
* Pilot skill triggers
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
Pilot sheets now have a fourth tab - <CLOUD//SYNC> - where new pilots can enter a Comp/Con cloud share code and click the download button to import your Comp/Con pilot into Foundry! Mech mounts and weapons are not yet imported and will need to be manually added as before.

![Comp/Con Import](https://i.imgur.com/EtFNMTd.gif)

## System Installation
**NOTE: This system is in Alpha! While technically released, it is not feature complete. There are probably bugs! If you find some, please submit an issue so we can keep track of it.**

To install, click "Install System" in the Foundry setup menu and enter this URL in the "Manifest URL" box: https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/master/src/system.json, then click "Install". 

Once the system is downloaded, create a world which uses it and go exploring!

## Development Setup
Development prerequisites are `npm` and `gulp`. Updating to the latest version of Node.js is also recommended.

This guide is written with Linux in mind, although most steps are similar on Windows.

First, ensure you have `npm` installed. There are a few ways to do this, [here's a handy guide for Linux](https://linuxize.com/post/how-to-install-node-js-on-ubuntu-18.04/).

Install packages and `gulp`

```
npm install -g gulp-cli
npm install
```

To update Node.js, you can follow [this guide](https://phoenixnap.com/kb/update-node-js-version). Version 10 is the minimum requirement and can be confirmed by using the command `node -v`.

### Link
In order for the project's build task to update the system files in your Foundry instance, you need to link the project's `dist` directory to your Foundry data directory (the one containing Config, Data, and Logs). This can be done automatically by `gulp`. To do so, edit `foundryconfig.json` with the path to your Foundry data directory, then run the `link` script:
```
gulp link
or
npm run link
```
#### Linking on Windows 
Windows seems to think that creating symbolic links is dangerous, so this script must be run using an Administrator command prompt/Powershell.

#### Linking with Docker
You won't want to do this if you're running Foundry in a docker container--it doesn't handle externally-created links well. Instead, you can manually copy over the folder each time it's built, or link it from inside the container. 
To link, you'll need to make sure the repository lives somewhere accessible by the container.

Note that the way you build your container can make these commands vary a lot:
```bash
docker exec -it {FOUNDRY_CONTAINER} bash
ln -s {PATH_TO_REPOSITORY}/dist {PATH_TO_FOUNDRY_FOLDER}/Data/systems/foundry
```

### Build
Once you have your import process set up, you're ready to build.

To compile once, use the `build` script:

```
gulp build
or
npm run build
```

To compile whenever a file changes, use the `watch` script:

```
gulp watch
or
npm run watch
```

To see all the tasks, use

```
gulp -T
or
npm run
```

Once a build is completed, files will be placed in the `dist` folder. If you also completed the `link` task mentioned above, they'll also be placed in your systems folder, and ready to use in Foundry!
