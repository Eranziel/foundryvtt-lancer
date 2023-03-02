// only required for dev - test 1
// in prod, foundry loads index.js, which is compiled by vite/rollup
// in dev, foundry loads index.js, this file, which loads lancer.ts

window.global = window;
import * as LANCER from "./lancer.ts";
console.warn("WECOME TO HELL");