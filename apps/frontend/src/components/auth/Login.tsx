"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  LucideIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthNavbar from "../AuthNavbar";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Login() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | null;
  }>({
    text: "",
    type: null,
  });

  // ==========================================
  // LOGIN (Flux sécurisé aligné avec le Backend 2FA)
  // ==========================================
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    setMessage({
      text: "",
      type: null,
    });

    try {
      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      console.log("LOGIN RESPONSE :", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la connexion"
        );
      }

      // Si le premier facteur est validé et que l'OTP est envoyé
      if (data.success && data.requiresOTP) {

        // 1. Stockage de l'email pour l'écran de vérification OTP
        localStorage.setItem(
          "temp_login_email",
          data.email || formData.email
        );

        // 2. Sauvegarde de l'état de la boutique pour la future redirection post-OTP
        localStorage.setItem(
          "temp_has_boutique",
          String(data.hasBoutique)
        );
        localStorage.setItem(
          "temp_must_change_password",
          String(Boolean(data.mustChangePassword))
        );

        setMessage({
          text: "Identifiants valides. Code de sécurité envoyé !",
          type: "success",
        });

        // 3. Redirection vers l'écran de saisie du code OTP
        setTimeout(() => {
          router.push("/verify-code");
        }, 1500);
      } else if (data.success && data.token) {
        document.cookie = `stockmaster_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user_profile", JSON.stringify(data.user || {}));
        localStorage.setItem("user_permissions", JSON.stringify(data.permissions || []));

        setMessage({
          text: data.mustChangePassword
            ? "Connexion validee. Modifiez votre mot de passe temporaire."
            : "Connexion reussie.",
          type: "success",
        });

        setTimeout(() => {
          router.push(data.mustChangePassword ? "/first-login" : "/dashboard");
        }, 900);
      }

    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue";

      // Désactive le bouton si le compte est détecté comme bloqué
      if (errorMessage.toLowerCase().includes("bloqu") || errorMessage.toLowerCase().includes("suspendu")) {
        setIsBlocked(true);
      }

      setMessage({
        text: errorMessage,
        type: "error",
      });

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthNavbar />

      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">

        {/* BG */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]"
          />
        </div>

        {/* CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[900px] flex flex-col lg:flex-row bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
        >

          {/* LEFT */}
          <div className="lg:w-[320px] bg-[#090E1A] p-10 flex flex-col items-center justify-center relative shrink-0 border-r border-slate-800/40 text-center">

            <div className="absolute inset-0 opacity-[0.02] pattern-grid-md text-white" />

            <div className="relative z-10 flex flex-col items-center w-full">

              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl mb-6 border border-white/10">
                <img src="/movoora-mark.svg" alt="Movoora" className="w-8 h-8" />
              </div>

              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                MOVO<span className="text-indigo-400">ORA</span>
              </h1>

              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">
                Pro Edition
              </p>

              <div className="flex items-center gap-3 w-full my-8">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700" />
              </div>

              <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[200px] opacity-80 italic">
                Accédez à votre tableau de bord
                <span className="text-slate-300">
                  {" "}Movoora
                </span>
              </p>
            </div>

            <div className="absolute bottom-8 text-slate-800 text-[8px] font-black uppercase tracking-[0.2em]">
              RDC • Connexion Sécurisée
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex-1 bg-white p-8 lg:p-14 overflow-y-auto">

            <div className="max-w-[420px] mx-auto">

              {/* HEADER */}
              <header className="mb-10 text-center lg:text-left">

                <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase leading-none">
                  Connexion
                </h2>

                <div className="h-1 w-8 bg-indigo-600 rounded-full mt-3 mx-auto lg:mx-0" />

                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                  Ravis de vous revoir sur Movoora
                </p>

              </header>

              {/* MESSAGE */}
              <div className="min-h-[28px] mb-6 flex items-center justify-center">

                <AnimatePresence mode="wait">
                  {message.text && (
                    <motion.div
                      key={message.type}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] py-2 px-4 rounded-full ${
                        message.type === "error"
                          ? "text-red-600 bg-red-50/50"
                          : "text-emerald-600 bg-emerald-50/50"
                      }`}
                    >
                      {message.type === "error" ? (
                        <AlertCircle size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}

                      <span>{message.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* FORM */}
              <form
                className="space-y-5"
                onSubmit={handleLogin}
              >

                <InputGroup
                  label="Email Professionnel"
                  type="email"
                  icon={Mail}
                  placeholder="votre@email.cd"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  required
                />

                {/* PASSWORD */}
                <div className="relative group flex flex-col">

                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 italic group-focus-within:text-indigo-600 transition-colors">
                    Mot de passe
                  </label>

                  <div className="relative">

                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-all"
                      size={16}
                    />

                    <input
                      type={
                        showPassword ? "text" : "password"
                      }
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-200"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                  </div>

                  <div className="flex justify-end mt-2">
                    <Link
                      href="/forgot-password"
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-tighter"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>

                </div>

                {/* REMEMBER */}
                <div className="flex items-center gap-3 cursor-pointer group py-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-50"
                  />

                  <label
                    htmlFor="remember"
                    className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer"
                  >
                    Se souvenir de moi
                  </label>
                </div>

                {/* BUTTON */}
                <button
                  disabled={isLoading || isBlocked}
                  type="submit"
                  className="w-full py-4 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-lg active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <span className="flex items-center gap-2">
                      Se connecter
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>

              </form>

              {/* FOOTER */}
              <footer className="mt-12 pt-8 border-t border-slate-50 text-center">

                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em]">

                  Pas encore de compte ?

                  <Link
                    href="/register"
                    className="text-indigo-600 hover:text-indigo-800 ml-2 border-b border-indigo-100 hover:border-indigo-600 transition-colors"
                  >
                    Créer un compte pro
                  </Link>

                </p>

              </footer>

            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ==========================================
// INPUT GROUP
// ==========================================
interface InputGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

function InputGroup({
  label,
  icon: Icon,
  className,
  ...props
}: InputGroupProps) {
  return (
    <div className="flex flex-col gap-1 w-full group/input">

      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within/input:text-indigo-600 transition-colors">
        {label}
      </label>

      <div className="relative">

        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-600 transition-all"
          size={16}
        />

        <input
          className={cn(
            "w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-200 placeholder:font-normal",
            className
          )}
          {...props}
        />

      </div>
    </div>
  );
}


