// ======================================
// Meme Multiverse Bot - Command Deployer
// ======================================

const { REST, Routes } = require("discord.js");
require("dotenv").config();

const clientId = "1431638929789943832"; // your bot's Application ID
const guildId = "1431637325582176386";  // your server ID
const token = process.env.BOT_TOKEN;     // uses your .env


// ===== Define all slash commands =====
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
    description: "🏆 Check your meme level and XP",
  },
];

// ===== Deploy the commands =====
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("📡 Deploying slash commands...");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log("✅ Successfully registered slash commands!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
