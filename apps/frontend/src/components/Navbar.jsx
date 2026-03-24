"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Package2, Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [open, setOpen] = useState(false);

  // Animations au scroll (réduction de la barre)
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
        className="bg-white/95 backdrop-blur-md border-slate-200/60 pointer-events-auto overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 sm:h-20 flex items-center justify-between gap-4">
          
          {/* --- LOGO + NOM MODERNE --- */}
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} className="text-slate-900"/> : <Menu size={20} className="text-slate-900"/>}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Icône du Logo avec effet de profondeur */}
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                <Package2 size={22} strokeWidth={2.5} />
              </div>
              
              {/* Le Nom StockMaster avec style Typo Moderne */}
              <div className="flex flex-col leading-[0.8]">
                <span className="text-lg sm:text-xl font-black tracking-tighter text-slate-900 uppercase">
                  STOCK<span className="text-indigo-600">MASTER</span>
                </span>
                <span className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 ml-0.5">
                  Pro Edition
                </span>
              </div>
            </Link>
          </div>

          {/* --- NAVIGATION CENTRALE (Desktop) --- */}
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

          {/* CÔTÉ DROIT : ACTIONS */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link 
              href="#" 
              className="text-[9px] sm:text-[10px] font-black uppercase italic text-slate-900 hover:text-indigo-600 px-2 py-1"
            >
              Login
            </Link>

            <Link 
              href="#pricing" 
              className="group flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 text-[8px] sm:text-[9px] uppercase font-black italic text-white rounded-full hover:bg-indigo-600 transition-all"
            >
              <span className="hidden sm:inline">Essai Gratuit</span>
              <span className="sm:hidden">Essai</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-slate-100 bg-white"
            >
              <div className="flex flex-col p-6 gap-4">
                {menuItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-black uppercase text-slate-600 hover:text-indigo-600 py-2 border-b border-slate-50 flex items-center justify-between"
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