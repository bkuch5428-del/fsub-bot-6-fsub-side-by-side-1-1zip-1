const { Markup } = require('telegraf');

function styledCallback(text, callbackData, style) {
  const button = { text, callback_data: callbackData };
  if (style) button.style = style;
  return button;
}

function joinGateKeyboard(missingChannels, retryPayload, missingBots = []) {
  const requirementButtons = [];

  missingChannels.forEach((ch, index) => {
    requirementButtons.push(
      Markup.button.url(
        `Join Channel ${index + 1}`,
        ch.inviteLink || `https://t.me/c/${ch.channelId.replace('-100', '')}`
      )
    );
  });

  missingBots.forEach((bot) => {
    requirementButtons.push(
      Markup.button.url(`🤖 Start @${bot.username}`, bot.startLink)
    );
  });

  // Exactly two FSub requirement buttons per row where possible.
  const rows = [];
  for (let i = 0; i < requirementButtons.length; i += 2) {
    rows.push(requirementButtons.slice(i, i + 2));
  }

  // Try Again stays full-width on its own row.
  rows.push([
    styledCallback('♻️ Try Again', `fsub_retry:${retryPayload}`, 'primary')
  ]);

  return Markup.inlineKeyboard(rows);
}

function settingsKeyboard() {
  return Markup.inlineKeyboard([
    [
      styledCallback('📡  FORCE SUB', 'settings_fsub_channels', 'primary'),
      styledCallback('📂  DB CHANNELS', 'settings_db_channels', 'primary')
    ],
    [
      styledCallback('🤖  BOT FSUB', 'settings_add_fsub_bot', 'primary'),
      styledCallback('📋  MANAGE', 'settings_manage', 'primary')
    ],
    [
      styledCallback('🏠  HOME', 'settings_home', 'primary'),
      styledCallback('MORE  ›', 'settings_next', 'primary')
    ]
  ]);
}

function settingsBackKeyboard(showCancel = true) {
  const rows = [[
    styledCallback('‹  BACK', 'settings_back', 'primary'),
    styledCallback('✕  CLOSE', 'settings_close', 'danger')
  ]];
  if (showCancel) {
    rows.unshift([styledCallback('CANCEL', 'settings_cancel', 'danger')]);
  }
  return Markup.inlineKeyboard(rows);
}

function settingsSuccessKeyboard(addAction) {
  const rows = [];
  if (addAction) rows.push([Markup.button.callback('＋  ADD ANOTHER', addAction)]);
  rows.push([
    styledCallback('‹  BACK', 'settings_back', 'primary'),
    styledCallback('✕  CLOSE', 'settings_close', 'danger')
  ]);
  return Markup.inlineKeyboard(rows);
}

function homeKeyboard(isAdmin = false) {
  const rows = [];
  if (isAdmin) rows.push([styledCallback('⚙️ SETTINGS ⚙️', 'open_settings', 'primary')]);
  rows.push([Markup.button.callback('Help', 'home_help'), Markup.button.callback('Close', 'home_close')]);
  return Markup.inlineKeyboard(rows);
}

function channelPickerKeyboard(targetChannels, selectedIds = []) {
  const rows = targetChannels.map((ch) => {
    const isSelected = selectedIds.includes(String(ch._id));
    const label = `${isSelected ? '✅ ' : ''}${ch.title}`;
    return [Markup.button.callback(label, `toggle_channel:${ch._id}`)];
  });
  rows.push([Markup.button.callback('Post now ▶', 'post_done')]);
  rows.push([styledCallback('Cancel', 'post_cancel', 'danger')]);
  return Markup.inlineKeyboard(rows);
}

function episodeButtonsRow(files) {
  return files.filter((f) => f.episodeLabel).map((f) => Markup.button.callback(f.episodeLabel, `get_file:${f.token}`));
}

function channelManageKeyboard(channels, bots = []) {
  const rows = channels.map((ch) => [
    Markup.button.callback(`${ch.title} (${ch.type})`, 'noop'),
    Markup.button.callback('×  REMOVE', `remove_channel:${ch._id}`),
  ]);
  for (const bot of bots) {
    rows.push([
      Markup.button.callback(`🤖 ${bot.title} (bot fsub)`, 'noop'),
      Markup.button.callback('×  REMOVE', `remove_fsubbot:${bot._id}`),
    ]);
  }
  
  rows.push([styledCallback('＋  ADD', 'settings_fsub_channels', 'primary')]);
  rows.push([
    styledCallback('‹  BACK', 'settings_back', 'primary'),
    styledCallback('✕  CLOSE', 'settings_close', 'danger')
  ]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  styledCallback,
  joinGateKeyboard,
  settingsKeyboard,
  settingsBackKeyboard,
  settingsSuccessKeyboard,
  homeKeyboard,
  channelPickerKeyboard,
  episodeButtonsRow,
  channelManageKeyboard
};
