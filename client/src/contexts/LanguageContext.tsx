import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '@/lib/translations';

/**
 * LanguageContext - 言語設定管理
 * 
 * Phase 2 改善:
 * - 日本語 ('ja') を常にデフォルトとする
 * - 翻訳キー欠損時のフォールバックは必ず日本語（英語にフォールバックしない）
 * - 開発モードでの未翻訳キー警告
 */

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
export const LANGUAGE_STORAGE_KEY = 'lang';
const LEGACY_LANGUAGE_STORAGE_KEY = 'language';
let cachedLanguage: Language = 'ja';

// localStorage から言語設定を同期的に取得（初期化時のチラつき防止）
function normalizeLanguage(value: string | null): Language {
  return value === 'en' || value === 'ja' ? value : 'ja';
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ja';

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      const normalized = normalizeLanguage(stored);
      cachedLanguage = normalized;
      return normalized;
    }
    const legacy = localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
    if (legacy) {
      const normalized = normalizeLanguage(legacy);
      // Migrate legacy key to new key
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
      cachedLanguage = normalized;
      return normalized;
    }
    // No stored value: default to 'ja' and persist it
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ja');
    cachedLanguage = 'ja';
  } catch {
    // localStorage access failed: use 'ja' fallback
  }

  return 'ja'; // Default is always Japanese
}

/**
 * 翻訳関数の実装
 * 
 * フォールバック順序:
 * 1. 選択言語のテキスト
 * 2. 日本語のテキスト（英語選択時もjaにフォールバック）
 * 3. 開発モード: 警告表示 + 【未翻訳:key】
 * 4. 本番: キー名そのまま
 */
function createTranslateFunction(language: Language) {
  return (key: string, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language] as Record<string, string>;
    const jaTranslations = translations.ja as Record<string, string>;

    // 現在の言語で取得を試みる
    let text = langTranslations[key];

    // 無ければ日本語にフォールバック（英語にフォールバックしない！）
    if (!text) {
      text = jaTranslations[key];
    }

    // それでも無い場合
    if (!text) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}"`);
        return `【未翻訳:${key}】`;
      }
      // Production: Log error but don't show ugly text in UI
      console.error(`[i18n] MISSING KEY IN PRODUCTION: "${key}"`);
      return "—"; // Safe fallback (em dash)
    }

    // パラメータ置換 (例: {name} -> "太郎")
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }

    return text;
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Use getInitialLanguage as initializer to avoid flash-of-wrong-language
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Ensure localStorage is normalized and the single source of truth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRaw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const legacyRaw = localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
      const normalized = normalizeLanguage(storedRaw ?? legacyRaw);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      if (legacyRaw !== null) localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
      cachedLanguage = normalized;
      if (normalized !== language) setLanguageState(normalized);
    } catch {
      // Ignore localStorage failures
    }
  }, []);

  // 言語設定を保存（localStorage + state）
  const setLanguage = (lang: Language) => {
    const normalized = normalizeLanguage(lang);
    setLanguageState(normalized);
    cachedLanguage = normalized;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // localStorage 書き込み失敗を無視
    }
  };

  // 翻訳関数を作成
  const t = createTranslateFunction(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// 単独で使える翻訳関数（コンテキスト外での使用）
// 注意: これは言語設定変更に追従しないので、コンポーネント内ではuseLanguage()を使用
export function translateSync(key: string, params?: Record<string, string | number>): string {
  return createTranslateFunction(cachedLanguage)(key, params);
}

export function getCachedLanguage(): Language {
  return cachedLanguage;
}
