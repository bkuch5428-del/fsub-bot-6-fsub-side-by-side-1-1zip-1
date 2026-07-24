# Fsub File-Store Bot — Setup Guide

A Telegram bot that stores files, force-subscribes users to your channels before
delivering content, lets you manage post/target channels, auto-detects episode
numbers (EP1, E01, Episode 1 → EPISODE 1 buttons), and posts to one or more
channels with Link / Forward / Copy modes.

---

## 1. Create the bot on Telegram

1. Open Telegram, search for **@BotFather**.
2. Send `/newbot`, follow the prompts (name, then a username ending in `bot`).
3. BotFather gives you a token like `123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
   Save it — you'll need it in step 4.
4. Send `/setprivacy` to BotFather, choose your bot, and select **Disable**.
   This lets the bot see file uploads without needing to be added as admin
   to your DMs (it only needs admin rights inside the actual channels).

## 2. Get your Telegram user ID

1. Message **@userinfobot** on Telegram.
2. It replies with your numeric ID — this is your `ADMIN_IDS` value.
3. You can list multiple admins separated by commas.

## 3. Set up MongoDB (free tier is enough)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free (M0) cluster.
3. Under **Database Access**, create a user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) — simplest
   for getting started; tighten later if you want.
5. Click **Connect > Drivers**, copy the connection string. It looks like:
   `mongodb+srv://user:password@cluster0.mongodb.net/`
6. Add a database name at the end, e.g. `.../fsubbot`.

## 4. Configure the project

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in the values:
   ```
   BOT_TOKEN=your_botfather_token
   MONGO_URI=your_mongodb_connection_string
   ADMIN_IDS=your_telegram_user_id
   BOT_USERNAME=your_bot_username_without_at_sign
   ```

## 5. Install and run locally

```
npm install
npm start
```

If everything is configured correctly you'll see:
```
MongoDB connected
Bot is running.
```

Open Telegram and send `/start` to your bot to confirm it responds.

## 6. Add your channels

**Force-subscribe channel** (users must join this before getting files):
1. Create a Telegram channel (or use an existing one).
2. Add your bot to the channel **as an admin** with at least "Invite users"
   and "Post messages" permission.
3. In your bot DM, send `/addfsub`.
4. Send the channel's numeric ID (see below for how to get it).
5. Send a title for it.

**Target/post channel** (where your files/posts actually get published):
1. Same as above — add the bot as admin to this channel too.
2. Send `/addchannel` in your bot DM and follow the prompts:
   channel ID → title → description → post mode → auto-delete time → poster
   image (or `/skip`).

### How to get a channel's numeric ID

- Forward any message from the channel to **@userinfobot**, or
- Add **@RawDataBot** temporarily to the channel — it posts the chat ID, or
- If your channel is public, the ID conversion follows `-100` + the internal
  numeric ID, but forwarding to a bot is the most reliable method.

## 7. Post your first file

1. Make sure you've added at least one **target** channel (`/addchannel`).
2. Send a file to the bot in DM (e.g. a video named `Show.EP1.mkv`).
3. The bot detects `EP1` and creates an `EPISODE 1` button automatically.
4. Send more files within a few seconds to batch them into one post
   (e.g. EP1, EP2, EP3 → one post with three episode buttons).
5. After a short pause, the bot shows your target channels as a checklist —
   tap to select one or more, then tap **Post now**.
6. The bot publishes according to each channel's configured mode:
   - **Link mode** — posts a promo message with buttons that deep-link back
     into the bot; the fsub gate applies before the file is delivered.
   - **Forward mode** — forwards the raw file straight into the channel.
   - **Copy mode** — same as forward but without the "forwarded from" tag.

## 8. Deploying (Railway example, matches your existing workflow)

1. Push this project to a GitHub repo.
2. On Railway, create a new project → **Deploy from GitHub repo**.
3. Add the same environment variables from your `.env` file under
   Railway's **Variables** tab.
4. Railway auto-detects `npm start` from `package.json` — no extra config
   needed.
5. Once deployed, check the logs for `Bot is running.`

**Important**: Telegraf uses long-polling by default (`bot.launch()`), which
works fine on Railway as-is — no webhook/public URL required.

## 9. Command reference

| Command | Who | What it does |
|---|---|---|
| `/start` | everyone | Greets the user, handles deep-links (referral or file) |
| `/help` | everyone | Shows available commands |
| `/myreferral` | everyone | Gets your personal referral link |
| `/addfsub` | admin | Adds a force-subscribe channel |
| `/addchannel` | admin | Adds a target/post channel (full wizard) |
| `/listchannels` | admin | Lists and removes channels |
| `/cancel` | admin | Cancels any in-progress wizard |
| `/skip` | admin | Skips the poster-image step in `/addchannel` |

## 10. Known limitations / things to customize

- **Button colors**: Telegram inline buttons don't support custom colors —
  that's controlled by the user's app theme, not by bots. If you want actual
  colored buttons, that requires a Telegram **Mini App / WebApp** button
  with your own HTML/CSS, which is a different (larger) build than this.
- **Auto-delete after delivery**: delivered files auto-delete after 10 minutes
  by default (see `src/handlers/fileDelivery.js`) — adjust or remove this.
- **In-memory wizard state**: if the bot restarts mid-wizard, the admin just
  needs to restart the command (`/addchannel`, etc.) — nothing is corrupted,
  the half-finished flow is simply discarded.
- **Batch window**: files sent within 4 seconds of each other are grouped
  into one post. Change `BATCH_WINDOW_MS` in `src/handlers/postFlow.js` if
  you want a longer/shorter window.

## Bot FSub + Settings (updated)

Admins now get a **⚙️ SETTINGS ⚙️** button on `/start`. It provides buttons to add Channel FSub, add Bot FSub, add post channels, and manage/remove configured entries. `/addbotfsub` is also available.

Bot FSub accepts a bot username, button title, and Telegram start/deep link. Telegram does not expose whether a user started an unrelated independent bot, so the implementation does not fake verification: pressing **Try Again** acknowledges displayed Bot FSub links, while normal channel membership is still verified with `getChatMember`.
