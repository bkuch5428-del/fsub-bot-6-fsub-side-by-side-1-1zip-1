const User = require('../models/User');
const FileItem = require('../models/FileItem');
const { checkFsub, acknowledgeBotFsubs } = require('../utils/fsub');
const { joinGateKeyboard, homeKeyboard } = require('../utils/keyboards');
const { isAdmin } = require('./adminGuard');
const { deliverFile } = require('./fileDelivery');

async function ensureUser(ctx, referredBy) {
  const userId = ctx.from.id;
  let user = await User.findOne({ userId });

  if (!user) {
    user = await User.create({
      userId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      referredBy: referredBy || null,
    });

    if (referredBy && referredBy !== userId) {
      await User.updateOne({ userId: referredBy }, { $inc: { referralCount: 1 } });
    }
  }

  return user;
}

function registerStart(bot) {
  bot.start(async (ctx) => {
    const payload = ctx.startPayload; // text after /start=

    // Referral deep link: /start ref_123456
    if (payload && payload.startsWith('ref_')) {
      const referrerId = Number(payload.replace('ref_', ''));
      await ensureUser(ctx, referrerId);
      return ctx.reply(
        "Welcome! You joined via a friend's referral link.\n\nSend /help to see what I can do."
      );
    }

    await ensureUser(ctx, null);

    // File deep link: /start <token>
    if (payload) {
      const file = await FileItem.findOne({ token: payload });
      if (!file) {
        return ctx.reply('This link is invalid or has expired.');
      }

      const { ok, missingChannels, missingBots } = await checkFsub(ctx.telegram, ctx.from.id);
      if (!ok) {
        return ctx.reply(
          'Complete the requirements below, then tap "Try Again".\n\nNote: Telegram cannot verify starting an unrelated bot; tapping Try Again acknowledges Bot FSub links.',
          joinGateKeyboard(missingChannels, payload, missingBots)
        );
      }

      return deliverFile(ctx, file);
    }

    // Plain /start: enforce FSub before showing the normal home screen.
    const result = await checkFsub(ctx.telegram, ctx.from.id);
    if (!result.ok) {
      return ctx.reply(
        `<i>Hey <b>${ctx.from.first_name || 'there'}</b></i>\n\n` +
        `<i>Please Join All My Update Channels To Use Me!</i>`,
        {
          parse_mode: 'HTML',
          ...joinGateKeyboard(result.missingChannels, 'home', result.missingBots)
        }
      );
    }

    return ctx.reply(
      `Hi ${ctx.from.first_name || ''}! Send me a file to create a post, or use /help to see all commands.`,
      homeKeyboard(isAdmin(ctx.from.id))
    );
  });

  // "Try again" button after joining channels
  bot.action(/fsub_retry:(.+)/, async (ctx) => {
    const token = ctx.match[1];
    let result = await checkFsub(ctx.telegram, ctx.from.id);

    // Bot-to-bot start status is not exposed by Telegram. Try Again is explicit acknowledgement.
    if (result.missingBots.length) {
      await acknowledgeBotFsubs(ctx.from.id, result.missingBots);
      result = await checkFsub(ctx.telegram, ctx.from.id);
    }

    if (!result.ok) {
      await ctx.answerCbQuery('Still missing some channel requirements.');
      return ctx.editMessageReplyMarkup(joinGateKeyboard(result.missingChannels, token, result.missingBots).reply_markup);
    }

    await ctx.answerCbQuery('Access granted!');

    if (token === 'home') {
      return ctx.editMessageText(
        `Hi ${ctx.from.first_name || ''}! Send me a file to create a post, or use /help to see all commands.`,
        homeKeyboard(isAdmin(ctx.from.id))
      );
    }

    const file = await FileItem.findOne({ token });
    if (!file) {
      return ctx.editMessageText('This link is invalid or has expired.');
    }
    return deliverFile(ctx, file);
  });


  bot.action('home_help', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply('Send me a file to create a post. Use /help to see all available commands.');
  });

  bot.action('home_close', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.deleteMessage().catch(() => {});
  });

  bot.command('myreferral', async (ctx) => {
    const { botUsername } = require('../config');
    const link = `https://t.me/${botUsername}?start=ref_${ctx.from.id}`;
    const user = await User.findOne({ userId: ctx.from.id });
    ctx.reply(
      `Your referral link:\n${link}\n\nTotal referrals: ${user?.referralCount || 0}`
    );
  });
}

module.exports = { registerStart, ensureUser };
