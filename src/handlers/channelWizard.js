const { Markup } = require('telegraf');
const Channel = require('../models/Channel');
const FsubBot = require('../models/FsubBot');
const state = require('../state');
const { genShareId } = require('../utils/idgen');
const { parseDuration } = require('../utils/parseDuration');
const { channelManageKeyboard, settingsKeyboard, settingsBackKeyboard, settingsSuccessKeyboard } = require('../utils/keyboards');
const { isAdmin } = require('./adminGuard');

function registerChannelWizard(bot) {
  const adminAction = (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      ctx.answerCbQuery('Admins only.', { show_alert: true });
      return false;
    }
    return true;
  };

  bot.action('open_settings', async (ctx) => {
    if (!adminAction(ctx)) return;
    await ctx.answerCbQuery();
    return ctx.reply('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
  });

  bot.action('settings_close', async (ctx) => {
    if (!adminAction(ctx)) return;
    await ctx.answerCbQuery();
    return ctx.deleteMessage().catch(() => {});
  });

  bot.action('settings_fsub_channels', async (ctx) => {
    if (!adminAction(ctx)) return;
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      '<b>FORCE SUB</b>\n\n<i>Users can access the bot after completing the required channels/bots.</i>\n\n» Manage your Force Subscribe requirements below.',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [
          Markup.button.callback('＋  ADD CHANNEL', 'settings_add_fsub_channel'),
          Markup.button.callback('＋  ADD BOT', 'settings_add_fsub_bot')
        ],
        [
          Markup.button.callback('MANAGE  /  REMOVE', 'settings_manage'),
          Markup.button.callback('‹  BACK', 'settings_back')
        ]
      ]) }
    );
  });

  bot.action('settings_db_channels', async (ctx) => {
    if (!adminAction(ctx)) return;
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      '<b>DB CHANNELS</b>\n\n<i>Manage the channels used for your posts and database.</i>',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [
          Markup.button.callback('＋  ADD CHANNEL', 'settings_add_channel'),
          Markup.button.callback('MANAGE  /  REMOVE', 'settings_manage')
        ],
        [Markup.button.callback('‹  BACK', 'settings_back')]
      ]) }
    );
  });

  bot.action('settings_next', async (ctx) => {
    if (!adminAction(ctx)) return;
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      '<b>MORE SETTINGS</b>\n\n<i>Choose an option below to continue.</i>',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [
          Markup.button.callback('ADD CHANNEL FSUB', 'settings_add_fsub_channel'),
          Markup.button.callback('ADD BOT FSUB', 'settings_add_fsub_bot')
        ],
        [
          Markup.button.callback('＋  ADD CHANNEL', 'settings_add_channel'),
          Markup.button.callback('MANAGE  /  REMOVE', 'settings_manage')
        ],
        [
          Markup.button.callback('‹  BACK', 'settings_back'),
          Markup.button.callback('✕  CLOSE', 'settings_close')
        ]
      ]) }
    );
  });

  bot.action('settings_home', async (ctx) => {
    if (!adminAction(ctx)) return;
    state.clear(ctx.from.id);
    await ctx.answerCbQuery();
    try {
      return await ctx.editMessageText('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    } catch (_) {
      return ctx.reply('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    }
  });

  bot.action('settings_back', async (ctx) => {
    if (!adminAction(ctx)) return;
    state.clear(ctx.from.id);
    await ctx.answerCbQuery();
    try {
      return await ctx.editMessageText('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    } catch (_) {
      return ctx.reply('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    }
  });

  bot.action('settings_cancel', async (ctx) => {
    if (!adminAction(ctx)) return;
    state.clear(ctx.from.id);
    await ctx.answerCbQuery('Cancelled');
    try {
      return await ctx.editMessageText('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    } catch (_) {
      return ctx.reply('✦ <b>BOT SETTINGS</b> ✦', { parse_mode: 'HTML', ...settingsKeyboard() });
    }
  });

  bot.action('settings_add_fsub_channel', async (ctx) => {
    if (!adminAction(ctx)) return;
        const currentFsubCount = await Channel.countDocuments({ type: 'fsub' });
    if (currentFsubCount >= 6) {
      return ctx.reply(
        '⚠️ <b>FSUB LIMIT REACHED</b>\n\nYou can add a maximum of <b>6 Force Subscribe channels</b>.\nRemove an existing FSub channel before adding another one.',
        { parse_mode: 'HTML', ...settingsBackKeyboard(false) }
      );
    }

state.set(ctx.from.id, { flow: 'addfsub', step: 'channelId', data: {} });
    await ctx.answerCbQuery();
    return ctx.reply('<b>ADD FORCE SUB CHANNEL</b>\n\n<i>Add a channel users must join before using the bot.</i>\n\n» <b>CHANNEL ID:</b> Send the channel ID.\n<blockquote>Example: <code>-1001234567890</code></blockquote>', { parse_mode: 'HTML', ...settingsBackKeyboard() });
  });

  bot.action('settings_add_fsub_bot', async (ctx) => {
    if (!adminAction(ctx)) return;
    state.set(ctx.from.id, { flow: 'addfsubbot', step: 'botDetails', data: {} });
    await ctx.answerCbQuery();
    return ctx.reply(
      '🤖 <b>ADD BOT FSUB</b>\n\n' +
      'Send only the bot <b>start/referral link</b>. The username will be detected automatically.\n\n' +
      '<b>Example:</b>\n<code>https://t.me/MyOtherBot?start=fsub_code</code>\n\n' +
      'The referral/deep-link will be used directly on the FSub button.\n\n' +
      'Use the buttons below to go back or cancel.',
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  });

  bot.action('settings_add_channel', async (ctx) => {
    if (!adminAction(ctx)) return;
    state.set(ctx.from.id, { flow: 'addchannel', step: 'channelId', data: {} });
    await ctx.answerCbQuery();
    return ctx.reply('<b>ADD DB CHANNEL</b>\n\n<i>Add a destination channel for your posts.</i>\n\n» <b>CHANNEL ID:</b> Send the channel ID.\n<blockquote>Example: <code>-1001234567890</code></blockquote>', { parse_mode: 'HTML', ...settingsBackKeyboard() });
  });

  bot.action('settings_manage', async (ctx) => {
    if (!adminAction(ctx)) return;
    const [channels, bots] = await Promise.all([Channel.find({}), FsubBot.find({})]);
    await ctx.answerCbQuery();
    if (!channels.length && !bots.length) return ctx.reply(
      '<b>MANAGE REQUIREMENTS</b>\n\n<i>No channels or bot requirements have been added yet.</i>',
      Markup.inlineKeyboard([[
        Markup.button.callback('⬅️ BACK', 'settings_back'),
        Markup.button.callback('❌ CLOSE', 'settings_close')
      ]])
    );
    return ctx.reply('<b>MANAGE REQUIREMENTS</b>\n\n<i>Your configured channels and bot requirements are shown below.</i>\n\n» Tap <b>REMOVE</b> beside an item to delete it.', channelManageKeyboard(channels, bots));
  });

  bot.command('addbotfsub', (ctx) => {
    state.set(ctx.from.id, { flow: 'addfsubbot', step: 'botDetails', data: {} });
    ctx.reply(
      '🤖 <b>ADD BOT FSUB</b>\n\n' +
      'Send the <b>bot username</b> and its <b>start/referral link</b> in one message, separated by a space.\n\n' +
      '<b>Example:</b>\n<code>@MyOtherBot https://t.me/MyOtherBot?start=fsub_code</code>\n\n' +
      'Send /cancel to go back.',
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  });
  // ---------- /addfsub : simple 2-step flow ----------
  bot.command('addfsub', (ctx) => {
    state.set(ctx.from.id, { flow: 'addfsub', step: 'channelId', data: {} });
    ctx.reply(
      'Add force-subscribe channel\n\nSend the channel ID (numeric, e.g. -1001234567890).\n\nSend /cancel to go back.'
    );
  });

  // ---------- /addchannel : full wizard for target/post channels ----------
  bot.command('addchannel', (ctx) => {
    state.set(ctx.from.id, { flow: 'addchannel', step: 'channelId', data: {} });
    ctx.reply(
      '+ Add channel\n\nSend the channel ID (numeric, e.g. -1001234567890).\n\nSend /cancel to go back.'
    );
  });

  bot.command('cancel', (ctx) => {
    if (state.isMidFlow(ctx.from.id)) {
      state.clear(ctx.from.id);
      return ctx.reply('Cancelled.');
    }
    return ctx.reply('Nothing to cancel.');
  });

  bot.command('listchannels', async (ctx) => {
    const [channels, bots] = await Promise.all([Channel.find({}), FsubBot.find({})]);
    if (channels.length === 0 && bots.length === 0) return ctx.reply('No channels or Bot FSubs added yet.');
    return ctx.reply('Your channels / Bot FSubs:', channelManageKeyboard(channels, bots));
  });

  bot.action(/remove_channel:(.+)/, async (ctx) => {
    if (!adminAction(ctx)) return;
    await Channel.findByIdAndDelete(ctx.match[1]);
    await ctx.answerCbQuery('Removed.');
    const [channels, bots] = await Promise.all([Channel.find({}), FsubBot.find({})]);
    if (!channels.length && !bots.length) return ctx.editMessageText('No entries left.');
    return ctx.editMessageReplyMarkup(channelManageKeyboard(channels, bots).reply_markup);
  });

  bot.action(/remove_fsubbot:(.+)/, async (ctx) => {
    if (!adminAction(ctx)) return;
    await FsubBot.findByIdAndDelete(ctx.match[1]);
    await ctx.answerCbQuery('Removed.');
    const [channels, bots] = await Promise.all([Channel.find({}), FsubBot.find({})]);
    if (!channels.length && !bots.length) return ctx.editMessageText('No entries left.');
    return ctx.editMessageReplyMarkup(channelManageKeyboard(channels, bots).reply_markup);
  });

  bot.action('noop', (ctx) => ctx.answerCbQuery());

  // ---------- Text step handler (shared by both wizards) ----------
  bot.on('text', async (ctx, next) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState) return next(); // not in a wizard, let other handlers process

    const text = ctx.message.text.trim();

    if (flowState.flow === 'addfsub') {
      return handleAddFsubStep(ctx, flowState, text);
    }
    if (flowState.flow === 'addchannel') {
      return handleAddChannelStep(ctx, flowState, text);
    }
    if (flowState.flow === 'addfsubbot') {
      return handleAddFsubBotStep(ctx, flowState, text);
    }

    return next();
  });

  // ---------- Post-mode button choice ----------
  bot.action(/set_postmode:(link|forward|copy)/, async (ctx) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState || flowState.flow !== 'addchannel') return ctx.answerCbQuery();

    flowState.data.postMode = ctx.match[1];
    flowState.step = 'autoDelete';
    state.set(ctx.from.id, flowState);

    await ctx.answerCbQuery();
    await ctx.editMessageText(`Post mode: ${ctx.match[1]}`);
    return ctx.reply(
      'Send auto-delete time:\n30s = 30 seconds\n5m = 5 minutes\n2h = 2 hours\n1d = 1 day\n0 = off',
      settingsBackKeyboard()
    );
  });

  // ---------- Poster image upload during addchannel wizard ----------
  bot.on('photo', async (ctx, next) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState || flowState.flow !== 'addchannel' || flowState.step !== 'poster') {
      return next();
    }
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    flowState.data.posterFileId = photo.file_id;
    return finalizeAddChannel(ctx, flowState);
  });

  bot.command('skip', async (ctx, next) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState || flowState.flow !== 'addchannel' || flowState.step !== 'poster') {
      return next();
    }
    return finalizeAddChannel(ctx, flowState);
  });
}

async function handleAddFsubStep(ctx, flowState, text) {
  if (flowState.step === 'channelId') {
    flowState.data.channelId = text;
    flowState.step = 'title';
    state.set(ctx.from.id, flowState);
    return ctx.reply('Send the title for this channel (e.g. "Main updates channel"):', settingsBackKeyboard());
  }

  if (flowState.step === 'title') {
    flowState.data.title = text;

    let inviteLink = null;
    try {
      inviteLink = await ctx.telegram.exportChatInviteLink(flowState.data.channelId);
    } catch (err) {
      // Bot might not be admin yet - can be added later, don't block the flow.
    }

    const channel = await Channel.create({
      channelId: flowState.data.channelId,
      type: 'fsub',
      title: flowState.data.title,
      inviteLink,
      addedBy: ctx.from.id,
    });

    state.clear(ctx.from.id);
    return ctx.reply(
      `✅ Force-sub channel added!

Title: ${channel.title}
ID: ${channel.channelId}

` +
        (inviteLink
          ? `Invite link: ${inviteLink}`
          : 'Note: I could not generate an invite link. Make sure I am an admin in that channel with "Invite users" permission.'),
      settingsSuccessKeyboard('settings_add_fsub_channel')
    );
  }
}

async function handleAddFsubBotStep(ctx, flowState, text) {
  if (flowState.step !== 'botDetails') return;

  const startLink = text.trim();

  let url;
  try {
    url = new URL(startLink);
  } catch (_) {
    return ctx.reply(
      '❌ <b>INVALID BOT LINK</b>\n\nSend only a valid Telegram bot start/referral link.\n\n' +
      '<blockquote>Example: <code>https://t.me/MyOtherBot?start=fsub_code</code></blockquote>',
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  }

  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'].includes(host)) {
    return ctx.reply(
      '❌ <b>INVALID TELEGRAM LINK</b>\n\nOnly Telegram <code>https://t.me/...</code> links are allowed.',
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  }

  const username = (url.pathname.split('/').filter(Boolean)[0] || '').replace(/^@/, '').trim();

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return ctx.reply(
      '❌ <b>BOT LINK NOT RECOGNIZED</b>\n\nI could not detect the bot name from this Telegram link.\n\n' +
      '<blockquote>Example: <code>https://t.me/MyOtherBot?start=fsub_code</code></blockquote>',
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  }

  const duplicate = await FsubBot.findOne({ username: new RegExp(`^${username}$`, 'i') });
  if (duplicate) {
    return ctx.reply(
      `⚠️ <b>@${username}</b> is already added to Bot FSub.\n\nUse <b>Manage / Remove</b> first if you want to replace it.`,
      { parse_mode: 'HTML', ...settingsBackKeyboard() }
    );
  }

  const botEntry = await FsubBot.create({
    username,
    title: username,
    startLink,
    addedBy: ctx.from.id,
  });

  state.clear(ctx.from.id);
  return ctx.reply(
    '✅ <b>BOT FSUB ADDED</b>\n\n' +
    `🤖 <b>Bot:</b> @${botEntry.username}\n` +
    `🔗 <b>Referral Link:</b> ${botEntry.startLink}\n\n` +
    'This link will now appear as the bot FSub button for users.',
    { parse_mode: 'HTML' }
  );
}

async function handleAddChannelStep(ctx, flowState, text) {
  if (flowState.step === 'channelId') {
    flowState.data.channelId = text;
    flowState.step = 'title';
    state.set(ctx.from.id, flowState);
    return ctx.reply('Send the title for this channel (e.g. "One Piece"):', settingsBackKeyboard());
  }

  if (flowState.step === 'title') {
    flowState.data.title = text;
    flowState.step = 'description';
    state.set(ctx.from.id, flowState);
    return ctx.reply('Send a description for this channel:', settingsBackKeyboard());
  }

  if (flowState.step === 'description') {
    flowState.data.description = text;
    flowState.step = 'postMode';
    state.set(ctx.from.id, flowState);
    return ctx.reply(
      'Choose post mode:',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔗 Link (FSub-gated)', 'set_postmode:link')],
        [Markup.button.callback('➡️ Forward', 'set_postmode:forward')],
        [Markup.button.callback('📋 Copy', 'set_postmode:copy')],
        [Markup.button.callback('⬅️ Back to Settings', 'settings_back')],
        [Markup.button.callback('❌ Cancel', 'settings_cancel')],
      ])
    );
  }

  if (flowState.step === 'autoDelete') {
    const seconds = parseDuration(text);
    if (seconds === null) {
      return ctx.reply('Invalid format. Use 30s, 5m, 2h, 1d, or 0 for off.');
    }
    flowState.data.autoDelete = seconds;
    flowState.step = 'poster';
    state.set(ctx.from.id, flowState);
    return ctx.reply(
      'Send a poster image for this channel, or send /skip to skip:',
      settingsBackKeyboard()
    );
  }
}

async function finalizeAddChannel(ctx, flowState) {
  const shareId = genShareId();
  const channel = await Channel.create({
    channelId: flowState.data.channelId,
    type: 'target',
    title: flowState.data.title,
    description: flowState.data.description,
    postMode: flowState.data.postMode,
    autoDelete: flowState.data.autoDelete,
    posterFileId: flowState.data.posterFileId || null,
    shareId,
    addedBy: ctx.from.id,
  });

  state.clear(ctx.from.id);

  const autoDeleteLabel = channel.autoDelete === 0 ? 'Off' : `${channel.autoDelete}s`;

  return ctx.reply(
    `✅ Channel added!\n\n` +
      `Title:- ${channel.title}\n` +
      `ID: ${channel.channelId}\n` +
      `Description: ${channel.description}\n` +
      `Mode: 🔗 ${channel.postMode} | Auto-Delete: ${autoDeleteLabel}\n` +
      `Share ID: ${channel.shareId}`
  );
}

module.exports = { registerChannelWizard };
