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
let template;
try {
  template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
} catch {
  console.error("⚠️ template.json missing or invalid — using empty template");
  template = { categories: [] };
}

// ✅ Connect XP System
if (process.env.MONGO_URI) Levels.setURL(process.env.MONGO_URI);
else console.warn("⚠️ No MONGO_URI set, XP won't save.");

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

// ================================
// 😂 Auto-Reactions for Meme Channels
// ================================
client.on("messageCreate", async (message) => {
  try {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) return;

    // Load template for autoReactions
    const memeCategories = template.categories || [];

    // Find if this channel is listed for autoReactions
    for (const category of memeCategories) {
      for (const ch of category.channels || []) {
        if (
          ch.autoReactions &&
          message.channel.name === ch.name.replace(/^[^│]*│/, "") // handle emoji prefixes like "🤣│general-memes"
        ) {
          for (const emoji of ch.autoReactions) {
            await message.react(emoji).catch(() => {}); // React silently
          }
          return; // stop after reacting once per message
        }
      }
    }
  } catch (err) {
    console.error("Auto-reaction error:", err.message);
  }
});


// ================================
// 🚀 Meme Reaction XP Booster
// ================================
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot || !reaction.message.guild) return;

    const memeChannels = ["🤣│general-memes", "📸│fresh-dankness"];
    const message = reaction.message;

    // Only boost XP for memes in meme channels
    if (!memeChannels.includes(message.channel.name)) return;

    const reactor = user;
    const author = message.author;
    if (!author || author.bot || reactor.id === author.id) return; // no self-boosting

    // Give the meme author a random XP reward
    const xpBoost = Math.floor(Math.random() * 10) + 5; // 5–15 XP per reaction
    await Levels.appendXp(author.id, message.guild.id, xpBoost);

    // Optional: fun viral milestones
    const reactionCount = message.reactions.cache.get(reaction.emoji.name)?.count || 0;
    if (reactionCount >= 10 && reactionCount % 10 === 0) {
      const viralMessages = [
        "🔥 That meme’s on fire!",
        "💀 Absolute legend post!",
        "🚀 This one's going to space!",
        "😂 The community loves this one!",
        "🏆 Certified dank content!",
        "🌈 Meme magic achieved!",
      ];
      const randomMsg = viralMessages[Math.floor(Math.random() * viralMessages.length)];
      message.channel.send(`${randomMsg} ${author}, you earned **${xpBoost} XP!**`);
    }

  } catch (err) {
    console.error("Reaction XP error:", err);
  }
});


// ================================
// 🏆 Meme Leaderboard Command
// ================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, guild } = interaction;
  if (commandName !== "leaderboard") return;

  try {
    await interaction.deferReply({ ephemeral: false });
    const rawLeaderboard = await Levels.fetchLeaderboard(guild.id, 10);

    if (rawLeaderboard.length < 1)
      return interaction.editReply("❌ No one’s earned any XP yet! Post some memes!");

    const leaderboard = await Levels.computeLeaderboard(client, rawLeaderboard, true);
    const lbString = leaderboard
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
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Failed to load leaderboard.", ephemeral: true }).catch(() => {});
    } else {
      await interaction.editReply("❌ Failed to load leaderboard.").catch(() => {});
    }
  }
});


client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🌍 The Meme Multiverse is now active!");
});

// Helper to always safely defer
async function ensureDeferred(interaction, opts = { ephemeral: true }) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: opts.ephemeral }).catch(() => {});
  }
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
  try {
    // ✅ Always ensure the interaction is deferred first
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.followUp({
        content: "❌ This button only works in a server.",
        ephemeral: true,
      });
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.followUp({
        content: "❌ Could not find your member profile.",
        ephemeral: true,
      });
    }

    const normieRole = guild.roles.cache.find(r => r.name === "🌈 Normie");
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
    // fallback to safe reply if needed
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: "❌ Something went wrong while verifying you. Try again later.",
        ephemeral: true,
      }).catch(() => {});
    } else {
      await interaction.followUp({
        content: "❌ Something went wrong while verifying you. Try again later.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
}

    // 🧠 Ignore non-slash commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild } = interaction;
    if (!guild) {
      await ensureDeferred(interaction);
      return interaction.editReply("❌ This command can only be used in a server.");
    }

   // ===================================
// 🔁 /reset-server (Fixed & Safe)
// ===================================
if (commandName === "reset-server") {
  const { guild } = interaction;
  try {
    // ✅ Always defer first to avoid InteractionNotReplied
    await ensureDeferred(interaction, { ephemeral: true }).catch(() => {});
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

    // ✅ Create a temporary locked channel
    const everyoneRole = guild.roles.everyone;
    const tempChannel = await guild.channels.create({
      name: "📜│bot-commands",
      type: 0, // text
    });

    await tempChannel.permissionOverwrites.create(everyoneRole, { ViewChannel: false }).catch(() => {});
    await tempChannel
      .send("✅ Server reset complete! Type `/setup-meme` here to rebuild the server (admins only).")
      .catch(() => {});

    // ✅ Safely finalize the interaction (avoids Unknown Message)
    await interaction
      .followUp({
        content: "✅ Reset complete! A temporary `📜│bot-commands` channel has been created.",
        ephemeral: true,
      })
      .catch(() => {
        console.log("Interaction expired — reset completed successfully.");
      });
  } catch (error) {
    console.error("Reset server error:", error);
    const msg = `❌ Reset failed: ${error.message}`;
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }
}

    // ===================================
// 🧱 /setup-meme (Crash-Proof + Full Features)
// ===================================
if (commandName === "setup-meme") {
  const { guild } = interaction;

  try {
    // ✅ Safely defer interaction to avoid "not replied" errors
    await ensureDeferred(interaction, { ephemeral: true }).catch(() => {});
    await interaction.editReply("🌀 Setting up The Meme Multiverse...").catch(() => {});

    // --- Create roles ---
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
      if (!guild.roles.cache.find(x => x.name === r.name)) {
        await guild.roles.create(r).catch(e => console.log(`Role error ${r.name}: ${e.message}`));
      }
    }

    // --- Fetch references ---
    const everyone = guild.roles.everyone;
    const normie = guild.roles.cache.find(r => r.name === "🌈 Normie");
    const mod = guild.roles.cache.find(r => r.name === "🧱 Moderator");
    const lord = guild.roles.cache.find(r => r.name === "👑 Meme Lord");
    const botRole = guild.roles.cache.find(r => r.name === "🤖 The Overseer (Bot)");

    // --- Build categories and channels from template ---
    for (const category of template.categories || []) {
      const cat = await guild.channels.create({ name: category.name, type: 4 }).catch(() => null);
      if (!cat) continue;

      // Permissions for each category
      if (category.name.includes("STAFF AREA")) {
        await cat.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
        if (lord) await cat.permissionOverwrites.create(lord, { ViewChannel: true }).catch(() => {});
        if (mod) await cat.permissionOverwrites.create(mod, { ViewChannel: true }).catch(() => {});
        if (botRole) await cat.permissionOverwrites.create(botRole, { ViewChannel: true }).catch(() => {});
      } else {
        await cat.permissionOverwrites.create(everyone, { ViewChannel: false }).catch(() => {});
        if (normie) await cat.permissionOverwrites.create(normie, { ViewChannel: true }).catch(() => {});
      }

      // Create text/voice channels inside category
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

    // === ✅ Create Verify Channel ===
    const verify = await guild.channels.create({ name: "✅│verify-here", type: 0 }).catch(() => null);
    if (verify) {
      await verify.permissionOverwrites.create(everyone, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      }).catch(() => {});

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

// === 📘 Create Server Guide Channel ===
const guide = await guild.channels.create({
  name: "📘│server-guide",
  type: 0, // text
}).catch(() => null);

if (guide) {
  // Make guide visible to everyone (even unverified)
  await guide.permissionOverwrites.create(everyone, {
    ViewChannel: true,
    SendMessages: false,
    ReadMessageHistory: true,
  }).catch(() => {});

  const guideText = `
🌌 **Welcome to The Meme Multiverse!**
> Where memes are more than jokes — they’re a way of life 💀  
> Read this guide to understand how everything works before diving in!

---

## 🪐 **Step 1: Get Verified**
Head to the **✅│verify-here** channel and click the **Verify** button.  
This unlocks the rest of the Multiverse so you can post, react, and level up!

---

## 👤 **Your Journey Begins Here**
Once verified, you’ll start as a **🌈 Normie** — the first tier of memers.  
By chatting, posting memes, and engaging with others, you earn **XP** and climb the ranks!

**Level Up & Evolve**
\`\`\`
1  🌈 Normie — Access to meme & chat channels
5  🪖 Shitposter — Unlock fun & meme event channels
10 🔥 Meme Champion — Get featured in contests
20 💎 Legendary Memer — Access to Creator’s Lab
30 🧑‍🎨 Template Alchemist — Collaborate on meme templates
50 🕵️ Meme Historian — Help preserve legendary memes
\`\`\`

---

## 😂 **Explore the Multiverse**
🏠 **Welcome Zone** — Announcements & Introductions  
🎭 **Meme HQ** — Share memes & chaos  
📈 **Level-Up Zone** — XP and leaderboard channels  
🎨 **Creator’s Lab** — Meme creation and design  
🎭 **Community Lounge** — Chat and voice hangouts  
🏛️ **Staff Area** — Mod-only zone  

---

## 💎 **Server Features**
✨ XP System — Earn XP from memes & chat  
😂 Auto Reactions — Memes get instant reactions  
🏆 Contests — Compete for meme fame  
🎨 Creator Roles — Unlock exclusive meme roles  
📈 Leaderboard — Flex your meme power  
🤖 Commands:
> \`/meme\` Get a random meme  
> \`/rank\` Check your XP level  
> \`/help\` View all commands  

---

## ⚖️ **Rules**
1. Keep memes fun — no hate or NSFW  
2. No spam or self-promo  
3. Respect mods & others  
4. Credit meme creators when possible  
5. Have fun — that’s mandatory 💀

---

## 🌈 **Stay Dank**
Engage, react, share memes — and rise to meme immortality.  
> “One does not simply post a meme... One crafts it.” 💀
`;

  const sentMessage = await guide.send(guideText).catch(() => {});
  if (sentMessage) await sentMessage.pin().catch(() => {});
}

    // === 📘 Create Command Guide Channel ===
    const guideChannel = await guild.channels.create({
      name: "📘│command-guide",
      type: 0,
    }).catch(() => null);

    if (guideChannel) {
      const adminCommands = `
> 🧱 \`/setup-meme\` — Builds the Meme Multiverse server  
> 🔁 \`/reset-server\` — Deletes channels & roles, creates a rebuild channel  
> 🧠 \`/verify\` — Manually verify a user  
`;

      const publicCommands = `
> 🤖 \`/meme\` — Get a fresh meme from Reddit  
> 🧩 \`/rank\` — View your XP progress  
> ✅ **Verify Button** — Unlock the server  
> 💬 **Chat XP** — Level up by chatting and posting memes  
> 😂 **Auto-Reactions** — Meme channels react automatically  
`;

      const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setTitle("📜 Meme Multiverse Commands")
        .setDescription("Explore the powers of the Meme Multiverse 🌌")
        .addFields(
          { name: "🛠️ Admin Commands", value: adminCommands },
          { name: "🌈 Public Commands", value: publicCommands }
        )
        .setFooter({
          text: "Meme Multiverse Bot • Stay Dank 💀",
          iconURL: client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await guideChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // 🧹 Cleanup old bot channel
    const old = guild.channels.cache.find(ch => ch.name === "📜│bot-commands");
    if (old) await old.delete().catch(() => {});

    // 🟢 Final confirmation
    await interaction.editReply("🎉 Setup complete! New members will only see **verify** until verified.").catch(() => {
      console.log("Interaction expired — setup finished successfully.");
    });
  } catch (error) {
    console.error("Setup error:", error);
    const msg = `❌ Setup failed: ${error.message}`;
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }
}


    // ===================================
    // 😂 /meme
    // ===================================
    if (commandName === "meme") {
      await ensureDeferred(interaction, { ephemeral: false });
      const res = await fetch("https://meme-api.com/gimme");
      const data = await res.json().catch(() => null);
      if (!data || !data.url) return interaction.editReply("❌ Couldn't fetch a meme right now.");

      const embed = new EmbedBuilder()
        .setTitle(data.title || "Random Meme 😂")
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit || "unknown"}` })
        .setColor("Random");

      return interaction.editReply({ embeds: [embed] });
    }

    // ===================================
    // 🧩 /rank
    // ===================================
    if (commandName === "rank") {
      await ensureDeferred(interaction);
      const user = await Levels.fetch(interaction.user.id, guild.id, true).catch(() => null);
      if (!user) return interaction.editReply("❌ You don’t have any XP yet!");
      const next = Levels.xpFor(user.level + 1);
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Rank`)
        .setDescription(`**Level:** ${user.level}\n**XP:** ${user.xp} / ${next}`)
        .setColor("Blue");
      return interaction.editReply({ embeds: [embed] });
    }

// ===================================
// 💬 /help — Public Command Guide
// ===================================
if (commandName === "help") {
  try {
    // Public message (not ephemeral)
    await ensureDeferred(interaction, { ephemeral: false });

    const adminCommands = `
👑 **Admin Commands**
> 🧱 \`/setup-meme\` — Builds the Meme Multiverse server  
> 🔁 \`/reset-server\` — Deletes channels & roles, then creates a rebuild channel  
> 🧠 \`/verify\` — Manually verify a user  
`;

    const publicCommands = `
🌈 **Public Commands**
> 🤖 \`/meme\` — Get a fresh meme from Reddit  
> 🧩 \`/rank\` — Check your XP level  
> ✅ **Verify Button** — Unlock the full server  
> 💬 **Chat XP** — Gain XP by being active in chat  
> 😂 **Auto-Reactions** — Meme channels react automatically to posts  
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

    // === Try updating command guide channel if it exists ===
    const guideChannel = guild.channels.cache.find(ch => ch.name === "📘│command-guide");

    if (guideChannel) {
      // Try to fetch the most recent message to edit instead of duplicating
      const messages = await guideChannel.messages.fetch({ limit: 1 }).catch(() => null);
      const lastMsg = messages?.first();

      if (lastMsg && lastMsg.author.id === client.user.id) {
        await lastMsg.edit({ embeds: [embed] }).catch(() => {});
        await interaction.editReply("✅ Command guide updated in 📘│command-guide!");
        return;
      }

      // If no message found, send a new one
      await guideChannel.send({ embeds: [embed] }).catch(() => {});
      await interaction.editReply("✅ Command guide posted in 📘│command-guide!");
      return;
    }

    // Fallback: send publicly in chat if channel missing
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("/help error:", err);
    await interaction.editReply("❌ Failed to show help menu. Try again later.").catch(() => {});
  }
}

// ===================================
// 💬 /help — Auto-Updating Public Command Guide
// ===================================
if (commandName === "help") {
  try {
    await ensureDeferred(interaction, { ephemeral: false });

    // Dynamically pull all slash commands
    const allCommands = client.application?.commands.cache || [];

    // Define admin vs public commands based on their names
    const adminCommandNames = ["setup-meme", "reset-server", "verify"];
    const adminCommands = allCommands
      .filter(cmd => adminCommandNames.includes(cmd.name))
      .map(cmd => `> 🧱 \`/${cmd.name}\` — ${cmd.description || "No description"}`)
      .join("\n") || "> *(No admin commands found)*";

    const publicCommands = allCommands
      .filter(cmd => !adminCommandNames.includes(cmd.name))
      .map(cmd => `> 💬 \`/${cmd.name}\` — ${cmd.description || "No description"}`)
      .join("\n") || "> *(No public commands found)*";

    // Add optional upgrades / perks
    const upgrades = `
⭐ **Optional Upgrades**
> 🧩 **Auto-Reactions:** Meme channels react with 😂, 🔥, 💀 automatically  
> 📈 **XP & Rank System:** Earn XP from chatting and memes  
> 🎨 **Creator Roles:** Unlock *Template Alchemist* & *Meme Historian* with activity  
> ⚙️ **Dynamic Help Guide:** Auto-refreshes every restart to stay up to date  
`;

    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("📘 Meme Multiverse Command Guide")
      .setDescription("Welcome to the **Meme Multiverse**, traveler 🌌\nHere's what you can do:")
      .addFields(
        { name: "👑 Admin Commands", value: adminCommands },
        { name: "🌈 Public Commands", value: publicCommands },
        { name: "💎 Upgrades & Features", value: upgrades }
      )
      .setFooter({ text: "Stay Dank 💀 | Powered by Meme Multiverse Bot", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // --- Locate or create the command guide channel ---
    const guideChannel = guild.channels.cache.find(ch => ch.name === "📘│command-guide");

    if (guideChannel) {
      // Try updating the last message (keeps the channel clean)
      const messages = await guideChannel.messages.fetch({ limit: 1 }).catch(() => null);
      const lastMsg = messages?.first();

      if (lastMsg && lastMsg.author.id === client.user.id) {
        await lastMsg.edit({ embeds: [embed] }).catch(() => {});
        await interaction.editReply("✅ Command guide refreshed in 📘│command-guide!");
        return;
      }

      await guideChannel.send({ embeds: [embed] }).catch(() => {});
      await interaction.editReply("✅ Command guide posted in 📘│command-guide!");
      return;
    }

    // If the guide channel doesn’t exist, post the help message publicly
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("/help error:", err);
    await interaction.editReply("❌ Failed to show help menu. Try again later.").catch(() => {});
  }
}

    // ===================================
    // 📘 /help — Command List Embed (NEW)
    // ===================================
    if (commandName === "help") {
      await ensureDeferred(interaction, { ephemeral: false });

      const adminCommands = `
👑 **Admin Commands**
> 🧱 \`/setup-meme\` — Builds the Meme Multiverse server (roles, channels, verify system)  
> 🔁 \`/reset-server\` — Deletes all channels and roles, creates a temp rebuild channel  
> 🧠 \`/verify\` — Manually verify a user  
`;

      const publicCommands = `
🌈 **Public Commands**
> 🤖 \`/meme\` — Get a fresh meme from Reddit  
> 🧩 \`/rank\` — View your XP progress  
> ✅ **Verify Button** — Unlock the full server  
> 💬 **Chat XP** — Level up by talking and posting memes  
> 😂 **Auto-Reactions** — Meme channels react automatically  
`;

      const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setTitle("📜 Meme Multiverse Commands")
        .setDescription("Explore the powers of the Meme Multiverse 🌌")
        .addFields(
          { name: "🛠️ Admin Commands", value: adminCommands },
          { name: "🌈 Public Commands", value: publicCommands },
        )
        .setFooter({ text: "Meme Multiverse Bot • Stay Dank 💀", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

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
  if (message.author.bot || !message.guild) return;
  const xp = Math.floor(Math.random() * 10) + 5;
  const leveled = await Levels.appendXp(message.author.id, message.guild.id, xp);
  if (leveled) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    message.channel.send(`🎉 ${message.author}, you leveled up to **Level ${user.level}**!`).catch(() => {});
  }
});

// ================================
// 🔑 Login
// ================================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing!");
  process.exit(1);
}
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
client.login(process.env.BOT_TOKEN);
