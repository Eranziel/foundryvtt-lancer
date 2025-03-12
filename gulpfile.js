const gulp = require("gulp");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const archiver = require("archiver");
const stringify = require("json-stringify-pretty-compact");
const cp = require("child_process");

const git = require("gulp-git");

const argv = require("yargs").argv;

function getConfig() {
  const configPath = path.resolve(process.cwd(), "foundryconfig.json");
  let config;

  if (fs.existsSync(configPath)) {
    config = fs.readJSONSync(configPath);
    return config;
  } else {
    return;
  }
}

function getManifest() {
  for (let name of ["system.json", "module.json"]) {
    for (let root of ["public", "src", "dist"]) {
      const p = path.join(root, name);
      if (fs.existsSync(p)) {
        return { file: fs.readJSONSync(p), root, name };
      }
    }
  }

  throw Error("Could not find manifest file");
}

/********************/
/*		BUILDING  		*/
/********************/

function build() {
  return cp.spawn("npx", ["vite", "build"], { stdio: "inherit", shell: true });
}

async function rebuild_pack(name) {
  console.log(chalk.green(`Rebuilding ${chalk.blueBright(name)}`));
  const packPath = path.resolve(".", "dist", "packs", name);
  if (await fs.exists(packPath)) {
    await fs.remove(packPath);
  }
  await fs.ensureDir(packPath);
  cp.spawnSync(
    "npx",
    [
      "fvtt",
      "package",
      "pack",
      "--type",
      "System",
      "--id",
      "lancer",
      "-n",
      name,
      "--in",
      `./src/packs/${name}`,
      "--out",
      "./dist/packs/",
      "--yaml",
    ],
    { stdio: "inherit", shell: true }
  );
  return Promise.resolve();
}

async function export_pack(name) {
  console.log(chalk.green(`Extracting ${chalk.blueBright(name)}`));
  // TODO: specifying output directory doesn't seem to work?
  cp.spawnSync("npx", ["fvtt", "package", "unpack", "--type", "System", "--id", "lancer", "-n", name, "--yaml"], {
    stdio: "inherit",
    shell: true,
  });
  return Promise.resolve();
}

async function configure_fvtt_cli() {
  const config = await fs.readJSON("foundryconfig.json");
  if (config.dataPath === "/path/to/foundry/data") {
    throw Error("Please configure foundryconfig.json to point to your Foundry data directory");
  }
  console.log(
    chalk.green(`Configuring foundryvtt-cli to use ${chalk.blueBright(config.dataPath)} as Foundry data directory`)
  );
  cp.spawnSync("npx", ["fvtt", "configure", "set", "dataPath", config.dataPath], {
    stdio: "inherit",
    shell: true,
  });
  return Promise.resolve();
}

async function build_packs() {
  await rebuild_pack("core_macros");
  await rebuild_pack("lancer_info");
  return Promise.resolve();
}

async function export_packs() {
  await export_pack("core_macros");
  await export_pack("lancer_info");
  return Promise.resolve();
}

function _distWatcher() {
  const publicDirPath = path.resolve(process.cwd(), "public");
  const watcher = gulp.watch(["public/**/*.hbs"], { ignoreInitial: false });
  watcher.on("change", async function (file, stats) {
    console.log(`File ${file} was changed`);
    const partial_file = path.relative(publicDirPath, file);
    await fs.copy(path.join("public", partial_file), path.join("dist", partial_file));
  });
}

function watch() {
  _distWatcher();
  return cp.spawn("npx", ["vite", "build", "-w"], { stdio: "inherit", shell: true });
}

function serve() {
  _distWatcher();
  // forward arguments on serves
  const serveArg = process.argv[2];
  let commands = ["vite", "serve"];
  if (serveArg == "serve" && process.argv.length > 3) {
    commands = commands.concat(process.argv.slice(3));
  }
  return cp.spawn("npx", commands, { stdio: "inherit", shell: true });
}

/********************/
/*		LINK		*/
/********************/

/**
 * Link build to User Data folder
 */
async function linkUserData() {
  const config = fs.readJSONSync("foundryconfig.json");
  if (config.dataPath === "/path/to/foundry/data") {
    throw Error("Please configure foundryconfig.json to point to your Foundry data directory");
  }

  let destDir;
  try {
    if (
      fs.existsSync(path.resolve(".", "dist", "module.json")) ||
      fs.existsSync(path.resolve(".", "src", "module.json"))
    ) {
      destDir = "modules";
    } else if (
      fs.existsSync(path.resolve(".", "dist", "system.json")) ||
      fs.existsSync(path.resolve(".", "src", "system.json"))
    ) {
      destDir = "systems";
    } else {
      throw Error(`Could not find ${chalk.blueBright("module.json")} or ${chalk.blueBright("system.json")}`);
    }

    let linkDir;
    if (config.dataPath) {
      if (!fs.existsSync(path.join(config.dataPath, "Data")))
        throw Error("User Data path invalid, no Data directory found");

      linkDir = path.join(config.dataPath, "Data", destDir, config.systemName);
    } else {
      throw Error("No User Data path defined in foundryconfig.json");
    }

    if (argv.clean || argv.c) {
      console.log(chalk.yellow(`Removing build in ${chalk.blueBright(linkDir)}`));

      await fs.remove(linkDir);
    } else if (!fs.existsSync(linkDir)) {
      console.log(chalk.green(`Copying build to ${chalk.blueBright(linkDir)}`));
      await fs.symlink(path.resolve("./dist"), linkDir, "junction");
    }
    await configure_fvtt_cli();
    return Promise.resolve();
  } catch (err) {
    Promise.reject(err);
  }
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Package build
 */
async function packageBuild() {
  const manifest = getManifest();

  try {
    // Remove the package dir without doing anything else
    if (argv.clean || argv.c) {
      console.log(chalk.yellow("Removing all packaged files"));
      await fs.remove("package");
      return;
    }

    // Ensure there is a directory to hold all the packaged versions
    await fs.ensureDir("package");

    // Copy the manifest file to the package directory
    if (await fs.exists(path.join("package", manifest.name))) {
      await fs.remove(path.join("package", manifest.name));
    }
    await fs.copy(path.join(manifest.root, manifest.name), path.join("package", manifest.name));

    // Initialize the zip file
    const zipName = `${manifest.file.id}-v${manifest.file.version}.zip`;
    const zipFile = fs.createWriteStream(path.join("package", zipName));
    const zip = archiver("zip", { zlib: { level: 9 } });

    zipFile.on("close", () => {
      console.log(chalk.green(zip.pointer() + " total bytes"));
      console.log(chalk.green(`Zip file ${zipName} has been written`));
      return Promise.resolve();
    });

    zip.on("error", err => {
      throw err;
    });

    zip.pipe(zipFile);

    // Add the directory with the final code
    zip.directory("dist/", manifest.file.id);

    zip.finalize();
  } catch (err) {
    Promise.reject(err);
  }
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Update version and URLs in the manifest JSON
 */
function updateManifest(cb) {
  const packageJson = fs.readJSONSync("package.json");
  const packageLockJson = fs.readJSONSync("package-lock.json");
  const config = getConfig(),
    manifest = getManifest(),
    rawURL = config.rawURL,
    downloadURL = config.downloadURL,
    repoURL = config.repository,
    manifestRoot = manifest.root;

  if (!config) cb(Error(chalk.red("foundryconfig.json not found")));
  if (!manifest) cb(Error(chalk.red("Manifest JSON not found")));
  if (!rawURL || !repoURL || !downloadURL) cb(Error(chalk.red("Repository URLs not configured in foundryconfig.json")));

  try {
    const version = argv.update || argv.u;

    /* Update version */

    const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})(-[a-zA-Z0-9]{0,})?$/;
    const currentVersion = manifest.file.version;
    let targetVersion = "";

    if (!version) {
      cb(Error("Missing version number"));
    }

    if (versionMatch.test(version)) {
      targetVersion = version;
    } else {
      targetVersion = currentVersion.replace(versionMatch, (substring, major, minor, patch) => {
        if (version === "major") {
          return `${Number(major) + 1}.0.0`;
        } else if (version === "minor") {
          return `${major}.${Number(minor) + 1}.0`;
        } else if (version === "patch") {
          return `${major}.${minor}.${Number(minor) + 1}`;
        } else {
          return "";
        }
      });
    }

    if (targetVersion === "") {
      return cb(Error(chalk.red("Error: Incorrect version arguments.")));
    }

    if (targetVersion === currentVersion) {
      return cb(Error(chalk.red("Error: Target version is identical to current version.")));
    }
    console.log(`Updating version number to '${targetVersion}'`);

    packageJson.version = targetVersion;
    packageLockJson.version = targetVersion;
    manifest.file.version = targetVersion;

    /* Update URLs */
    const download = `${downloadURL}/v${manifest.file.version}/${manifest.file.id}-v${manifest.file.version}.zip`;
    manifest.file.url = repoURL;
    manifest.file.manifest = `${rawURL}/${manifest.name}`;
    manifest.file.download = download;

    const prettyProjectJson = stringify(manifest.file, { maxLength: 35 });

    fs.writeJSONSync("package.json", packageJson, { spaces: 2 });
    fs.writeJSONSync("package-lock.json", packageLockJson, { spaces: 2 });
    fs.writeFileSync(path.join(manifest.root, manifest.name), prettyProjectJson, "utf8");

    return cb();
  } catch (err) {
    cb(err);
  }
}

function gitAdd() {
  return gulp.src(["./public/system.json", "./package.json"]).pipe(git.add({ args: "--no-all" }));
}

function gitCommit() {
  return gulp.src("./*").pipe(
    git.commit(`v${getManifest().file.version}`, {
      args: "-a",
      disableAppendPaths: true,
    })
  );
}

function gitTag() {
  const manifest = getManifest();
  return git.tag(`v${manifest.file.version}`, `Updated to ${manifest.file.version}`, err => {
    if (err) throw err;
  });
}

const execGit = gulp.series(gitAdd, gitCommit, gitTag);

exports.build = build;
exports.build_packs = build_packs;
exports.export_packs = export_packs;
exports.watch = watch;
exports.serve = serve;
exports.link = linkUserData;
exports.package = packageBuild;
exports.manifest = updateManifest;
exports.git = execGit;
exports.publish = gulp.series(updateManifest, build, packageBuild, execGit);
