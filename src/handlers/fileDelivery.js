async function deliverFile(ctx, file) {
  const sendMethod = {
    photo: 'sendPhoto',
    video: 'sendVideo',
    document: 'sendDocument',
    audio: 'sendAudio',
  }[file.fileType];

  const sent = await ctx.telegram[sendMethod](ctx.chat.id, file.fileId, {
    caption: file.caption || undefined,
  });

  await ctx.reply('This file will auto-delete in 10 minutes. Forward it somewhere safe if you want to keep it.').catch(() => {});

  // Auto-delete after 10 minutes to discourage re-sharing without the fsub gate.
  // Adjust or remove this if you don't want delivered files to expire.
  setTimeout(() => {
    ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {});
  }, 10 * 60 * 1000);

  return sent;
}

module.exports = { deliverFile };
