// Import Discord.js classes
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
} = require("discord.js");
const fs = require("fs");

// Small helper pause
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Load the server template
const template = JSON.parse(fs.readFileSync("template.json", "utf8"));

// Create client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Ready event
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("Bot online and ready to create The Meme Multiverse!");
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;

  // =======================================================
  // /reset-server
  // =======================================================
  if (interaction.commandName === "reset-server") {
    await interaction.deferReply();
    await wait(500);
    await interaction.followUp("⚠️ Resetting server… deleting all channels and roles.");

    // delete channels
    for (const [, channel] of guild.channels.cache) {
      try {
        await channel.delete();
      } catch (err) {
        console.error(`Could not delete ${channel.name}:`, err.message);
      }
    }

    // delete roles (except @everyone / managed)
    for (const [, role] of guild.roles.cache) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await role.delete();
        } catch (err) {
          console.error(`Could not delete ${role.name}:`, err.message);
        }
      }
    }

    // make temp channel
    const temp = await guild.channels.create({
      name: "📜│bot-commands",
      type: 0,
    });
    await temp.send("✅ Reset complete! Type `/setup-meme` to rebuild.");
    return;
  }


// =======================================================
// /battle-start
// =======================================================
if (interaction.commandName === "battle-start") {
  try {
    await interaction.deferReply({ ephemeral: true }); // gives bot time

    const battleChannel = interaction.guild.channels.cache.find(
      (ch) => ch.name.includes("battle-arena")
    );

    if (!battleChannel) {
      await interaction.editReply("❌ Couldn't find the #battle-arena channel!");
      return;
    }

    // Random battle themes
    const themes = [
      "🔥 Dank Duel",
      "💖 Wholesome Wars",
      "💀 Cursed Clash",
      "🌈 Template Takedown",
      "🤖 AI Apocalypse",
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    await battleChannel.send(
      `${randomTheme} has begun! Post your best memes below! 🗳️`
    );

    await interaction.editReply("✅ Meme battle announcement posted!");
  } catch (err) {
    console.error(err);
    if (interaction.deferred) {
      await interaction.editReply("⚠️ Something went wrong starting the battle.");
    } else {
      await interaction.reply("⚠️ Something went wrong starting the battle.");
    }
  }
}

  // =======================================================
  // /setup-meme
  // =======================================================
  if (interaction.commandName === "setup-meme") {
    console.log("⚙️ setup-meme triggered");
    await interaction.deferReply();
    await wait(500);
    await interaction.followUp("🌀 Setting up The Meme Multiverse…");

    // Create roles
    for (const role of template.roles) {
      const roleData = { name: role.name, permissions: role.permissions ?? [] };
      if (role.color) roleData.color = role.color;
      await guild.roles.create(roleData);
      await wait(300);
    }

    // Create categories + channels
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

    // Create verify channel with embed + button
    const verifyChannel = await guild.channels.create({
      name: "✅│verify-here",
      type: 0,
    });

    const verifyEmbed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("👋 Welcome to The Meme Multiverse!")
      .setDescription("Click **Verify** below to unlock the rest of the server.")
      .setFooter({ text: "Verification required for full access" });

    const verifyButton = new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verify")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await verifyChannel.send({ embeds: [verifyEmbed], components: [row] });

    // Lock all other channels for unverified users
    const verifiedRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
    const everyoneRole = guild.roles.everyone;

    for (const [, ch] of guild.channels.cache) {
      if (ch.name !== "✅│verify-here" && ch.type === 0) {
        await ch.permissionOverwrites.create(everyoneRole, { ViewChannel: false });
        if (verifiedRole) {
          await ch.permissionOverwrites.create(verifiedRole, { ViewChannel: true });
        }
      }
    }

    await interaction.followUp("🎉 The Meme Multiverse has been created!");
  }
});

// =======================================================
// Button: Verify
// =======================================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_button") return;

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);

  // find or create role
  let verifiedRole = guild.roles.cache.find((r) => r.name === "🌈 Normie");
  if (!verifiedRole) {
    verifiedRole = await guild.roles.create({
      name: "🌈 Normie",
      color: 15158332,
      permissions: [],
    });
  }

  // give role
  await member.roles.add(verifiedRole);
  await interaction.reply({
    content: "✅ Verified! Welcome to the Meme Multiverse!",
    ephemeral: true,
  });
});

// Login
client.login(process.env.BOT_TOKEN);
