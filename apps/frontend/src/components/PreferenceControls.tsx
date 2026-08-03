"use client";

import { useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";

type AppLanguage = "fr" | "en";

const TRANSLATIONS = new Map<string, string>([
  ["Accueil", "Home"],
  ["Fonctionnalités", "Features"],
  ["Solutions", "Solutions"],
  ["Tarifs", "Pricing"],
  ["A propos", "About"],
  ["Essai Gratuit", "Free Trial"],
  ["Essai", "Trial"],
  ["Retour", "Back"],
  ["Commerce Platform", "Commerce Platform"],
  ["Ravis de vous revoir sur Movoora", "Glad to see you again on Movoora"],
  ["Connectez-vous pour reprendre le contrôle de vos opérations.", "Sign in to take control of your operations again."],
  ["Adresse email", "Email address"],
  ["Mot de passe", "Password"],
  ["Se connecter", "Sign in"],
  ["Mot de passe oublié ?", "Forgot password?"],
  ["Créer un compte", "Create an account"],
  ["Inscription", "Sign up"],
  ["Créer votre espace", "Create your workspace"],
  ["Vérification OTP", "OTP verification"],
  ["Vérifier le code", "Verify code"],
  ["Renvoyer un code", "Resend code"],
  ["Réinitialisation de mot de passe", "Password reset"],
]);

const originalTextNodes = new WeakMap<Text, string>();

const translateDom = (language: AppLanguage) => {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue || "");
    const original = originalTextNodes.get(node) || "";
    const key = original.trim();
    if (language === "fr") {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }
    const translated = TRANSLATIONS.get(key);
    if (!translated) return;
    const next = original.replace(key, translated);
    if (node.nodeValue !== next) node.nodeValue = next;
  });
};

export default function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>("fr");

  useEffect(() => {
    const savedTheme = localStorage.getItem("movoora_theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const nextDark = savedTheme ? savedTheme === "dark" : Boolean(prefersDark);
    setDarkMode(nextDark);

    const savedLanguage = localStorage.getItem("movoora_language");
    setLanguage(savedLanguage === "en" ? "en" : "fr");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("movoora_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("movoora_language", language);
    document.documentElement.lang = language;
    const apply = () => translateDom(language);
    const timer = window.setTimeout(apply, 0);
    const observer = new MutationObserver(() => window.setTimeout(apply, 0));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language]);

  const buttonBase = "h-9 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors shrink-0 border border-slate-200/70";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => setDarkMode((current) => !current)}
        className={`${buttonBase} w-9 sm:w-10 flex items-center justify-center`}
        title={darkMode ? "Mode clair" : "Mode sombre"}
      >
        {darkMode ? <Sun size={compact ? 15 : 17} className="text-amber-500" /> : <Moon size={compact ? 15 : 17} />}
      </button>
      <button
        type="button"
        onClick={() => setLanguage((current) => (current === "fr" ? "en" : "fr"))}
        className={`${buttonBase} px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider`}
        title={language === "fr" ? "Passer en anglais" : "Switch to French"}
      >
        <Languages size={compact ? 14 : 16} />
        {language === "fr" ? "FR" : "EN"}
      </button>
    </div>
  );
}