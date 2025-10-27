// ================================
// 🌌 Meme Multiverse Bot
// ================================

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const fetch = require("node-fetch");
const Levels = require("discord-xp");

// ✅ Connect XP to MongoDB
Levels.setURL(process.env.MONGO_URI);

// ================================
// 🤖 Create Client with ALL Intents
// ================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// ================================
// 🚀 Bot Ready
// ================================
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🌍 The Meme Multiverse is now active!");
});

// ================================
// 🎯 Slash Command + Button Handler
// ================================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "verify_button") {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const normieRole = guild.roles.cache.find(r => r.name === "🌈 Normie");

    if (!normieRole)
      return interaction.reply({ content: "⚠️ The Normie role doesn't exist yet!", ephemeral: true });

    await member.roles.add(normieRole);
    return interaction.reply({ content: "✅ You’re verified! Welcome to the Meme Multiverse!", ephemeral: true });
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName, guild } = interaction;

  // ===================================
  // 🔁 /reset-server
  // ===================================
  if (commandName === "reset-server") {
    await interaction.reply("⚠️ Resetting the server...");
    for (const [id, channel] of guild.channels.cache) {
      try { await channel.delete(); } catch (err) { console.error(`Couldn't delete ${channel.name}:`, err.message); }
    }
    for (const [id, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try { await role.delete(); } catch (err) { console.error(`Couldn't delete role ${role.name}:`, err.message); }
      }
    }
   const everyoneRole = guild.roles.everyone;
const tempChannel = await guild.channels.create({
  name: "📜│bot-commands",
  type: 0,
});

await tempChannel.permissionOverwrites.create(everyoneRole, { ViewChannel: false });
await tempChannel.send("✅ Server reset complete! Type `/setup-meme` here to rebuild the server (admins only).");
  }

  // ===================================
  // 🧱 /setup-meme
  // ===================================
   if (commandName === "setup-meme") {
  try {
    // Let Discord know the bot is processing
    await interaction.deferReply({ ephemeral: true });

    await interaction.followUp("🌀 Setting up The Meme Multiverse...");

  // Create roles
    for (const role of template.roles) {
      const roleData = {
        name: role.name,
        permissions: new PermissionsBitField(role.permissions || 0),
        color: role.color || null,
      };
      await guild.roles.create(roleData).catch(err => console.log(`Role error: ${err.message}`));
    }

    // Create categories and channels
    for (const category of template.categories) {
      const cat = await guild.channels.create({
        name: category.name,
        type: 4,
      });

      const everyone = guild.roles.everyone;
      const normie = guild.roles.cache.find(r => r.name === "🌈 Normie");
      const mod = guild.roles.cache.find(r => r.name === "🧱 Moderator");
      const lord = guild.roles.cache.find(r => r.name === "👑 Meme Lord");
      const bot = guild.roles.cache.find(r => r.name === "🤖 The Overseer (Bot)");

      if (category.name.includes("STAFF AREA")) {
        await cat.permissionOverwrites.create(everyone, { ViewChannel: false });
        if (lord) await cat.permissionOverwrites.create(lord, { ViewChannel: true });
        if (mod) await cat.permissionOverwrites.create(mod, { ViewChannel: true });
        if (bot) await cat.permissionOverwrites.create(bot, { ViewChannel: true });
      } else {
        await cat.permissionOverwrites.create(everyone, { ViewChannel: false });
        if (normie) await cat.permissionOverwrites.create(normie, { ViewChannel: true });
      }

      for (const channel of category.channels) {
        const ch = await guild.channels.create({
          name: channel.name,
          type: channel.type === "voice" ? 2 : 0,
          parent: cat.id,
        });

        // Hide non-staff channels until verified
        if (!category.name.includes("STAFF AREA")) {
          await ch.permissionOverwrites.create(everyone, { ViewChannel: false });
          if (normie) await ch.permissionOverwrites.create(normie, { ViewChannel: true });
        }
      }
    }

    // === Create Verify Channel ===
    const verifyChannel = await guild.channels.create({
      name: "✅│verify-here",
      type: 0,
    });

    const everyoneRole = guild.roles.everyone;
    await verifyChannel.permissionOverwrites.create(everyoneRole, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_button")
        .setLabel("✅ Verify")
        .setStyle(ButtonStyle.Success)
    );

    await verifyChannel.send({
      content: "👋 Welcome! Click the **Verify** button below to unlock the rest of the Meme Multiverse!",
      components: [row],
    });

    // === Delete temporary bot-commands channel if it exists ===
    const oldBotChannel = guild.channels.cache.find(ch => ch.name === "📜│bot-commands");
    if (oldBotChannel) await oldBotChannel.delete().catch(() => {});

    await interaction.followUp("🎉 Setup complete! Only new members will see the verify channel until they verify.");
  } catch (error) {
    console.error("Setup error:", error);
    await interaction.followUp(`❌ Setup failed: ${error.message}`);
  }
}

  // ===================================
  // 🧠 /verify (manual fallback)
  // ===================================
  if (commandName === "verify") {
    const member = await guild.members.fetch(interaction.user.id);
    const role = guild.roles.cache.find(r => r.name === "🌈 Normie");
    if (!role) return interaction.reply("⚠️ The Normie role doesn't exist yet!");
    await member.roles.add(role);
    await interaction.reply("✅ You’ve been verified! Welcome to the Meme Multiverse!");
  }

  // ===================================
  // 😂 /meme
  // ===================================
  if (commandName === "meme") {
    await interaction.deferReply();
    const response = await fetch("https://meme-api.com/gimme");
    const data = await response.json();

    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setImage(data.url)
      .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` })
      .setColor("Random");

    await interaction.followUp({ embeds: [embed] });
  }

  // ===================================
  // 🧩 /rank
  // ===================================
  if (commandName === "rank") {
    const user = await Levels.fetch(interaction.user.id, guild.id, true);
    if (!user) return interaction.reply("❌ You don't have any XP yet!");
    const nextLevelXP = Levels.xpFor(user.level + 1);

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Rank`)
      .setDescription(`**Level:** ${user.level}\n**XP:** ${user.xp} / ${nextLevelXP}`)
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  }

  // ===================================
  // 🧠 /check-intents
  // ===================================
  if (commandName === "check-intents") {
    const activeIntents = Object.keys(GatewayIntentBits)
      .filter(intent => client.options.intents.has(GatewayIntentBits[intent]));

    const embed = new EmbedBuilder()
      .setTitle("🧩 Active Discord Gateway Intents")
      .setColor("Aqua")
      .setDescription(activeIntents.map(i => `✅ ${i}`).join("\n"))
      .setFooter({ text: `Total Active: ${activeIntents.length}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// ================================
// 📈 XP System
// ================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const randomXP = Math.floor(Math.random() * 10) + 5;
  const hasLeveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomXP);
  if (hasLeveledUp) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    message.channel.send(`🎉 ${message.author}, you leveled up to **Level ${user.level}**!`);
  }
});

// ==========================================
// 😂 Auto-Reactions for Meme Channels
// ==========================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // Load template
  const template = JSON.parse(fs.readFileSync("template.json", "utf8"));

  // Loop through categories/channels with autoReactions
  for (const category of template.categories) {
    for (const channel of category.channels) {
      if (
        channel.autoReactions &&
        message.channel.name === channel.name.replace(/[^\w-]/g, "")
      ) {
        for (const emoji of channel.autoReactions) {
          try {
            await message.react(emoji);
          } catch (err) {
            console.error(`Failed to react with ${emoji}:`, err.message);
          }
        }
      }
    }
  }
});

// ================================
// 🔑 Login
// ================================
client.login(process.env.BOT_TOKEN);
