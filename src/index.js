const { Telegraf } = require('telegraf');
const express = require('express');
const { botToken } = require('./config');
const { connectDB } = require('./db');

const { registerStart } = require('./handlers/start');
const { registerHelp } = require('./handlers/help');
const { registerChannelWizard } = require('./handlers/channelWizard');
const { registerPostFlow } = require('./handlers/postFlow');
const { requireAdmin } = require('./handlers/adminGuard');

if (!botToken) {
  console.error('BOT_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const bot = new Telegraf(botToken);

// Minimal HTTP server so Render/Koyeb detect an open port
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.send('Bot is running'));

app.listen(PORT, () => {
  console.log(`Health-check server listening on port ${PORT}`);
});

async function main() {
  await connectDB();

  registerStart(bot);
  registerHelp(bot);

  // Admin-only command groups get the guard applied inside each handler's command
  // registration point would be cleaner, but for simplicity we gate at the command level here:
  bot.use(async (ctx, next) => {
    const adminOnlyCommands = ['/addfsub', '/addbotfsub', '/addchannel', '/listchannels'];
    const text = ctx.message?.text || '';
    const isAdminCommand = adminOnlyCommands.some((cmd) => text.startsWith(cmd));

    if (isAdminCommand) {
      return requireAdmin()(ctx, next);
    }
    return next();
  });

  registerChannelWizard(bot);
  registerPostFlow(bot);

  bot.catch((err, ctx) => {
    const description = err?.response?.description || err?.description || '';
    if (description.includes('message is not modified')) return;
    console.error(`Error for ${ctx?.updateType || 'update'}:`, err);
  });

  bot.launch();
  console.log('Bot is running.');
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
