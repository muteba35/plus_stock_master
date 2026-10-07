"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "./LanguageRuntime";

export default function PageLoading() {
  const { language } = useLanguage();
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-no-translate className="flex min-h-[45vh] w-full flex-col items-center justify-center gap-4 px-6 py-16 text-slate-600 dark:text-slate-300">
      <Loader2 aria-hidden="true" size={28} className="animate-spin text-blue-600 motion-reduce:animate-none" />
      <p className="text-sm font-medium">{language === "en" ? "Loading page..." : "Chargement de la page..."}</p>
    </div>
  );
}
