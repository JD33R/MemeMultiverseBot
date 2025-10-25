// ============================================
// Meme Multiverse Bot – Deploy Commands Script
// ============================================

require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// Secure environment variables
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Check variables before running
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in environment variables.");
  process.exit(1);
}

// Define commands
const commands = [
  new SlashCommandBuilder()
    .setName("setup-meme")
    .setDescription("🌀 Setup The Meme Multiverse server automatically."),
  new SlashCommandBuilder()
    .setName("reset-server")
    .setDescription("⚠️ Delete all channels and roles to reset the server."),
  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("😂 Get a random meme from the multiverse."),
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("🏅 Check your XP level and progress."),
].map((command) => command.toJSON());

// REST client
const rest = new REST({ version: "10" }).setToken(TOKEN);

// Deploy commands
(async () => {
  try {
    console.log("📡 Deploying slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands deployed successfully!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
