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

test("testing lock blocks every expensive model even when all paid provider keys are present", () => {
  const result = serviceStatus({NODE_ENV:"production",OPENAI_API_KEY:"fake-openai",ANTHROPIC_API_KEY:"fake-anthropic",GEMINI_API_KEY:"fake-paid-google",GEMINI_FREE_API_KEY:"fake-free-google"});
  assert.equal(result.testingRestricted,true);
  assert.equal(result.choices["gpt-6-luna"],true);
  assert.equal(result.choices["gemini-3-flash-preview"],true);
  for (const [id,enabled] of Object.entries(result.choices))
    if (!["gpt-6-luna","gemini-3-flash-preview"].includes(id)) assert.equal(enabled,false,id);
  assert.doesNotMatch(JSON.stringify(result),/fake-/);
});

test("free-tier Gemini never uses the paid Gemini key; lock can only be lifted through server config", () => {
  assert.equal(serviceStatus({NODE_ENV:"production",GEMINI_API_KEY:"paid"}).choices["gemini-3-flash-preview"],false);
  const free = serviceStatus({NODE_ENV:"production",GEMINI_FREE_API_KEY:"free"});
  assert.equal(free.choices["gemini-3-flash-preview"],true);
  assert.equal(free.choices["gemini-3.8-flash"],false);
  assert.equal(serviceStatus({NODE_ENV:"production",OPENAI_API_KEY:"fake",AI_TESTING_MODE:"false"}).choices["gpt-6-astra"],true);
});
