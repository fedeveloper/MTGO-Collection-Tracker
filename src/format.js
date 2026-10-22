// Number and date formatting shared by the UI, following the interface language
// (Italian uses comma decimals, English uses points).

const locales = { en: 'en-US', it: 'it-IT' };
const localeFor = (lang) => locales[lang] || locales.en;

export function formatTix(value, lang, digits = 2) {
  return (Number(value) || 0).toLocaleString(localeFor(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

// Signed amount with a true minus sign, e.g. "+1.25" / "−0.40"; zero has no sign
export function formatSigned(value, lang, digits = 2) {
  const n = Number(value) || 0;
  const rounded = Number(n.toFixed(digits));
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return sign + formatTix(Math.abs(n), lang, digits);
}

export function formatPercent(value, lang, digits = 1) {
  return `${formatSigned(value, lang, digits)}%`;
}

// 'up' | 'down' | '' for colouring a price movement
export function direction(value) {
  if (value > 0.001) return 'up';
  if (value < -0.001) return 'down';
  return '';
}

export function formatDate(iso, lang, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const options = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(localeFor(lang), options);
}

export function formatTime(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' });
}
