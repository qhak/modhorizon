import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { parseLocalSettings } from "./local-env.mjs";
const env = { ...process.env, ...parseLocalSettings(readFileSync(".dev.vars", "utf8")) };
env.NODE_ENV = "development";
env.APP_ORIGIN = "http://127.0.0.1:3215";
env.AI_TESTING_MODE = "true";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3215"], { env, stdio: "inherit", windowsHide: true });
child.on("exit", code => process.exit(code ?? 1));
