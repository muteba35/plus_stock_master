"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthNavbar from "../AuthNavbar";

export default function VerifyCode() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus sur le premier input au chargement
  useEffect(() => {
    if (inputs.current[0]) inputs.current[0].focus();
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus automatique sur le suivant
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
    // Simulation vérification OTP
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard"); // Redirection vers le dashboard
    }, 2000);
  };

  return (
    <>
      <AuthNavbar />
      
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[500px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.1)] border border-slate-100 p-8 lg:p-14 text-center"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-[#090E1A] rounded-2xl flex items-center justify-center text-white shadow-xl">
              <ShieldCheck size={32} className="text-indigo-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                STOCK<span className="text-indigo-600">MASTER</span>
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Sécurité Avancée</span>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Vérification</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10 px-4">
            Entrez le code à 6 chiffres envoyé à votre adresse email pour accéder à votre inventaire.
          </p>

          <form onSubmit={handleVerify} className="space-y-8">
            {/* OTP Inputs */}
            <div className="flex justify-between gap-2 sm:gap-4">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  // Correction TypeScript ici : utilisation d'un bloc {}
                  ref={(el) => { inputs.current[index] = el; }}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-full h-14 sm:h-16 text-center text-2xl font-black text-slate-900 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all uppercase"
                />
              ))}
            </div>

            <button 
              disabled={isLoading || otp.some(v => v === "")}
              className="w-full py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-30"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  Valider le code
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
              Vous n `avez pas reçu le code ?
            </p>
            <button 
              onClick={() => {
                setIsResending(true);
                setTimeout(() => setIsResending(false), 2000);
              }}
              disabled={isResending}
              className="inline-flex items-center gap-2 text-indigo-600 font-black text-[11px] uppercase tracking-widest hover:text-indigo-800 transition-colors disabled:opacity-50"
            >
              {isResending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Renvoyer un nouveau code
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}