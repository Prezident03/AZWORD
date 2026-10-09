/* AzWord · ikon yordamchilari */
import { PATHS } from './icon-paths.js';

export { PATHS };

/* Bo'lim/mukofot/do'kon uchun tanlanadigan ikonlar */
export const PICKER_ICONS = [
  'book-open', 'book', 'library', 'folder', 'graduation-cap', 'brain', 'languages',
  'file-text', 'star', 'trophy', 'medal', 'award', 'crown', 'flame', 'sparkles',
  'rocket', 'zap', 'target', 'gift', 'heart', 'lightbulb', 'palette', 'frame',
  'snowflake', 'coins', 'shield', 'headphones', 'mic', 'puzzle', 'bot', 'calendar'
];

/* Eski ma'lumotlarda emoji saqlangan bo'lishi mumkin — ikon nomiga o'giramiz */
export const EMOJI_TO_ICON = {
  '📚': 'book-open', '📁': 'folder', '📖': 'book-marked', '📗': 'book', '📘': 'book',
  '⭐': 'star', '🌟': 'star', '🪙': 'coins', '🔥': 'flame', '🏆': 'trophy',
  '🏅': 'medal', '🎖️': 'medal', '🛒': 'shopping-bag', '📊': 'bar-chart',
  '👥': 'users', '🤖': 'bot', '📢': 'megaphone', '⚙️': 'settings',
  '🏠': 'home', '📝': 'file-text', '🎉': 'party-popper', '🎊': 'party-popper',
  '💪': 'dumbbell', '🔤': 'languages', '🧩': 'puzzle', '🔗': 'link',
  '✍️': 'pen-line', '✅': 'circle-check', '⚠️': 'alert-triangle',
  '👑': 'crown', '🎁': 'gift', '🔔': 'bell', '🚀': 'rocket', '🔒': 'lock',
  '🎓': 'graduation-cap', '🧠': 'brain', '💡': 'lightbulb', '🎯': 'target',
  '❤️': 'heart', '⚡': 'zap', '💎': 'sparkles', '✨': 'sparkles', '🎨': 'palette',
  '❄️': 'snowflake', '🎧': 'headphones', '🎤': 'mic', '📅': 'calendar'
};

export function icon(name, size = 20, extra = '') {
  const paths = PATHS[name] || PATHS[EMOJI_TO_ICON[name]] || PATHS.sparkles;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;
}

/* Ma'lumotlar bazasidagi `emoji`/`icon` maydonini xavfsiz ikon nomiga aylantiradi */
export function iconName(value, fallback = 'folder') {
  if (!value) return fallback;
  if (PATHS[value]) return value;
  return EMOJI_TO_ICON[value] || fallback;
}

export function starIcon(size = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">${PATHS.star}</svg>`;
}

export const LOGO_SVG = `<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 50 L32 14 L47 50"/><path d="M22.5 38 L41.5 38"/></svg>`;
