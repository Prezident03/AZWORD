/* AzWord · qurilmadagi sozlamalar (mavzu, ovoz, animatsiya, eslatma)
   Kunlik maqsad kabi hisobga bog'liq sozlamalar Firestore'da saqlanadi. */
const KEY = 'az:prefs';
const DEFAULTS = {
  theme: 'dark',        // 'dark' | 'light' | 'system'
  sound: true,
  effects: true,        // konfetti va animatsiyalar
  autoSpeak: true,      // so'z ko'rsatilganda avtomatik talaffuz
  voiceRate: 0.9,
  sessionSize: 12,     // bitta mashg'ulotdagi so'zlar soni
  accent: 'en-GB',      // 'en-GB' | 'en-US'
  reminder: false,
  reminderTime: '19:00'
};

export function getPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { return { ...DEFAULTS }; }
}
export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
  applyPrefs(next);
  return next;
}
export function resolvedTheme(p = getPrefs()) {
  if (p.theme === 'system') return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return p.theme;
}
export function applyPrefs(p = getPrefs()) {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme(p);
  root.classList.toggle('no-motion', !p.effects);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = root.dataset.theme === 'light' ? '#f6f4fb' : '#0e0b1f';
}
applyPrefs();
