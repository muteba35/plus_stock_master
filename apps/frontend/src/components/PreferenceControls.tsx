"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type AppLanguage = "fr" | "en";

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

    const handleLanguageChange = (event: Event) => {
      const custom = event as CustomEvent<AppLanguage>;
      setLanguage(custom.detail === "en" ? "en" : "fr");
    };

    window.addEventListener("movoora-language-change", handleLanguageChange as EventListener);
    return () => window.removeEventListener("movoora-language-change", handleLanguageChange as EventListener);
  }, []);

  const chooseLanguage = (nextLanguage: AppLanguage) => {
    localStorage.setItem("movoora_language", nextLanguage);
    setLanguage(nextLanguage);
    window.dispatchEvent(new CustomEvent("movoora-language-change", { detail: nextLanguage }));
    setOpen(false);
  };

  const buttonClass = [
    "h-9 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors shrink-0 border border-slate-200/70 px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
    compact ? "" : "min-w-[76px]",
  ].join(" ");

  const optionClass = (option: AppLanguage) => [
    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider transition-colors",
    language === option ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
  ].join(" ");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={buttonClass}
        title={language === "fr" ? "Changer la langue" : "Change language"}
        aria-label={language === "fr" ? "Changer la langue" : "Change language"}
      >
        <FlagIcon language={language} />
        <span>{language === "fr" ? "FR" : "EN"}</span>
        <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[9999] w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <button type="button" onClick={() => chooseLanguage("fr")} className={optionClass("fr")}>
            <FlagIcon language="fr" />
            Français
          </button>
          <button type="button" onClick={() => chooseLanguage("en")} className={optionClass("en")}>
            <FlagIcon language="en" />
            English
          </button>
        </div>
      )}
    </div>
  );
}
