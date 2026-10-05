export type Lang = 'zh' | 'en';

export type LangText = { zh: string; en: string };

export const LANG_STORAGE_KEY = 'travian-lang';

export function pick(text: LangText | string, lang: Lang): string {
  if (typeof text === 'string') return text;
  return text[lang] ?? text.en;
}
