/** Commands the AI can put in its reply after a build. The workspace turns each one into a link, chip or button. */
export type ChatCommand = { name: string; args: string; use: string };

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  { name: "reference", args: "<file path>", use: "a file you created or changed" },
  { name: "config", args: "<key>", use: "a config.yml setting the owner can change" },
  { name: "command", args: "</command and its arguments>", use: "an in-game command the project adds" },
  { name: "permission", args: "<permission node>", use: "a permission players need" },
  { name: "event", args: "<event name>", use: "a game event the code listens to" },
  { name: "item", args: "<item id>", use: "an item the project adds or changes" },
  { name: "block", args: "<block id>", use: "a block the project adds or changes" },
  { name: "entity", args: "<entity id>", use: "a mob or entity the project adds or changes" },
  { name: "recipe", args: "<recipe>", use: "a crafting recipe the project adds" },
  { name: "keybind", args: "<key>", use: "a key binding the mod adds" },
  { name: "texture", args: "<texture path>", use: "an unsupported texture that still needs to be supplied; do not mark supported tool recolors or ore PNGs as missing when their recipes are included" },
  { name: "shader", args: "<setting>", use: "an option in shaders.properties" },
  { name: "dependency", args: "<plugin or mod>", use: "something else that must be installed" },
  { name: "version", args: "<version>", use: "the Minecraft or API version it targets" },
  { name: "java", args: "<version>", use: "the Java version it needs" },
  { name: "download", args: "", use: "a button that downloads the JAR or ZIP" },
  { name: "build", args: "", use: "a link to the build log" },
  { name: "test", args: "", use: "a link to the testing steps" },
  { name: "install", args: "", use: "a link to the install steps" },
  { name: "warning", args: "<text>", use: "a limitation or risk the user must know about" },
  { name: "tip", args: "<text>", use: "a short optional tip" },
  { name: "next", args: "<follow-up request>", use: "a follow-up change the user can ask for with one click" },
];

const NAMES = new Set(CHAT_COMMANDS.map((command) => command.name));

/** Instructions for the reply the model writes next to its files. */
export function replyInstructions(): string {
  const list = CHAT_COMMANDS.map(({ name, args, use }) => `/${name}${args ? ` ${args}` : ""} for ${use}`).join("; ");
  return `In "message", write a short note for the user about what you built or changed, at most 12 lines. Use plain sentences, then put each relevant command on its own line, starting with the command: ${list}. Only reference files and settings that exist in your files. Never claim the project was compiled or tested.`;
}

export type ReplyPart =
  | { kind: "text"; text: string }
  | { kind: "command"; name: string; arg: string };

/** Splits a reply into text and command lines. Unknown commands stay as text. */
export function parseReply(message: string): ReplyPart[] {
  return message.split("\n").flatMap((line): ReplyPart[] => {
    const match = line.trim().match(/^\/([a-z]+)(?:\s+(.*))?$/);
    if (match && NAMES.has(match[1])) return [{ kind: "command", name: match[1], arg: (match[2] ?? "").trim() }];
    return line.trim() ? [{ kind: "text", text: line.trim() }] : [];
  });
}
