import { spawnSync } from "node:child_process";
import { dockerBinary } from "./docker-job";
const docker = dockerBinary();
const ready = spawnSync(docker, ["info", "--format", "{{.OSType}}"], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
if (ready.status !== 0 || ready.stdout.trim() !== "linux") {
  console.error("Start Docker Desktop, finish its setup, and select Linux containers before preparing the builder.");
  process.exit(1);
}
const built = spawnSync(docker, ["build", "--file", "build-service/local/Dockerfile", "--tag", "modhorizon-local-paper:1.21.4", "."], { stdio: "inherit", windowsHide: true });
process.exit(built.status ?? 1);
