import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_COMMANDS, parseReply, replyInstructions } from "../src/lib/chat-commands";
import { MockProvider } from "../src/lib/mock-provider";
import { validateProject } from "../src/lib/validation";

test("replies split into text and known commands", () => {
  assert.equal(CHAT_COMMANDS.length >= 20, true);
  assert.deepEqual(parseReply("Adds a heal command.\n\n/reference src/main/java/a/Heal.java\n/command /heal <player>\n/download\n/unknown thing"), [
    { kind: "text", text: "Adds a heal command." },
    { kind: "command", name: "reference", arg: "src/main/java/a/Heal.java" },
    { kind: "command", name: "command", arg: "/heal <player>" },
    { kind: "command", name: "download", arg: "" },
    { kind: "text", text: "/unknown thing" },
  ]);
  for (const { name } of CHAT_COMMANDS) assert.match(replyInstructions(), new RegExp(`/${name}\\b`));
});

test("the model's message is kept, cleaned and bounded", async () => {
  const source = await new MockProvider().generate({ prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", version: "1.21.4" });
  assert.match(validateProject(source).message!, /^Players who kill a zombie/);
  assert.equal(validateProject({ ...source, message: "  Done.\u0000\n\n\n\n/test  " }).message, "Done.\n\n/test");
  assert.equal(validateProject({ ...source, message: "x".repeat(3000) }).message?.length, 2000);
  assert.equal("message" in validateProject({ ...source, message: 42 }), false);
});
