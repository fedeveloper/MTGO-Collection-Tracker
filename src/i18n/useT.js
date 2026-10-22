import { translations } from './translations';

// Returns t(key, params) for a language; falls back to English, then to the key itself.
export function makeT(lang) {
  const strings = translations[lang] || translations.en;
  return (key, params) => {
    let text = strings[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, value);
      }
    }
    return text;
  };
}

// Pick the singular/plural key pair, e.g. countLabel(t, 'copies', 'copiesOne', n)
export function countLabel(t, manyKey, oneKey, n) {
  return n === 1 ? t(oneKey) : t(manyKey, { n });
}
