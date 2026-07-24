const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };

/**
 * Parses "30s", "5m", "2h", "1d", or "0" into seconds.
 * Returns null if the input doesn't match the expected format.
 */
function parseDuration(text) {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === '0') return 0;

  const match = trimmed.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const [, amount, unit] = match;
  return parseInt(amount, 10) * UNIT_SECONDS[unit];
}

module.exports = { parseDuration };
