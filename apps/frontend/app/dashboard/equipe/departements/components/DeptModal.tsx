"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../../src/components/LanguageRuntime";


import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "../../../components/ModalPortal";
import { X, Building, FileText, Loader2, CheckCircle2 } from "lucide-react";

interface DeptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeptModal({ isOpen, onClose, onSuccess }: DeptModalProps) {
  const { ui: du } = useDashboardLanguage();
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Récupère ton token d'authentification
      const token = localStorage.getItem("token"); 

      // 2. Définir l'adresse dynamique de l'API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/departements`
        : "https://plus-stock-master.onrender.com/api/departements";

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "", 
        },
        body: JSON.stringify({
          nom: formData.nom,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSuccess("Le département a été créé avec succès !");
        setFormData({ nom: "", description: "" });
        
        // On rafraîchit la liste immédiatement
        onSuccess();
        
        // On attend 1.5s pour laisser l'utilisateur voir le message de succès avant de fermer
        setTimeout(() => {
          setSuccess("");
          onClose();
        }, 1500);
      } else {
        setError(data.message || "Une erreur est survenue lors de la création.");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur backend.");
    } finally {
      setIsLoading(false);
    }
  };

  // OPTIMISATION : Fonction pour gérer la fermeture sécurisée du modal
  const handleSafeClose = () => {
    // On empêche la fermeture si une action (création) est en cours
    if (!isLoading && !success) {
      onClose();
    }
  };

  return (
    <ModalPortal>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSafeClose} // Application de la sécurité ici
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-label={du("m89ee85443942")}
            className="relative z-10 w-full max-w-lg max-h-[92dvh] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-y-auto flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {du("m89ee85443942")}{" "}</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {du("mdf283e2acbf9")}{" "}</p>
              </div>
              <button onClick={handleSafeClose} disabled={isLoading || !!success} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors disabled:opacity-30">
                <X size={16} />
              </button>
            </div>

            <form id="add-dept-form" onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  {du(error)}
                </div>
              )}

              {success && (
                <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {du(success)}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Building size={12} /> {du("mcf8dd1612df8")}{" "}<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  required
                  disabled={isLoading || !!success}
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder={du("m19a26f76cfc4")}
                  className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all bg-white text-slate-800 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={12} /> {du("m88000a350189")}{" "}</label>
                <textarea
                  name="description"
                  rows={4}
                  disabled={isLoading || !!success}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={du("m62d4f098ddf9")}
                  className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white text-slate-800 disabled:opacity-60"
                />
              </div>
            </form>

            <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] flex justify-end gap-3">
              <button 
                onClick={handleSafeClose} 
                type="button"
                disabled={isLoading || !!success}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                {du("m46ad3916f6a0")}{" "}</button>
              <button
                type="submit"
                form="add-dept-form"
                disabled={isLoading || !!success}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:bg-indigo-400 shadow-sm"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {success ? du("m759f80e09266") : du("maaeb8666c43e")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </ModalPortal>
  );
}
