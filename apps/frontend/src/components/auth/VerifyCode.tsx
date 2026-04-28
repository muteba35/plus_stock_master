"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, RefreshCw, Package2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthNavbar from "../AuthNavbar";

export default function VerifyCode() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsLoadingResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false); 
  const [timer, setTimer] = useState(0); // Initialisé à 0 pour permettre le premier clic
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Récupération de l'email au montage
  useEffect(() => {
    const savedEmail = localStorage.getItem("temp_login_email");
    if (!savedEmail) {
      router.push("/login");
    } else {
      setEmail(savedEmail);
    }
    if (inputs.current[0]) inputs.current[0].focus();
  }, [router]);

  // 2. Gestion du compte à rebours (ne s'active que si timer > 0)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setResendSuccess(false); // Cache le message de succès quand le temps est écoulé
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    setError("");
    
    if (element.value !== "" && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const fullOtp = otp.join("");
      const response = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Code invalide ou expiré");
      }

      localStorage.setItem("token", data.token);
      localStorage.removeItem("temp_login_email");
      router.push("/register"); 
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de vérification";
      setError(msg);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoadingResending(true);
    setError("");
    setResendSuccess(false);
    
    try {
      const response = await fetch("http://localhost:5000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Impossible de renvoyer le code.");
      }

      // LE TIMER SE DÉCLENCHE UNIQUEMENT ICI
      setResendSuccess(true);
      setTimer(45); 

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du renvoi";
      setError(msg);
    } finally {
      setIsLoadingResending(false);
    }
  };

  return (
    <>
      <AuthNavbar />
      
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.1)] border border-slate-100 p-10 text-center"
        >
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Package2 size={32} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                STOCK<span className="text-indigo-600">MASTER</span>
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                Pro Edition
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-3">Vérification</h2>
          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-8 px-2">
            Entrez le code envoyé à <span className="text-indigo-600 font-bold">{email}</span>.
          </p>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  ref={(el) => { inputs.current[index] = el; }}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full h-12 text-center text-xl font-black text-slate-900 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all uppercase"
                />
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={isLoading || otp.some(v => v === "")}
              className="w-full py-4 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-30"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                <>Valider le code <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col items-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">
              Vous n'avez pas reçu le code ?
            </p>
            <button 
              type="button"
              onClick={handleResend}
              disabled={isResending || timer > 0}
              className="inline-flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:text-indigo-800 transition-colors disabled:opacity-50"
            >
              {isResending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} className={timer > 0 ? "animate-spin" : ""} />}
              {timer > 0 ? `Attendre ${timer}s` : "Renvoyer un nouveau code"}
            </button>

            <AnimatePresence>
              {resendSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-1.5 text-emerald-600 text-[9px] font-black uppercase tracking-wider"
                >
                  <CheckCircle2 size={12} />
                  Nouveau code otp envoyé !
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div> 
      </div>
    </>
  );
}