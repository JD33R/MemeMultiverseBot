require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error("❌ Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in environment variables.");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("✅ Verify yourself and unlock all channels."),

  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("😂 Fetch a random meme from Reddit."),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("📈 Show your XP and level."),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🏆 View the top-ranked memers in the Meme Multiverse."),

  new SlashCommandBuilder()
    .setName("check-intents")
    .setDescription("🧩 Check active Discord gateway intents."),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("📡 Deploying Meme Multiverse slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands updated! Old commands have been removed.");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
