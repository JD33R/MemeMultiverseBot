// ======================================
// Meme Multiverse Bot — Full Working Build
// ======================================

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Levels = require("discord-xp");
const fs = require("fs");
require("dotenv").config();

const template = JSON.parse(fs.readFileSync("template.json", "utf8"));
// Levels.setURL("sqlite://meme_multiverse_levels.sqlite");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ======================================
// When bot starts
// ======================================
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🚀 Meme Multiverse Bot is online and ready!");
});

// ======================================
// Interaction Handler
// ======================================
client.on("interactionCreate", async (interaction) => {
  // ✅ Handle Verify Button
  if (interaction.isButton() && interaction.customId === "verify_button") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);

      let verifiedRole = guild.roles.cache.find(r => r.name === "🌈 Normie");
      if (!verifiedRole) {
        verifiedRole = await guild.roles.create({
          name: "🌈 Normie",
          color: 15158332,
        });
      }

      await member.roles.add(verifiedRole);
      await interaction.editReply("✅ You’re verified! Welcome to The Meme Multiverse!");
    } catch (err) {
      console.error("❌ Verify error:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("⚠️ Something went wrong verifying you.");
      } else {
        await interaction.reply({ content: "⚠️ Something went wrong verifying you.", ephemeral: true });
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;

  // ======================================
  // /setup-meme Command
  // ======================================
  if (interaction.commandName === "setup-meme") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp("🌀 Setting up The Meme Multiverse...");

    // Create roles
    for (const role of template.roles) {
      const roleData = {
        name: role.name,
        permissions: role.permissions ?? [],
      };
      if (role.color) roleData.color = role.color;
      await guild.roles.create(roleData);
    }

    // Create categories & channels
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
      }
    }

    // ✅ Create or reuse verify channel
    let verifyChannel = guild.channels.cache.find(c => c.name === "✅│verify-here");
    if (!verifyChannel) {
      verifyChannel = await guild.channels.create({
        name: "✅│verify-here",
        type: 0,
      });
    }

    const verifyButton = new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verify")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await verifyChannel.send({
      content:
        "👋 Welcome to **The Meme Multiverse!** Click below to verify and unlock the rest of the server.",
      components: [row],
    });

    await interaction.followUp("🎉 The Meme Multiverse has been created!");
  }

  // ======================================
  // /reset-server Command
  // ======================================
  if (interaction.commandName === "reset-server") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp("⚠️ Resetting the server...");

    const tempChannel = await guild.channels.create({
      name: "📜│bot-commands-temp",
      type: 0,
    });

    // Delete all other channels
    for (const [id, channel] of guild.channels.cache) {
      if (channel.id !== tempChannel.id) {
        try {
          await channel.delete();
        } catch (err) {
          console.error(`Couldn't delete ${channel.name}: ${err.message}`);
        }
      }
    }

    // Delete all non-managed roles
    for (const [id, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await role.delete();
        } catch (err) {
          console.error(`Couldn't delete role ${role.name}: ${err.message}`);
        }
      }
    }

    await tempChannel.edit({ name: "📜│bot-commands" });
    await tempChannel.send("✅ Server reset complete! Type `/setup-meme` to rebuild the server.");

    await interaction.followUp("✅ Server successfully reset!");
  }

  // ======================================
  // /meme Command
  // ======================================
  if (interaction.commandName === "meme") {
    try {
      await interaction.deferReply();
      const response = await fetch("https://meme-api.com/gimme/dankmemes");
      const data = await response.json();

      if (!data || !data.url) {
        await interaction.editReply("⚠️ Couldn't fetch a meme right now, try again later!");
        return;
      }

      await interaction.editReply({
        content: `🤣 **${data.title}**\nFrom: [r/${data.subreddit}](https://reddit.com/r/${data.subreddit})`,
        embeds: [{ image: { url: data.url }, color: 0x00ff99 }],
      });
    } catch (err) {
      console.error("Error with /meme:", err);
      await interaction.reply("⚠️ Something went wrong getting the meme!");
    }
  }

  // ======================================
  // /rank Command
  // ======================================
  if (interaction.commandName === "rank") {
    const user = await Levels.fetch(interaction.user.id, interaction.guild.id);
    if (!user || user.level === 0) {
      await interaction.reply("💤 You haven’t earned any XP yet. Post some memes!");
    } else {
      await interaction.reply(`🏆 ${interaction.user.username}, you are Level **${user.level}** with **${user.xp} XP!**`);
    }
  }
});

// ======================================
// XP System — Gain XP for Meme Channels
// ======================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const allowedChannels = ["meme-plaza", "earth-420", "wholesome-verse", "void-of-dankness"];
  if (!allowedChannels.some(name => message.channel.name.includes(name))) return;

  const randomXp = Math.floor(Math.random() * 10) + 5;
  const hasLeveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomXp);

  if (hasLeveledUp) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    message.channel.send(`🎉 ${message.author} has reached **Level ${user.level}**!`);
  }
});


// ✅ Prevent bot from crashing on random Discord API errors
client.on("error", err => console.error("Client error:", err));
client.on("shardError", err => console.error("Shard error:", err));
process.on("unhandledRejection", err => console.error("Unhandled promise rejection:", err));

// ======================================
// Login
// ======================================
client.login(process.env.BOT_TOKEN);
