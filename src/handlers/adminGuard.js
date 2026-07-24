const { adminIds } = require('../config');

function isAdmin(userId) {
  return adminIds.includes(userId);
}

function requireAdmin() {
  return async (ctx, next) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply('This command is for admins only.');
    }
    return next();
  };
}

module.exports = { isAdmin, requireAdmin };
