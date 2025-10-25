const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = "MTQzMTYzODkyOTc4OTk0MzgzMg.G-83r2.1PbU4itiEK-IpzizQdxu2ssQXxNdauthLCmcU0";
const clientId = "1431638929789943832";
const guildId = "1431637325582176386";

const commands = [
  new SlashCommandBuilder()
    .setName("setup-meme")
    .setDescription("Sets up the Meme Multiverse server structure.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("reset-server")
    .setDescription("Deletes all channels and roles for a clean rebuild.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify yourself to access the rest of the server.")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);

// ✅ Wrap in an async IIFE (immediately-invoked function)
(async () => {
  try {
    console.log("📡 Deploying slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("✅ Slash commands deployed successfully!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();