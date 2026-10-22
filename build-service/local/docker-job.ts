import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname, delimiter } from "node:path";
import { randomUUID } from "node:crypto";

export function dockerBinary() {
  const candidates = [
    join(process.env.LOCALAPPDATA || "", "Programs/DockerDesktop/resources/bin/docker.exe"),
    "C:/Program Files/Docker/Docker/resources/bin/docker.exe",
  ];
  return candidates.find(path => existsSync(path)) ?? "docker";
}
export function dockerEnvironment(binary = dockerBinary()): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "development", ...Object.fromEntries(["PATH", "SystemRoot", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "HOME", "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_CONFIG"]
    .flatMap(key => process.env[key] ? [[key, process.env[key]!]] : [])) };
  // Existing terminals may predate Docker's installation. Its credential helper
  // must be discoverable alongside docker.exe without changing the user's PATH.
  if (existsSync(binary)) env.PATH = `${dirname(binary)}${delimiter}${env.PATH || ""}`;
  return env;
}
export function dockerArguments(name: string) {
  return ["run", "--rm", "--interactive", "--name", name, "--network", "none", "--read-only",
    "--user", "1000:1000", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--pids-limit", "128", "--memory", "2g", "--memory-swap", "2g", "--cpus", "1",
    "--log-driver", "none", "--tmpfs", "/work:rw,nosuid,nodev,size=1g,uid=1000,gid=1000,mode=0700",
    "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=64m,uid=1000,gid=1000,mode=0700",
    "--pull=never", "modhorizon-local-paper:1.21.4"];
}
export async function compileDockerJob(payload: unknown, timeoutMs = 100_000) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 100_000) throw new Error("Invalid local compilation deadline.");
  const binary = dockerBinary(), name = `modhorizon-job-${randomUUID()}`;
  // Only Docker's own configuration environment reaches its client; no AI or Stripe keys.
  const env = dockerEnvironment(binary);
  return new Promise<unknown>((resolve, reject) => {
    const child = spawn(binary, dockerArguments(name), { windowsHide: true, env, stdio: ["pipe", "pipe", "pipe"] });
    let output = Buffer.alloc(0), exceeded = false, timedOut = false;
    let stopping: Promise<boolean> | null = null;
    const stop = () => {
      stopping ??= (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          const removed = await new Promise<boolean>(done => execFile(binary, ["rm", "--force", name], { windowsHide: true, timeout: 10_000, env }, (error, _stdout, stderr) => done(!error || String(stderr).includes("No such container"))));
          if (removed) return true;
        }
        return false;
      })();
      void stopping.finally(() => child.kill());
      return stopping;
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      if (output.length + chunk.length > 7_000_000) { exceeded = true; stop(); }
      else output = Buffer.concat([output, chunk]);
    });
    child.stderr.resume(); // Docker infrastructure messages do not enter user-visible compiler logs.
    child.stdin.on("error", () => undefined);
    child.on("error", () => { clearTimeout(timer); reject(new Error("Docker is unavailable. Start Docker Desktop and prepare the local build image.")); });
    child.on("close", async code => {
      clearTimeout(timer);
      if (timedOut || exceeded || code !== 0) {
        const removed = await stop();
        const reason = timedOut ? "Build exceeded its deadline." : exceeded ? "Build output exceeded its limit." : "Docker build job failed. Check Docker Desktop and the prepared image.";
        return reject(new Error(`${reason} ${removed ? "Job container removed." : "Container cleanup could not be confirmed; check Docker Desktop before retrying."}`));
      }
      try { resolve(JSON.parse(output.toString("utf8"))); }
      catch { reject(new Error("Local compiler returned an invalid response.")); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
