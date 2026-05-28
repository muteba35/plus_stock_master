"use client";

import React, { useState, useRef } from "react";
import { X, Upload, Mail, Phone, Briefcase, Camera, Loader2, User } from "lucide-react";

export default function EmployeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Ajouter un Collaborateur</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Section Gauche : Photo (Plus grande et propre) */}
          <div className="md:w-1/3 p-8 border-r border-slate-100 flex flex-col items-center justify-center bg-slate-50/50 gap-4">
            <div 
              className="w-36 h-36 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                  <User size={60} />
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Camera className="text-white" size={28} />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && setPreview(URL.createObjectURL(e.target.files[0]))} />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Définir l'avatar</p>
          </div>

          {/* Section Droite : Champs (Style épuré) */}
          <div className="md:w-2/3 p-8 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="Ex: Jean" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nom</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="Ex: Kabeya" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Adresse Email</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="jean.kabeya@entreprise.com" />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm" placeholder="081 000 000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Rôle</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm appearance-none cursor-pointer">
                  <option>Vendeur</option>
                  <option>Gestionnaire</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-all">Annuler</button>
          <button className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
            Créer le compte
          </button>
        </div>
      </div>
    </div>
  );
}