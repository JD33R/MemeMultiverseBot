// ======================================
// Meme Multiverse Bot — Command Deployer
// ======================================

const { REST, Routes } = require("discord.js");
require("dotenv").config();

// ===== Replace with your IDs =====
const clientId = "1431638929789943832"; // your bot Application ID
const guildId = "1431637325582176386";  // your Discord server ID
const token = process.env.BOT_TOKEN;     // Reads from .env

// ===== Define slash commands =====
const commands = [
  {
    name: "setup-meme",
    description: "🌀 Set up The Meme Multiverse server structure",
  },
  {
    name: "reset-server",
    description: "⚠️ Reset the server to a clean state",
  },
  {
    name: "meme",
    description: "🤣 Fetch a random meme from Reddit",
  },
  {
    name: "rank",
    description: "🏆 Check your meme XP level",
  },
];

// ===== Deploy Commands =====
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("📡 Deploying slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("✅ Successfully registered all slash commands!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
