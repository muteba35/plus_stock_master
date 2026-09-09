"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getStoredLanguage,
  languageChangeEvent,
  languageStorageKey,
  setStoredLanguage,
  translateValue,
  type AppLanguage,
} from "../i18n/catalog";
import enCommon from "../i18n/locales/en/common.json";
import frCommon from "../i18n/locales/fr/common.json";

type Params = Record<string, string | number>;
type LanguageContextValue = {
  language: AppLanguage;
  locale: "fr-FR" | "en-GB";
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, params?: Params) => string;
  translate: (value: string) => string;
};

const dictionaries = { fr: frCommon, en: enCommon } as const;
const LanguageContext = createContext<LanguageContextValue | null>(null);

const getByPath = (source: unknown, path: string): string | undefined => {
  const result = path.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, source);
  return typeof result === "string" ? result : undefined;
};

const interpolate = (value: string, params?: Params) => {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
};

const originals = new WeakMap<Node, string>();
const applied = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
const appliedAttributes = new WeakMap<Element, Record<string, string>>();
const skippedParents = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);
const translatedAttributes = ["placeholder", "title", "aria-label", "alt"] as const;

const translateDocument = (language: AppLanguage) => {
  if (!document.body) return;
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      return !parent || skippedParents.has(parent.tagName) || !node.nodeValue?.trim() || parent.closest("[data-no-translate]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    const current = node.nodeValue || "";
    if (!originals.has(node) || (applied.has(node) && current !== applied.get(node))) originals.set(node, current);
    const next = translateValue(originals.get(node) || current, language);
    applied.set(node, next);
    if (current !== next) node.nodeValue = next;
  });

  document.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]").forEach((element) => {
    if (element.closest("[data-no-translate]")) return;
    const source = originalAttributes.get(element) || {};
    const last = appliedAttributes.get(element) || {};
    translatedAttributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current?.trim()) return;
      if (!source[attribute] || (last[attribute] !== undefined && current !== last[attribute])) source[attribute] = current;
      const next = translateValue(source[attribute], language);
      last[attribute] = next;
      if (current !== next) element.setAttribute(attribute, next);
    });
    originalAttributes.set(element, source);
    appliedAttributes.set(element, last);
  });

  document.querySelectorAll<HTMLInputElement>('input[type="button"], input[type="submit"], input[type="reset"]').forEach((input) => {
    if (input.closest("[data-no-translate]") || !input.value.trim()) return;
    const current = input.value;
    if (!originals.has(input) || (applied.has(input) && current !== applied.get(input))) originals.set(input, current);
    const next = translateValue(originals.get(input) || current, language);
    applied.set(input, next);
    if (current !== next) input.value = next;
  });
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageRuntime");
  return context;
}

export default function LanguageRuntime({ children }: { children: ReactNode }) {
  // The server always renders French. Keep the browser's first render identical,
  // then restore the persisted preference once hydration has completed.
  const [language, setLanguageState] = useState<AppLanguage>("fr");
  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    setStoredLanguage(next);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setLanguageState(getStoredLanguage());
    });
    const onChange = (event: Event) => setLanguageState((event as CustomEvent<AppLanguage>).detail === "en" ? "en" : "fr");
    const onStorage = (event: StorageEvent) => {
      if (event.key === languageStorageKey) setLanguageState(event.newValue === "en" ? "en" : "fr");
    };
    window.addEventListener(languageChangeEvent, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener(languageChangeEvent, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => translateDocument(language));
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes, "value"],
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language]);

  const translate = useCallback((value: string) => translateValue(value, language), [language]);
  const t = useCallback((key: string, params?: Params) => {
    const value = getByPath(dictionaries[language], key) ?? getByPath(dictionaries.fr, key) ?? key;
    return interpolate(value, params);
  }, [language]);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "fr" ? "fr-FR" : "en-GB",
    setLanguage,
    t,
    translate,
  }), [language, setLanguage, t, translate]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
