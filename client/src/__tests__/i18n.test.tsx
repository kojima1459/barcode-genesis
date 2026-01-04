/**
 * i18n Tests - LanguageContext Behavior
 *
 * Verifies:
 * - Default language is 'ja'
 * - localStorage persistence works
 * - Language changes are reflected
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage, LANGUAGE_STORAGE_KEY } from '../contexts/LanguageContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LanguageContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('defaults to Japanese when no localStorage value exists', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        expect(result.current.language).toBe('ja');
        expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
    });

    it('persists language to localStorage when changed', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        act(() => {
            result.current.setLanguage('en');
        });

        expect(result.current.language).toBe('en');
        expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });

    it('loads language from localStorage on init', () => {
        localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'en');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        expect(result.current.language).toBe('en');
    });

    it('normalizes invalid language to ja', () => {
        localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'invalid');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        expect(result.current.language).toBe('ja');
        expect(localStorageMock.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
    });

    it('t() returns Japanese translation', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        // Test a known translation key
        const text = result.current.t('back');
        expect(text).toBe('戻る');
    });

    it('t() returns key name for missing translation in production', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LanguageProvider>{children}</LanguageProvider>
        );
        const { result } = renderHook(() => useLanguage(), { wrapper });

        // Test a missing key
        const text = result.current.t('nonexistent_key_12345');
        // In dev mode it returns 【未翻訳:key】, in test it may return key
        expect(text).toMatch(/nonexistent_key_12345|未翻訳/);
    });
});
