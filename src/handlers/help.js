function registerHelp(bot) {
  bot.help((ctx) => {
    const isAdmin = require('../config').adminIds.includes(ctx.from.id);

    let text = `Available commands:\n\n/start - start the bot\n/myreferral - get your referral link\n/help - this message`;

    if (isAdmin) {
      text += `\n\nAdmin commands:\n` +
        `/addfsub - add a force-subscribe channel\n` +
        `/addbotfsub - add a bot FSub link\n` +
        `/addchannel - add a channel to post files to\n` +
        `/listchannels - view and remove channels\n` +
        `/cancel - cancel any in-progress wizard\n\n` +
        `To create a post: just send me a file (photo/video/document/audio). ` +
        `Send several in a row to batch them into one post with episode buttons.`;
    }

    return ctx.reply(text);
  });
}

module.exports = { registerHelp };
