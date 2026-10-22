import { readFileSync } from "node:fs";
import { localBuilderServer } from "./server";
import { compileDockerJob } from "./docker-job";
const setting = readFileSync(".dev.vars", "utf8").split(/\r?\n/).find(line => /^BUILD_SERVICE_TOKEN=/.test(line));
const token = setting?.slice(setting.indexOf("=") + 1).trim();
if (!token) throw new Error("Run npm run setup:local-builder first.");
localBuilderServer(token, compileDockerJob).listen(3230, "127.0.0.1", () => console.log("Private local Paper builder: http://127.0.0.1:3230 (token required)"));
