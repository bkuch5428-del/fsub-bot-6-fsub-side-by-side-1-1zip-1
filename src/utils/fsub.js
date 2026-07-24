const Channel = require('../models/Channel');
const FsubBot = require('../models/FsubBot');
const User = require('../models/User');

const JOINED_STATUSES = ['member', 'administrator', 'creator'];

/**
 * Checks verifiable channel FSub requirements and returns configured bot FSub links.
 * Telegram cannot verify whether a user started an unrelated bot, so bot requirements
 * use explicit user acknowledgement on Try Again instead of pretending to verify them.
 */
async function checkFsub(telegram, userId) {
  const [fsubChannels, fsubBots, user] = await Promise.all([
    Channel.find({ type: 'fsub' }),
    FsubBot.find({ enabled: true }),
    User.findOne({ userId }),
  ]);

  const missingChannels = [];
  for (const channel of fsubChannels) {
    try {
      const member = await telegram.getChatMember(channel.channelId, userId);
      if (!JOINED_STATUSES.includes(member.status)) missingChannels.push(channel);
    } catch (err) {
      missingChannels.push(channel);
    }
  }

  const acknowledged = new Set(user?.acknowledgedFsubBots || []);
  const missingBots = fsubBots.filter((b) => !acknowledged.has(String(b._id)));

  return {
    ok: missingChannels.length === 0 && missingBots.length === 0,
    missing: missingChannels,
    missingChannels,
    missingBots,
  };
}

async function acknowledgeBotFsubs(userId, bots) {
  if (!bots?.length) return;
  await User.updateOne(
    { userId },
    { $addToSet: { acknowledgedFsubBots: { $each: bots.map((b) => String(b._id)) } } }
  );
}

module.exports = { checkFsub, acknowledgeBotFsubs };
