"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type AppLanguage = "fr" | "en";

const TRANSLATIONS = new Map<string, string>([
  ["Accueil", "Home"],
  ["Fonctionnalités", "Features"],
  ["Solutions", "Solutions"],
  ["Tarifs", "Pricing"],
  ["A propos", "About"],
  ["À propos", "About"],
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
  ["Nom", "Last name"],
  ["Prénom", "First name"],
  ["Téléphone", "Phone"],
  ["Confirmer le mot de passe", "Confirm password"],
  ["Déjà un compte ?", "Already have an account?"],
  ["Créer ma boutique", "Create my store"],
  ["Nom de la boutique", "Store name"],
  ["Secteur d'activité", "Business sector"],
  ["Taille de l'entreprise", "Business size"],
  ["Continuer", "Continue"],
  ["Valider", "Confirm"],
  ["Annuler", "Cancel"],
]);

const MOJIBAKE_TRANSLATIONS = new Map<string, string>([
  ["FonctionnalitÃ©s", "Features"],
  ["Connectez-vous pour reprendre le contrÃ´le de vos opÃ©rations.", "Sign in to take control of your operations again."],
  ["CrÃ©er un compte", "Create an account"],
  ["CrÃ©er votre espace", "Create your workspace"],
  ["VÃ©rification OTP", "OTP verification"],
  ["VÃ©rifier le code", "Verify code"],
  ["RÃ©initialisation de mot de passe", "Password reset"],
]);

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();

const getTranslation = (text: string) => TRANSLATIONS.get(text) || MOJIBAKE_TRANSLATIONS.get(text);

const translateDom = (language: AppLanguage) => {
  if (typeof document === "undefined" || !document.body) return;

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

    const translated = getTranslation(key);
    if (!translated) return;
    const next = original.replace(key, translated);
    if (node.nodeValue !== next) node.nodeValue = next;
  });

  const attrs = ["placeholder", "title", "aria-label"];
  document.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]").forEach((element) => {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = {};
      originalAttributes.set(element, originals);
    }

    attrs.forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current || !current.trim()) return;
      if (!originals[attr]) originals[attr] = current;
      const original = originals[attr];
      const key = original.trim();

      if (language === "fr") {
        if (current !== original) element.setAttribute(attr, original);
        return;
      }

      const translated = getTranslation(key);
      if (!translated) return;
      const next = original.replace(key, translated);
      if (current !== next) element.setAttribute(attr, next);
    });
  });
};

function FlagIcon({ language }: { language: AppLanguage }) {
  if (language === "fr") {
    return (
      <span className="grid h-4 w-6 grid-cols-3 overflow-hidden rounded-[3px] border border-slate-300 shadow-sm">
        <span className="bg-[#1f3f8b]" />
        <span style={{ backgroundColor: "#ffffff" }} />
        <span className="bg-[#e63946]" />
      </span>
    );
  }

  return (
    <span className="relative h-4 w-6 overflow-hidden rounded-[3px] border border-slate-300 bg-[#102b7a] shadow-sm">
      <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-[#d91f3c]" />
      <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-[#d91f3c]" />
      <span className="absolute -left-1 top-1/2 h-[2px] w-8 -rotate-[34deg] bg-white" />
      <span className="absolute -left-1 top-1/2 h-[2px] w-8 rotate-[34deg] bg-white" />
    </span>
  );
}

export default function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<AppLanguage>("fr");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("movoora_language");
    setLanguage(savedLanguage === "en" ? "en" : "fr");
  }, []);

  useEffect(() => {
    localStorage.setItem("movoora_language", language);
    document.documentElement.lang = language;
    const apply = () => translateDom(language);
    const timer = window.setTimeout(apply, 0);
    const observer = new MutationObserver(() => window.setTimeout(apply, 0));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language]);

  const chooseLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`h-9 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors shrink-0 border border-slate-200/70 px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${compact ? "" : "min-w-[76px]"}`}
        title={language === "fr" ? "Changer la langue" : "Change language"}
        aria-label={language === "fr" ? "Changer la langue" : "Change language"}
      >
        <FlagIcon language={language} />
        <span>{language === "fr" ? "FR" : "EN"}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[130] w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <button
            type="button"
            onClick={() => chooseLanguage("fr")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider transition-colors ${language === "fr" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <FlagIcon language="fr" />
            Français
          </button>
          <button
            type="button"
            onClick={() => chooseLanguage("en")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider transition-colors ${language === "en" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <FlagIcon language="en" />
            English
          </button>
        </div>
      )}
    </div>
  );
}

