"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Lock, Package2, ShieldCheck, X } from "lucide-react";
import AuthNavbar from "../../src/components/AuthNavbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

const PASSWORD_RULES = [
  { label: "8 caracteres minimum", test: (value: string) => value.length >= 8 },
  { label: "Une lettre majuscule", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Un chiffre", test: (value: string) => /[0-9]/.test(value) },
  { label: "Un caractere special", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function FirstLoginPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
  }, [router]);

  const rulesValid = useMemo(
    () => PASSWORD_RULES.every((rule) => rule.test(newPassword)),
    [newPassword]
  );
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (!rulesValid) {
      setError("Le nouveau mot de passe ne respecte pas toutes les regles de securite.");
      return;
    }
    if (!passwordsMatch) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Impossible de modifier le mot de passe.");
      }

      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      localStorage.setItem("user_profile", JSON.stringify({ ...profile, mustChangePassword: false }));
      setSuccess("Mot de passe configure avec succes. Redirection...");
      window.dispatchEvent(new Event("userProfileUpdated"));
      window.setTimeout(() => router.replace("/dashboard"), 1000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthNavbar />
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-24 sm:px-6 font-sans">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid lg:grid-cols-[300px_1fr]"
        >
          <div className="bg-[#090E1A] px-8 py-10 text-center text-white flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/40">
              <img src="/movoora-mark.svg" alt="Movoora" className="w-8 h-8" />
            </div>
            <h1 className="mt-5 text-xl font-black uppercase">Stock<span className="text-indigo-400">Master</span></h1>
            <p className="mt-8 text-xs leading-6 text-slate-400">
              Protegez votre compte avant votre premier acces au tableau de bord.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold uppercase text-indigo-300">
              <ShieldCheck size={14} /> Configuration obligatoire
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-7">
              <h2 className="text-xl font-black uppercase text-slate-950">Premiere connexion</h2>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Remplacez le code temporaire transmis par votre responsable.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {(error || success) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-5 rounded-xl border p-3 text-xs font-bold ${
                    error ? "border-rose-100 bg-rose-50 text-rose-600" : "border-emerald-100 bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {error || success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordField
                label="Code temporaire actuel"
                value={currentPassword}
                visible={visible.current}
                icon={KeyRound}
                onChange={setCurrentPassword}
                onToggle={() => setVisible((state) => ({ ...state, current: !state.current }))}
              />
              <PasswordField
                label="Nouveau mot de passe"
                value={newPassword}
                visible={visible.next}
                icon={Lock}
                onChange={setNewPassword}
                onToggle={() => setVisible((state) => ({ ...state, next: !state.next }))}
              />

              {newPassword && (
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const valid = rule.test(newPassword);
                    return (
                      <div key={rule.label} className={`flex items-center gap-2 text-[10px] font-bold ${valid ? "text-emerald-600" : "text-slate-400"}`}>
                        {valid ? <Check size={12} /> : <X size={12} />}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}

              <PasswordField
                label="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                visible={visible.confirm}
                icon={Lock}
                onChange={setConfirmPassword}
                onToggle={() => setVisible((state) => ({ ...state, confirm: !state.confirm }))}
              />

              {confirmPassword && (
                <p className={`text-[10px] font-bold ${passwordsMatch ? "text-emerald-600" : "text-rose-500"}`}>
                  {passwordsMatch ? "Les mots de passe correspondent." : "Les mots de passe ne correspondent pas."}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !rulesValid || !passwordsMatch || !currentPassword}
                className="w-full h-12 rounded-xl bg-[#090E1A] text-white text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {isSubmitting ? "Enregistrement..." : "Valider mon nouvel acces"}
              </button>
            </form>
          </div>
        </motion.section>
      </main>
    </>
  );
}

function PasswordField({ label, value, visible, icon: Icon, onChange, onToggle }: {
  label: string;
  value: string;
  visible: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600" title={visible ? "Masquer" : "Afficher"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

