const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Client: PgClient } = require('pg');
require('dotenv').config();
const express = require('express');
const app = express();
const fs = require('fs');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const path = require('path');
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running to keep Render alive');
});
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // Needed to fetch members
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});
const database_client = new PgClient({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

database_client.connect();
const EMOJI = '🤓'; // Change to any emoji you want
const key = Buffer.from(process.env.IMAGE_KEY, 'hex');
const iv = Buffer.from(process.env.IMAGE_IV, 'hex'); 
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim().startsWith('!win')) {
    const displayName = message.author.displayName;
    const username = message.author.username;

    try {
      // Try to insert the user (if not exists)

      await database_client.query(
        `INSERT INTO wins (username, wins)
         VALUES ($1, 0)
         ON CONFLICT (username) DO NOTHING`,
        [username]
      );
      // Fetch updated win count
      const result = await database_client.query(
        `SELECT wins FROM wins WHERE username = $1`,
        [username]
      );

      const wins = result.rows[0].wins;
      message.channel.send(`${displayName} now has ${wins} win${wins !== 1 ? 's' : ''}! 🏆`);
    } catch (err) {
      console.error('Database error:', err);
      message.channel.send('Something went wrong updating the leaderboard 😔');
    }
  }
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim() === '!allwins') {
    try {
      const result = await database_client.query(
        `SELECT username, wins FROM wins ORDER BY wins DESC`
      );

      if (result.rows.length === 0) {
        return message.channel.send("No wins recorded yet 😔");
      }

      // Build a formatted leaderboard
      const leaderboard = result.rows
        .map((row, index) => `**${index + 1}.** ${row.username}: ${row.wins} win${row.wins !== 1 ? 's' : ''}`)
        .join('\n');

      message.channel.send(`🏆 **Wins Leaderboard** 🏆\n${leaderboard}`);
    } catch (err) {
      console.error('Failed to fetch wins:', err);
      message.channel.send("Error retrieving wins 😵");
    }
  }
});

client.on('messageCreate', async (message) => {
  // Prevent bot from reacting to its own messages
  if (message.author.bot) return;
  const joelemoji = message.guild.emojis.cache.find(e => e.name === 'hoboel');
  const ibzemoji = message.guild.emojis.cache.find(e => e.name === 'goku');
  const kumoji = message.guild.emojis.cache.find(e => e.name === 'kumar_stare');
  if (Math.random() > 0.2) {
    return;
  }
  let emoji = EMOJI;
  if (message.author.id=="145163678516379648") {
    emoji = joelemoji;
  }
  else if (message.author.id=="439436120363761685") {
    emoji = ibzemoji;
  }
  else if (message.author.id== "159007315301761025") {
    emoji = EMOJI;
  } else if (message.author.id == "622915260759932948"){
    emoji = kumoji;
  }else return;

  try {
    await message.react(emoji)
  } catch (error) {
    console.error('Failed to react:', error);
  }
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const username = message.author.username;
  // console.log(message.author.id);
  if (Math.random() > 0.01) {
    return;
  }
  await database_client.query(
    `INSERT INTO wins (username, wins)
     VALUES ($1, 1)
     ON CONFLICT (username) DO UPDATE SET wins = wins.wins + 1`,
    [username]
  );
  message.channel.send(`<@${message.author.id}> you won the lottery!!! joel owes you 100 dollars!!`);

})
client.on('messageCreate', async (message) => {
    // 1 in 100 chance
    if (message.author.id!= "159007315301761025") return;
    // if (Math.random() > 0.01) {
    //   return;
    // }

    const encryptedPath = path.join(__dirname, 'goku.enc');
    const decryptedPath = path.join(__dirname, 'temp_image.png');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const input = fs.createReadStream(encryptedPath);
    const output = fs.createWriteStream(decryptedPath);

    input.pipe(decipher).pipe(output);

    output.on('finish', () => {
      message.reply({
        content: 'Could you repeat that?',
        files: [decryptedPath],
      }).then(() => {
        fs.unlinkSync(decryptedPath);
      });
    });
});
// client.on('messageCreate', async (message) => {
//   if (message.author.bot) return;
//   // Command: !mention username
//   if (!message.content.startsWith('!mention')) {
//     // const username = args.join(' '); 

//     // Fetch all members (if not cached)
//     await message.guild.members.fetch();
//     // Find the user by username (not displayName or nickname)
//       const member = message.guild.members.cache.find(m => message.content.toLowerCase().includes(m.user.displayName.toLowerCase()));

//       if (member) {
//         message.channel.send(`<@${member.user.id}>`);
//       }

//   }
// });
client.login(process.env.DISCORD_TOKEN);
