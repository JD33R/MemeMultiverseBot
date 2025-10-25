// ============================================
// Meme Multiverse Bot – Full Version with XP
// ============================================

require("dotenv").config();
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  SlashCommandBuilder,
  Collection,
} = require("discord.js");

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================
// Local XP System Setup
// ============================================
const xpFile = "./levels.json";
let xpData = fs.existsSync(xpFile) ? JSON.parse(fs.readFileSync(xpFile)) : {};

function saveXP() {
  fs.writeFileSync(xpFile, JSON.stringify(xpData, null, 2));
}

function addXP(userId, guildId, xpToAdd) {
  if (!xpData[guildId]) xpData[guildId] = {};
  if (!xpData[guildId][userId])
    xpData[guildId][userId] = { xp: 0, level: 1 };

  const user = xpData[guildId][userId];
  user.xp += xpToAdd;

  const nextLevelXP = user.level * 100;
  if (user.xp >= nextLevelXP) {
    user.level++;
    user.xp = 0;
    return true;
  }

  return false;
}

// ============================================
// Bot Ready
// ============================================
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🚀 Meme Multiverse Bot is online with XP system!");
});

// ============================================
// XP Event on Message
// ============================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const leveledUp = addXP(message.author.id, message.guild.id, 10);

  if (leveledUp) {
    message.channel.send(`🎉 ${message.author} leveled up! You're now level ${xpData[message.guild.id][message.author.id].level}!`);
  }

  saveXP();
});

// ============================================
// Slash Commands
// ============================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  const guild = interaction.guild;

  // ======================
  // VERIFY BUTTON
  // ======================
  if (interaction.isButton() && interaction.customId === "verify_button") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const member = await guild.members.fetch(interaction.user.id);

      let verifiedRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
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
      await interaction.reply({ content: "⚠️ Verification failed.", ephemeral: true });
    }
    return;
  }

  // ======================
  // RESET SERVER
  // ======================
  if (interaction.commandName === "reset-server") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply("⚠️ Resetting the server...");

    for (const [id, channel] of guild.channels.cache) {
      try {
        await channel.delete();
      } catch (err) {
        console.warn(`Couldn't delete channel ${channel.name}:`, err.message);
      }
    }

    for (const [id, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await role.delete();
        } catch (err) {
          console.warn(`Couldn't delete role ${role.name}:`, err.message);
        }
      }
    }

    const botChannel = await guild.channels.create({
      name: "📜│bot-commands",
      type: 0,
    });

    await botChannel.send("✅ Server reset complete! Use `/setup-meme` to rebuild.");
    await interaction.followUp("🧹 Server wiped clean.");
    return;
  }

  // ======================
  // SETUP SERVER
  // ======================
  if (interaction.commandName === "setup-meme") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply("🌀 Setting up The Meme Multiverse...");

    const roles = [
      { name: "👑 Meme Lord", color: 16766720, permissions: [PermissionsBitField.Flags.Administrator] },
      { name: "🧱 Moderator", color: 3066993 },
      { name: "🤖 The Overseer (Bot)", color: 10070709 },
      { name: "🪖 Shitposter", color: 13632027 },
      { name: "🌈 Normie", color: 15158332 },
      { name: "🧑‍🎨 Template Alchemist", color: 3447003 },
      { name: "🕵️ Meme Historian", color: 9807270 },
    ];

    for (const r of roles) {
      if (!guild.roles.cache.find((role) => role.name === r.name)) {
        await guild.roles.create({
          name: r.name,
          color: r.color,
          permissions: r.permissions || [],
        });
        await wait(300);
      }
    }

    let verifyChannel = guild.channels.cache.find((c) => c.name === "✅│verify-here");
    if (!verifyChannel) {
      verifyChannel = await guild.channels.create({
        name: "✅│verify-here",
        type: 0,
      });
    }

    const verifyButton = new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verify Me")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await verifyChannel.send({
      content: "👋 Welcome! Click below to verify and unlock the rest of the server!",
      components: [row],
    });

    const everyoneRole = guild.roles.everyone;
    const verifiedRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");

    for (const [id, channel] of guild.channels.cache) {
      if (channel.id === verifyChannel.id) {
        await channel.permissionOverwrites.create(everyoneRole, { ViewChannel: true, SendMessages: true });
      } else {
        await channel.permissionOverwrites.create(everyoneRole, { ViewChannel: false, SendMessages: false });
        await channel.permissionOverwrites.create(verifiedRole, { ViewChannel: true, SendMessages: true });
      }
    }

    await interaction.followUp("🎉 Setup complete! Only verified users can now access the server.");
    return;
  }

  // ======================
  // MEME COMMAND
  // ======================
  if (interaction.commandName === "meme") {
    await interaction.deferReply();
    try {
      const res = await fetch("https://meme-api.com/gimme");
      const data = await res.json();
      await interaction.editReply({ content: `${data.title}\n${data.url}` });
    } catch (err) {
      await interaction.editReply("⚠️ Couldn't fetch a meme right now!");
    }
    return;
  }

  // ======================
  // RANK COMMAND
  // ======================
  if (interaction.commandName === "rank") {
    const user = xpData[guild.id]?.[interaction.user.id];
    if (!user) {
      await interaction.reply({ content: "😅 You haven’t earned any XP yet!", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `🏅 **${interaction.user.username}** — Level ${user.level}, XP: ${user.xp}/100`,
      ephemeral: true,
    });
  }
});

// ============================================
// Error Safety
// ============================================
client.on("error", (err) => console.error("Client error:", err));
client.on("shardError", (err) => console.error("Shard error:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

// ============================================
// Login
// ============================================
client.login(process.env.BOT_TOKEN);

