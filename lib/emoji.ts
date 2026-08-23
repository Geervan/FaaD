const EMOJI_MAP: Record<string, string> = {
  ':sweat_smile:': '😅',
  ':smile:': '😊',
  ':slight_smile:': '🙂',
  ':grin:': '😀',
  ':joy:': '😂',
  ':rofl:': '🤣',
  ':heart:': '❤️',
  ':heart_eyes:': '😍',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':thumbsup:': '👍',
  ':+1:': '👍',
  ':thumbsdown:': '👎',
  ':-1:': '👎',
  ':sob:': '😭',
  ':skull:': '💀',
  ':thinking:': '🤔',
  ':eyes:': '👀',
  ':clap:': '👏',
  ':tada:': '🎉',
  ':party:': '🎉',
  ':100:': '💯',
  ':check:': '✅',
  ':heavy_check_mark:': '✅',
  ':x:': '❌',
  ':wink:': '😉',
  ':cool:': '😎',
  ':sunglasses:': '😎',
  ':pray:': '🙏',
  ':star:': '⭐',
  ':wave:': '👋',
  ':poop:': '💩',
  ':clown:': '🤡',
  ':sparkles:': '✨',
  ':raised_hands:': '🙌',
  ':muscle:': '💪',
  ':exploding_head:': '🤯',
  ':mind_blown:': '🤯',
  ':salute:': '🫡',
};

/**
 * Replaces emoji shortcodes (e.g. :sweat_smile:) with actual unicode emojis (e.g. 😅).
 */
export function replaceEmojiShortcodes(text: string): string {
  if (!text) return text;
  return text.replace(/:[a-z0-9_+-]+:/gi, (match) => {
    const lower = match.toLowerCase();
    return EMOJI_MAP[lower] || match;
  });
}

export const POPULAR_EMOJIS = ['😅', '😊', '😂', '❤️', '🔥', '🚀', '👍', '😭', '💀', '🤔', '👀', '🎉', '💯', '✨', '🙌', '💪'];
