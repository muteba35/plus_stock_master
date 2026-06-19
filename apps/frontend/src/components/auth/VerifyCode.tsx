"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  RefreshCw,
  Package2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AuthNavbar from "../AuthNavbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

export default function VerifyCode() {
  const router = useRouter();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [email, setEmail] = useState("");

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Vérification email temporaire
  useEffect(() => {
    const timeout = setTimeout(() => {
      const savedEmail = localStorage.getItem("temp_login_email");
      if (!savedEmail) {
        router.push("/login");
        return;
      }

      setEmail(savedEmail);
      inputs.current[0]?.focus();
    }, 0);

    return () => clearTimeout(timeout);
  }, [router]);

  // Timer resend
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;

    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);

    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputs.current[index - 1]?.focus();
      }
    }
  };

  // Gestion collage OTP optimisée pour React
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text")
      .trim()
      .replace(/\D/g, "");

    if (pastedData.length !== 6) return;

    const otpArray = pastedData.split("").slice(0, 6);
    setOtp(otpArray);

    inputs.current[5]?.focus();
  };

  // Fonction de vérification OTP modifiée avec gestion du Rate Limiter (429)
  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const fullOtp = otp.join("");

      const response = await fetch(
        `${API_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp: fullOtp,
          }),
        }
      );

      const data = await response.json();

      // Interception des erreurs (code faux, expiré ou vrai blocage après 3 essais)
      if (!response.ok) {
        const serverMessage = data.message || "Code invalide ou expiré";
        const normalizedMessage = serverMessage.toLowerCase();
        const isHardBlocked =
          response.status === 429 ||
          normalizedMessage.includes("trop de tentatives") ||
          normalizedMessage.includes("sécurité activée") ||
          normalizedMessage.includes("securite activee");

        if (isHardBlocked) {
          setIsBlocked(true);
          setError(serverMessage);
          
          // Laisse l'utilisateur lire le message de sécurité pendant 2.5s avant redirection
          setTimeout(() => {
            router.push("/login");
          }, 2500);
          return;
        }
        
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        throw new Error(serverMessage);
      }

      // Cookie middleware Next.js (7 jours)
      document.cookie = `stockmaster_token=${
        data.token
      }; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // Token localStorage
      localStorage.setItem("token", data.token);

      // Récupération des données utilisateur de transition
      const tempUserInfoStr = localStorage.getItem("temp_user_info");
      const fallbackUser = tempUserInfoStr ? JSON.parse(tempUserInfoStr) : null;

      // Unification complète du profil basée sur l'architecture par permissions
      const finalUserProfile = data.user ? {
        id: data.user.id || fallbackUser?.id,
        nom: data.user.nom || fallbackUser?.nom,
        prenom: data.user.prenom || fallbackUser?.prenom,
        email: data.user.email || fallbackUser?.email,
        telephone: data.user.telephone || fallbackUser?.telephone,
        role: data.user.roleId ? "Employé" : "Admin Général",
        avatar: data.user.avatar || fallbackUser?.avatar || "",
        boutiqueActive: data.user.boutiqueActive?._id || data.user.boutiqueActive || fallbackUser?.boutiqueActive || "",
        mustChangePassword: Boolean(data.mustChangePassword || data.user.mustChangePassword),
      } : fallbackUser;

      if (finalUserProfile) {
        localStorage.setItem("user_profile", JSON.stringify(finalUserProfile));
      }

      // Enregistrement des permissions transmises par le backend
      const permissions = data.permissions || fallbackUser?.permissions || [];
      localStorage.setItem("user_permissions", JSON.stringify(permissions));

      // Nettoyage des stores temporaires
      const mustChangePassword =
        Boolean(data.mustChangePassword || data.user?.mustChangePassword) ||
        localStorage.getItem("temp_must_change_password") === "true";

      localStorage.removeItem("temp_login_email");
      localStorage.removeItem("temp_user_info");
      localStorage.removeItem("temp_must_change_password");

      setSuccessMessage("Vérification réussie. Redirection...");

      setTimeout(() => {
        router.push(mustChangePassword ? "/first-login" : "/dashboard");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de vérification";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/auth/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Impossible de renvoyer le code.");
      }

      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();

      setTimer(45); // Cooldown aligné sur le backend
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du renvoi";
      setError(msg);

      if (msg.toLowerCase().includes("bloqué") || msg.toLowerCase().includes("tentative")) {
        setIsBlocked(true);
        setTimeout(() => {
          router.push("/login");
        }, 4000);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <AuthNavbar />

      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 relative overflow-hidden font-sans">
        {/* Background Shapes */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-70">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[460px] bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_25px_80px_-12px_rgba(15,23,42,0.08)] p-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-2xl shadow-indigo-100 border border-indigo-500/20">
              <Package2 size={36} strokeWidth={1.8} />
            </div>

            <div className="mt-5">
              <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-950">
                STOCK<span className="text-indigo-600">MASTER</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">
                PRO EDITION
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-5">
              <ShieldCheck size={14} />
              Authentification sécurisée
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-950 uppercase">
              Vérification OTP
            </h2>

            <p className="text-slate-500 text-sm mt-4 leading-relaxed">
              Entrez le code envoyé à
              <br />
              <span className="font-bold text-indigo-600 break-all">
                {email}
              </span>
            </p>
          </div>

          {/* Messages Alerts */}
          <div className="min-h-[48px] mb-6 flex justify-center">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-start gap-2.5 text-xs font-semibold py-3 px-4 rounded-2xl bg-red-50 text-red-600 border border-red-100/50 w-full text-center justify-center leading-relaxed"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2.5 text-xs font-bold py-3 px-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 w-full text-center justify-center"
                >
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-8">
            {/* OTP Grid Inputs */}
            <div className="flex justify-between gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isBlocked || isLoading}
                  onPaste={handlePaste}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-center text-xl font-black text-slate-950 outline-none transition-all focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-40 transition-opacity"
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isBlocked || otp.some((v) => v === "")}
              className="w-full py-4 bg-[#090E1A] hover:bg-indigo-600 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Vérifier le code
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Resend Actions */}
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">
              {"Vous n'avez pas reçu le code ?"}
            </p>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || isBlocked || timer > 0}
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw
                  size={14}
                  className={timer > 0 ? "animate-spin" : ""}
                />
              )}

              {timer > 0 ? `Attendre ${timer}s` : "Renvoyer un code"}
            </button>

            <AnimatePresence>
              {timer > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-[0.15em]"
                >
                  <CheckCircle2 size={13} />
                  Nouveau code envoyé
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
