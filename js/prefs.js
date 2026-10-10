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
  applyAccent();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = root.dataset.theme === 'light' ? '#f6f4fb' : '#0e0b1f';
}
applyPrefs();

/* Do'kondan olingan "mavzu rangi" (accent) */
export function setAccent(color) {
  try {
    if (color && /^#[0-9a-f]{6}$/i.test(color)) localStorage.setItem('az:accent', color);
    else localStorage.removeItem('az:accent');
  } catch (e) { /* ignore */ }
  applyAccent();
}
export function applyAccent() {
  let c = null;
  try { c = localStorage.getItem('az:accent'); } catch (e) { /* ignore */ }
  const st = document.documentElement.style;
  if (c && /^#[0-9a-f]{6}$/i.test(c)) {
    st.setProperty('--primary', c);
    st.setProperty('--primary-hover', `color-mix(in srgb, ${c} 82%, black)`);
    st.setProperty('--primary-light', `color-mix(in srgb, ${c} 62%, white)`);
    st.setProperty('--primary-soft', `color-mix(in srgb, ${c} 15%, transparent)`);
    st.setProperty('--primary-ring', `color-mix(in srgb, ${c} 45%, transparent)`);
    st.setProperty('--grad-brand', `linear-gradient(135deg, ${c} 0%, color-mix(in srgb, ${c} 60%, #ec4899) 100%)`);
  } else {
    ['--primary', '--primary-hover', '--primary-light', '--primary-soft', '--primary-ring', '--grad-brand'].forEach(v => st.removeProperty(v));
  }
}
