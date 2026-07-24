const { nanoid } = require('nanoid');

// Numeric-looking share IDs to match the style shown in reference screenshots
function genShareId() {
  return String(Date.now()).slice(-6) + Math.floor(Math.random() * 900 + 100);
}

// URL-safe token for file deep-links
function genToken() {
  return nanoid(10);
}

module.exports = { genShareId, genToken };
