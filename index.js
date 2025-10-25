// ==================== IMPORTS ====================
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ==================== LOAD TEMPLATE ====================
const template = JSON.parse(fs.readFileSync("template.json", "utf8"));

// ==================== CLIENT SETUP ====================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ==================== READY EVENT ====================
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("Your bot is online and ready to create The Meme Multiverse!");
});

// ==================== COMMAND HANDLER ====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;

  // =======================================================
  // /reset-server
  // =======================================================
  if (interaction.commandName === "reset-server") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply("⚠️ Resetting the server... deleting all channels and roles.");

    // Delete all channels
    for (const [id, channel] of guild.channels.cache) {
      try {
        await channel.delete();
      } catch (err) {
        console.error(`Couldn't delete channel ${channel.name}:`, err.message);
      }
    }

    // Delete all roles except @everyone and managed
    for (const [id, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await role.delete();
        } catch (err) {
          console.error(`Couldn't delete role ${role.name}:`, err.message);
        }
      }
    }

    // Recreate bot commands channel
    const tempChannel = await guild.channels.create({
      name: "📜│bot-commands",
      type: 0,
    });

    await tempChannel.send("✅ Server reset complete! Type `/setup-meme` to rebuild the server.");
    return;
  }

  // =======================================================
  // /setup-meme
  // =======================================================
  if (interaction.commandName === "setup-meme") {
    console.log("⚙️ setup-meme command triggered!");
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply("🌀 Setting up The Meme Multiverse...");

    // Create roles
    for (const role of template.roles) {
      const roleData = {
        name: role.name,
        permissions: role.permissions ?? [],
      };

      if (role.color) {
        roleData.color = role.color;
      }

      await guild.roles.create(roleData);
      await wait(500);
    }

    // Create categories and channels
    for (const category of template.categories) {
      const cat = await guild.channels.create({
        name: category.name,
        type: 4,
      });

      for (const channel of category.channels) {
        await guild.channels.create({
          name: channel.name,
          type: channel.type === "voice" ? 2 : 0,
          parent: cat.id,
        });
        await wait(300);
      }
    }

    // Make a verify channel
    const verifyChannel = await guild.channels.create({
      name: "✅│verify-here",
      type: 0,
    });

    await verifyChannel.send("👋 Welcome! Type `/verify` to unlock the rest of the server!");

    // Lock other channels
    const verifiedRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
    const everyoneRole = guild.roles.everyone;

    for (const [id, channel] of guild.channels.cache) {
      if (channel.name !== "✅│verify-here" && channel.type === 0) {
        await channel.permissionOverwrites.create(everyoneRole, { ViewChannel: false });
        if (verifiedRole) {
          await channel.permissionOverwrites.create(verifiedRole, { ViewChannel: true });
        }
      }
    }

    await interaction.editReply("🎉 The Meme Multiverse has been created!");
    return;
  }

 // =======================================================
// /battle-start
// =======================================================
if (interaction.commandName === "battle-start") {
  try {
    // Respond right away so Discord doesn’t time out
    await interaction.reply({ content: "⚙️ Starting the meme battle...", ephemeral: true });

    // Find or create the #battle-arena channel
    let battleChannel = interaction.guild.channels.cache.find(
      (ch) => ch.name.includes("battle-arena")
    );

    if (!battleChannel) {
      battleChannel = await interaction.guild.channels.create({
        name: "🔥│battle-arena",
        type: 0, // text channel
      });
    }

    // Pick a random theme
    const themes = [
      "🔥 Dank Duel",
      "💖 Wholesome Wars",
      "💀 Cursed Clash",
      "🌈 Template Takedown",
      "🤖 AI Apocalypse",
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    // Send the battle message
    const msg = await battleChannel.send(
      `${randomTheme} has begun! Post your best memes below! 🗳️`
    );

    // Add voting reactions
    await msg.react("👍");
    await msg.react("👎");

    // Update the ephemeral reply to show success
    await interaction.editReply("✅ Meme battle announcement posted!");
  } catch (err) {
    console.error("❌ Error starting battle:", err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("⚠️ Something went wrong starting the battle.");
    } else {
      await interaction.reply("⚠️ Something went wrong starting the battle.");
    }
  }
}

});

// ==================== LOGIN ====================
client.login(process.env.BOT_TOKEN);
