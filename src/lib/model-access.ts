// Temporary spending restriction. Only server configuration can lift this lock.
export const TESTING_MODEL_IDS = ["gpt-6-luna", "gemini-3-flash-preview", "demo"] as const;
export function testingModelAllowed(id: string, env: NodeJS.ProcessEnv = process.env) {
  return env.AI_TESTING_MODE === "false" || (TESTING_MODEL_IDS as readonly string[]).includes(id);
}
