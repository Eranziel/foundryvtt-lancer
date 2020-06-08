# foundryvtt-lancer
A Foundry VTT game system for LANCER RPG. 

## Setup
To set up your environment up to test the system or contribute, you have two options: download the latest packaged version, or build from source.
### Download
If you don't intend to contribute, this is probably the way for you. Note that until the system is released as an official system in foundry (available from the system browser) there will be no guarantee of quality or compatability--try at your own risk!

In Foundry, click "Install System", then paste in the following manifest URL: https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/master/src/system.json

This will import the latest build, hopefully without any issues. Feel free to create a world and try it out with this!

### Build
To build the system from source, you'll need to use npm and gulp.

This guide is written with :inux in mind, although I'm sure many steps are similar on Windows.

First, ensure you have npm installed. There are a few ways to do this, [here's a handy guide](https://linuxize.com/post/how-to-install-node-js-on-ubuntu-18.04/).

Install packages and `gulp`

```
npm install
npm install -g gulp-cli
```

Then, you have the option to have gulp handle folder linking for you. To do this, add your Foundry environment folder (the one container Config, Data, and Logs) to foundryconfig.json. Then, run "gulp link" to link the folder.
``` 
gulp link
```

You won't want to do this if you're running Foundry in a docker container--it doesn't handle externally-created links well. Instead, you can manually copy over the folder each time it's built, or link it from inside the container. 
To link, you'll need to make sure the repository lives somewhere accessible by the container.

Note that the way you build your container can make these commands vary a lot:
```
docker exec -it {FOUNDRY_CONTAINER} bash
ln -s {PATH_TO_REPOSITORY}/dist {PATH_TO_FOUNDRY_FOLDER}/Data/systems/foundry
```

Once you have your import process set up, you're ready to build.

To compile once, use "gulp build"

```
gulp build
```

To compile whenever a file changes,

```
gulp watch
```

To see all the tasks, use

```
gulp -T
```

Once a build is completed, files will be placed in the "dist" folder. If you completed the setup above, they'll also be placed in your systems folder, and ready to use in Foundry!
