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
  PermissionFlagsBits,
} = require("discord.js");

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const Levels = require("discord-xp");

// ================================
// 🧱 Load Meme Server Template
// ================================
const templatePath = path.join(__dirname, "template.json");
let template;
try {
  template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
} catch (e) {
  console.error("Failed to read template.json. Make sure it exists and is valid JSON.");
  template = { roles: [], categories: [] };
}

// ✅ Connect XP System (MongoDB URI required)
if (!process.env.MONGO_URI) {
  console.warn("⚠️ MONGO_URI not set. XP system will fail to connect.");
} else {
  try {
    Levels.setURL(process.env.MONGO_URI);
  } catch (e) {
    console.error("Failed to connect XP (Levels.setURL):", e.message);
  }
}

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

// Small helper to always acknowledge an interaction safely
async function ensureDeferred(interaction, opts = { ephemeral: true }) {
  if (interaction.deferred || interaction.replied) return;
  // v14: use flags: 64 OR ephemeral: true (both supported now). We'll use ephemeral for readability.
  await interaction.deferReply({ ephemeral: !!opts.ephemeral }).catch(() => {});
}

// ================================
// 🎯 Interaction Handler
// ================================
client.on("interactionCreate", async (interaction) => {
  try {
    // ===============================
    // 🖱️ Verify Button
    // ===============================
    if (interaction.isButton() && interaction.customId === "verify_button") {
      await ensureDeferred(interaction, { ephemeral: true });

      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ This button only works in a server.");

      const member = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) return interaction.editReply("❌ Could not find your member profile.");

      const normieRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
      if (!normieRole) return interaction.editReply("⚠️ The **🌈 Normie** role doesn’t exist yet!");

      await member.roles.add(normieRole).catch((e) => {
        console.error("Add role error:", e);
      });
      return interaction.editReply("✅ You’re verified! Welcome to the Meme Multiverse!");
    }

    // Ignore non-slash commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild } = interaction;
    if (!guild) {
      await ensureDeferred(interaction, { ephemeral: true });
      return interaction.editReply("❌ This command can only be used in a server.");
    }

    // ===================================
    // 🔁 /reset-server
    // ===================================
    if (commandName === "reset-server") {
      await ensureDeferred(interaction, { ephemeral: true });
      await interaction.editReply("⚠️ Resetting the server...");

      // Delete channels
      for (const [, channel] of guild.channels.cache) {
        try {
          await channel.delete();
        } catch (err) {
          console.log(`Couldn't delete channel ${channel?.name || channel?.id}: ${err.message}`);
        }
      }

      // Delete roles (except @everyone & managed)
      for (const [, role] of guild.roles.cache) {
        if (role.name !== "@everyone" && !role.managed) {
          try {
            await role.delete();
          } catch (err) {
            console.log(`Couldn't delete role ${role.name}: ${err.message}`);
          }
        }
      }

      // Create a temporary locked channel
      const everyoneRole = guild.roles.everyone;
      const tempChannel = await guild.channels.create({
        name: "📜│bot-commands",
        type: 0,
      });

      await tempChannel.permissionOverwrites.create(everyoneRole, { ViewChannel: false }).catch(() => {});
      await tempChannel.send("✅ Server reset complete! Type `/setup-meme` here to rebuild the server (admins only).").catch(() => {});
      return interaction.followUp({ content: "✅ Reset done.", ephemeral: true }).catch(() => {});
    }

    // ===================================
    // 🧱 /setup-meme
    // ===================================
    if (commandName === "setup-meme") {
      try {
        await ensureDeferred(interaction, { ephemeral: true });
        await interaction.editReply("🌀 Setting up The Meme Multiverse...");

        // --- Create or fetch core roles with safe permissions ---
       const wantRoles = [
  { name: "👑 Meme Lord", color: "#FFD700", perms: [PermissionFlagsBits.Administrator] },
  {
    name: "🧱 Moderator",
    color: "#FF4500",
    perms: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ViewAuditLog,
    ],
  },
  { name: "🤖 The Overseer (Bot)", color: "#00FFFF", perms: [PermissionFlagsBits.ManageGuild] },
  { name: "🪖 Shitposter", color: "#FF69B4", perms: [] },
  { name: "🌈 Normie", color: "#7289DA", perms: [] },
  { name: "🧑‍🎨 Template Alchemist", color: "#32CD32", perms: [] },
  { name: "🕵️ Meme Historian", color: "#9932CC", perms: [] },
];

for (const r of wantRoles) {
  let existing = guild.roles.cache.find((x) => x.name === r.name);
  if (!existing) {
    try {
      existing = await guild.roles.create({
        name: r.name,
        color: r.color,
        permissions: r.perms, // <— now an array, not a bitfield
      });
    } catch (e) {
      console.log(`Role create error (${r.name}): ${e.message}`);
    }
  }
}


        for (const r of wantRoles) {
          let existing = guild.roles.cache.find((x) => x.name === r.name);
          if (!existing) {
            try {
              existing = await guild.roles.create({
                name: r.name,
                color: r.color,
                permissions: r.perms,
              });
            } catch (e) {
              console.log(`Role create error (${r.name}): ${e.message}`);
            }
          }
        }

        // Refresh role refs
        const everyone = guild.roles.everyone;
        const normie = guild.roles.cache.find((r) => r.name === "🌈 Normie");
        const mod = guild.roles.cache.find((r) => r.name === "🧱 Moderator");
        const lord = guild.roles.cache.find((r) => r.name === "👑 Meme Lord");
        const botRole = guild.roles.cache.find((r) => r.name === "🤖 The Overseer (Bot)");

        // --- Create categories & channels from template ---
        for (const category of template.categories || []) {
          let cat;
          try {
            cat = await guild.channels.create({
              name: category.name,
              type: 4,
            });
          } catch (e) {
            console.log(`Category create error (${category.name}): ${e.message}`);
            continue;
          }

          // Permissions per category
          if (category.name.includes("STAFF AREA")) {
            await cat.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
            if (lord) await cat.permissionOverwrites.create(lord, { ViewChannel: true }).catch(() => {});
            if (mod) await cat.permissionOverwrites.create(mod, { ViewChannel: true }).catch(() => {});
            if (botRole) await cat.permissionOverwrites.create(botRole, { ViewChannel: true }).catch(() => {});
          } else {
            await cat.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
            if (normie) await cat.permissionOverwrites.create(normie, { ViewChannel: true }).catch(() => {});
          }

          for (const ch of category.channels || []) {
            let newCh;
            try {
              newCh = await guild.channels.create({
                name: ch.name,
                type: ch.type === "voice" ? 2 : 0,
                parent: cat.id,
              });
            } catch (e) {
              console.log(`Channel create error (${ch.name}): ${e.message}`);
              continue;
            }

            if (!category.name.includes("STAFF AREA")) {
              await newCh.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
              if (normie) await newCh.permissionOverwrites.create(normie, { ViewChannel: true }).catch(() => {});
            }
          }
        }

        // === Create Verify Channel (visible to everyone for onboarding) ===
        const verifyChannel = await guild.channels.create({
          name: "✅│verify-here",
          type: 0,
        });

        await verifyChannel.permissionOverwrites.create(everyone, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("verify_button").setLabel("✅ Verify").setStyle(ButtonStyle.Success)
        );

        await verifyChannel
          .send({
            content: "👋 Welcome! Click the **Verify** button below to unlock the rest of the Meme Multiverse!",
            components: [row],
          })
          .catch(() => {});

        // 🧹 Cleanup old temp channel
        const oldBotChannel = guild.channels.cache.find((ch) => ch.name === "📜│bot-commands");
        if (oldBotChannel) await oldBotChannel.delete().catch(() => {});

        return interaction.editReply("🎉 Setup complete! New members will only see **verify** until they verify.");
      } catch (error) {
        console.error("Setup error:", error);
        if (!interaction.deferred && !interaction.replied) {
          return interaction.reply({ content: `❌ Setup failed: ${error.message}`, ephemeral: true }).catch(() => {});
        }
        return interaction.editReply(`❌ Setup failed: ${error.message}`).catch(() => {});
      }
    }

    // ===================================
    // 🧠 /verify (manual)
    // ===================================
    if (commandName === "verify") {
      await ensureDeferred(interaction, { ephemeral: true });

      const member = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) return interaction.editReply("❌ Could not find your member profile.");

      const role = guild.roles.cache.find((r) => r.name === "🌈 Normie");
      if (!role) return interaction.editReply("⚠️ The **🌈 Normie** role doesn’t exist yet!");

      await member.roles.add(role).catch((e) => console.log("Add role error:", e.message));
      return interaction.editReply("✅ You’re verified! Welcome!");
    }

    // ===================================
    // 😂 /meme
    // ===================================
    if (commandName === "meme") {
      try {
        await ensureDeferred(interaction, { ephemeral: false });

        const res = await fetch("https://meme-api.com/gimme");
        const data = await res.json().catch(() => null);

        if (!data || !data.url) {
          return interaction.editReply("❌ Couldn't fetch a meme right now. Try again later!");
        }

        const embed = new EmbedBuilder()
          .setTitle(data.title || "Random Meme 😂")
          .setImage(data.url)
          .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit || "unknown"}` })
          .setColor("Random");

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error("Meme command error:", err);
        if (!interaction.deferred && !interaction.replied) {
          return interaction.reply({ content: "❌ Failed to fetch meme. Try again later!", ephemeral: true }).catch(() => {});
        }
        return interaction.editReply("❌ Failed to fetch meme. Try again later!").catch(() => {});
      }
    }

    // ===================================
    // 🧩 /rank
    // ===================================
    if (commandName === "rank") {
      await ensureDeferred(interaction, { ephemeral: true });

      let user;
      try {
        user = await Levels.fetch(interaction.user.id, guild.id, true);
      } catch (e) {
        console.error("Levels.fetch error:", e.message);
      }

      if (!user) return interaction.editReply("❌ You don’t have any XP yet!");

      const nextLevelXP = Levels.xpFor(user.level + 1);
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Rank`)
        .setDescription(`**Level:** ${user.level}\n**XP:** ${user.xp} / ${nextLevelXP}`)
        .setColor("Blue");

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error("Interaction error:", err);
  }
});

// ================================
// 📈 XP System
// ================================
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    const randomXP = Math.floor(Math.random() * 10) + 5;
    const leveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomXP);
    if (leveledUp) {
      const user = await Levels.fetch(message.author.id, message.guild.id);
      message.channel.send(`🎉 ${message.author}, you leveled up to **Level ${user.level}**!`).catch(() => {});
    }
  } catch (e) {
    console.error("XP handler error:", e.message);
  }
});

// ================================
// 🔑 Login
// ================================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing! Set it in your environment.");
  process.exit(1);
}
client.login(process.env.BOT_TOKEN);
