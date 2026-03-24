"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Package2, Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [open, setOpen] = useState(false);

  // Animations au scroll pour réduire la barre
  const width = useTransform(scrollY, [0, 100], ["100%", "95%"]);
  const y = useTransform(scrollY, [0, 100], [0, 12]);
  const borderRadius = useTransform(scrollY, [0, 100], [0, 24]);
  const borderWidth = useTransform(scrollY, [0, 100], [0, 1]);
  const shadow = useTransform(scrollY, [0, 100], ["none", "0 10px 30px -10px rgba(0,0,0,0.1)"]);

  const menuItems = [
    { name: "Fonctionnalités", href: "#Fonctionnalités" },
    { name: "Solutions", href: "#solutions" },
    { name: "Tarifs", href: "#pricing" },
    { name: "A propos", href: "#apropos" },
  ];

  return (
    <div className="fixed w-full flex justify-center z-[100] pointer-events-none px-2 sm:px-4">
      <motion.nav
        style={{ width, y, borderRadius, borderWidth, boxShadow: shadow }}
        className="bg-white/95 backdrop-blur-md border-slate-200/60 pointer-events-auto overflow-hidden transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-4">
          
          {/* --- LOGO + NOM ADAPTATIF --- */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Bouton Hamburger Mobile */}
            <button 
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} className="text-slate-900"/> : <Menu size={20} className="text-slate-900"/>}
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              {/* Icône redimensionnée : petite sur mobile, normale sur desktop */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:rotate-3 transition-transform">
                <Package2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              
              {/* Texte Typo Moderne : Taille fluide */}
              <div className="flex flex-col leading-none">
                <span className="text-sm sm:text-lg lg:text-xl font-black tracking-tighter text-slate-900 uppercase">
                  STOCK<span className="text-indigo-600">MASTER</span>
                </span>
                <span className="text-[6px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5 ml-0.5">
                  Pro Edition
                </span>
              </div>
            </Link>
          </div>

          {/* --- MENU DESKTOP --- */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-[10px] lg:text-[11px] font-black text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all uppercase tracking-widest"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* --- ACTIONS DROITE --- */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link 
              href="#" 
              className="hidden sm:block text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors tracking-widest"
            >
              Login
            </Link>

            <Link 
              href="#pricing" 
              className="group flex items-center gap-1.5 px-3.5 py-2 sm:px-6 sm:py-3 bg-indigo-600 text-[9px] sm:text-[11px] uppercase font-black text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span className="hidden xs:inline">Essai Gratuit</span>
              <span className="xs:hidden">Essai</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* --- MENU MOBILE DÉROULANT --- */}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-slate-100 bg-white"
            >
              <div className="flex flex-col p-6 gap-4">
                {menuItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-xs font-black uppercase text-slate-600 hover:text-indigo-600 py-2 border-b border-slate-50 flex items-center justify-between"
                  >
                    {item.name}
                    <ArrowRight size={16} className="text-indigo-500" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}