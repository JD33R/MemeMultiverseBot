require("dotenv").config();
const { REST, Routes } = require("discord.js");

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error("❌ Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in environment variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("💣 Deleting ALL guild slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    console.log("✅ All guild slash commands deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting commands:", error);
  }
})();
