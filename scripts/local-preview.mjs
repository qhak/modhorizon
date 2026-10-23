import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { parseLocalSettings } from "./local-env.mjs";
const env = { ...process.env, ...parseLocalSettings(readFileSync(".dev.vars", "utf8")) };
env.NODE_ENV = "development";
env.APP_ORIGIN = "http://127.0.0.1:3215";
env.MODHORIZON_LOCAL_ORIGIN = env.APP_ORIGIN;
env.AI_TESTING_MODE = "true";
let compiler;
const python = env.SHADER_COMPILER_PYTHON || `${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`;
if (process.platform === "win32" && existsSync(python)) {
  env.SHADER_COMPILER_URL = "http://127.0.0.1:3231/check";
  env.SHADER_COMPILER_TOKEN = randomBytes(32).toString("hex");
  compiler = spawn(process.execPath, ["--import", "tsx", "scripts/shaders/start-compiler.ts"], {
    env: { SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
      SHADER_COMPILER_TOKEN: env.SHADER_COMPILER_TOKEN, SHADER_COMPILER_PYTHON: python },
    stdio: "inherit", windowsHide: true,
  });
  compiler.on("error", () => console.error("Local shader compiler could not start; shader checks will fail safely."));
} else {
  delete env.SHADER_COMPILER_URL; delete env.SHADER_COMPILER_TOKEN;
  console.log("Local GLSL checker disabled: set SHADER_COMPILER_PYTHON to a Windows Python executable.");
}
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3215"], { env, stdio: "inherit", windowsHide: true });
child.on("exit", code => { compiler?.kill(); process.exit(code ?? 1); });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { compiler?.kill(); child.kill(); });
process.on("exit", () => compiler?.kill());
