"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package2, Mail, Lock, User, Phone, Store, Building2, 
  Eye, EyeOff, ArrowRight, Loader2, LucideIcon, Check, ChevronDown 
} from "lucide-react";
import Link from "next/link";
// 1. Import de la Navbar fixe
import AuthNavbar from "../AuthNavbar"; 
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

export default function Register() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) return;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <>
      {/* 2. Ajout de la Navbar en dehors du flux pour qu'elle reste fixe */}
      <AuthNavbar />

      {/* 3. Utilisation de pt-32 pour éviter que la Navbar ne cache le formulaire */}
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]" 
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[900px] flex flex-col lg:flex-row bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
        >
          
          {/* --- PANNEAU GAUCHE --- */}
          <div className="lg:w-[320px] bg-[#090E1A] p-10 flex flex-col items-center justify-center relative shrink-0 border-r border-slate-800/40 text-center">
            <div className="absolute inset-0 opacity-[0.02] pattern-grid-md text-white" />
            
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl mb-6 border border-white/10">
                <Package2 size={32} strokeWidth={1.5} />
              </div>
              
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                STOCK<span className="text-indigo-400">MASTER</span>
              </h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">Pro Edition</p>
              
              <div className="flex items-center gap-3 w-full my-8">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700" />
              </div>
              
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[200px] opacity-80 italic">
                Gestion intelligente <span className="text-slate-300">made in RDC</span> pour votre excellence commerciale.
              </p>
            </div>

            <div className="absolute bottom-8 text-slate-800 text-[8px] font-black uppercase tracking-[0.2em]">
              RDC • Solution Cloud
            </div>
          </div>

          {/* --- PANNEAU DROIT --- */}
          <div className="flex-1 bg-white p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-[460px] mx-auto">
              
              <header className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase leading-none">Inscription</h2>
                <div className="h-1 w-8 bg-indigo-600 rounded-full mt-3 mx-auto lg:mx-0" />
              </header>

              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Prénom" icon={User} placeholder="Jean" required />
                  <InputGroup label="Nom" icon={User} placeholder="Mubarak" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Email Pro" type="email" icon={Mail} placeholder="jean@boutique.cd" required />
                  <InputGroup label="Téléphone" type="tel" icon={Phone} placeholder="+243..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Boutique" icon={Store} placeholder="Nom du commerce" required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1 italic">Business</label>
                    <div className="relative group/select">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-indigo-600 transition-colors z-10" size={16} />
                      <select className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all appearance-none font-bold text-slate-900 text-sm uppercase cursor-pointer">
                        <option>Commerce Général</option>
                        <option>Supermarché</option>
                        <option>Pharmacie</option>
                        <option>Restaurant</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group flex flex-col">
                     <InputGroup label="Mot de passe" type={showPassword ? "text" : "password"} icon={Lock} placeholder="••••••••" required />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 bottom-3 text-slate-400 hover:text-indigo-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <InputGroup label="Confirmer" type="password" icon={Lock} placeholder="••••••••" required />
                </div>

                <div className="flex items-center gap-3 cursor-pointer group mt-6 px-1">
                  <div className="relative flex items-center justify-center shrink-0">
                      <input 
                          type="checkbox" 
                          id="terms" 
                          checked={acceptedTerms}
                          onChange={() => setAcceptedTerms(!acceptedTerms)}
                          className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-200 bg-white checked:border-indigo-600 checked:bg-indigo-600 transition-all outline-none" 
                      />
                      <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                  </div>
                  <label htmlFor="terms" className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer group-hover:text-slate-700">
                    J'accepte les <Link href="#" className="text-indigo-600 hover:underline">Conditions</Link> de StockMaster Pro.
                  </label>
                </div>

                <button 
                  disabled={isLoading || !acceptedTerms}
                  type="submit"
                  className="w-full py-3.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-lg active:scale-[0.98] disabled:opacity-30"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Créer mon compte"}
                </button>
              </form>

              <footer className="mt-8 pt-6 border-t border-slate-50 text-center">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em]">
                  Déjà inscrit ? <Link href="/login" className="text-indigo-600 hover:text-indigo-800 ml-1 border-b border-indigo-100 hover:border-indigo-600 transition-colors">Se connecter</Link>
                </p>
              </footer>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function InputGroup({ label, icon: Icon, ...props }: InputGroupProps) {
  return (
    <div className="flex flex-col gap-1 w-full group/input">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within/input:text-indigo-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-600 transition-all" size={16} />
        <input 
          className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300 placeholder:font-normal"
          {...props}
        />
      </div>
    </div>
  );
}