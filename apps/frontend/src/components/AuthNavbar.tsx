"use client";

import { Package2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AuthNavbar() {
  return (
    <div className="fixed top-0 left-0 w-full flex justify-center z-[100] px-2 sm:px-4 py-4 sm:py-6 pointer-events-none">
      <nav className="w-[95%] max-w-7xl bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-auto">
        <div className="px-4 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-4">
          
          {/* --- LOGO --- */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:rotate-3 transition-transform">
                <Package2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              
              <div className="flex flex-col leading-none text-left">
                <span className="text-sm sm:text-lg lg:text-xl font-black tracking-tighter text-slate-900 uppercase">
                  STOCK<span className="text-indigo-600">MASTER</span>
                </span>
                <span className="text-[6px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5 ml-0.5">
                  Pro Edition
                </span>
              </div>
            </Link>
          </div>

          {/* --- ACTIONS DROITE --- */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link 
              href="/" 
              className="hidden md:block text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors mr-2"
            >
              Retour à l'accueil
            </Link>
            
            <Link 
              href="/register" 
              className="group flex items-center gap-1.5 px-3.5 py-2 sm:px-6 sm:py-3 bg-indigo-600 text-[9px] sm:text-[11px] uppercase font-black text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>Essai Gratuit</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}