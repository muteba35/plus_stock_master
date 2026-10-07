"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "./LanguageRuntime";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pending: boolean };

export default function PendingButton({ pending, disabled, children, style, ...props }: Props) {
  const { language } = useLanguage();
  return (
    <button {...props} style={{ ...style, position: "relative" }} disabled={disabled || pending} aria-busy={pending}>
      <span style={{ display: "contents", visibility: pending ? "hidden" : undefined }} aria-hidden={pending || undefined}>{children}</span>
      {pending && <span data-no-translate role="status" className="absolute inset-0 flex items-center justify-center gap-1 px-1 text-[10px] font-semibold tracking-normal normal-case">
        <Loader2 size={14} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />
        <span className="sr-only">{language === "en" ? "Processing..." : "Traitement en cours..."}</span>
      </span>}
    </button>
  );
}
