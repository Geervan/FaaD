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
  ':zebra_face:': '🦓',
  ':zebra:': '🦓',
  ':dog_face:': '🐶',
  ':cat_face:': '🐱',
  ':monkey_face:': '🐵',
  ':lion_face:': '🦁',
  ':tiger_face:': '🐯',
  ':fox_face:': '🦊',
  ':bear_face:': '🐻',
  ':panda_face:': '🐼',
  ':cow_face:': '🐮',
  ':pig_face:': '🐷',
  ':frog_face:': '🐸',
};

/**
 * Replaces any emoji shortcodes across GitHub, Slack, Discord, iOS, Android,
 * and standard Unicode CLDR names (e.g. :zebra_face:, :face_with_hand_over_mouth:, :melting_face:).
 */
export function replaceEmojiShortcodes(text: string): string {
  if (!text) return text;
  let result = emoji.emojify(text);
  result = result.replace(/:[a-z0-9_+-]+:/gi, (match) => {
    const lower = match.toLowerCase();
    if (CLDR_MAP[lower]) return CLDR_MAP[lower];
    if (EXTRA_ALIASES[lower]) return EXTRA_ALIASES[lower];
    
    // Handle _face suffix variations (e.g. :zebra_face: -> :zebra:)
    if (lower.endsWith('_face:')) {
      const stripped = lower.replace('_face:', ':');
      if (CLDR_MAP[stripped]) return CLDR_MAP[stripped];
      if (EXTRA_ALIASES[stripped]) return EXTRA_ALIASES[stripped];
      const emojified = emoji.emojify(stripped);
      if (emojified !== stripped) return emojified;
    }
    return match;
  });
  return result;
}
