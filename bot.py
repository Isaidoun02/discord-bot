import os
import random
import discord
import asyncio
import asyncpg
from discord.ext import commands
from flask import Flask
from threading import Thread
from dotenv import load_dotenv
import base64
from Crypto.Cipher import AES
import shutil
from Crypto.Util.Padding import unpad
load_dotenv()

intents = discord.Intents.default()
intents.messages = True
intents.guilds = True
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)
app = Flask(__name__)
# Constants
EMOJI = '🤓'
key = bytes.fromhex(os.getenv("IMAGE_KEY"))
iv = bytes.fromhex(os.getenv("IMAGE_IV"))
algorithm = AES.new(key, AES.MODE_CBC, iv)

DATABASE_URL = os.getenv("DATABASE_URL")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
print("Loaded DB URL:", DATABASE_URL)


@app.route("/")
def index():
    return "Bot is alive!"


def run_web():
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 3000)))


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name}")


async def setup_db():
    import ssl

    ssl_context = ssl.create_default_context()
    return await asyncpg.connect(DATABASE_URL, ssl=ssl_context)



@bot.event
async def on_message(message):
    if message.author.bot:
        return

    db = await setup_db()

    # !win command
    if message.content.strip().startswith("!win"):
        username = message.author.name
        display_name = message.author.display_name

        try:
            await db.execute(
                """
                INSERT INTO wins (username, wins)
                VALUES ($1, 0)
                ON CONFLICT (username) DO NOTHING
                """, username
            )

            row = await db.fetchrow("SELECT wins FROM wins WHERE username = $1", username)
            wins = row["wins"]
            await message.channel.send(f"{display_name} now has {wins} win{'s' if wins != 1 else ''}! 🏆")
        except Exception as e:
            print("Database error:", e)
            await message.channel.send("Something went wrong updating the leaderboard 😔")
        finally:
            await db.close()

    # !allwins command
    elif message.content.strip() == "!allwins":
        try:
            rows = await db.fetch("SELECT username, wins FROM wins ORDER BY wins DESC")
            if not rows:
                await message.channel.send("No wins recorded yet 😔")
            else:
                leaderboard = "\n".join(
                    [f"**{i+1}.** {row['username']}: {row['wins']} win{'s' if row['wins'] != 1 else ''}" for i, row in enumerate(rows)]
                )
                await message.channel.send(f"🏆 **Wins Leaderboard** 🏆\n{leaderboard}")
        except Exception as e:
            print("Failed to fetch wins:", e)
            await message.channel.send("Error retrieving wins 😵")
        finally:
            await db.close()

    # Emoji reaction
    if random.random() < 0.2:
        if message.author.id == 145163678516379648:
            emoji = discord.utils.get(message.guild.emojis, name='hoboel')
        elif message.author.id == 439436120363761685:
            emoji = discord.utils.get(message.guild.emojis, name='goku')
        elif message.author.id == 159007315301761025:
            emoji = EMOJI
        elif message.author.id == 622915260759932948:
            kumoji = discord.utils.get(message.guild.emojis, name='kumar_stare')
            emoji = kumoji

        try:
            await message.add_reaction(emoji)
        except Exception as e:
            print("Failed to react:", e)

    # Lottery win
    if random.random() < 0.001:
        try:
            await db.execute("""
                INSERT INTO wins (username, wins)
                VALUES ($1, 1)
                ON CONFLICT (username) DO UPDATE SET wins = wins.wins + 1
            """, message.author.name)

            await message.channel.send(
                f"<@{message.author.id}> you won the lottery!!! joel owes you 100 dollars!!"
            )
        except Exception as e:
            print("Failed lottery update:", e)
        finally:
            await db.close()

    # Encrypted image
    if random.random() < 0.005:
        encrypted_path = "goku.enc"
        decrypted_path = "temp_image.png"

        try:
            with open(encrypted_path, "rb") as f:
                ciphertext = f.read()

            decrypted = algorithm.decrypt(ciphertext)
            decrypted = unpad(decrypted, AES.block_size)  # PKCS#7 unpadding
            with open(decrypted_path, "wb") as f:
                f.write(decrypted)

            await message.reply(content="Could you repeat that?", file=discord.File(decrypted_path))
        finally:
            if os.path.exists(decrypted_path):
                os.remove(decrypted_path)


# Run Flask server in background
Thread(target=run_web).start()

# Run Discord bot
bot.run(DISCORD_TOKEN)
