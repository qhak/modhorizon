import { modelChoices, preferredModelId } from "./models";
import { ARTIFACT_EXPERTS } from "./artifact-experts";

/** Public configuration flags only. Never return credentials or endpoint values. */
export function serviceStatus(env: NodeJS.ProcessEnv = process.env) {
  const choices = modelChoices(env);
  const generationAvailable = Object.values(choices).some(Boolean);
  const demoAvailable = choices.demo === true;
  return {
    generationAvailable,
    artifactTypes: Object.keys(ARTIFACT_EXPERTS),
    buildConfigured: Boolean(env.BUILD_SERVICE_URL && env.BUILD_SERVICE_TOKEN),
    choices,
    testingRestricted: env.AI_TESTING_MODE !== "false",
    preferred: preferredModelId(choices, env),
    message: !generationAvailable
      ? "Hosting preview · AI not connected"
      : demoAvailable && !env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY && !env.AI_MODEL
        ? "Development preview available"
        : "AI connection ready",
  };
}
