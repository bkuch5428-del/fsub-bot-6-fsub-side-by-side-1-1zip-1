// Simple in-memory state machine for multi-step conversations (add channel wizard,
// file posting flow). Not persisted across restarts - that's fine since these
// flows are short-lived and an admin can just restart the command if the bot reboots.

const store = new Map();

function get(userId) {
  return store.get(userId) || null;
}

function set(userId, data) {
  store.set(userId, data);
}

function clear(userId) {
  store.delete(userId);
}

function isMidFlow(userId) {
  return store.has(userId);
}

module.exports = { get, set, clear, isMidFlow };
