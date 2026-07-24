const { Markup } = require('telegraf');
const Channel = require('../models/Channel');
const FileItem = require('../models/FileItem');
const state = require('../state');
const { parseEpisode } = require('../utils/episodeParser');
const { genToken } = require('../utils/idgen');
const { channelPickerKeyboard } = require('../utils/keyboards');
const { botUsername, adminIds } = require('../config');

// Files sent within this window (ms) after each other get grouped into one batch/post.
const BATCH_WINDOW_MS = 4000;

function registerPostFlow(bot) {
  // Catches photo/video/document uploads from admins that are NOT part of the
  // add-channel wizard (that's handled separately in channelWizard.js for posters).
  bot.on(['video', 'document', 'audio', 'photo'], async (ctx, next) => {
    if (!adminIds.includes(ctx.from.id)) return next(); // only admins create posts this way

    const flowState = state.get(ctx.from.id);
    if (flowState && flowState.flow === 'addchannel') return next(); // let wizard handle posters etc.

    return handleIncomingFile(ctx);
  });

  bot.action('post_done', async (ctx) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState || flowState.flow !== 'postbatch') return ctx.answerCbQuery();

    const selectedIds = flowState.selectedChannelIds || [];
    if (selectedIds.length === 0) {
      return ctx.answerCbQuery('Pick at least one channel first.');
    }

    await ctx.answerCbQuery('Posting...');
    const channels = await Channel.find({ _id: { $in: selectedIds } });
    const files = await FileItem.find({ batchId: flowState.batchId });

    for (const channel of channels) {
      await publishToChannel(ctx, channel, files);
    }

    state.clear(ctx.from.id);
    return ctx.editMessageText(`Posted to ${channels.length} channel(s).`);
  });

  bot.action('post_cancel', async (ctx) => {
    state.clear(ctx.from.id);
    await ctx.answerCbQuery('Cancelled.');
    return ctx.editMessageText('Post cancelled.');
  });

  bot.action(/toggle_channel:(.+)/, async (ctx) => {
    const flowState = state.get(ctx.from.id);
    if (!flowState || flowState.flow !== 'postbatch') return ctx.answerCbQuery();

    const id = ctx.match[1];
    const selected = new Set(flowState.selectedChannelIds || []);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    flowState.selectedChannelIds = [...selected];
    state.set(ctx.from.id, flowState);

    await ctx.answerCbQuery();
    const targetChannels = await Channel.find({ type: 'target' });
    return ctx.editMessageReplyMarkup(
      channelPickerKeyboard(targetChannels, flowState.selectedChannelIds).reply_markup
    );
  });
}

async function handleIncomingFile(ctx) {
  const message = ctx.message;
  let fileType, fileObj, fileName;

  if (message.video) {
    fileType = 'video';
    fileObj = message.video;
    fileName = message.video.file_name || message.caption || '';
  } else if (message.document) {
    fileType = 'document';
    fileObj = message.document;
    fileName = message.document.file_name || message.caption || '';
  } else if (message.audio) {
    fileType = 'audio';
    fileObj = message.audio;
    fileName = message.audio.file_name || message.caption || '';
  } else if (message.photo) {
    fileType = 'photo';
    fileObj = message.photo[message.photo.length - 1];
    fileName = message.caption || '';
  } else {
    return;
  }

  const episode = parseEpisode(fileName) || parseEpisode(message.caption || '');

  // Figure out if this belongs to an existing in-progress batch (sent moments ago)
  let flowState = state.get(ctx.from.id);
  let batchId;

  if (flowState && flowState.flow === 'postbatch' && !flowState.locked) {
    batchId = flowState.batchId;
    clearTimeout(flowState.batchTimer);
  } else {
    batchId = `${ctx.from.id}_${Date.now()}`;
    flowState = { flow: 'postbatch', batchId, selectedChannelIds: [], locked: false };
  }

  const file = await FileItem.create({
    token: genToken(),
    fileId: fileObj.file_id,
    fileUniqueId: fileObj.file_unique_id,
    fileType,
    fileName,
    episodeNumber: episode?.number ?? null,
    episodeLabel: episode?.label ?? null,
    caption: message.caption || '',
    uploadedBy: ctx.from.id,
    batchId,
  });

  // Wait a short window for more files (batch upload) before showing the channel picker
  flowState.batchTimer = setTimeout(async () => {
    flowState.locked = true;
    state.set(ctx.from.id, flowState);
    await presentChannelPicker(ctx, flowState);
  }, BATCH_WINDOW_MS);

  state.set(ctx.from.id, flowState);

  const label = episode ? ` — detected ${episode.label}` : '';
  await ctx.reply(`Got the file${label}. Send more files for this post, or wait ${BATCH_WINDOW_MS / 1000}s to continue.`);
}

async function presentChannelPicker(ctx, flowState) {
  const targetChannels = await Channel.find({ type: 'target' });
  if (targetChannels.length === 0) {
    state.clear(ctx.from.id);
    return ctx.reply('No target channels configured yet. Use /addchannel first.');
  }
  return ctx.reply('Select channel(s) to post to:', channelPickerKeyboard(targetChannels, []));
}

async function publishToChannel(ctx, channel, files) {
  if (channel.postMode === 'forward') {
    for (const file of files) {
      await sendRawFile(ctx, channel.channelId, file);
    }
    return;
  }

  if (channel.postMode === 'copy') {
    for (const file of files) {
      const sent = await sendRawFile(ctx, channel.channelId, file);
      if (channel.autoDelete > 0) scheduleAutoDelete(ctx, channel.channelId, sent.message_id, channel.autoDelete);
    }
    return;
  }

  // 'link' mode: post a promo message (poster + description) with deep-link buttons
  // that route back into the bot, where the fsub gate applies before delivery.
  const linkButtons = files
    .filter((f) => f.episodeLabel)
    .map((f) => Markup.button.url(f.episodeLabel, `https://t.me/${botUsername}?start=${f.token}`));

  const rows = linkButtons.length ? [linkButtons] : [];
  const caption = `${channel.title}\n\n${channel.description}`.trim();

  let sent;
  if (channel.posterFileId) {
    sent = await ctx.telegram.sendPhoto(channel.channelId, channel.posterFileId, {
      caption,
      reply_markup: Markup.inlineKeyboard(rows).reply_markup,
    });
  } else {
    sent = await ctx.telegram.sendMessage(channel.channelId, caption, {
      reply_markup: Markup.inlineKeyboard(rows).reply_markup,
    });
  }

  if (channel.autoDelete > 0) {
    scheduleAutoDelete(ctx, channel.channelId, sent.message_id, channel.autoDelete);
  }
}

async function sendRawFile(ctx, chatId, file) {
  const sendMethod = {
    video: 'sendVideo',
    document: 'sendDocument',
    audio: 'sendAudio',
    photo: 'sendPhoto',
  }[file.fileType];
  return ctx.telegram[sendMethod](chatId, file.fileId, { caption: file.caption || undefined });
}

function scheduleAutoDelete(ctx, chatId, messageId, seconds) {
  setTimeout(() => {
    ctx.telegram.deleteMessage(chatId, messageId).catch(() => {});
  }, seconds * 1000);
}

module.exports = { registerPostFlow };
