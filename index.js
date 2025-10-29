// ================================
// 🌌 Meme Multiverse Bot (Stable / Clean)
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
let template;
try {
  template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  console.log("🧩 Loaded template.json");
} catch {
  console.error("⚠️ template.json missing or invalid — using empty template");
  template = { categories: [], roles: [] };
}

// ✅ Connect XP System
if (process.env.MONGO_URI) {
  Levels.setURL(process.env.MONGO_URI);
  console.log("🗄️ Connected discord-xp to MongoDB");
} else {
  console.warn("⚠️ No MONGO_URI set, XP won't persist.");
}

// ✅ Create Discord Client
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

// --------------------------------
// Helpers
// --------------------------------
async function ensureDeferred(interaction, opts = { ephemeral: false }) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: opts.ephemeral }).catch(() => {});
  }
}

function roleResolvableFromTemplatePerms(perms) {
  // Pass through as-is if author already uses bitfields;
  // otherwise accept arrays of permission strings (best effort).
  return Array.isArray(perms) ? perms : [];
}

// --------------------------------
// 😂 Auto-Reactions for Meme Channels
// --------------------------------
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    const memeCategories = template.categories || [];

    for (const category of memeCategories) {
      for (const ch of category.channels || []) {
        if (
          ch.autoReactions &&
          message.channel.name === ch.name.replace(/^[^│]*│/, "")
        ) {
          for (const emoji of ch.autoReactions) {
            await message.react(emoji).catch(() => {});
          }
          return;
        }
      }
    }
  } catch (err) {
    console.error("Auto-reaction error:", err.message);
  }
});

// --------------------------------
// 🚀 Meme Reaction XP Booster
// --------------------------------
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot || !reaction.message.guild) return;

    const memeChannels = ["🤣│general-memes", "📸│fresh-dankness"];
    const message = reaction.message;

    if (!memeChannels.includes(message.channel.name)) return;

    const author = message.author;
    if (!author || author.bot || user.id === author.id) return;

    const xpBoost = Math.floor(Math.random() * 10) + 5; // 5–15 XP
    await Levels.appendXp(author.id, message.guild.id, xpBoost);

    const count = message.reactions.cache.get(reaction.emoji.name)?.count || 0;
    if (count >= 10 && count % 10 === 0) {
      const hype = [
        "🔥 That meme’s on fire!",
        "💀 Absolute legend post!",
        "🚀 This one's going to space!",
        "😂 The community loves this one!",
        "🏆 Certified dank content!",
        "🌈 Meme magic achieved!",
      ];
      const msg = hype[Math.floor(Math.random() * hype.length)];
      message.channel
        .send(`${msg} ${author}, you earned **${xpBoost} XP!**`)
        .catch(() => {});
    }
  } catch (err) {
    console.error("Reaction XP error:", err);
  }
});

// --------------------------------
// 🎭 Reaction Role Handlers (toggle)
// --------------------------------
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;

  const file = path.join(__dirname, "reactionRoles.json");
  if (!fs.existsSync(file)) return;

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (reaction.message.id !== data.messageId) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const rr = (data.mapping || []).find((m) => m.emoji === reaction.emoji.name);
  if (!rr) return;

  const role = guild.roles.cache.find((r) => r.name === rr.role);
  if (role) await member.roles.add(role).catch(() => {});
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;

  const file = path.join(__dirname, "reactionRoles.json");
  if (!fs.existsSync(file)) return;

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (reaction.message.id !== data.messageId) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const rr = (data.mapping || []).find((m) => m.emoji === reaction.emoji.name);
  if (!rr) return;

  const role = guild.roles.cache.find((r) => r.name === rr.role);
  if (role) await member.roles.remove(role).catch(() => {});
});

// --------------------------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🌍 The Meme Multiverse is now active!");
});

// --------------------------------
// 🎯 CENTRAL Interaction Handler
// --------------------------------
client.on("interactionCreate", async (interaction) => {
  try {
    // ---------- Verify Button
    if (interaction.isButton() && interaction.customId === "verify_button") {
      await handleVerifyButton(interaction);
      return;
    }

    // ---------- Slash Commands only
    if (!interaction.isChatInputCommand()) return;

    // Route by name; handlers handle their own defer/visibility
    switch (interaction.commandName) {
      case "setup-meme":
        return await handleSetupMeme(interaction);
      case "reset-server":
        return await handleResetServer(interaction);
      case "update-server":
        return await handleUpdateServer(interaction);
      case "meme":
        return await handleMeme(interaction);
      case "rank":
        return await handleRank(interaction);
      case "leaderboard":
        return await handleLeaderboard(interaction);
      case "help":
        return await handleHelp(interaction);
      default:
        await ensureDeferred(interaction, { ephemeral: true });
        return interaction.editReply("❌ Unknown command.");
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "❌ Something went wrong executing this command.", ephemeral: true })
        .catch(() => {});
    }
  }
});

// ================================
// 🛠️ Handlers
// ================================
async function handleVerifyButton(interaction) {
  try {
    await ensureDeferred(interaction, { ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.followUp({ content: "❌ This button only works in a server.", ephemeral: true });
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.followUp({ content: "❌ Could not find your member profile.", ephemeral: true });
    }

    const normieRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
    if (!normieRole) {
      return interaction.followUp({
        content: "⚠️ The **🌈 Normie** role doesn’t exist yet!",
        ephemeral: true,
      });
    }

    await member.roles.add(normieRole).catch(console.error);
    return interaction.followUp({
      content: "✅ You’re verified! Welcome to the Meme Multiverse!",
      ephemeral: true,
    });
  } catch (err) {
    console.error("Verify button error:", err);
    if (!interaction.deferred && !interaction.replied) {
      await interaction
        .reply({ content: "❌ Something went wrong while verifying you. Try again later.", ephemeral: true })
        .catch(() => {});
    } else {
      await interaction
        .followUp({ content: "❌ Something went wrong while verifying you. Try again later.", ephemeral: true })
        .catch(() => {});
    }
  }
}

async function handleResetServer(interaction) {
  const { guild } = interaction;
  try {
    await ensureDeferred(interaction, { ephemeral: true });
    await interaction.editReply("⚠️ Resetting the server...").catch(() => {});

    // Delete all channels
    for (const [, channel] of guild.channels.cache) {
      try {
        await channel.delete().catch(() => {});
      } catch (err) {
        console.log(`Couldn't delete ${channel?.name || "unknown"}: ${err.message}`);
      }
    }

    // Delete roles (except @everyone & managed)
    for (const [, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await role.delete().catch(() => {});
        } catch (err) {
          console.log(`Couldn't delete role ${role.name}: ${err.message}`);
        }
      }
    }

    // Create temp locked channel
    const everyoneRole = guild.roles.everyone;
    const tempChannel = await guild.channels.create({
      name: "📜│bot-commands",
      type: 0,
    });

    await tempChannel.permissionOverwrites.create(everyoneRole, { ViewChannel: false }).catch(() => {});
    await tempChannel
      .send("✅ Server reset complete! Type `/setup-meme` here to rebuild the server (admins only).")
      .catch(() => {});

    await interaction
      .followUp({
        content: "✅ Reset complete! A temporary `📜│bot-commands` channel has been created.",
        ephemeral: true,
      })
      .catch(() => {});
  } catch (error) {
    console.error("Reset server error:", error);
    const msg = `❌ Reset failed: ${error.message}`;
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }
}

async function handleSetupMeme(interaction) {
  const { guild } = interaction;

  try {
    await ensureDeferred(interaction, { ephemeral: true });
    await interaction.editReply("🌀 Setting up The Meme Multiverse...").catch(() => {});

    // --- Create core roles ---
    const roles = [
      { name: "👑 Meme Lord", color: "#FFD700", perms: [PermissionsBitField.Flags.Administrator] },
      {
        name: "🧱 Moderator",
        color: "#FF4500",
        perms: [
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ManageRoles,
          PermissionsBitField.Flags.ViewAuditLog,
        ],
      },
      { name: "🤖 The Overseer (Bot)", color: "#00FFFF", perms: [PermissionsBitField.Flags.ManageGuild] },
      { name: "🪖 Shitposter", color: "#FF69B4", perms: [] },
      { name: "🌈 Normie", color: "#7289DA", perms: [] },
      { name: "🧑‍🎨 Template Alchemist", color: "#32CD32", perms: [] },
      { name: "🕵️ Meme Historian", color: "#9932CC", perms: [] },
    ];

    for (const r of roles) {
      if (!guild.roles.cache.find((x) => x.name === r.name)) {
        await guild.roles.create({ name: r.name, color: r.color, permissions: r.perms }).catch((e) =>
          console.log(`Role error ${r.name}: ${e.message}`)
        );
      }
    }

    // Also ensure template-defined roles exist
    if (Array.isArray(template.roles)) {
      for (const r of template.roles) {
        if (!guild.roles.cache.find((x) => x.name === r.name)) {
          await guild.roles
            .create({
              name: r.name,
              color: r.color || null,
              permissions: roleResolvableFromTemplatePerms(r.permissions),
            })
            .catch((e) => console.log(`Role error ${r.name}: ${e.message}`));
        }
      }
    }

    // --- Permissions references ---
    const everyone = guild.roles.everyone;
    const normie = guild.roles.cache.find((r) => r.name === "🌈 Normie");
    const mod = guild.roles.cache.find((r) => r.name === "🧱 Moderator");
    const lord = guild.roles.cache.find((r) => r.name === "👑 Meme Lord");
    const botRole = guild.roles.cache.find((r) => r.name === "🤖 The Overseer (Bot)");

    // --- Build categories & channels from template ---
    for (const category of template.categories || []) {
      const cat = await guild.channels.create({ name: category.name, type: 4 }).catch(() => null);
      if (!cat) continue;

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
        const newCh = await guild.channels
          .create({
            name: ch.name,
            type: ch.type === "voice" ? 2 : 0,
            parent: cat.id,
          })
          .catch(() => null);
        if (!newCh) continue;

        if (!category.name.includes("STAFF AREA")) {
          await newCh.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
          if (normie) await newCh.permissionOverwrites.create(normie, { ViewChannel: true }).catch(() => {});
        }
      }
    }

    // === ✅ Verify Channel ===
    const verify = await guild.channels.create({ name: "✅│verify-here", type: 0 }).catch(() => null);
    if (verify) {
      await verify.permissionOverwrites
        .create(everyone, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true })
        .catch(() => {});
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("verify_button").setLabel("✅ Verify").setStyle(ButtonStyle.Success)
      );
      await verify
        .send({
          content: "👋 Welcome! Click **Verify** below to unlock the rest of the Meme Multiverse!",
          components: [row],
        })
        .catch(() => {});
    }

    // === 📘 Server Guide Channel ===
    const guide = await guild.channels.create({ name: "📘│server-guide", type: 0 }).catch(() => null);
    if (guide) {
      await guide.permissionOverwrites
        .create(everyone, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true })
        .catch(() => {});
      const guideText = `
🌌 **Welcome to The Meme Multiverse!**
> Where memes are more than jokes — they’re a way of life 💀  

## 🪐 Step 1: Get Verified
Go to **✅│verify-here** and press **Verify** to unlock the server.

## 👤 Ranks
\`\`\`
1  🌈 Normie
5  🪖 Shitposter
10 🔥 Meme Champion
20 💎 Legendary Memer
30 🧑‍🎨 Template Alchemist
50 🕵️ Meme Historian
\`\`\`

## 😂 Areas
🏠 Welcome • 🎭 Meme HQ • 📈 Level-Up • 🎨 Creator’s Lab • 🎭 Lounge • 🏛️ Staff

## 💎 Features
XP • Auto Reactions • Contests • Creator Roles • Leaderboard • Reaction Roles

## ⚖️ Rules
Be kind. No NSFW/hate. No spam. Credit creators. Have fun 💀
`;
      const sent = await guide.send(guideText).catch(() => {});
      if (sent) await sent.pin().catch(() => {});
    }

    // === 🎭 Reaction Roles message (inside setup) ===
    await ensureReactionRolesPost(guild);

    // 🧹 Cleanup old bot channel
    const old = guild.channels.cache.find((ch) => ch.name === "📜│bot-commands");
    if (old) await old.delete().catch(() => {});

    await interaction
      .editReply("🎉 Setup complete! New members will only see **verify** until verified.")
      .catch(() => {});
  } catch (error) {
    console.error("Setup error:", error);
    const msg = `❌ Setup failed: ${error.message}`;
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }
}

async function handleUpdateServer(interaction) {
  const { guild } = interaction;

  try {
    await ensureDeferred(interaction, { ephemeral: true });
    await interaction.editReply("🔄 Checking for new roles, channels, and guides...").catch(() => {});

    // Roles from template
    if (Array.isArray(template.roles)) {
      for (const r of template.roles) {
        if (!guild.roles.cache.find((x) => x.name === r.name)) {
          await guild.roles
            .create({
              name: r.name,
              color: r.color || null,
              permissions: roleResolvableFromTemplatePerms(r.permissions),
            })
            .catch((e) => console.log(`Role error ${r.name}: ${e.message}`));
        }
      }
    }

    // Categories & channels
    for (const category of template.categories || []) {
      let cat = guild.channels.cache.find((c) => c.name === category.name && c.type === 4);
      if (!cat) cat = await guild.channels.create({ name: category.name, type: 4 }).catch(() => null);
      if (!cat) continue;

      for (const ch of category.channels || []) {
        const exists = guild.channels.cache.find((c) => c.name === ch.name && c.parentId === cat.id);
        if (!exists) {
          await guild.channels
            .create({
              name: ch.name,
              type: ch.type === "voice" ? 2 : 0,
              parent: cat.id,
            })
            .catch(() => {});
        }
      }
    }

    // Reaction roles post (recreate to keep fresh)
    await ensureReactionRolesPost(guild);

    // Server guide sync
    await ensureServerGuideSync(guild);

    await interaction
      .followUp({
        content: "✅ Server updated successfully! Roles, channels, vibe roles, and server guide synced!",
        ephemeral: true,
      })
      .catch(() => {});
  } catch (err) {
    console.error("Update server error:", err);
    await interaction
      .followUp({ content: `❌ Failed to update: ${err.message}`, ephemeral: true })
      .catch(() => {});
  }
}

async function handleMeme(interaction) {
  await ensureDeferred(interaction, { ephemeral: false });
  const res = await fetch("https://meme-api.com/gimme").catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  if (!data || !data.url) {
    return interaction.editReply("❌ Couldn't fetch a meme right now.");
  }

  const embed = new EmbedBuilder()
    .setTitle(data.title || "Random Meme 😂")
    .setImage(data.url)
    .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit || "unknown"}` })
    .setColor("Random");

  return interaction.editReply({ embeds: [embed] });
}

async function handleRank(interaction) {
  const guild = interaction.guild;
  await ensureDeferred(interaction, { ephemeral: false });

  const user = await Levels.fetch(interaction.user.id, guild.id, true).catch(() => null);
  if (!user) return interaction.editReply("❌ You don’t have any XP yet!");

  const next = Levels.xpFor(user.level + 1);
  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username}'s Rank`)
    .setDescription(`**Level:** ${user.level}\n**XP:** ${user.xp} / ${next}`)
    .setColor("Blue");

  return interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
  const guild = interaction.guild;
  await ensureDeferred(interaction, { ephemeral: false });

  try {
    const raw = await Levels.fetchLeaderboard(guild.id, 10);
    if (!raw || raw.length < 1) {
      return interaction.editReply("❌ No one’s earned any XP yet! Post some memes!");
    }

    const cooked = await Levels.computeLeaderboard(client, raw, true);
    const lbString = cooked
      .map((u, i) => `**${i + 1}.** 🧠 ${u.username}#${u.discriminator} — **Lvl ${u.level}** (${u.xp} XP)`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Meme Multiverse Leaderboard")
      .setDescription(lbString)
      .setColor("Gold")
      .setFooter({ text: "Keep posting memes to climb the ranks!" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Leaderboard error:", err);
    await interaction.editReply("❌ Failed to load leaderboard.").catch(() => {});
  }
}

async function handleHelp(interaction) {
  await ensureDeferred(interaction, { ephemeral: false });

  const adminCommands = `
👑 **Admin Commands**
> 🧱 \`/setup-meme\` — Builds the server  
> 🔁 \`/reset-server\` — Nukes channels/roles & makes a rebuild channel  
> 🔄 \`/update-server\` — Syncs roles/channels from template (no deletions)  
`;

  const publicCommands = `
🌈 **Public Commands**
> 🤖 \`/meme\` — Get a fresh meme  
> 🧩 \`/rank\` — View your XP  
> 🏆 \`/leaderboard\` — Top memers  
`;

  const embed = new EmbedBuilder()
    .setColor("#00FFFF")
    .setTitle("📜 Meme Multiverse Commands")
    .setDescription("Explore the powers of the Meme Multiverse 🌌")
    .addFields(
      { name: "🛠️ Admin Commands", value: adminCommands },
      { name: "🌈 Public Commands", value: publicCommands }
    )
    .setFooter({ text: "Meme Multiverse Bot • Stay Dank 💀", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ================================
// 🔧 Utilities used by multiple handlers
// ================================
async function ensureReactionRolesPost(guild) {
  // Ensure channel exists
  let vibeChannel = guild.channels.cache.find((ch) => ch.name === "😎│choose-your-vibe");
  if (!vibeChannel) {
    const funCategory = guild.channels.cache.find((c) => c.name.includes("COMMUNITY LOUNGE") && c.type === 4);
    vibeChannel = await guild.channels
      .create({
        name: "😎│choose-your-vibe",
        type: 0,
        parent: funCategory ? funCategory.id : null,
      })
      .catch(() => null);
  }
  if (!vibeChannel) return;

  const reactionRoles = [
    { emoji: "💀", role: "💀 Dankster" },
    { emoji: "🌮", role: "🌮 Taco Lover" },
    { emoji: "🦆", role: "🦆 Quackhead" },
    { emoji: "🧠", role: "🧠 Galaxy Brain" },
    { emoji: "🐸", role: "🐸 Meme Frog" },
  ];

  // Ensure the roles exist
  for (const rr of reactionRoles) {
    if (!guild.roles.cache.find((r) => r.name === rr.role)) {
      await guild.roles.create({ name: rr.role }).catch(() => {});
    }
  }

  const filePath = path.join(__dirname, "reactionRoles.json");
  if (fs.existsSync(filePath)) {
    const old = JSON.parse(fs.readFileSync(filePath, "utf8"));
    try {
      const oldMsg = await vibeChannel.messages.fetch(old.messageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    } catch {}
  }

  const embed = new EmbedBuilder()
    .setTitle("🎭 Choose Your Meme Vibe")
    .setDescription(
      "Pick your meme identity! React below to claim a vibe — you can have more than one 😎\n\n" +
        reactionRoles.map((rr) => `${rr.emoji} → **${rr.role}**`).join("\n")
    )
    .setFooter({ text: "React to toggle your vibe role 💀" })
    .setTimestamp();

  const msg = await vibeChannel.send({ embeds: [embed] }).catch(() => null);
  if (msg) {
    for (const rr of reactionRoles) await msg.react(rr.emoji).catch(() => {});
    fs.writeFileSync(
      filePath,
      JSON.stringify({ messageId: msg.id, mapping: reactionRoles }, null, 2)
    );
  }
}

async function ensureServerGuideSync(guild) {
  let guide = guild.channels.cache.find((ch) => ch.name === "📘│server-guide");
  if (!guide) {
    const welcomeCat = guild.channels.cache.find((c) => c.name.includes("WELCOME ZONE") && c.type === 4);
    guide = await guild.channels
      .create({
        name: "📘│server-guide",
        type: 0,
        parent: welcomeCat ? welcomeCat.id : null,
      })
      .catch(() => null);
  }
  if (!guide) return;

  const everyone = guild.roles.everyone;
  await guide.permissionOverwrites
    .create(everyone, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true })
    .catch(() => {});

  const guideText = `
🌌 **Welcome to The Meme Multiverse!**
Read this guide to understand how everything works before diving in 💀

## Verify
Go to **✅│verify-here** and click **Verify**.

## Ranks
\`\`\`
1  🌈 Normie
5  🪖 Shitposter
10 🔥 Meme Champion
20 💎 Legendary Memer
30 🧑‍🎨 Template Alchemist
50 🕵️ Meme Historian
\`\`\`

## Areas
Welcome • Meme HQ • Level-Up • Creator's Lab • Lounge • Staff

## Features
XP • Auto Reactions • Contests • Creator Roles • Leaderboard • Reaction Roles

## Rules
Keep it fun. No hate/NSFW. No spam. Respect others. Credit creators.
`;

  const messages = await guide.messages.fetch({ limit: 1 }).catch(() => null);
  const existing = messages?.first();
  if (existing && existing.author.id === client.user.id) {
    await existing.edit(guideText).catch(() => {});
  } else {
    const msg = await guide.send(guideText).catch(() => null);
    if (msg) await msg.pin().catch(() => {});
  }
}

// ================================
// 📈 XP System (Chat)
// ================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const xp = Math.floor(Math.random() * 10) + 5;
  const leveled = await Levels.appendXp(message.author.id, message.guild.id, xp);
  if (leveled) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    message.channel
      .send(`🎉 ${message.author}, you leveled up to **Level ${user.level}**!`)
      .catch(() => {});
  }
});

// ================================
// 🔑 Login Guard
// ================================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing!");
  process.exit(1);
}

// ================================
// 🧩 Register Slash Commands Automatically
// ================================
client.once("ready", async () => {
  try {
    const commands = [
      {
        name: "setup-meme",
        description: "🧱 Builds the Meme Multiverse server (roles, channels, and verify system).",
      },
      {
        name: "reset-server",
        description: "🔁 Deletes all channels & roles and creates a rebuild channel.",
      },
      {
        name: "meme",
        description: "😂 Sends a fresh meme from Reddit.",
      },
      {
        name: "rank",
        description: "📈 Shows your XP and meme level.",
      },
      {
        name: "leaderboard",
        description: "🏆 Displays the top-ranked memers in the server.",
      },
      {
        name: "help",
        description: "📘 Shows the command and feature guide for the Meme Multiverse.",
      },
      {
        name: "update-server",
        description: "🔄 Syncs new roles, channels, and categories from the template without resetting anything.",
      },
    ];

    if (process.env.GUILD_ID) {
      await client.application.commands.set(commands, process.env.GUILD_ID);
      console.log(`✅ Registered slash commands for guild: ${process.env.GUILD_ID}`);
    } else {
      await client.application.commands.set(commands);
      console.log("🌍 Registered global slash commands.");
    }
  } catch (err) {
    console.error("⚠️ Failed to register slash commands:", err);
  }
});

// =====================================
// 🧹 Auto Delete Unsafe Commands on Startup
// =====================================
const { REST, Routes } = require("discord.js");

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
    console.log("🧹 Checking for old commands to delete...");

    const commands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    );

    const commandsToDelete = ["setup-meme", "reset-server", "update-server"];

    for (const command of commands) {
      if (commandsToDelete.includes(command.name)) {
        console.log(`🚮 Deleting command: ${command.name}`);
        await rest.delete(
          Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, command.id)
        );
      }
    }

    console.log("✅ Restricted commands removed successfully.");
  } catch (err) {
    console.error("❌ Failed to clean commands:", err.message);
  }
})();

// ================================
// 🌐 Keep-alive for Render
// ================================
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Meme Multiverse Bot is online ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// ✅ Start Bot
client.login(process.env.BOT_TOKEN);