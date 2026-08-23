import * as emoji from 'node-emoji';

const EMOJI_ALIASES: Record<string, string> = {
  ':partying_face:': '🥳',
  ':melting_face:': '🫠',
  ':saluting_face:': '🫡',
  ':salute:': '🫡',
  ':smiling_face_with_tear:': '🥲',
  ':face_with_peeking_eye:': '🫣',
  ':face_with_diagonal_mouth:': '🫤',
  ':dotted_line_face:': '🫥',
  ':face_holding_back_tears:': '🥹',
  ':heart_on_fire:': '❤️‍🔥',
  ':mending_heart:': '🩹',
  ':mind_blown:': '🤯',
  ':exploding_head:': '🤯',
  ':sweat_smile:': '😅',
  ':joy:': '😂',
  ':rofl:': '🤣',
  ':sob:': '😭',
  ':skull:': '💀',
  ':shrug:': '🤷',
  ':facepalm:': '🤦',
  ':pinched_fingers:': '🤌',
  ':tada:': '🎉',
  ':party:': '🎉',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':thumbsup:': '👍',
  ':+1:': '👍',
  ':thumbsdown:': '👎',
  ':-1:': '👎',
  ':heart:': '❤️',
  ':star:': '⭐',
  ':100:': '💯',
};

/**
 * Replaces any emoji shortcodes (e.g. :sweat_smile:, :fire:, :partying_face:, :melting_face:)
 * with actual unicode emojis across the full Unicode/GitHub/Slack dataset.
 */
export function replaceEmojiShortcodes(text: string): string {
  if (!text) return text;
  let result = emoji.emojify(text);
  result = result.replace(/:[a-z0-9_+-]+:/gi, (match) => {
    const lower = match.toLowerCase();
    return EMOJI_ALIASES[lower] || match;
  });
  return result;
}
