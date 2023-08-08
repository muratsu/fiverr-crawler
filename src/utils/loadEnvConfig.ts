import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { expand } from "dotenv-expand";

export type Env = { [key: string]: string };
export type LoadedEnvFiles = Array<{
  path: string;
  contents: string;
}>;

let combinedEnv: Env | undefined = undefined;
const cachedLoadedEnvFiles: LoadedEnvFiles = [];

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  if ("code" in (e as any)) return true;
  else return false;
}

export function processEnv(loadedEnvFiles: LoadedEnvFiles, dir?: string) {
  // don't reload env if we already have since this breaks escaped
  // environment values e.g. \$ENV_FILE_KEY
  if (process.env.__PROCESSED_ENV || loadedEnvFiles.length === 0) {
    return process.env as Env;
  }

  process.env.__PROCESSED_ENV = "true";

  const origEnv = Object.assign({}, process.env);
  const parsed: dotenv.DotenvParseOutput = {};

  for (const envFile of loadedEnvFiles) {
    try {
      let result: dotenv.DotenvConfigOutput = {};

      result.parsed = dotenv.parse(envFile.contents);
      result = expand(result);

      for (const key of Object.keys(result.parsed || {})) {
        if (
          typeof parsed[key] === "undefined" &&
          typeof origEnv[key] === "undefined" &&
          result.parsed?.[key]
        ) {
          parsed[key] = result.parsed[key];
        }
      }
    } catch (err) {
      console.error(
        `Failed to load env from ${path.join(dir || "", envFile.path)}`,
        err
      );
    }
  }

  return Object.assign(process.env, parsed);
}

export function loadEnvConfig(dir: string): {
  combinedEnv: Env;
  loadedEnvFiles: LoadedEnvFiles;
} {
  // don't reload env if we already have since this breaks escaped
  // environment values e.g. \$ENV_FILE_KEY
  if (combinedEnv) {
    return {
      combinedEnv,
      loadedEnvFiles: cachedLoadedEnvFiles,
    };
  }

  const dotenvFiles = [".env.local", ".env"];

  for (const envFile of dotenvFiles) {
    // only load .env if the user provided has an env config file
    const dotEnvPath = path.join(dir, envFile);

    try {
      const stats = fs.statSync(dotEnvPath);

      // make sure to only attempt to read files
      if (!stats.isFile()) {
        continue;
      }

      const contents = fs.readFileSync(dotEnvPath, "utf8");

      cachedLoadedEnvFiles.push({ path: envFile, contents });
    } catch (err) {
      if (isErrnoException(err) && err.code !== "ENOENT") {
        console.error(`Failed to load env from ${envFile}`, err);
      }
    }
  }

  combinedEnv = processEnv(cachedLoadedEnvFiles, dir);

  return {
    combinedEnv,
    loadedEnvFiles: cachedLoadedEnvFiles,
  };
}
