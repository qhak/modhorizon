/** Prompt-selected implementation guidance shared by the UI and server. */
export type GenerationSkill = {
  id: string;
  label: string;
  pattern: RegExp;
  guidance: string;
};

export const GENERATION_SKILLS: GenerationSkill[] = [
  {
    id: "timed-mechanics",
    label: "Timed mechanics",
    pattern: /\b(timer|timed|every\s+\d+|after\s+\d+|for\s+\d+\s*(seconds?|minutes?|ticks?)|cooldown|countdown|rises?|shrinks?|wave|periodic|interval)\b/i,
    guidance: "For timed mechanics, convert seconds to 20 ticks per second, use the synchronous Bukkit scheduler for world/player changes, retain task handles, and cancel repeating tasks on disable. Validate world height and block state before changing blocks; never overwrite valuable blocks or fluids unless the request explicitly requires it.",
  },
  {
    id: "commands-permissions",
    label: "Commands & permissions",
    pattern: /\b(command|\/\w+|permission|admin|operator|staff|reload|subcommand)\b/i,
    guidance: "For commands, define them in plugin.yml, implement a clear executor (and tab completion only when useful), check sender type before player-only actions, validate arguments, give concise usage feedback, and declare/check explicit permissions for privileged actions.",
  },
  {
    id: "configuration",
    label: "Configurable settings",
    pattern: /\b(config|configurable|setting|message|customi[sz]e|editable|yml|option|duration|amount|radius|interval)\b/i,
    guidance: "Put practical server-owner choices and player-facing messages in config.yml with safe defaults. Call saveDefaultConfig on enable, read values defensively, and provide a documented reload path only if requested.",
  },
  {
    id: "event-handling",
    label: "Event handling",
    pattern: /\b(event|on\s+(join|quit|death|kill|break|place|damage|click|interact|eat|craft)|players?\s+(join|quit)|damage|kill|death|join|quit|break|place|interact|click|craft|eat)\b/i,
    guidance: "For event-driven behavior, register listeners in onEnable, use the narrowest relevant Paper event, guard nullable actors/targets and cancelled events where relevant, and avoid doing expensive work in event callbacks.",
  },
  {
    id: "inventory-ui",
    label: "Inventory menus",
    pattern: /\b(gui|menu|inventory|chest|item|click|shop|selector)\b/i,
    guidance: "For inventory menus, identify this plugin's menus with a stable holder or namespaced key, cancel only clicks in those menus, validate the clicked slot/item, and avoid trusting display names as identity.",
  },
  {
    id: "persistent-data",
    label: "Persistent player data",
    pattern: /\b(save|persist|persistent|remember|across\s+(restart|restarts|reboot)|database|storage|player\s+(level|points|data|state|streak|score))\b/i,
    guidance: "When state must survive restarts, use a small, version-appropriate config-backed store for simple data, handle missing or malformed entries safely, and avoid blocking disk or network work on the server thread.",
  },
];

export function selectGenerationSkills(prompt: string, target?: string): GenerationSkill[] {
  const selected = GENERATION_SKILLS.filter((skill) => skill.pattern.test(prompt));
  // Keep the instruction bundle focused when a prompt matches many categories.
  return selected.slice(0, 5).map(skill => target === "folia" && skill.id === "timed-mechanics"
    ? { ...skill, guidance: "For timed mechanics on Folia, schedule entity and region work through the appropriate Folia scheduler for its owner; use global or async scheduling only for suitable non-entity work. Never use the ordinary Bukkit scheduler for region-owned world or player changes. Keep task handles, cancel them on disable, and guard block and world boundaries." }
    : skill);
}
