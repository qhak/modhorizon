import type { AIProvider, GenerateRequest, GeneratedProject } from "./types";

export class MockProvider implements AIProvider {
  name = "mock";
  async generate(request: GenerateRequest): Promise<GeneratedProject> {
    if (request.artifactType && request.artifactType !== "plugin")
      throw new Error("The deterministic demo provider only supports its Paper plugin example. Configure a real AI provider for mods, resource packs, and shader packs.");
    const normalized = request.prompt
      .toLowerCase()
      .replace(/[.!]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const supported =
      "create a paper plugin where players receive speed ii for 10 seconds whenever they kill a zombie";
    if (request.project || request.platform !== "paper" || normalized !== supported) {
      throw new Error(
        "Development preview supports only the Paper example: Speed II for 10 seconds after killing a zombie. Configure an AI provider for other platforms, prompts and follow-up edits.",
      );
    }
    return {
      name: "ZombieSprint",
      files: [
        {
          path: "src/main/java/dev/modhorizon/zombiesprint/ZombieSprint.java",
          content: `package dev.modhorizon.zombiesprint;

import org.bukkit.entity.Player;
import org.bukkit.entity.EntityType;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

public final class ZombieSprint extends JavaPlugin implements Listener {
    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(this, this);
    }

    @EventHandler
    public void onZombieDeath(EntityDeathEvent event) {
        if (event.getEntityType() != EntityType.ZOMBIE) return;
        Player killer = event.getEntity().getKiller();
        if (killer == null) return;
        // Paper uses ticks (20 per second), and amplifier 1 means Speed II.
        killer.addPotionEffect(new PotionEffect(PotionEffectType.SPEED, 200, 1));
        String message = getConfig().getString("activation-message", "Zombie defeated! Speed II for 10 seconds.");
        if (message != null && !message.isBlank()) killer.sendMessage(message);
    }
}
`,
        },
        {
          path: "src/main/resources/plugin.yml",
          content: `name: ZombieSprint\nversion: '1.0.0'\nmain: dev.modhorizon.zombiesprint.ZombieSprint\napi-version: '1.21'\nauthor: ModHorizon\ndescription: Grants Speed II for ten seconds after a player kills a zombie.\n`,
        },
        {
          path: "src/main/resources/config.yml",
          content: `activation-message: 'Zombie defeated! Speed II for 10 seconds.'\n`,
        },
      ],
    };
  }
}
