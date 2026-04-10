"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Correction ici
import { 
  Package2, Mail, Lock, User, Phone, Store, Building2, 
  Eye, EyeOff, Loader2, LucideIcon, Check, 
  ChevronDown, Coins, Users, AlertCircle 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios"; // Typage Axios
import AuthNavbar from "../AuthNavbar"; 

// --- TYPES ---
interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

// Interface pour la structure de l'erreur Backend
interface ApiErrorResponse {
  message: string;
  success?: boolean;
}

export default function Register() {
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    nomBoutique: "",
    secteurActivite: "Commerce Général",
    deviseParDefaut: "USD ($)",
    tailleBusiness: "1-2 employés",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post( "https://hotellerie.onrender.com/api/auth/register", formData);

      if (response.data.success) {
        router.push("/verify-email-pending"); 
      }
    } catch (err) {
      // Correction du "Unexpected any" en utilisant AxiosError
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.message || "Une erreur est survenue lors de l'inscription.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthNavbar />

      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 relative overflow-hidden font-sans selection:bg-indigo-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[900px] flex flex-col lg:flex-row bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
        >
          {/* --- PANNEAU GAUCHE --- */}
          <div className="lg:w-[320px] bg-[#090E1A] p-10 flex flex-col items-center justify-center relative shrink-0 border-r border-slate-800/40 text-center">
             <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl mb-6">
                <Package2 size={32} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                STOCK<span className="text-indigo-400">MASTER</span>
              </h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">Pro Edition</p>
            </div>
          </div>

          {/* --- PANNEAU DROIT --- */}
          <div className="flex-1 bg-white p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-[460px] mx-auto">
              
              <header className="mb-8">
                <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Inscription</h2>
                <div className="h-1 w-8 bg-indigo-600 rounded-full mt-3" />
              </header>

              {/* AnimatePresence est maintenant défini via l'import */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700 text-xs font-bold uppercase tracking-tight overflow-hidden"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Prénom" name="prenom" icon={User} placeholder="Jean" required onChange={handleChange} />
                  <InputGroup label="Nom" name="nom" icon={User} placeholder="Mubarak" required onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Email Pro" name="email" type="email" icon={Mail} placeholder="jean@boutique.cd" required onChange={handleChange} />
                  <InputGroup label="Téléphone" name="telephone" type="tel" icon={Phone} placeholder="+243..." onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Boutique" name="nomBoutique" icon={Store} placeholder="Nom du commerce" required onChange={handleChange} />
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Business</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select 
                        name="secteurActivite"
                        value={formData.secteurActivite}
                        onChange={handleChange}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer"
                      >
                        <option>Commerce Général</option>
                        <option>Supermarché</option>
                        <option>Pharmacie</option>
                        <option>Restaurant</option>
                        <option>Boutique de vêtements</option>
                        <option>Autre</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Devise</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select name="deviseParDefaut" value={formData.deviseParDefaut} onChange={handleChange} className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer">
                        <option>USD ($)</option>
                        <option>CDF (FC)</option>
                        <option>EUR (€)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Taille</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select name="tailleBusiness" value={formData.tailleBusiness} onChange={handleChange} className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer">
                        <option>1-2 employés</option>
                        <option>3-10 employés</option>
                        <option>10+ employés</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group flex flex-col">
                    <InputGroup label="Mot de passe" name="password" type={showPassword ? "text" : "password"} icon={Lock} placeholder="••••••••" required onChange={handleChange} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 bottom-3 text-slate-400 hover:text-indigo-600 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <InputGroup label="Confirmer" name="confirmPassword" type="password" icon={Lock} placeholder="••••••••" required onChange={handleChange} />
                </div>

                <div className="flex items-center gap-3 mt-6 px-1">
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
                  <label htmlFor="terms" className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">
                    J`accepte les <Link href="#" className="text-indigo-600 hover:underline">Conditions</Link>
                  </label>
                </div>

                <button 
                  disabled={isLoading || !acceptedTerms}
                  type="submit"
                  className="w-full py-3.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-30 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Créer mon compte"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function InputGroup({ label, icon: Icon, ...props }: InputGroupProps & { name: string }) {
  return (
    <div className="flex flex-col gap-1 w-full group/input">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within/input:text-indigo-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-600 transition-all" size={16} />
        <input 
          className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white font-bold text-slate-900 text-sm placeholder:text-slate-300 placeholder:font-normal transition-all"
          {...props}
        />
      </div>
    </div>
  );
}