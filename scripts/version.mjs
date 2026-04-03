#!/usr/bin/env node
import fs from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const manifest = JSON.parse(fs.readFileSync("src/system.json"));
manifest.download =
  "https://github.com/Eranziel/foundryvtt-lancer/releases/download/" +
  `v${packageJson.version}/${manifest.id}-v${packageJson.version}.zip`;
manifest.version = packageJson.version;
fs.writeFileSync("src/system.json", JSON.stringify(manifest, null, 2));
