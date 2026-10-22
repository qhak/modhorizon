import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const path = ".dev.vars";
let content = readFileSync(path, "utf8");
function setting(name, value) {
  const expression = new RegExp(`^${name}=.*$`, "m");
  content = expression.test(content) ? content.replace(expression, () => `${name}=${value}`) : `${content.trimEnd()}\n${name}=${value}\n`;
}
// This file is ignored by Git. No credential is printed or sent to Cloudflare.
setting("BUILD_SERVICE_TOKEN", randomBytes(32).toString("hex"));
setting("BUILD_SERVICE_URL", "http://127.0.0.1:3230/build");
writeFileSync(path, content, "utf8");
console.log("Private builder URL and random token saved locally. Prepare the Docker image next.");
