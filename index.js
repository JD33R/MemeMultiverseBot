// ================================
// 🌌 Meme Multiverse Bot (Stable)
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
const fs = require("fs");
const path = require("path");
const Levels = require("discord-xp");

// ================================
// 🧱 Load Meme Server Template
// ================================
const templatePath = path.join(__dirname, "template.json");
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

// ✅ Connect XP System
Levels.setURL(process.env.MONGO_URI);

// ✅ Create client with full intents
const client = new Client({
  intents: Object.values(GatewayIntentBits),
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
// 🎯 Interaction Handler
// ================================
client.on("interactionCreate", async (interaction) => {
  try {
    // ===============================
    // 🖱️ Verify Button
    // ===============================
    if (interaction.isButton() && interaction.customId === "verify_button") {
      await interaction.deferReply({ flags: 64 });

      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      const normieRole = guild.roles.cache.find(r => r.name === "🌈 Normie");

      if (!normieRole)
        return await interaction.editReply("⚠️ The Normie role doesn’t exist yet!");

      await member.roles.add(normieRole);
      return await interaction.editReply("✅ You’re verified! Welcome to the Meme Multiverse!");
    }

    // Ignore non-slash commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild } = interaction;

    // ===================================
    // 🔁 /reset-server
    // ===================================
    if (commandName === "reset-server") {
      await interaction.reply({ content: "⚠️ Resetting the server...", flags: 64 });

      for (const [id, channel] of guild.channels.cache) {
        try {
          await channel.delete();
        } catch (err) {
          console.log(`Couldn't delete ${channel.name}: ${err.message}`);
        }
      }

      for (const [id, role] of guild.roles.cache) {
        if (role.name !== "@everyone" && !role.managed) {
          try {
            await role.delete();
          } catch (err) {
            console.log(`Couldn't delete role ${role.name}: ${err.message}`);
          }
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
        // ✅ Initial acknowledgement
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({ content: "🌀 Setting up The Meme Multiverse...", flags: 64 });
        }

        // === Create Roles ===
        for (const role of template.roles) {
          const roleData = {
            name: role.name,
            permissions: new PermissionsBitField(BigInt(role.permissions) || 0n),
            color: role.color || null,
          };
          await guild.roles.create(roleData).catch(err =>
            console.log(`Role creation error for ${role.name}: ${err.message}`)
          );
        }

        // === Create Categories & Channels ===
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

          // Create channels
          for (const channel of category.channels) {
            const ch = await guild.channels.create({
              name: channel.name,
              type: channel.type === "voice" ? 2 : 0,
              parent: cat.id,
            });

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

        // 🧹 Cleanup
        const oldBotChannel = guild.channels.cache.find(ch => ch.name === "📜│bot-commands");
        if (oldBotChannel) await oldBotChannel.delete().catch(() => {});

        await interaction.followUp({
          content: "🎉 Setup complete! New members will only see the verify channel until they verify.",
          flags: 64,
        });

      } catch (error) {
        console.error("Setup error:", error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `❌ Setup failed: ${error.message}`, flags: 64 });
        } else {
          await interaction.followUp({ content: `❌ Setup failed: ${error.message}`, flags: 64 });
        }
      }
    }

    // ===================================
    // 🧠 /verify (manual)
    // ===================================
    if (commandName === "verify") {
      const member = await guild.members.fetch(interaction.user.id);
      const role = guild.roles.cache.find(r => r.name === "🌈 Normie");
      if (!role) return await interaction.reply({ content: "⚠️ The Normie role doesn’t exist yet!", flags: 64 });
      await member.roles.add(role);
      await interaction.reply({ content: "✅ You’re verified! Welcome!", flags: 64 });
    }

    // ===================================
    // 😂 /meme
    // ===================================
    if (commandName === "meme") {
      await interaction.reply({ content: "Fetching a meme...", flags: 64 });
      const res = await fetch("https://meme-api.com/gimme");
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setTitle(data.title)
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` })
        .setColor("Random");

      await interaction.followUp({ embeds: [embed], flags: 64 });
    }

    // ===================================
    // 🧩 /rank
    // ===================================
    if (commandName === "rank") {
      await interaction.reply({ content: "Checking your rank...", flags: 64 });
      const user = await Levels.fetch(interaction.user.id, guild.id, true);
      if (!user) return await interaction.followUp({ content: "❌ You don’t have any XP yet!", flags: 64 });
      const nextLevelXP = Levels.xpFor(user.level + 1);

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Rank`)
        .setDescription(`**Level:** ${user.level}\n**XP:** ${user.xp} / ${nextLevelXP}`)
        .setColor("Blue");

      await interaction.followUp({ embeds: [embed], flags: 64 });
    }
  } catch (err) {
    console.error("Interaction error:", err);
  }
});

// ================================
// 📈 XP System
// ================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const randomXP = Math.floor(Math.random() * 10) + 5;
  const leveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomXP);
  if (leveledUp) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    message.channel.send(`🎉 ${message.author}, you leveled up to **Level ${user.level}**!`);
  }
});

// ================================
// 🔑 Login
// ================================
client.login(process.env.BOT_TOKEN);
