require("dotenv").config();
const { REST, Routes } = require("discord.js");

const commands = [
  {
    name: "setup-meme",
    description: "Set up The Meme Multiverse server structure",
  },
  {
    name: "reset-server",
    description: "Reset all channels and roles in the server",
  },
  {
    name: "battle-start",
    description: "Start a new meme battle announcement!",
  },
];

const clientId = "1431638929789943832"; // Your bot's Application ID
const guildId = "1431637325582176386";  // Replace this with your Discord server ID

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("📡 Deploying slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("✅ Slash commands deployed!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
