// Matches: E1, E01, EP1, EP 1, EP-1, EP_1, Episode1, Episode 1, episode.1 (case-insensitive)
// Longest alternatives are tried first so "Episode12" doesn't get parsed as "E" + garbage.
//
// Note: we deliberately use (?<![a-z0-9]) / (?![0-9]) lookaround instead of \b here.
// \b treats "_" as a word character, so a plain \b would fail to find the boundary in
// very common underscore-delimited release names like "Show_Ep_12.mkv" or
// "Show_Episode_05_1080p.mkv" (no boundary exists between "_" and "E"/"e").
const EPISODE_REGEX = /(?<![a-z0-9])(?:episode|ep|e)[.\s_-]*0*(\d{1,3})(?![0-9])/i;

// Matches scene-release style "S01E05", "S1E5" - no boundary exists between
// the season digits and "E" so this needs its own pattern.
const SEASON_EPISODE_REGEX = /s\d{1,2}[.\s_-]?e0*(\d{1,3})(?![0-9])/i;

/**
 * Extracts an episode number from a filename or caption.
 * @param {string} text - filename or caption to scan
 * @returns {{ number: number, label: string } | null}
 */
function parseEpisode(text) {
  if (!text) return null;

  const seasonMatch = text.match(SEASON_EPISODE_REGEX);
  const match = seasonMatch || text.match(EPISODE_REGEX);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  if (Number.isNaN(number)) return null;

  return {
    number,
    label: `EPISODE ${number}`,
  };
}

module.exports = { parseEpisode };
