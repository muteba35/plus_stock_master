"use client";

import { useEffect, useState } from "react";
import {
  getStoredLanguage,
  languageChangeEvent,
  languageStorageKey,
  translateValue,
  type AppLanguage,
} from "../i18n/catalog";

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
const originalInputValues = new WeakMap<HTMLInputElement, string>();

const skippedTextParents = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);

const shouldSkipTextNode = (node: Node) => {
  const parent = node.parentElement;
  if (!parent) return true;
  if (skippedTextParents.has(parent.tagName)) return true;
  if (!node.nodeValue || !node.nodeValue.trim()) return true;
  if (parent.closest("[data-no-translate]")) return true;
  return false;
};

const translateTextNodes = (language: AppLanguage) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue || "");
    const original = originalTextNodes.get(node) || "";
    const next = translateValue(original, language);
    if (node.nodeValue !== next) node.nodeValue = next;
  });
};

const translateAttributes = (language: AppLanguage) => {
  const attrs = ["placeholder", "title", "aria-label", "alt"];
  document.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]").forEach((element) => {
    if (element.closest("[data-no-translate]")) return;

    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = {};
      originalAttributes.set(element, originals);
    }

    attrs.forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current || !current.trim()) return;
      if (!originals[attr]) originals[attr] = current;
      const next = translateValue(originals[attr], language);
      if (current !== next) element.setAttribute(attr, next);
    });
  });
};

const translateButtonInputValues = (language: AppLanguage) => {
  document.querySelectorAll<HTMLInputElement>('input[type="button"], input[type="submit"], input[type="reset"]').forEach((input) => {
    if (input.closest("[data-no-translate]")) return;
    if (!input.value || !input.value.trim()) return;
    if (!originalInputValues.has(input)) originalInputValues.set(input, input.value);
    const next = translateValue(originalInputValues.get(input) || "", language);
    if (input.value !== next) input.value = next;
  });
};

const applyLanguage = (language: AppLanguage) => {
  if (typeof document === "undefined" || !document.body) return;

  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;

  translateTextNodes(language);
  translateAttributes(language);
  translateButtonInputValues(language);
};

export default function LanguageRuntime() {
  const [language, setLanguage] = useState<AppLanguage>("fr");

  useEffect(() => {
    const timer = window.setTimeout(() => setLanguage(getStoredLanguage()), 0);

    const handleLanguageChange = (event: Event) => {
      const custom = event as CustomEvent<AppLanguage>;
      setLanguage(custom.detail === "en" ? "en" : "fr");
    };

    window.addEventListener(languageChangeEvent, handleLanguageChange as EventListener);
    window.addEventListener("storage", handleLanguageChange as EventListener);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(languageChangeEvent, handleLanguageChange as EventListener);
      window.removeEventListener("storage", handleLanguageChange as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    const apply = () => applyLanguage(language);
    const timer = window.setTimeout(apply, 0);
    const observer = new MutationObserver(() => window.setTimeout(apply, 0));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language]);

  return null;
}
