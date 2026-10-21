import assert from "node:assert/strict";
import test from "node:test";
import { serviceStatus } from "../src/lib/service-status";

test("unconfigured hosted app reports generation unavailable without exposing secrets", () => {
  const result = serviceStatus({ NODE_ENV: "production" });
  assert.equal(result.generationAvailable, false);
  assert.equal(result.buildConfigured, false);
  assert.match(result.message, /AI not connected/);
  assert.equal(serviceStatus({ NODE_ENV: "production", AI_PROVIDER: "mock" }).generationAvailable, false);
});

test("provider availability requires both credential and model", () => {
  assert.equal(serviceStatus({ NODE_ENV: "production", AI_API_KEY: "secret" }).generationAvailable, false);
  const result = serviceStatus({ NODE_ENV: "production", AI_API_KEY: "secret", AI_MODEL: "model", BUILD_SERVICE_URL: "https://private-builder.example", BUILD_SERVICE_TOKEN: "builder-secret" });
  assert.equal(result.generationAvailable, true);
  assert.equal(result.buildConfigured, true);
  assert.doesNotMatch(JSON.stringify(result), /secret|private-builder|model/);
});

test("development keeps the built-in source preview available", () => {
  assert.equal(serviceStatus({ NODE_ENV: "development" }).generationAvailable, true);
});
