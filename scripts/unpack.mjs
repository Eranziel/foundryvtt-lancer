#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

// https://discord.com/channels/170995199584108546/1090432971850403952/1152119148130881556

const MODULE_ID = process.cwd();

const packs = await fs.readdir("./dist/packs");
for (const pack of packs) {
  if (pack === ".gitattributes") continue;
  console.log(`Unpacking ${pack}`);
  const directory = `./src/packs/${pack}`;
  try {
    for (const file of await fs.readdir(directory)) {
      await fs.unlink(path.join(directory, file));
    }
  } catch (error) {
    if (error.code === "ENOENT") console.log(`No files inside of ${pack}`);
    else console.log(error);
  }
  await extractPack(`${MODULE_ID}/dist/packs/${pack}`, `${MODULE_ID}/src/packs/${pack}`, {
    yaml: true,
    log: true,
  });
}
