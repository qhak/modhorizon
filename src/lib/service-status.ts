import { modelChoices, preferredModelId } from "./models";

/** Public configuration flags only. Never return credentials or endpoint values. */
export function serviceStatus(env: NodeJS.ProcessEnv = process.env) {
  const choices = modelChoices(env);
  const generationAvailable = Object.values(choices).some(Boolean);
  const demoAvailable = choices.demo === true;
  return {
    generationAvailable,
    artifactTypes: ["plugin", "mod"],
    buildConfigured: Boolean(env.BUILD_SERVICE_URL && env.BUILD_SERVICE_TOKEN),
    choices,
    preferred: preferredModelId(choices, env),
    message: !generationAvailable
      ? "Hosting preview · AI not connected"
      : demoAvailable && !env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY && !env.AI_MODEL
        ? "Development preview available"
        : "AI connection ready",
  };
}
