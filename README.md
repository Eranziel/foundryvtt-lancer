# foundryvtt-lancer
A Foundry VTT system for the [Lancer RPG by Massif Press](https://massif-press.itch.io/corebook-pdf-free).

## Foundry Installation
**WARNING: This system is not yet released! There is no guarantee of quality or compatibility - try at your own risk! Things may not work properly, data may mysteriously vanish, and updates may break your world!**

If you still wish to install the Lancer system to test, click "Install System" in the Foundry setup menu and enter this URL in the "Manifest URL" box: https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/master/src/system.json, then click "Install". 

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
