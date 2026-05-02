#!/usr/bin/env node
import child from "node:child_process";
import fs from "node:fs";
import path from "node:path";

if (process.env.CI) process.exit(0);

const dataPath = child.execSync("npx fvtt --config ./fvttrc.yml configure get dataPath").toString().trim();
if ((dataPath || "undefined") !== "undefined") {
    const systemDir = path.resolve(dataPath, "Data", "systems", "lancer");
    console.log(`Symlinking ${systemDir} to dev build`);
    try {
        fs.symlinkSync(path.resolve("dist"), systemDir);
    } catch (e) {
        if (e.code === "ENOENT")
            console.log(`Foundry systemdata dir missing: ${path.normalize(path.join(e.dest, ".."))}`);
        if (e.code === "EEXIST") console.log("System directory or symlink already exists");
    }
}
