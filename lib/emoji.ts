import * as emoji from 'node-emoji';
import emojilib from 'emojilib';

// Build comprehensive CLDR map from emojilib (6,200+ iOS, Android, and Unicode names)
const CLDR_MAP: Record<string, string> = {};
if (emojilib && typeof emojilib === 'object') {
  for (const [emojiChar, keywords] of Object.entries(emojilib)) {
    if (Array.isArray(keywords)) {
      for (const kw of keywords) {
        const shortcode = `:${kw.toLowerCase().replace(/[\s-]+/g, '_')}:`;
        if (!CLDR_MAP[shortcode]) {
          CLDR_MAP[shortcode] = emojiChar;
        }
      }
    }
  }
}

const EXTRA_ALIASES: Record<string, string> = {
  ':salute:': '🫡',
  ':party:': '🎉',
  ':mind_blown:': '🤯',
};

/**
 * Replaces any emoji shortcodes across GitHub, Slack, Discord, iOS, Android,
 * and standard Unicode CLDR names (e.g. :face_with_hand_over_mouth:, :melting_face:, :partying_face:).
 */
export function replaceEmojiShortcodes(text: string): string {
  if (!text) return text;
  let result = emoji.emojify(text);
  result = result.replace(/:[a-z0-9_+-]+:/gi, (match) => {
    const lower = match.toLowerCase();
    return CLDR_MAP[lower] || EXTRA_ALIASES[lower] || match;
  });
  return result;
}
