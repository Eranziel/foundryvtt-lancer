#!/usr/bin/env node
import fs from "node:fs/promises";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

// https://discord.com/channels/170995199584108546/1090432971850403952/1152119148130881556

const MODULE_ID = process.cwd();

const packs = await fs.readdir("./src/packs");
for (const pack of packs) {
  if (pack === ".gitattributes") continue;
  console.log(`Packing ${pack}`);
  await compilePack(`${MODULE_ID}/src/packs/${pack}`, `${MODULE_ID}/dist/packs/${pack}`, {
    yaml: true,
    log: true,
  });
}
