"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Package2, Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [open, setOpen] = useState(false);

  // Animations scroll
  const width = useTransform(scrollY, [0, 100], ["100%", "95%"]);
  const y = useTransform(scrollY, [0, 100], [0, 12]);
  const borderRadius = useTransform(scrollY, [0, 100], [0, 24]);
  const borderWidth = useTransform(scrollY, [0, 100], [0, 1]);
  const shadow = useTransform(scrollY, [0, 100], ["none", "0 4px 20px -5px rgba(0,0,0,0.1)"]);

  // --- LIENS RELIÉS AUX SECTIONS ---
  const menuItems = [
    { name: "Fonctionnalités", href: "#Fonctionnalités" },
    { name: "Solutions", href: "#solutions" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Contact", href: "#footer" },
  ];

  return (
    <div className="fixed w-full flex justify-center z-[100] pointer-events-none px-2 sm:px-4">
      <motion.nav
        style={{ width, y, borderRadius, borderWidth, boxShadow: shadow }}
        className="bg-white/90 backdrop-blur-md border-slate-200/50 pointer-events-auto overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* CÔTÉ GAUCHE : HAMBURGER + LOGO */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} className="text-slate-900"/> : <Menu size={18} className="text-slate-900"/>}
            </button>

            <Link href="/" className="flex items-center gap-1.5 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Package2 size={16} />
              </div>
              <span className="hidden xs:block text-[10px] sm:text-xs font-black tracking-tighter text-slate-900 uppercase italic">
                StockMaster
              </span>
            </Link>
          </div>

          {/* CENTRE : MENU DESKTOP (Ancres reliées) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 bg-slate-100/50 px-5 py-1.5 rounded-full border border-slate-200/50">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-[9px] lg:text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest italic"
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

        {/* MENU MOBILE DÉROULANT */}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-100 bg-white"
            >
              <div className="flex flex-col p-5 gap-3">
                {menuItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-[11px] font-black uppercase italic text-slate-600 py-1 flex items-center justify-between"
                  >
                    {item.name}
                    <ArrowRight size={12} className="text-indigo-600" />
                  </a>
                ))}
                <div className="h-px bg-slate-50 my-1" />
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-center">
                  Gestion de stock simplifiée • 2026
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}