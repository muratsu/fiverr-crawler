#!/usr/bin/env node
import { loadEnvConfig } from "./utils/loadEnvConfig";
loadEnvConfig(`${__dirname}/..`);

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  // Use the commands directory to scaffold.
  .commandDir("commands", {
    extensions: ["js", "ts"],
    exclude: /.d.ts$/,
  })
  // Enable strict mode.
  .strict()
  // Useful aliases.
  .alias({ h: "help" }).argv;
